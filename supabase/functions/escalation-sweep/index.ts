/**
 * escalation-sweep
 *
 * Called every 15 minutes by pg_cron (or manually via supabase.functions.invoke).
 * For every active task, evaluates where it sits in the escalation state machine
 * and advances the level / sends the appropriate nudge.
 *
 * State machine:
 *   0  on_track        — due > 4h away, no action
 *   1  soft_nudge      — due within 4h OR 0–2h overdue, push notification
 *   2  firm_nudge      — 2–24h overdue, stronger push notification
 *   3  sms_escalation  — 24h+ overdue and user has SMS opted in
 *   4  blocked         — 48h+ overdue, in-app block until forced response
 *
 * Throttle: never nudge the same task at the same level more than once per hour.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type EscalationLevel = '0' | '1' | '2' | '3' | '4';

interface ActiveTask {
  id: string;
  title: string;
  due_date: string;
  user_id: string;
  status: string;
  pre_deadline_warned_at: string | null;
  users: {
    push_token: string | null;
    phone_number: string | null;
    sms_opt_in: boolean;
  };
}

interface EscalationStateRow {
  id: string;
  task_id: string;
  user_id: string;
  level: EscalationLevel;
  last_nudge_at: string | null;
  nudge_count: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoursAgo(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

function hoursUntil(date: Date): number {
  return (date.getTime() - Date.now()) / (1000 * 60 * 60);
}

function canNudge(state: EscalationStateRow | null, level: EscalationLevel): boolean {
  if (!state) return true;
  // Don't nudge if already at a higher level (shouldn't happen, but guard)
  if (parseInt(state.level) > parseInt(level)) return false;
  // Same level: throttle to once per hour
  if (state.level === level && state.last_nudge_at) {
    return hoursAgo(new Date(state.last_nudge_at)) >= 1;
  }
  return true;
}

function targetLevel(task: ActiveTask): EscalationLevel {
  if (!task.due_date) return '0';
  const due = new Date(task.due_date);
  const hoursOver = hoursAgo(due);
  const hoursLeft = hoursUntil(due);

  if (hoursLeft > 4) return '0';         // plenty of time
  if (hoursOver < 2) return '1';         // pre-deadline or just overdue
  if (hoursOver < 24) return '2';        // firmly overdue
  if (hoursOver < 48) return '3';        // SMS territory
  return '4';                            // blocked
}

// ── Push notification via send-notification function ─────────────────────────

async function sendPush(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  taskId: string,
  title: string,
  body: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: { userId, title, body, data: { taskId, type: 'escalation' } },
    });
    if (error) {
      console.warn('[sweep] push failed:', error.message);
      return null;
    }
    return data?.result?.data?.receiptId ?? null;
  } catch (e) {
    console.warn('[sweep] push exception:', e);
    return null;
  }
}

// ── SMS via Twilio ────────────────────────────────────────────────────────────

async function sendSms(
  phoneNumber: string,
  message: string,
): Promise<string | null> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('[sweep] Twilio env vars not set — skipping SMS');
    return null;
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phoneNumber, From: fromNumber, Body: message }),
      },
    );
    const json = await res.json() as { sid?: string; error_message?: string };
    if (json.error_message) {
      console.warn('[sweep] Twilio error:', json.error_message);
      return null;
    }
    return json.sid ?? null;
  } catch (e) {
    console.warn('[sweep] Twilio exception:', e);
    return null;
  }
}

// ── Nudge messages ────────────────────────────────────────────────────────────

function buildMessage(level: EscalationLevel, taskTitle: string): { title: string; body: string } {
  switch (level) {
    case '1':
      return {
        title: 'RELENTLESS',
        body: `Due soon: "${taskTitle}" — don't let it slip.`,
      };
    case '2':
      return {
        title: 'RELENTLESS — Overdue',
        body: `"${taskTitle}" is overdue. Handle it now.`,
      };
    case '3':
      return {
        title: 'RELENTLESS',
        body: `"${taskTitle}" has been overdue for over 24 hours. Open the app.`,
      };
    case '4':
      return {
        title: 'RELENTLESS — Action Required',
        body: `"${taskTitle}" is 48h+ overdue. The app is locked until you respond.`,
      };
    default:
      return { title: 'RELENTLESS', body: taskTitle };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch all active (non-complete, non-cancelled) tasks with a due date
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        user_id,
        status,
        pre_deadline_warned_at,
        users ( push_token, phone_number, sms_opt_in )
      `)
      .in('status', ['pending', 'in_progress'])
      .not('due_date', 'is', null);

    if (tasksError) throw tasksError;
    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch existing escalation states for these tasks
    const taskIds = tasks.map((t: ActiveTask) => t.id);
    const { data: states, error: statesError } = await supabase
      .from('escalation_state')
      .select('*')
      .in('task_id', taskIds)
      .is('resolved_at', null);

    if (statesError) throw statesError;

    const stateByTaskId = new Map<string, EscalationStateRow>();
    for (const s of (states ?? [])) {
      stateByTaskId.set(s.task_id, s as EscalationStateRow);
    }

    let nudgesSent = 0;

    for (const task of tasks as ActiveTask[]) {
      const level = targetLevel(task);
      if (level === '0') continue; // nothing to do

      const existingState = stateByTaskId.get(task.id) ?? null;

      // Pre-deadline warning (level 1): only send once per task
      if (level === '1' && task.pre_deadline_warned_at) continue;

      if (!canNudge(existingState, level)) continue;

      const { title, body } = buildMessage(level, task.title);
      let externalId: string | null = null;

      // Determine channel based on level + user preferences
      if (level === '3' && task.users.sms_opt_in && task.users.phone_number) {
        const smsBody = `${body}\n\nRELENTLESS`;
        externalId = await sendSms(task.users.phone_number, smsBody);
      } else if (task.users.push_token) {
        externalId = await sendPush(supabase, task.user_id, task.id, title, body);
      }
      // Level 4 always also sends an in_app marker regardless of push success

      const channel = (level === '3' && task.users.sms_opt_in && task.users.phone_number)
        ? 'sms'
        : level === '4'
          ? 'in_app'
          : 'push';

      // Upsert escalation_state
      const levelTimestampField = `level_${level}_at` as const;
      const levelTimestamp = existingState?.[`level_${level}_at` as keyof EscalationStateRow]
        ? {}
        : { [levelTimestampField]: new Date().toISOString() };

      const { error: upsertError } = await supabase
        .from('escalation_state')
        .upsert({
          task_id: task.id,
          user_id: task.user_id,
          level,
          last_nudge_at: new Date().toISOString(),
          nudge_count: (existingState?.nudge_count ?? 0) + 1,
          ...levelTimestamp,
        }, { onConflict: 'task_id' });

      if (upsertError) {
        console.warn('[sweep] upsert error:', upsertError.message);
        continue;
      }

      // Append nudge_history
      await supabase.from('nudge_history').insert({
        task_id: task.id,
        user_id: task.user_id,
        level,
        channel,
        message: body,
        external_id: externalId,
      });

      // Mark pre_deadline_warned_at so we don't re-send level 1
      if (level === '1') {
        await supabase
          .from('tasks')
          .update({ pre_deadline_warned_at: new Date().toISOString() })
          .eq('id', task.id);
      }

      nudgesSent++;
      console.log(`[sweep] task=${task.id} level=${level} channel=${channel}`);
    }

    return new Response(
      JSON.stringify({ ok: true, processed: tasks.length, nudgesSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sweep] fatal:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

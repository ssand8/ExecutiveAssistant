/**
 * morning-briefing
 *
 * Runs at 7:00 AM in the user's local timezone (approximated via pg_cron
 * running at 7:00 UTC — Phase 4 will add per-user timezone support).
 *
 * Builds a tight, personalized daily brief from:
 *   - Overdue tasks (escalation level ≥ 2)
 *   - Tasks due today
 *   - User patterns (velocity, overdue rate)
 *   - Active goals and their progress
 *
 * Sends via push notification. The message is short enough to read in the tray.
 *
 * Body: {} (called by pg_cron with no body, or manually for testing)
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserRow {
  id: string;
  push_token: string | null;
}

interface TaskRow {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  priority: number;
  goals: { title: string } | null;
}

interface PatternRow {
  user_id: string;
  tasks_completed_last_7d: number;
  overdue_rate_pct: number;
  top_reschedule_reason: string | null;
  active_task_count: number;
  active_goal_count: number;
}

interface BriefingResult {
  title: string;
  body: string;
}

async function generateBriefing(
  anthropic: Anthropic,
  overdueTasks: TaskRow[],
  todayTasks: TaskRow[],
  patterns: PatternRow | null,
): Promise<BriefingResult> {
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  let prompt = `Today is ${todayStr}. Generate a morning briefing for a CEO/founder.\n\n`;

  if (overdueTasks.length > 0) {
    prompt += `OVERDUE (${overdueTasks.length}):\n`;
    for (const t of overdueTasks.slice(0, 3)) {
      prompt += `- ${t.title}\n`;
    }
    if (overdueTasks.length > 3) prompt += `...and ${overdueTasks.length - 3} more\n`;
    prompt += '\n';
  }

  if (todayTasks.length > 0) {
    prompt += `DUE TODAY (${todayTasks.length}):\n`;
    for (const t of todayTasks.slice(0, 5)) {
      prompt += `- ${t.title}${t.goals ? ` [${t.goals.title}]` : ''}\n`;
    }
    if (todayTasks.length > 5) prompt += `...and ${todayTasks.length - 5} more\n`;
    prompt += '\n';
  }

  if (patterns) {
    prompt += `Context: ${patterns.tasks_completed_last_7d} tasks completed this week, `;
    prompt += `${patterns.overdue_rate_pct}% overdue rate, `;
    prompt += `${patterns.active_goal_count} active goals.\n\n`;
  }

  if (overdueTasks.length === 0 && todayTasks.length === 0) {
    prompt += `No tasks due. The slate is clean.\n\n`;
  }

  prompt += `Write a push notification briefing (title + body). Rules:
- Title: max 6 words, sharp
- Body: max 2 sentences, direct, no filler
- If there are overdue items, lead with urgency
- If the slate is clean, be terse and affirming
- Never use exclamation points`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
    tools: [{
      name: 'send_briefing',
      description: 'Send the morning briefing notification',
      input_schema: {
        type: 'object' as const,
        properties: {
          title: { type: 'string', description: 'Push notification title, max 6 words' },
          body: { type: 'string', description: 'Push notification body, max 2 sentences' },
        },
        required: ['title', 'body'],
      },
    }],
    tool_choice: { type: 'tool', name: 'send_briefing' },
  });

  const toolUse = response.content.find((c) => c.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return tool_use');
  }

  return toolUse.input as BriefingResult;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not set');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Get all users with push tokens
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, push_token')
      .not('push_token', 'is', null);

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    let sent = 0;

    for (const user of users as UserRow[]) {
      try {
        // Overdue tasks
        const { data: overdueTasks } = await supabase
          .from('tasks')
          .select('id, title, due_date, status, priority, goals ( title )')
          .eq('user_id', user.id)
          .in('status', ['pending', 'in_progress'])
          .lt('due_date', now.toISOString())
          .order('due_date', { ascending: true })
          .limit(10);

        // Tasks due today (not overdue)
        const { data: todayTasks } = await supabase
          .from('tasks')
          .select('id, title, due_date, status, priority, goals ( title )')
          .eq('user_id', user.id)
          .in('status', ['pending', 'in_progress'])
          .gte('due_date', now.toISOString())
          .lt('due_date', todayEnd.toISOString())
          .order('priority', { ascending: true })
          .limit(10);

        // User patterns
        const { data: patterns } = await supabase
          .from('user_patterns')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const { title, body } = await generateBriefing(
          anthropic,
          (overdueTasks ?? []) as TaskRow[],
          (todayTasks ?? []) as TaskRow[],
          patterns as PatternRow | null,
        );

        // Send push via send-notification function
        await supabase.functions.invoke('send-notification', {
          body: {
            userId: user.id,
            title,
            body,
            data: { type: 'morning_briefing' },
          },
        });

        sent++;
        console.log(`[morning-briefing] sent to user=${user.id}`);
      } catch (userErr) {
        console.warn(`[morning-briefing] failed for user=${user.id}:`, userErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[morning-briefing]', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

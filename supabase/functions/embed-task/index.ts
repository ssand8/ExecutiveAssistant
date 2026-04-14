/**
 * embed-task
 *
 * Called by the app after a task is completed (or by a Supabase DB webhook).
 * Builds a rich text representation of the task and embeds it via OpenAI,
 * storing the result in task_embeddings for use by help-me RAG retrieval.
 *
 * Also embeds goals when all their tasks are complete.
 *
 * Body: { taskId: string }
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: number;
  estimated_minutes: number | null;
  due_date: string | null;
  updated_at: string;
  user_id: string;
  goal_id: string | null;
  goals: { title: string; type: string } | null;
}

interface CheckInRow {
  action: string;
  reschedule_reason: string | null;
  created_at: string;
}

async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embeddings error: ${err}`);
  }

  const json = await res.json() as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

function buildTaskContent(task: TaskRow, checkIns: CheckInRow[]): string {
  const parts: string[] = [];

  parts.push(`Task: ${task.title}`);

  if (task.goals) {
    parts.push(`Goal: ${task.goals.title} (${task.goals.type})`);
  }

  const priorityLabel = task.priority === 1 ? 'high' : task.priority === 2 ? 'medium' : 'low';
  parts.push(`Priority: ${priorityLabel}`);

  if (task.estimated_minutes) {
    parts.push(`Estimated: ${task.estimated_minutes} minutes`);
  }

  const reschedules = checkIns.filter((c) => c.action === 'reschedule');
  if (reschedules.length > 0) {
    parts.push(`Rescheduled ${reschedules.length} time(s)`);
    const reasons = [...new Set(reschedules.map((r) => r.reschedule_reason).filter(Boolean))];
    if (reasons.length > 0) {
      parts.push(`Reschedule reasons: ${reasons.join(', ')}`);
    }
  }

  parts.push(`Status: completed`);

  return parts.join('. ');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new Error('OPENAI_API_KEY not set');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { taskId } = await req.json() as { taskId: string };
    if (!taskId) throw new Error('taskId is required');

    // Fetch task with goal
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, goals ( title, type )')
      .eq('id', taskId)
      .single();

    if (taskError) throw taskError;
    if (!task) throw new Error('Task not found');

    const typedTask = task as TaskRow;

    // Fetch check-ins for context
    const { data: checkIns } = await supabase
      .from('task_check_ins')
      .select('action, reschedule_reason, created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    const content = buildTaskContent(typedTask, (checkIns ?? []) as CheckInRow[]);
    const embedding = await getEmbedding(content, openaiKey);

    // Upsert — safe to call multiple times
    const { error: upsertError } = await supabase
      .from('task_embeddings')
      .upsert({
        task_id: taskId,
        user_id: typedTask.user_id,
        content,
        embedding: JSON.stringify(embedding),
      }, { onConflict: 'task_id' });

    if (upsertError) throw upsertError;

    console.log(`[embed-task] embedded task=${taskId}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[embed-task]', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

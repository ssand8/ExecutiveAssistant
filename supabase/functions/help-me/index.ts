/**
 * help-me
 *
 * Called when the user taps "Help" on a task.
 * 1. Embeds the task title to get a query vector
 * 2. Retrieves the top-5 most similar completed tasks from history (RAG)
 * 3. Sends task context + history + user patterns to Claude
 * 4. Returns a structured response: first_step, why, similar_past_tasks
 *
 * Body: { taskId: string, userId: string }
 *
 * Response: {
 *   first_step: string       — the single most concrete next action
 *   why: string              — why this approach, given their history
 *   similar_tasks: string[]  — titles of similar completed tasks (social proof)
 *   has_history: boolean     — false if no embeddings exist yet
 * }
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskRow {
  id: string;
  title: string;
  priority: number;
  due_date: string | null;
  estimated_minutes: number | null;
  status: string;
  goal_id: string | null;
  goals: { title: string; type: string } | null;
}

interface SimilarTask {
  content: string;
  similarity: number;
}

interface UserPatterns {
  tasks_completed_last_7d: number;
  tasks_completed_last_30d: number;
  overdue_rate_pct: number;
  top_reschedule_reason: string | null;
  avg_reschedules_per_task: number;
  active_task_count: number;
  active_goal_count: number;
}

interface HelpResponse {
  first_step: string;
  why: string;
  similar_tasks: string[];
  has_history: boolean;
}

async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
  const json = await res.json() as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!openaiKey) throw new Error('OPENAI_API_KEY not set');
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not set');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const { taskId, userId } = await req.json() as { taskId: string; userId: string };
    if (!taskId || !userId) throw new Error('taskId and userId are required');

    // ── 1. Fetch the task ──────────────────────────────────────────────────────
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, goals ( title, type )')
      .eq('id', taskId)
      .single();

    if (taskError) throw taskError;
    const typedTask = task as TaskRow;

    // ── 2. RAG: embed query + find similar completed tasks ────────────────────
    const queryText = typedTask.goals
      ? `${typedTask.title} — Goal: ${typedTask.goals.title}`
      : typedTask.title;

    const queryEmbedding = await getEmbedding(queryText, openaiKey);

    // Nearest-neighbor search via pgvector
    const { data: similarRows } = await supabase.rpc('match_task_embeddings', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_user_id: userId,
      match_count: 5,
    }) as { data: SimilarTask[] | null };

    const similarTasks = similarRows ?? [];
    const hasHistory = similarTasks.length > 0;

    // ── 3. Fetch user patterns ────────────────────────────────────────────────
    const { data: patterns } = await supabase
      .from('user_patterns')
      .select('*')
      .eq('user_id', userId)
      .single();

    const typedPatterns = patterns as UserPatterns | null;

    // ── 4. Build Claude prompt ────────────────────────────────────────────────
    const priorityLabel = typedTask.priority === 1 ? 'high' : typedTask.priority === 2 ? 'medium' : 'low';
    const isOverdue = typedTask.due_date && new Date(typedTask.due_date) < new Date();

    let systemPrompt = `You are RELENTLESS, an AI accountability engine for high-performing CEOs and founders. You are direct, concrete, and brief. You never give generic advice. You always recommend a single specific next action.`;

    let userPrompt = `The user is stuck or asking for help on this task:\n\nTask: "${typedTask.title}"\nPriority: ${priorityLabel}\n${isOverdue ? 'Status: OVERDUE\n' : ''}`;

    if (typedTask.goals) {
      userPrompt += `Goal: "${typedTask.goals.title}" (${typedTask.goals.type})\n`;
    }

    if (typedTask.estimated_minutes) {
      userPrompt += `Estimated effort: ${typedTask.estimated_minutes} minutes\n`;
    }

    if (hasHistory && similarTasks.length > 0) {
      userPrompt += `\nSimilar tasks they've completed before:\n`;
      for (const t of similarTasks.slice(0, 3)) {
        userPrompt += `- ${t.content}\n`;
      }
    }

    if (typedPatterns) {
      userPrompt += `\nUser context:\n`;
      userPrompt += `- ${typedPatterns.tasks_completed_last_7d} tasks completed this week\n`;
      userPrompt += `- ${typedPatterns.overdue_rate_pct}% of active tasks are overdue\n`;
      if (typedPatterns.top_reschedule_reason) {
        userPrompt += `- Most common reason for rescheduling: "${typedPatterns.top_reschedule_reason}"\n`;
      }
    }

    userPrompt += `\nRespond with a JSON object using this exact structure:
{
  "first_step": "One sentence. The single most concrete action to take right now.",
  "why": "One sentence. Why this approach, grounded in their history or situation.",
  "similar_tasks": ["title of past similar task 1", "title of past similar task 2"]
}

Only include similar_tasks if you have real history to reference. Keep first_step and why under 20 words each. Be direct.`;

    // ── 5. Call Claude with tool_use to force structured output ───────────────
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [{
        name: 'provide_help',
        description: 'Provide structured help for a stuck task',
        input_schema: {
          type: 'object' as const,
          properties: {
            first_step: {
              type: 'string',
              description: 'The single most concrete next action, one sentence',
            },
            why: {
              type: 'string',
              description: 'Why this approach, grounded in context, one sentence',
            },
            similar_tasks: {
              type: 'array',
              items: { type: 'string' },
              description: 'Titles of similar past completed tasks (max 3)',
            },
          },
          required: ['first_step', 'why', 'similar_tasks'],
        },
      }],
      tool_choice: { type: 'tool', name: 'provide_help' },
    });

    const toolUse = response.content.find((c) => c.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Claude did not return tool_use');
    }

    const result = toolUse.input as { first_step: string; why: string; similar_tasks: string[] };

    const helpResponse: HelpResponse = {
      first_step: result.first_step,
      why: result.why,
      similar_tasks: result.similar_tasks ?? [],
      has_history: hasHistory,
    };

    return new Response(JSON.stringify(helpResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[help-me]', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

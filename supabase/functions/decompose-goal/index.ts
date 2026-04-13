import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a goal decomposition engine for RELENTLESS, an AI accountability system for high-performing executives and founders.

Your job: break down a goal into a concrete, time-bound project plan the user can actually execute. No fluff.

Rules:
- Create 1–3 projects (phases or milestones). More than 3 is usually a sign of unclear thinking.
- Each project has 3–8 specific, actionable tasks.
- Task titles must be precise — not "Research competitors" but "List top 5 competitors with their pricing and one key differentiator for each in a spreadsheet."
- Due dates must be realistic. Distribute work across the available time — don't backload everything.
- Estimated minutes should be honest. Tasks always take longer than expected.
- Priority 1 = critical path (this must not slip or the goal fails), 2 = important, 3 = standard, 4 = nice-to-have.
- If the user has other active goals, note any scheduling conflicts or dependencies.
- The first task in each project should be something the user can start immediately.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Supabase client scoped to the requesting user (RLS enforced)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { goalId } = await req.json();
    if (!goalId) throw new Error('goalId is required');

    // Fetch the goal (RLS ensures it belongs to the requesting user)
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();
    if (goalError) throw goalError;

    // Fetch other active goals for scheduling context
    const { data: otherGoals } = await supabase
      .from('goals')
      .select('title, target_date, goal_type')
      .eq('status', 'active')
      .neq('id', goalId)
      .limit(5);

    const today = new Date().toISOString().split('T')[0];

    const otherGoalsContext =
      otherGoals && otherGoals.length > 0
        ? `\n\nThe user's other active goals (for scheduling context):\n${otherGoals
            .map((g) => `- "${g.title}" (${g.goal_type}, due ${g.target_date})`)
            .join('\n')}`
        : '';

    const userMessage = `Break down this goal into a concrete project plan.

Goal: ${goal.title}
Type: ${goal.goal_type}
${goal.description ? `Why it matters: ${goal.description}` : ''}
Target date: ${goal.target_date}
Today: ${today}
${otherGoalsContext}

Create a realistic, specific plan I can start executing today.`;

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: 'create_plan',
          description: 'Output the structured project plan for the goal.',
          input_schema: {
            type: 'object' as const,
            required: ['summary', 'projects'],
            properties: {
              summary: {
                type: 'string',
                description: 'A 1–2 sentence overview of the plan and the key bet being made.',
              },
              projects: {
                type: 'array',
                minItems: 1,
                maxItems: 3,
                items: {
                  type: 'object',
                  required: ['title', 'target_date', 'tasks'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    target_date: {
                      type: 'string',
                      description: 'YYYY-MM-DD. Must be on or before the goal target date.',
                    },
                    tasks: {
                      type: 'array',
                      minItems: 2,
                      maxItems: 10,
                      items: {
                        type: 'object',
                        required: ['title', 'due_date', 'priority'],
                        properties: {
                          title: {
                            type: 'string',
                            description: 'Specific and actionable. Tells the user exactly what to do.',
                          },
                          description: {
                            type: 'string',
                            description: 'Optional clarification or first step.',
                          },
                          due_date: {
                            type: 'string',
                            description: 'YYYY-MM-DD.',
                          },
                          estimated_minutes: {
                            type: 'integer',
                            minimum: 5,
                            description: 'Realistic estimate. Most tasks take longer than expected.',
                          },
                          priority: {
                            type: 'integer',
                            enum: [1, 2, 3, 4],
                            description: '1=critical path, 2=important, 3=standard, 4=nice-to-have',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'create_plan' },
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract the structured plan from tool use
    const toolUse = response.content.find((c) => c.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Claude did not return a structured plan');
    }

    const plan = toolUse.input as {
      summary: string;
      projects: Array<{
        title: string;
        description?: string;
        target_date: string;
        tasks: Array<{
          title: string;
          description?: string;
          due_date: string;
          estimated_minutes?: number;
          priority: 1 | 2 | 3 | 4;
        }>;
      }>;
    };

    // Save draft to goal metadata so the review screen can fetch it
    await supabase
      .from('goals')
      .update({ ai_breakdown_metadata: plan })
      .eq('id', goalId);

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

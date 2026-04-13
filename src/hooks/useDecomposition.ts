import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { DecompositionResult, DecomposedProject } from '@/types/decomposition';

// ── Trigger AI decomposition via Edge Function ─────────────────────────────────
export function useDecomposeGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string): Promise<DecompositionResult> => {
      const { data, error } = await supabase.functions.invoke('decompose-goal', {
        body: { goalId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as DecompositionResult;
    },
    onSuccess: (_data, goalId) => {
      // Invalidate goal so review screen gets fresh ai_breakdown_metadata
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
    },
  });
}

// ── Approve decomposition — bulk create projects + tasks ───────────────────────
export function useApproveDecomposition() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({
      goalId,
      projects,
    }: {
      goalId: string;
      projects: DecomposedProject[];
    }) => {
      if (!userId) throw new Error('Not authenticated');

      for (const project of projects) {
        // Insert the project
        const { data: createdProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            goal_id: goalId,
            user_id: userId,
            title: project.title,
            description: project.description ?? null,
            target_date: project.target_date,
            status: 'active',
          })
          .select('id')
          .single();

        if (projectError) throw projectError;

        // Insert all tasks for this project
        const taskInserts = project.tasks.map((task) => ({
          user_id: userId,
          goal_id: goalId,
          project_id: createdProject.id,
          title: task.title,
          description: task.description ?? null,
          due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
          estimated_minutes: task.estimated_minutes ?? null,
          priority: task.priority,
          status: 'not_started' as const,
        }));

        const { error: tasksError } = await supabase.from('tasks').insert(taskInserts);
        if (tasksError) throw tasksError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

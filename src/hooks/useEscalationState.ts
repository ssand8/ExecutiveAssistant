import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export type EscalationLevel = 0 | 1 | 2 | 3 | 4;

export interface EscalationState {
  id: string;
  task_id: string;
  level: EscalationLevel;
  nudge_count: number;
  last_nudge_at: string | null;
  level_4_at: string | null;
  resolved_at: string | null;
}

// Fetch escalation state for a single task
export function useTaskEscalationState(taskId: string | undefined) {
  return useQuery({
    queryKey: ['escalation', taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<EscalationState | null> => {
      if (!taskId) return null;
      const { data, error } = await supabase
        .from('escalation_state')
        .select('*')
        .eq('task_id', taskId)
        .is('resolved_at', null)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...data, level: parseInt(data.level) as EscalationLevel };
    },
    staleTime: 60_000,
  });
}

// Fetch ALL unresolved level-4 tasks for the current user (drives the blocked screen)
export function useBlockedTasks() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['escalation', 'blocked', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('escalation_state')
        .select(`
          id,
          task_id,
          level,
          level_4_at,
          nudge_count,
          tasks ( id, title, due_date, goal_id, goals ( title ) )
        `)
        .eq('user_id', userId)
        .eq('level', '4')
        .is('resolved_at', null);
      if (error) throw error;
      return data ?? [];
    },
    // Poll every 2 minutes so the blocked screen reflects new sweeps
    refetchInterval: 2 * 60 * 1000,
  });
}

// Resolve escalation state (called after forced response or task completion)
export function useResolveEscalation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (escalationStateId: string) => {
      const { error } = await supabase
        .from('escalation_state')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', escalationStateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

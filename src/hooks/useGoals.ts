import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Tables, TablesInsert } from '@/types/database';

export type Goal = Tables<'goals'>;
export type GoalInsert = TablesInsert<'goals'>;

export function useGoals() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['goals', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('status', 'active')
        .order('target_date', { ascending: true });
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!userId,
  });
}

export interface GoalProgress {
  goalId: string;
  total: number;
  completed: number;
  pct: number;
}

export function useGoalProgress(goalId: string | undefined) {
  return useQuery({
    queryKey: ['goal-progress', goalId],
    enabled: !!goalId,
    queryFn: async (): Promise<GoalProgress> => {
      if (!goalId) return { goalId: '', total: 0, completed: 0, pct: 0 };
      const { data, error } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('goal_id', goalId);
      if (error) throw error;
      const tasks = data ?? [];
      const total = tasks.length;
      const completed = tasks.filter((t) => t.status === 'complete').length;
      return {
        goalId,
        total,
        completed,
        pct: total === 0 ? 0 : Math.round((completed / total) * 100),
      };
    },
    staleTime: 60_000,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (input: Omit<GoalInsert, 'user_id'>) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...input, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

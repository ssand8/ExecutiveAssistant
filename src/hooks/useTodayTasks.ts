import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Tables } from '@/types/database';

export type Task = Tables<'tasks'>;

export type TaskWithGoal = Task & {
  goals: { title: string } | null;
};

export function useTodayTasks() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['tasks', 'today', userId],
    queryFn: async () => {
      // End of today in local time (ISO string)
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('tasks')
        .select('*, goals(title)')
        .lte('due_date', endOfToday.toISOString())
        .not('status', 'in', '("complete","cancelled")')
        .order('priority', { ascending: true })
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as TaskWithGoal[];
    },
    enabled: !!userId,
    refetchInterval: 60_000, // refresh every minute so escalation state stays fresh
  });
}

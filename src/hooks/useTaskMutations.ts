import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { TablesInsert } from '@/types/database';

type TaskInsert = TablesInsert<'tasks'>;
type CheckInInsert = TablesInsert<'task_check_ins'>;

export const RESCHEDULE_REASONS = [
  'Did not have time',
  'Blocked by dependency',
  'Scope was bigger than expected',
  'Deprioritized',
  'Forgot',
  'Custom reason…',
] as const;

export type RescheduleReason = (typeof RESCHEDULE_REASONS)[number];

// ── Create task ────────────────────────────────────────────────────────────────
export function useCreateTask() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (input: Omit<TaskInsert, 'user_id'>) => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...input, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// ── Complete task ──────────────────────────────────────────────────────────────
export function useCompleteTask() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!userId) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'complete' })
        .eq('id', taskId);
      if (updateError) throw updateError;

      const checkIn: CheckInInsert = {
        task_id: taskId,
        user_id: userId,
        action: 'complete',
        new_status: 'complete',
      };
      await supabase.from('task_check_ins').insert(checkIn);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// ── Snooze task (push due date by 1 hour) ─────────────────────────────────────
export function useSnoozeTask() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ taskId, currentDueDate }: { taskId: string; currentDueDate: string | null }) => {
      if (!userId) throw new Error('Not authenticated');
      const base = currentDueDate ? new Date(currentDueDate) : new Date();
      const newDueDate = new Date(base.getTime() + 60 * 60 * 1000).toISOString();

      const { error: updateError } = await supabase
        .from('tasks')
        .update({ due_date: newDueDate })
        .eq('id', taskId);
      if (updateError) throw updateError;

      const checkIn: CheckInInsert = {
        task_id: taskId,
        user_id: userId,
        action: 'snooze',
        previous_due_date: currentDueDate ?? undefined,
        new_due_date: newDueDate,
      };
      await supabase.from('task_check_ins').insert(checkIn);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// ── Reschedule task (requires reason) ─────────────────────────────────────────
export function useRescheduleTask() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({
      taskId,
      currentDueDate,
      newDueDate,
      reason,
    }: {
      taskId: string;
      currentDueDate: string | null;
      newDueDate: string;
      reason: string;
    }) => {
      if (!userId) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('tasks')
        .update({ due_date: newDueDate })
        .eq('id', taskId);
      if (updateError) throw updateError;

      const checkIn: CheckInInsert = {
        task_id: taskId,
        user_id: userId,
        action: 'reschedule',
        previous_due_date: currentDueDate ?? undefined,
        new_due_date: newDueDate,
        reschedule_reason: reason,
      };
      await supabase.from('task_check_ins').insert(checkIn);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

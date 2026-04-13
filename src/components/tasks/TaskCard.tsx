import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { GoalBadge } from '@/components/goals/GoalBadge';
import { RescheduleModal } from '@/components/tasks/RescheduleModal';
import { useCompleteTask, useSnoozeTask, useRescheduleTask } from '@/hooks/useTaskMutations';
import type { TaskWithGoal } from '@/hooks/useTodayTasks';

interface TaskCardProps {
  task: TaskWithGoal;
  onPress: () => void;
}

function formatDueTime(due: string | null): { label: string; isOverdue: boolean } {
  if (!due) return { label: 'No due time', isOverdue: false };
  const date = new Date(due);
  const now = new Date();
  const isOverdue = date < now;

  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (isOverdue) {
    const diffMs = now.getTime() - date.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffH >= 24) return { label: `${Math.floor(diffH / 24)}d overdue`, isOverdue: true };
    if (diffH > 0) return { label: `${diffH}h overdue`, isOverdue: true };
    return { label: `${diffM}m overdue`, isOverdue: true };
  }

  return { label: isToday ? timeStr : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isOverdue: false };
}

function priorityColor(priority: number): string {
  if (priority === 1) return Colors.danger;
  if (priority === 2) return Colors.warning;
  return Colors.textTertiary;
}

export function TaskCard({ task, onPress }: TaskCardProps) {
  const [showReschedule, setShowReschedule] = useState(false);
  const { label: dueLabel, isOverdue } = formatDueTime(task.due_date);

  const complete = useCompleteTask();
  const snooze = useSnoozeTask();
  const reschedule = useRescheduleTask();

  function handleComplete() {
    complete.mutate(task.id);
  }

  function handleSnooze() {
    snooze.mutate({ taskId: task.id, currentDueDate: task.due_date });
  }

  function handleRescheduleConfirm(newDueDate: string, reason: string) {
    reschedule.mutate(
      { taskId: task.id, currentDueDate: task.due_date, newDueDate, reason },
      { onSuccess: () => setShowReschedule(false) }
    );
  }

  const isMutating = complete.isPending || snooze.isPending;

  return (
    <>
      <TouchableOpacity
        style={[styles.card, isOverdue && styles.cardOverdue]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {/* Priority bar */}
        <View style={[styles.priorityBar, { backgroundColor: priorityColor(task.priority) }]} />

        <View style={styles.body}>
          {/* Goal badge */}
          {task.goals && <GoalBadge title={task.goals.title} />}

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>{task.title}</Text>

          {/* Meta row */}
          <View style={styles.meta}>
            <View style={styles.metaLeft}>
              <Ionicons
                name="time-outline"
                size={12}
                color={isOverdue ? Colors.danger : Colors.textTertiary}
              />
              <Text style={[styles.metaText, isOverdue && styles.metaOverdue]}>
                {dueLabel}
              </Text>
              {task.estimated_minutes && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>~{task.estimated_minutes}m</Text>
                </>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={handleComplete}
              disabled={isMutating}
            >
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.completeBtnText}>Done</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleSnooze}
              disabled={isMutating}
            >
              <Ionicons name="alarm-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.actionBtnText}>+1h</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowReschedule(true)}
              disabled={isMutating}
            >
              <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.actionBtnText}>Reschedule</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
              <Ionicons name="flash-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.actionBtnText}>Help</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      <RescheduleModal
        task={task}
        visible={showReschedule}
        onClose={() => setShowReschedule(false)}
        onConfirm={handleRescheduleConfirm}
        loading={reschedule.isPending}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
  },
  cardOverdue: {
    borderColor: Colors.danger + '55',
    backgroundColor: '#1a0e0e',
  },
  priorityBar: {
    width: 3,
  },
  body: {
    flex: 1,
    padding: Layout.cardPadding,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  metaOverdue: {
    color: Colors.danger,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  completeBtn: {
    backgroundColor: Colors.success + '22',
    borderColor: Colors.success + '55',
  },
  actionBtnText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  completeBtnText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
});

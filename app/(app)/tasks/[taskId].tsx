import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { supabase } from '@/lib/supabase';
import type { TaskWithGoal } from '@/hooks/useTodayTasks';

function useTask(taskId: string) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, goals(title)')
        .eq('id', taskId)
        .single();
      if (error) throw error;
      return data as TaskWithGoal;
    },
  });
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  complete: 'Complete',
  cancelled: 'Cancelled',
};

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const { data: task, isLoading } = useTask(taskId);

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      </Screen>
    );
  }

  if (!task) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Task not found.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>Task</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {task.goals && (
          <View style={styles.goalBadge}>
            <Ionicons name="flag" size={12} color={Colors.textTertiary} />
            <Text style={styles.goalText}>{task.goals.title}</Text>
          </View>
        )}

        <Text style={styles.title}>{task.title}</Text>

        {task.description && (
          <Text style={styles.description}>{task.description}</Text>
        )}

        <View style={styles.metaGrid}>
          <MetaRow icon="ellipse" label="Status" value={STATUS_LABELS[task.status] ?? task.status} />
          <MetaRow
            icon="time-outline"
            label="Due"
            value={
              task.due_date
                ? new Date(task.due_date).toLocaleString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })
                : 'No due date'
            }
          />
          {task.estimated_minutes && (
            <MetaRow icon="hourglass-outline" label="Estimate" value={`${task.estimated_minutes} min`} />
          )}
          {task.actual_minutes && (
            <MetaRow icon="checkmark-done-outline" label="Actual" value={`${task.actual_minutes} min`} />
          )}
        </View>

        {/* Help me — placeholder for Phase 3 */}
        <View style={styles.helpPlaceholder}>
          <Ionicons name="flash-outline" size={20} color={Colors.textTertiary} />
          <Text style={styles.helpText}>
            "Help me" — AI assistance coming in Phase 3
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function MetaRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon as any} size={14} color={Colors.textTertiary} />
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: Colors.danger, fontSize: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  content: { flex: 1 },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  goalText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 32,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  metaGrid: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Layout.cardPadding,
    gap: 14,
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaLabel: {
    fontSize: 13,
    color: Colors.textTertiary,
    width: 70,
  },
  metaValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  helpPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Layout.cardPadding,
  },
  helpText: {
    fontSize: 14,
    color: Colors.textTertiary,
    flex: 1,
  },
});

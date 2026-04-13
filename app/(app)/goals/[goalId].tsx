import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { supabase } from '@/lib/supabase';
import { useDecomposeGoal } from '@/hooks/useDecomposition';
import type { Goal } from '@/hooks/useGoals';
import type { Task } from '@/hooks/useTodayTasks';

function useGoalDetail(goalId: string) {
  return useQuery({
    queryKey: ['goal', goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();
      if (error) throw error;
      return data as Goal;
    },
  });
}

function useGoalTasks(goalId: string) {
  return useQuery({
    queryKey: ['tasks', 'goal', goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', goalId)
        .not('status', 'in', '("complete","cancelled")')
        .order('priority', { ascending: true })
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
  });
}

const STATUS_COLOR: Record<string, string> = {
  active: Colors.onTrack,
  complete: Colors.success,
  cancelled: Colors.textTertiary,
};

export default function GoalDetailScreen() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const { data: goal, isLoading } = useGoalDetail(goalId);
  const { data: tasks } = useGoalTasks(goalId);
  const decompose = useDecomposeGoal();

  const hasExistingPlan = goal?.ai_breakdown_metadata != null;
  const hasTasks = tasks && tasks.length > 0;

  async function handleGeneratePlan() {
    if (hasExistingPlan || hasTasks) {
      Alert.alert(
        'Regenerate Plan?',
        'This will replace the existing AI plan. Tasks you already created will remain.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Regenerate', style: 'destructive', onPress: runDecompose },
        ]
      );
    } else {
      runDecompose();
    }
  }

  function runDecompose() {
    decompose.mutate(goalId, {
      onSuccess: () => {
        router.push(`/(app)/goals/${goalId}/review`);
      },
      onError: (err) => {
        Alert.alert('Error', err.message ?? 'Failed to generate plan. Check your connection and try again.');
      },
    });
  }

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      </Screen>
    );
  }

  if (!goal) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Goal not found.</Text>
        </View>
      </Screen>
    );
  }

  const targetDate = new Date(goal.target_date).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>Goal</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.meta}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[goal.status] ?? Colors.textTertiary }]} />
          <Text style={styles.goalType}>{goal.goal_type.charAt(0).toUpperCase() + goal.goal_type.slice(1)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.targetDate}>Due {targetDate}</Text>
        </View>

        <Text style={styles.title}>{goal.title}</Text>

        {goal.description && (
          <Text style={styles.description}>{goal.description}</Text>
        )}

        {/* AI Plan Section */}
        <View style={styles.planSection}>
          {decompose.isPending ? (
            <View style={styles.generatingState}>
              <ActivityIndicator color={Colors.accent} size="small" />
              <Text style={styles.generatingText}>
                Claude is breaking down your goal…
              </Text>
            </View>
          ) : (
            <>
              <Button
                label={hasExistingPlan ? '✦ View / Regenerate Plan' : '✦ Generate Plan with AI'}
                onPress={hasExistingPlan ? () => router.push(`/(app)/goals/${goalId}/review`) : handleGeneratePlan}
                variant={hasExistingPlan ? 'secondary' : 'primary'}
                style={styles.planButton}
              />
              {!hasExistingPlan && !hasTasks && (
                <Text style={styles.planHint}>
                  Claude will break this goal into projects, tasks, and realistic due dates.
                </Text>
              )}
              {!hasExistingPlan && (
                <TouchableOpacity onPress={handleGeneratePlan} style={styles.regenerateLink}>
                  {hasExistingPlan && <Text style={styles.regenerateLinkText}>Regenerate plan</Text>}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Tasks section */}
        <View style={styles.tasksHeader}>
          <Text style={styles.sectionTitle}>
            Tasks {tasks ? `(${tasks.length})` : ''}
          </Text>
          <TouchableOpacity
            style={styles.addTaskBtn}
            onPress={() => router.push('/(app)/tasks/new')}
          >
            <Ionicons name="add" size={16} color={Colors.accent} />
            <Text style={styles.addTaskText}>Add Task</Text>
          </TouchableOpacity>
        </View>

        {tasks && tasks.length === 0 && (
          <View style={styles.emptyTasks}>
            <Text style={styles.emptyTasksText}>No tasks yet.</Text>
            <Text style={styles.emptyTasksSubtext}>
              Generate an AI plan above or add tasks manually.
            </Text>
          </View>
        )}

        {tasks?.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={styles.taskRow}
            onPress={() => router.push(`/(app)/tasks/${task.id}`)}
          >
            <View style={styles.taskRowLeft}>
              <View style={[styles.priorityDot, {
                backgroundColor: task.priority === 1 ? Colors.danger
                  : task.priority === 2 ? Colors.warning
                  : Colors.textTertiary,
              }]} />
              <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
            </View>
            {task.due_date && (
              <Text style={styles.taskDue}>
                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            )}
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
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
  headerLabel: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  goalType: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  metaDot: { fontSize: 13, color: Colors.textTertiary },
  targetDate: { fontSize: 13, color: Colors.textTertiary },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 34,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  planSection: {
    marginBottom: 32,
  },
  planButton: {
    width: '100%',
  },
  planHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  regenerateLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  regenerateLinkText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  generatingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  generatingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  addTaskBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addTaskText: { fontSize: 14, color: Colors.accent, fontWeight: '600' },
  emptyTasks: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyTasksText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  emptyTasksSubtext: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', lineHeight: 18 },
  taskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  taskRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  taskDue: { fontSize: 12, color: Colors.textTertiary, marginLeft: 8 },
});

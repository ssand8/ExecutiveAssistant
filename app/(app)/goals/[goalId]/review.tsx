import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { supabase } from '@/lib/supabase';
import { useDecomposeGoal, useApproveDecomposition } from '@/hooks/useDecomposition';
import type { DecomposedProject, DecomposedTask } from '@/types/decomposition';
import type { Goal } from '@/hooks/useGoals';

function useGoalWithPlan(goalId: string) {
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

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'P1', color: Colors.danger },
  2: { label: 'P2', color: Colors.warning },
  3: { label: 'P3', color: Colors.textSecondary },
  4: { label: 'P4', color: Colors.textTertiary },
};

function TaskRow({
  task,
  onRemove,
  onEditTitle,
}: {
  task: DecomposedTask;
  onRemove: () => void;
  onEditTitle: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const p = PRIORITY_LABELS[task.priority] ?? PRIORITY_LABELS[3];

  return (
    <View style={styles.taskRow}>
      <View style={[styles.priorityPill, { borderColor: p.color + '66' }]}>
        <Text style={[styles.priorityPillText, { color: p.color }]}>{p.label}</Text>
      </View>

      {editing ? (
        <TextInput
          style={styles.taskTitleInput}
          value={task.title}
          onChangeText={onEditTitle}
          onBlur={() => setEditing(false)}
          autoFocus
          multiline
        />
      ) : (
        <TouchableOpacity style={styles.taskTitleContainer} onPress={() => setEditing(true)}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          {task.due_date && (
            <Text style={styles.taskDue}>
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {task.estimated_minutes ? ` · ~${task.estimated_minutes}m` : ''}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
        <Ionicons name="close" size={16} color={Colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

export default function DecompositionReviewScreen() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const { data: goal, isLoading } = useGoalWithPlan(goalId);
  const decompose = useDecomposeGoal();
  const approve = useApproveDecomposition();

  const rawPlan = goal?.ai_breakdown_metadata as {
    summary?: string;
    projects?: DecomposedProject[];
  } | null;

  const [projects, setProjects] = useState<DecomposedProject[] | null>(null);

  // Initialize local editable state from the fetched plan
  const editableProjects =
    projects ?? (rawPlan?.projects ? JSON.parse(JSON.stringify(rawPlan.projects)) : null);

  function removeTask(projectIdx: number, taskIdx: number) {
    const next = JSON.parse(JSON.stringify(editableProjects)) as DecomposedProject[];
    next[projectIdx].tasks.splice(taskIdx, 1);
    setProjects(next);
  }

  function editTaskTitle(projectIdx: number, taskIdx: number, title: string) {
    const next = JSON.parse(JSON.stringify(editableProjects)) as DecomposedProject[];
    next[projectIdx].tasks[taskIdx].title = title;
    setProjects(next);
  }

  function handleApprove() {
    if (!editableProjects) return;
    const totalTasks = editableProjects.reduce((sum: number, p: DecomposedProject) => sum + p.tasks.length, 0);
    Alert.alert(
      'Create Plan',
      `This will create ${editableProjects.length} project${editableProjects.length !== 1 ? 's' : ''} and ${totalTasks} task${totalTasks !== 1 ? 's' : ''}. Ready?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: () => {
            approve.mutate(
              { goalId, projects: editableProjects },
              {
                onSuccess: () => {
                  router.replace(`/(app)/goals/${goalId}`);
                },
                onError: (err) => {
                  Alert.alert('Error', err.message ?? 'Failed to create plan.');
                },
              }
            );
          },
        },
      ]
    );
  }

  function handleRegenerate() {
    Alert.alert('Regenerate Plan?', 'Claude will create a new plan. Your edits here will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate',
        style: 'destructive',
        onPress: () => {
          setProjects(null);
          decompose.mutate(goalId, {
            onError: (err) => Alert.alert('Error', err.message),
          });
        },
      },
    ]);
  }

  if (isLoading || decompose.isPending) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingTitle}>
            {decompose.isPending ? 'Generating your plan…' : 'Loading…'}
          </Text>
          {decompose.isPending && (
            <Text style={styles.loadingSubtext}>
              Claude is breaking down your goal into specific, time-bound tasks.
            </Text>
          )}
        </View>
      </Screen>
    );
  }

  if (!editableProjects) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.errorText}>No plan found. Go back and generate one.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const totalTasks = editableProjects.reduce((sum: number, p: DecomposedProject) => sum + p.tasks.length, 0);

  return (
    <Screen padded={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Plan</Text>
        <TouchableOpacity onPress={handleRegenerate} disabled={decompose.isPending}>
          <Text style={styles.regenerateText}>Redo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Goal name */}
        {goal && <Text style={styles.goalName}>{goal.title}</Text>}

        {/* AI summary */}
        {rawPlan?.summary && (
          <View style={styles.summaryCard}>
            <Ionicons name="flash" size={14} color={Colors.accent} />
            <Text style={styles.summaryText}>{rawPlan.summary}</Text>
          </View>
        )}

        <Text style={styles.hint}>
          Tap any task to edit its title. Tap × to remove it. Then approve to create everything.
        </Text>

        {/* Projects */}
        {editableProjects.map((project: DecomposedProject, pIdx: number) => (
          <View key={pIdx} style={styles.projectBlock}>
            <View style={styles.projectHeader}>
              <Text style={styles.projectTitle}>{project.title}</Text>
              <Text style={styles.projectDate}>
                by {new Date(project.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            {project.description && (
              <Text style={styles.projectDescription}>{project.description}</Text>
            )}
            {project.tasks.map((task: DecomposedTask, tIdx: number) => (
              <TaskRow
                key={tIdx}
                task={task}
                onRemove={() => removeTask(pIdx, tIdx)}
                onEditTitle={(title) => editTaskTitle(pIdx, tIdx, title)}
              />
            ))}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerCount}>
            {editableProjects.length} project{editableProjects.length !== 1 ? 's' : ''} · {totalTasks} task{totalTasks !== 1 ? 's' : ''}
          </Text>
          <Button
            label="Approve & Create Plan"
            onPress={handleApprove}
            loading={approve.isPending}
            disabled={totalTasks === 0}
            style={styles.approveButton}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  backLink: { fontSize: 15, color: Colors.accent },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerBack: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  regenerateText: { fontSize: 15, color: Colors.textSecondary },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  goalName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    lineHeight: 30,
  },
  summaryCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.accentMuted,
    borderRadius: Layout.cardRadius,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    padding: 14,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 21,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 20,
    lineHeight: 18,
  },
  projectBlock: {
    marginBottom: 24,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  projectTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  projectDate: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginLeft: 8,
  },
  projectDescription: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginBottom: 10,
    lineHeight: 18,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 6,
  },
  priorityPill: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 1,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  taskTitleContainer: { flex: 1, gap: 3 },
  taskTitle: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  taskDue: { fontSize: 11, color: Colors.textTertiary },
  taskTitleInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent,
    paddingVertical: 2,
  },
  removeBtn: { padding: 2, marginTop: 2 },
  footer: {
    marginTop: 8,
    gap: 10,
  },
  footerCount: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  approveButton: { width: '100%' },
});

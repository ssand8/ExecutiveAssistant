import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { useCreateTask } from '@/hooks/useTaskMutations';
import { useGoals } from '@/hooks/useGoals';

const PRIORITIES = [
  { value: 1, label: 'P1', color: Colors.danger },
  { value: 2, label: 'P2', color: Colors.warning },
  { value: 3, label: 'P3', color: Colors.textSecondary },
  { value: 4, label: 'P4', color: Colors.textTertiary },
] as const;

export default function NewTaskScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(2);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState('');

  const { data: goals } = useGoals();
  const createTask = useCreateTask();

  async function handleCreate() {
    if (!title.trim()) return;
    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      goal_id: selectedGoalId,
      due_date: dueDate?.toISOString() ?? null,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
      status: 'not_started',
    });
    router.back();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Task</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.titleInput}
          placeholder="What needs to get done?"
          placeholderTextColor={Colors.textTertiary}
          value={title}
          onChangeText={setTitle}
          autoFocus
          multiline
          returnKeyType="done"
        />

        <TextInput
          style={styles.input}
          placeholder="Description (optional)"
          placeholderTextColor={Colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* Priority */}
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[
                styles.priorityChip,
                priority === p.value && { backgroundColor: p.color + '33', borderColor: p.color },
              ]}
              onPress={() => setPriority(p.value)}
            >
              <Text style={[styles.priorityChipText, priority === p.value && { color: p.color }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Goal */}
        {goals && goals.length > 0 && (
          <>
            <Text style={styles.label}>Connect to Goal</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalRow}>
              <TouchableOpacity
                style={[styles.goalChip, !selectedGoalId && styles.goalChipSelected]}
                onPress={() => setSelectedGoalId(null)}
              >
                <Text style={[styles.goalChipText, !selectedGoalId && styles.goalChipTextSelected]}>
                  None
                </Text>
              </TouchableOpacity>
              {goals.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.goalChip, selectedGoalId === g.id && styles.goalChipSelected]}
                  onPress={() => setSelectedGoalId(g.id)}
                >
                  <Text
                    style={[styles.goalChipText, selectedGoalId === g.id && styles.goalChipTextSelected]}
                    numberOfLines={1}
                  >
                    {g.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Due date */}
        <Text style={styles.label}>Due Date (optional)</Text>
        <DateTimePicker
          value={dueDate ?? new Date()}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          onChange={(_event, date) => { if (date) setDueDate(date); }}
          themeVariant="dark"
          style={styles.datePicker}
        />

        {/* Estimate */}
        <Text style={styles.label}>Estimated time (minutes)</Text>
        <TextInput
          style={[styles.input, styles.estimateInput]}
          placeholder="e.g. 30"
          placeholderTextColor={Colors.textTertiary}
          value={estimatedMinutes}
          onChangeText={setEstimatedMinutes}
          keyboardType="number-pad"
        />

        <Button
          label="Add Task"
          onPress={handleCreate}
          disabled={!title.trim()}
          loading={createTask.isPending}
          style={styles.submitButton}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },
  cancel: {
    fontSize: 16,
    color: Colors.textSecondary,
    width: 60,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  form: {
    flex: 1,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  input: {
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  priorityChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  priorityChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  goalRow: {
    marginBottom: 20,
  },
  goalChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
    maxWidth: 160,
  },
  goalChipSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentMuted,
  },
  goalChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  goalChipTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  datePicker: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  estimateInput: {
    width: 120,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 40,
  },
});

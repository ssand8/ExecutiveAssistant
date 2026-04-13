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
import { useCreateGoal } from '@/hooks/useGoals';

const GOAL_TYPES = [
  { value: 'annual', label: 'Annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'project', label: 'Project' },
] as const;

type GoalType = (typeof GOAL_TYPES)[number]['value'];

// Default target: 90 days out
function defaultTargetDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d;
}

export default function NewGoalScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('quarterly');
  const [targetDate, setTargetDate] = useState(defaultTargetDate());

  const createGoal = useCreateGoal();

  async function handleCreate() {
    if (!title.trim()) return;
    const goal = await createGoal.mutateAsync({
      title: title.trim(),
      description: description.trim() || null,
      goal_type: goalType,
      target_date: targetDate.toISOString().split('T')[0], // date only
      status: 'active',
    });
    // Navigate to the goal detail where tasks can be added
    // In M1.3 this will trigger AI decomposition
    router.replace(`/(app)/goals/${goal.id}`);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Goal</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.titleInput}
          placeholder="What do you want to achieve?"
          placeholderTextColor={Colors.textTertiary}
          value={title}
          onChangeText={setTitle}
          autoFocus
          multiline
        />

        <TextInput
          style={styles.input}
          placeholder="Why does this matter? (optional)"
          placeholderTextColor={Colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* Goal type */}
        <Text style={styles.label}>Goal Type</Text>
        <View style={styles.typeRow}>
          {GOAL_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeChip, goalType === t.value && styles.typeChipSelected]}
              onPress={() => setGoalType(t.value)}
            >
              <Text style={[styles.typeChipText, goalType === t.value && styles.typeChipTextSelected]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Target date */}
        <Text style={styles.label}>Target Date</Text>
        <DateTimePicker
          value={targetDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={new Date()}
          onChange={(_event, date) => { if (date) setTargetDate(date); }}
          themeVariant="dark"
        />

        <View style={styles.aiNote}>
          <Text style={styles.aiNoteText}>
            💡 After saving, Claude will break this goal into a project plan with tasks and suggested dates. (Coming in M1.3)
          </Text>
        </View>

        <Button
          label="Create Goal"
          onPress={handleCreate}
          disabled={!title.trim()}
          loading={createGoal.isPending}
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
  form: { flex: 1 },
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeChipSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentMuted,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  typeChipTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  aiNote: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginTop: 24,
    marginBottom: 16,
  },
  aiNoteText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  submitButton: {
    marginBottom: 40,
  },
});

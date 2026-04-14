/**
 * Onboarding Step 3 — First Goal
 *
 * Guided goal creation. Simple form — title, type, target date.
 * On complete, marks onboarding_complete = true and routes to Today.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useCreateGoal } from '@/hooks/useGoals';

const GOAL_TYPES = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'product', label: 'Product' },
  { value: 'hiring', label: 'Hiring' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
] as const;

type GoalType = (typeof GOAL_TYPES)[number]['value'];

export default function OnboardingFirstGoal() {
  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('revenue');
  const [targetDate, setTargetDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90); // default 90 days
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [completing, setCompleting] = useState(false);

  const user = useAuthStore((s) => s.user);
  const createGoal = useCreateGoal();

  const canSubmit = title.trim().length >= 3 && !createGoal.isPending && !completing;

  async function handleCreate() {
    if (!canSubmit || !user?.id) return;

    createGoal.mutate(
      {
        title: title.trim(),
        goal_type: goalType,
        target_date: targetDate.toISOString().split('T')[0],
        status: 'active',
      },
      {
        onSuccess: async () => {
          setCompleting(true);
          // Mark onboarding complete
          await supabase
            .from('users')
            .update({ onboarding_complete: true })
            .eq('id', user.id);
          router.replace('/(app)/today');
        },
      },
    );
  }

  async function handleSkip() {
    if (!user?.id) return;
    setCompleting(true);
    await supabase
      .from('users')
      .update({ onboarding_complete: true })
      .eq('id', user.id);
    router.replace('/(app)/today');
  }

  const isLoading = createGoal.isPending || completing;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Step indicator */}
      <View style={styles.steps}>
        <View style={[styles.step, styles.stepDone]} />
        <View style={[styles.step, styles.stepDone]} />
        <View style={[styles.step, styles.stepActive]} />
      </View>

      <Text style={styles.headline}>Set your first goal.</Text>
      <Text style={styles.body}>
        What's the most important outcome you need to achieve right now? Be specific — you'll break it into tasks with AI next.
      </Text>

      {/* Title */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Goal</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Close $500K in ARR by Q3"
          placeholderTextColor={Colors.textTertiary}
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
          returnKeyType="done"
          multiline
          numberOfLines={2}
          autoFocus
        />
      </View>

      {/* Type */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.chips}>
          {GOAL_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.chip, goalType === t.value && styles.chipSelected]}
              onPress={() => setGoalType(t.value)}
            >
              <Text style={[styles.chipText, goalType === t.value && styles.chipTextSelected]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Target date */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Target date</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateBtnText}>
            {targetDate.toLocaleDateString('en-US', {
              weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
            })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={targetDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={(_e, date) => {
              if (date) setTargetDate(date);
              if (Platform.OS !== 'ios') setShowDatePicker(false);
            }}
            themeVariant="dark"
          />
        )}
        {showDatePicker && Platform.OS === 'ios' && (
          <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.pickerDone}>
            <Text style={styles.pickerDoneText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      {createGoal.isError && (
        <Text style={styles.error}>Could not create goal. Try again.</Text>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
          onPress={handleCreate}
          disabled={!canSubmit}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Create Goal and Start</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={isLoading}>
          <Text style={styles.skipText}>Skip — I'll add goals later</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: {
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 52,
    gap: 24,
    flexGrow: 1,
  },
  steps: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  step: { height: 3, flex: 1, backgroundColor: Colors.border, borderRadius: 2 },
  stepDone: { backgroundColor: Colors.success },
  stepActive: { backgroundColor: Colors.accent },
  headline: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  body: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  fieldGroup: { gap: 8 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    minHeight: 56,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: { backgroundColor: Colors.accent + '22', borderColor: Colors.accent },
  chipText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: Colors.accent, fontWeight: '700' },
  dateBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateBtnText: { fontSize: 16, color: Colors.textPrimary },
  pickerDone: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 16 },
  pickerDoneText: { fontSize: 16, color: Colors.accent, fontWeight: '600' },
  error: { fontSize: 13, color: Colors.danger },
  footer: { gap: 12, marginTop: 8 },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipText: { fontSize: 15, color: Colors.textTertiary },
});

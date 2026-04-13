import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { Button } from '@/components/common/Button';
import { RESCHEDULE_REASONS } from '@/hooks/useTaskMutations';
import type { TaskWithGoal } from '@/hooks/useTodayTasks';

interface RescheduleModalProps {
  task: TaskWithGoal;
  visible: boolean;
  onClose: () => void;
  onConfirm: (newDueDate: string, reason: string) => void;
  loading?: boolean;
}

export function RescheduleModal({ task, visible, onClose, onConfirm, loading }: RescheduleModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [newDate, setNewDate] = useState(() => {
    const d = task.due_date ? new Date(task.due_date) : new Date();
    d.setDate(d.getDate() + 1); // default: tomorrow
    return d;
  });

  const isCustom = selectedReason === 'Custom reason…';
  const finalReason = isCustom ? customReason.trim() : (selectedReason ?? '');
  const canSubmit = !!selectedReason && (!isCustom || finalReason.length > 0);

  function handleConfirm() {
    if (!canSubmit) return;
    onConfirm(newDate.toISOString(), finalReason);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Reschedule</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.taskName} numberOfLines={2}>{task.title}</Text>
        <Text style={styles.sectionLabel}>Why are you rescheduling?</Text>

        <ScrollView style={styles.reasons} contentContainerStyle={styles.reasonsContent}>
          {RESCHEDULE_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[styles.reasonRow, selectedReason === reason && styles.reasonRowSelected]}
              onPress={() => setSelectedReason(reason)}
            >
              <View style={[styles.radio, selectedReason === reason && styles.radioSelected]} />
              <Text style={[styles.reasonText, selectedReason === reason && styles.reasonTextSelected]}>
                {reason}
              </Text>
            </TouchableOpacity>
          ))}

          {isCustom && (
            <TextInput
              style={styles.customInput}
              placeholder="Enter reason…"
              placeholderTextColor={Colors.textTertiary}
              value={customReason}
              onChangeText={setCustomReason}
              multiline
              autoFocus
            />
          )}
        </ScrollView>

        <Text style={styles.sectionLabel}>New due date</Text>
        <View style={styles.datePicker}>
          <DateTimePicker
            value={newDate}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={(_event, date) => { if (date) setNewDate(date); }}
            themeVariant="dark"
          />
        </View>

        <View style={styles.footer}>
          <Button
            label="Reschedule"
            onPress={handleConfirm}
            disabled={!canSubmit}
            loading={loading}
            style={styles.submitButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cancel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  taskName: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  reasons: {
    maxHeight: 240,
    marginBottom: 24,
  },
  reasonsContent: {
    gap: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reasonRowSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentMuted,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
  },
  radioSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  reasonText: {
    fontSize: 15,
    color: Colors.textSecondary,
    flex: 1,
  },
  reasonTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  customInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  datePicker: {
    marginBottom: 24,
  },
  footer: {
    paddingBottom: 40,
  },
  submitButton: {
    width: '100%',
  },
});

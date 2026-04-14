/**
 * MissedDeadlineModal
 *
 * Shown when a task reaches escalation level 2+ (overdue).
 * Forces the user to:
 *   1. Pick a reason why it was missed
 *   2. Commit to a new due date
 *
 * On submit it:
 *   - Reschedules the task
 *   - Logs a task_check_in with reason + action = 'reschedule'
 *   - Resolves the escalation state (drops level back to 0)
 */

import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/colors';
import { useRescheduleTask } from '@/hooks/useTaskMutations';
import { useResolveEscalation } from '@/hooks/useEscalationState';

const MISSED_REASONS = [
  'Did not have time',
  'Blocked by dependency',
  'Scope was bigger than expected',
  'Deprioritized',
  'Forgot',
  'External blocker',
  'Intentionally deferred',
] as const;

interface Props {
  visible: boolean;
  taskId: string;
  taskTitle: string;
  currentDueDate: string | null;
  escalationStateId: string;
  onClose: () => void;
}

export function MissedDeadlineModal({
  visible,
  taskId,
  taskTitle,
  currentDueDate,
  escalationStateId,
  onClose,
}: Props) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [newDate, setNewDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);

  const reschedule = useRescheduleTask();
  const resolve = useResolveEscalation();

  const isLoading = reschedule.isPending || resolve.isPending;
  const canSubmit = !!selectedReason && !isLoading;

  async function handleSubmit() {
    if (!canSubmit) return;

    reschedule.mutate(
      {
        taskId,
        currentDueDate,
        newDueDate: newDate.toISOString(),
        reason: selectedReason!,
      },
      {
        onSuccess: () => {
          resolve.mutate(escalationStateId, {
            onSuccess: () => {
              onClose();
              setSelectedReason(null);
            },
          });
        },
      },
    );
  }

  const hoursOverdue = currentDueDate
    ? Math.round((Date.now() - new Date(currentDueDate).getTime()) / (1000 * 60 * 60))
    : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>OVERDUE</Text>
          </View>
          <Text style={styles.title} numberOfLines={3}>{taskTitle}</Text>
          <Text style={styles.subtitle}>
            {hoursOverdue >= 24
              ? `${Math.floor(hoursOverdue / 24)}d ${hoursOverdue % 24}h overdue`
              : `${hoursOverdue}h overdue`}
            {' '}— commit to a new date.
          </Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Reason picker */}
          <Text style={styles.sectionLabel}>Why was it missed?</Text>
          <View style={styles.reasons}>
            {MISSED_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonChip,
                  selectedReason === reason && styles.reasonChipSelected,
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason && styles.reasonTextSelected,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* New date */}
          <Text style={styles.sectionLabel}>New commitment date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {newDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              {'  '}
              {newDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={newDate}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={(_e, date) => {
                if (date) setNewDate(date);
                if (Platform.OS !== 'ios') setShowPicker(false);
              }}
              themeVariant="dark"
            />
          )}
          {showPicker && Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.pickerDone} onPress={() => setShowPicker(false)}>
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.commitBtn, !canSubmit && styles.commitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.commitBtnText}>Commit to New Date</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  headerPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.danger + '22',
    borderWidth: 1,
    borderColor: Colors.danger + '55',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.danger,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 12,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reasonChipSelected: {
    backgroundColor: Colors.danger + '22',
    borderColor: Colors.danger,
  },
  reasonText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: Colors.danger,
    fontWeight: '700',
  },
  dateButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  pickerDone: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pickerDoneText: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commitBtn: {
    backgroundColor: Colors.danger,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  commitBtnDisabled: {
    opacity: 0.4,
  },
  commitBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});

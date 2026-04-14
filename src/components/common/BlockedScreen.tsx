/**
 * BlockedScreen
 *
 * Rendered as an overlay when the user has one or more Level 4 escalations.
 * The app is unusable until they address every blocked task.
 *
 * Each blocked task must be resolved via MissedDeadlineModal before
 * the overlay lifts.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { MissedDeadlineModal } from '@/components/tasks/MissedDeadlineModal';
import { useBlockedTasks } from '@/hooks/useEscalationState';

interface BlockedTask {
  id: string;
  task_id: string;
  level_4_at: string | null;
  tasks: {
    id: string;
    title: string;
    due_date: string | null;
    goal_id: string | null;
    goals: { title: string } | null;
  } | null;
}

interface ActiveModal {
  escalationStateId: string;
  taskId: string;
  taskTitle: string;
  currentDueDate: string | null;
}

export function BlockedScreen() {
  const { data: blockedTasks = [] } = useBlockedTasks();
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

  if (!blockedTasks.length) return null;

  function openModal(item: BlockedTask) {
    if (!item.tasks) return;
    setActiveModal({
      escalationStateId: item.id,
      taskId: item.tasks.id,
      taskTitle: item.tasks.title,
      currentDueDate: item.tasks.due_date,
    });
  }

  return (
    <>
      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="warning" size={32} color={Colors.level4} />
          <Text style={styles.headline}>App Locked</Text>
          <Text style={styles.subheadline}>
            {blockedTasks.length} task{blockedTasks.length !== 1 ? 's are' : ' is'} critically
            overdue. You must respond before continuing.
          </Text>
        </View>

        {/* Blocked task list */}
        <FlatList
          data={blockedTasks as BlockedTask[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const task = item.tasks;
            if (!task) return null;

            const hoursOver = item.level_4_at
              ? Math.round(
                  (Date.now() - new Date(item.level_4_at).getTime()) / (1000 * 60 * 60),
                )
              : 0;

            return (
              <View style={styles.taskRow}>
                <View style={styles.taskInfo}>
                  {task.goals && (
                    <Text style={styles.goalLabel}>{task.goals.title}</Text>
                  )}
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.overdueLabel}>
                    {hoursOver >= 48
                      ? `${Math.floor(hoursOver / 24)}d overdue`
                      : `${hoursOver}h overdue`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.respondBtn}
                  onPress={() => openModal(item)}
                >
                  <Text style={styles.respondBtnText}>Respond</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.level4} />
                </TouchableOpacity>
              </View>
            );
          }}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            RELENTLESS doesn't let things silently die.
          </Text>
        </View>
      </SafeAreaView>

      {activeModal && (
        <MissedDeadlineModal
          visible={true}
          taskId={activeModal.taskId}
          taskTitle={activeModal.taskTitle}
          currentDueDate={activeModal.currentDueDate}
          escalationStateId={activeModal.escalationStateId}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    zIndex: 9999,
  },
  header: {
    padding: 32,
    paddingTop: 48,
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headline: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.level4,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  list: {
    padding: 20,
    gap: 12,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.level4 + '55',
    padding: 16,
    gap: 12,
  },
  taskInfo: {
    flex: 1,
    gap: 3,
  },
  goalLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  overdueLabel: {
    fontSize: 13,
    color: Colors.level4,
    fontWeight: '600',
  },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.level4 + '22',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.level4 + '55',
  },
  respondBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.level4,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
});

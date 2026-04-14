import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { useGoals, useGoalProgress } from '@/hooks/useGoals';
import type { Goal } from '@/hooks/useGoals';

function daysRemaining(targetDate: string): number {
  const diff = new Date(targetDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function GoalCard({ goal }: { goal: Goal }) {
  const days = daysRemaining(goal.target_date);
  const isAtRisk = days < 14 && days > 0;
  const isPast = days <= 0;
  const { data: progress } = useGoalProgress(goal.id);

  const pct = progress?.pct ?? 0;
  const progressColor = pct === 100
    ? Colors.success
    : isPast || (isAtRisk && pct < 50)
      ? Colors.danger
      : isAtRisk
        ? Colors.warning
        : Colors.accent;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/goals/${goal.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <Text style={styles.goalType}>
          {goal.goal_type.charAt(0).toUpperCase() + goal.goal_type.slice(1)}
        </Text>
        <View style={[
          styles.daysBadge,
          isAtRisk && styles.daysBadgeWarning,
          isPast && styles.daysBadgeDanger,
        ]}>
          <Text style={[
            styles.daysText,
            isAtRisk && styles.daysTextWarning,
            isPast && styles.daysTextDanger,
          ]}>
            {isPast ? 'Overdue' : `${days}d left`}
          </Text>
        </View>
      </View>
      <Text style={styles.goalTitle} numberOfLines={2}>{goal.title}</Text>
      {goal.description && (
        <Text style={styles.goalDesc} numberOfLines={1}>{goal.description}</Text>
      )}

      {/* Progress bar */}
      {progress && progress.total > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: progressColor }]} />
          </View>
          <Text style={[styles.progressLabel, { color: progressColor }]}>
            {progress.completed}/{progress.total}
          </Text>
        </View>
      )}

      <Text style={styles.goalDate}>
        Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </Text>
    </TouchableOpacity>
  );
}

export default function GoalsScreen() {
  const { data: goals, isLoading, refetch, isRefetching } = useGoals();

  return (
    <Screen padded={false}>
      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Goals</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/(app)/goals/new')}
            >
              <Ionicons name="add" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.accent} />
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No goals yet.</Text>
              <TouchableOpacity
                style={styles.createPrompt}
                onPress={() => router.push('/(app)/goals/new')}
              >
                <Text style={styles.createPromptText}>+ Create your first goal</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => <GoalCard goal={item} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary },
  addButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Layout.cardPadding,
    marginBottom: 10,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalType: { fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },
  daysBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: Colors.surfaceElevated,
  },
  daysBadgeWarning: { backgroundColor: Colors.warning + '22' },
  daysBadgeDanger: { backgroundColor: Colors.danger + '22' },
  daysText: { fontSize: 11, color: Colors.textTertiary, fontWeight: '600' },
  daysTextWarning: { color: Colors.warning },
  daysTextDanger: { color: Colors.danger },
  goalTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, lineHeight: 24 },
  goalDesc: { fontSize: 13, color: Colors.textSecondary },
  goalDate: { fontSize: 12, color: Colors.textTertiary },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'right',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary },
  createPrompt: {
    paddingVertical: 10, paddingHorizontal: 20,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
  },
  createPromptText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
});

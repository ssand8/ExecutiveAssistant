/**
 * History Screen
 *
 * Completion rate, velocity, reschedule frequency, and recent activity.
 * Reads from user_patterns view and task_check_ins.
 */

import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { Colors } from '@/constants/colors';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface PatternRow {
  tasks_completed_last_7d: number;
  tasks_completed_last_30d: number;
  overdue_rate_pct: number;
  top_reschedule_reason: string | null;
  avg_reschedules_per_task: number;
  active_task_count: number;
  active_goal_count: number;
}

interface RecentCheckIn {
  id: string;
  action: string;
  reschedule_reason: string | null;
  created_at: string;
  tasks: { title: string } | null;
}

function StatCard({
  value,
  label,
  sublabel,
  color,
}: {
  value: string;
  label: string;
  sublabel?: string;
  color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sublabel && <Text style={styles.statSublabel}>{sublabel}</Text>}
    </View>
  );
}

function actionLabel(action: string): string {
  switch (action) {
    case 'complete': return 'Completed';
    case 'reschedule': return 'Rescheduled';
    case 'snooze': return 'Snoozed';
    default: return action;
  }
}

function actionColor(action: string): string {
  switch (action) {
    case 'complete': return Colors.success;
    case 'reschedule': return Colors.warning;
    case 'snooze': return Colors.textTertiary;
    default: return Colors.textTertiary;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / (1000 * 60 * 60));
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return 'just now';
}

export default function HistoryScreen() {
  const userId = useAuthStore((s) => s.user?.id);

  const { data: patterns, isLoading: patternsLoading } = useQuery({
    queryKey: ['user-patterns', userId],
    enabled: !!userId,
    queryFn: async (): Promise<PatternRow | null> => {
      const { data } = await supabase
        .from('user_patterns')
        .select('*')
        .eq('user_id', userId!)
        .single();
      return data as PatternRow | null;
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['recent-checkins', userId],
    enabled: !!userId,
    queryFn: async (): Promise<RecentCheckIn[]> => {
      const { data } = await supabase
        .from('task_check_ins')
        .select('id, action, reschedule_reason, created_at, tasks ( title )')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(30);
      return (data ?? []) as RecentCheckIn[];
    },
    staleTime: 60_000,
  });

  const isLoading = patternsLoading || activityLoading;

  const overdueColor =
    (patterns?.overdue_rate_pct ?? 0) > 30
      ? Colors.danger
      : (patterns?.overdue_rate_pct ?? 0) > 10
        ? Colors.warning
        : Colors.success;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : (
          <>
            {/* Stats grid */}
            <Text style={styles.sectionLabel}>Last 30 days</Text>
            <View style={styles.statsGrid}>
              <StatCard
                value={String(patterns?.tasks_completed_last_30d ?? 0)}
                label="Completed"
                sublabel="tasks"
                color={Colors.success}
              />
              <StatCard
                value={`${patterns?.overdue_rate_pct ?? 0}%`}
                label="Overdue rate"
                color={overdueColor}
              />
              <StatCard
                value={String(patterns?.avg_reschedules_per_task ?? 0)}
                label="Avg reschedules"
                sublabel="per task"
              />
              <StatCard
                value={String(patterns?.tasks_completed_last_7d ?? 0)}
                label="This week"
                sublabel="completed"
              />
            </View>

            {/* Reschedule insight */}
            {patterns?.top_reschedule_reason && (
              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Top reschedule reason</Text>
                <Text style={styles.insightValue}>"{patterns.top_reschedule_reason}"</Text>
                <Text style={styles.insightSub}>
                  Recognizing patterns is the first step to breaking them.
                </Text>
              </View>
            )}

            {/* Active overview */}
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>{patterns?.active_task_count ?? 0}</Text>
                <Text style={styles.overviewLabel}>Active tasks</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>{patterns?.active_goal_count ?? 0}</Text>
                <Text style={styles.overviewLabel}>Active goals</Text>
              </View>
            </View>

            {/* Recent activity */}
            <Text style={styles.sectionLabel}>Recent activity</Text>
            {recentActivity && recentActivity.length > 0 ? (
              <View style={styles.activityList}>
                {recentActivity.map((item) => (
                  <View key={item.id} style={styles.activityItem}>
                    <View style={[styles.activityDot, { backgroundColor: actionColor(item.action) }]} />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTask} numberOfLines={1}>
                        {item.tasks?.title ?? 'Unknown task'}
                      </Text>
                      <View style={styles.activityMeta}>
                        <Text style={[styles.activityAction, { color: actionColor(item.action) }]}>
                          {actionLabel(item.action)}
                        </Text>
                        {item.reschedule_reason && (
                          <Text style={styles.activityReason}>· {item.reschedule_reason}</Text>
                        )}
                        <Text style={styles.activityTime}>{timeAgo(item.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyActivity}>
                <Text style={styles.emptyText}>No activity yet.</Text>
                <Text style={styles.emptySubtext}>Complete your first task to see history here.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 60, flexGrow: 1 },
  header: { paddingTop: 16, paddingBottom: 24 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    width: '47%',
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statSublabel: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  insightCard: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    marginBottom: 16,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  insightValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  insightSub: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  overviewRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  overviewDivider: { width: 1, backgroundColor: Colors.border },
  overviewValue: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  overviewLabel: { fontSize: 13, color: Colors.textSecondary },
  activityList: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  activityContent: { flex: 1, gap: 3 },
  activityTask: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  activityAction: { fontSize: 12, fontWeight: '600' },
  activityReason: { fontSize: 12, color: Colors.textTertiary },
  activityTime: { fontSize: 12, color: Colors.textTertiary, marginLeft: 'auto' },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, color: Colors.textTertiary },
});

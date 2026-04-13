import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Colors } from '@/constants/colors';
import { useTodayTasks } from '@/hooks/useTodayTasks';
import type { TaskWithGoal } from '@/hooks/useTodayTasks';

export default function TodayScreen() {
  const { data: tasks, isLoading, error, refetch, isRefetching } = useTodayTasks();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const overdue = tasks?.filter((t) => t.due_date && new Date(t.due_date) < new Date()) ?? [];
  const upcoming = tasks?.filter((t) => !t.due_date || new Date(t.due_date) >= new Date()) ?? [];

  return (
    <Screen padded={false}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.date}>{today}</Text>
              <Text style={styles.title}>Today</Text>
              {tasks && tasks.length > 0 && (
                <Text style={styles.subtitle}>
                  {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                  {overdue.length > 0 ? ` · ${overdue.length} overdue` : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/(app)/tasks/new')}
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
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>Failed to load tasks.</Text>
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>You're clear.</Text>
              <Text style={styles.emptySubtext}>No tasks due today.</Text>
              <TouchableOpacity
                style={styles.createPrompt}
                onPress={() => router.push('/(app)/goals/new')}
              >
                <Text style={styles.createPromptText}>+ Create a goal to get started</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }: { item: TaskWithGoal }) => (
          <TaskCard
            task={item}
            onPress={() => router.push(`/(app)/tasks/${item.id}`)}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingBottom: 24,
  },
  date: {
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  createPrompt: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  createPromptText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: Colors.danger,
  },
});

import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { Colors } from '@/constants/colors';

// Placeholder — wired to real data in M1.2
export default function TodayScreen() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.date}>{today}</Text>
        <Text style={styles.title}>Today</Text>
      </View>

      <View style={styles.empty}>
        <Text style={styles.emptyText}>No tasks yet.</Text>
        <Text style={styles.emptySubtext}>Create a goal to get started.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 12,
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
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 8,
  },
});

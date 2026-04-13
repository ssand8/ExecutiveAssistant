import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { Colors } from '@/constants/colors';

// Scaffold — full history view in Phase 4
export default function HistoryScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Review & retrospectives</Text>
        <Text style={styles.emptySubtext}>Coming in Phase 4</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
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

import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { Colors } from '@/constants/colors';

// Scaffold — full goal creation + AI decomposition in M1.3
export default function NewGoalScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>New Goal</Text>
        <Text style={styles.subtitle}>Goal creation form — coming in Milestone 1.3</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

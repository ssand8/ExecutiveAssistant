import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface GoalBadgeProps {
  title: string;
}

export function GoalBadge({ title }: GoalBadgeProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="flag" size={10} color={Colors.textTertiary} />
      <Text style={styles.text} numberOfLines={1}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: 11,
    color: Colors.textTertiary,
    flex: 1,
  },
});

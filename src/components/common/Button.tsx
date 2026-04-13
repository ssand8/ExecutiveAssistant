import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : Colors.accent} />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: Colors.accent },
  secondary: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.danger },
  disabled: { opacity: 0.4 },
  label: { fontSize: 15, fontWeight: '600' },
  primaryLabel: { color: '#fff' },
  secondaryLabel: { color: Colors.textPrimary },
  ghostLabel: { color: Colors.textSecondary },
  dangerLabel: { color: '#fff' },
});

/**
 * Onboarding Step 2 — Phone Number + SMS Opt-in
 *
 * SMS escalation (Level 3) requires a phone number and explicit opt-in.
 * This is optional — users can skip and add later in Settings.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function OnboardingPhone() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  function formatPhone(raw: string): string {
    // Keep only digits and leading +
    return raw.replace(/[^\d+]/g, '');
  }

  async function handleSave() {
    if (!user?.id) return;
    const formatted = formatPhone(phone);
    if (!formatted || formatted.length < 10) {
      setError('Enter a valid phone number including country code (e.g. +1...)');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('users')
      .update({ phone_number: formatted, sms_opt_in: true })
      .eq('id', user.id);

    setLoading(false);

    if (updateError) {
      setError('Could not save phone number. Try again.');
      return;
    }

    router.push('/(onboarding)/first-goal');
  }

  function handleSkip() {
    router.push('/(onboarding)/first-goal');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Step indicator */}
      <View style={styles.steps}>
        <View style={[styles.step, styles.stepDone]} />
        <View style={[styles.step, styles.stepActive]} />
        <View style={styles.step} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconRing}>
          <Ionicons name="chatbubble-ellipses" size={36} color={Colors.accent} />
        </View>

        <Text style={styles.headline}>SMS escalation</Text>
        <Text style={styles.body}>
          When a task goes 24+ hours overdue, RELENTLESS can text you. This cuts through notification fatigue when it matters most.
        </Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="+1 555 000 0000"
            placeholderTextColor={Colors.textTertiary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            autoFocus
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Text style={styles.hint}>
            Include country code. Standard SMS rates apply. You can opt out anytime in Settings.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} disabled={loading || !phone}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Enable SMS Escalation</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip — push notifications only</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 52,
  },
  steps: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 48,
  },
  step: {
    height: 3,
    flex: 1,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  stepDone: { backgroundColor: Colors.success },
  stepActive: { backgroundColor: Colors.accent },
  content: {
    flex: 1,
    gap: 20,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent + '18',
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  body: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  inputGroup: {
    gap: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  error: {
    fontSize: 13,
    color: Colors.danger,
  },
  hint: {
    fontSize: 12,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
  footer: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  skipBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: Colors.textTertiary,
  },
});

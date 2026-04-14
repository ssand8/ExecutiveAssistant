/**
 * Onboarding Step 1 — Welcome + Notification Permissions
 *
 * Shown once after account creation.
 * Requests push notification permission before anything else —
 * notifications are core to the product, not optional.
 */

import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { registerForPushNotificationsAsync, savePushToken } from '@/lib/notifications';
import { useAuthStore } from '@/stores/authStore';

export default function OnboardingWelcome() {
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const user = useAuthStore((s) => s.user);

  async function handleEnableNotifications() {
    setLoading(true);
    const token = await registerForPushNotificationsAsync();
    if (token && user?.id) {
      await savePushToken(user.id, token);
    } else {
      setPermissionDenied(true);
    }
    setLoading(false);
    router.push('/(onboarding)/phone');
  }

  function handleSkip() {
    router.push('/(onboarding)/phone');
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Wordmark */}
        <Text style={styles.wordmark}>RELENTLESS</Text>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconRing}>
            <Ionicons name="notifications" size={40} color={Colors.accent} />
          </View>
          <Text style={styles.headline}>Stay accountable.</Text>
          <Text style={styles.body}>
            RELENTLESS nudges you when things slip. Enable notifications so nothing silently dies.
          </Text>
        </View>

        {/* What you'll get */}
        <View style={styles.benefits}>
          {[
            { icon: 'time-outline', text: 'Pre-deadline reminders before tasks slip' },
            { icon: 'trending-up-outline', text: 'Daily morning briefing with AI prioritization' },
            { icon: 'warning-outline', text: 'Escalating alerts when you go dark on a task' },
          ].map((item, i) => (
            <View key={i} style={styles.benefit}>
              <Ionicons name={item.icon as any} size={18} color={Colors.accent} />
              <Text style={styles.benefitText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {permissionDenied && (
          <Text style={styles.deniedText}>
            Notifications denied. You can enable them later in Settings.
          </Text>
        )}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleEnableNotifications}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Enable Notifications</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 52,
  },
  content: {
    gap: 40,
  },
  wordmark: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 4,
  },
  hero: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent + '18',
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  benefits: {
    gap: 16,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    gap: 12,
  },
  deniedText: {
    fontSize: 13,
    color: Colors.warning,
    textAlign: 'center',
    marginBottom: 4,
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

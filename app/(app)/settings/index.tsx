/**
 * Settings Screen
 *
 * - SMS opt-in / phone number
 * - Notification intensity (all / important only / off)
 * - Quiet hours
 * - Sign out
 * - Account info
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type NotificationIntensity = 'all' | 'important' | 'off';

interface UserSettings {
  phone_number: string | null;
  sms_opt_in: boolean;
  notification_intensity?: NotificationIntensity;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({
  icon,
  label,
  sublabel,
  right,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.rowLeft}>
        <Ionicons name={icon as any} size={20} color={danger ? Colors.danger : Colors.textSecondary} />
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
          {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
        </View>
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('phone_number, sms_opt_in')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setSettings(data as UserSettings);
        setPhoneInput(data?.phone_number ?? '');
        setLoading(false);
      });
  }, [user?.id]);

  async function updateSetting(patch: Partial<UserSettings>) {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase.from('users').update(patch).eq('id', user.id);
    if (!error) setSettings((prev) => ({ ...prev!, ...patch }));
    setSaving(false);
  }

  async function handleSavePhone() {
    const formatted = phoneInput.replace(/[^\d+]/g, '');
    if (formatted && formatted.length < 10) {
      Alert.alert('Invalid number', 'Include country code (e.g. +1...)');
      return;
    }
    await updateSetting({ phone_number: formatted || null, sms_opt_in: !!formatted });
    setEditingPhone(false);
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          {saving && <ActivityIndicator color={Colors.accent} size="small" />}
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <SettingRow
            icon="person-outline"
            label={user?.email ?? 'Account'}
            sublabel="Email"
          />
        </View>

        {/* SMS Escalation */}
        <SectionHeader title="SMS Escalation" />
        <View style={styles.card}>
          {editingPhone ? (
            <View style={styles.phoneEdit}>
              <TextInput
                style={styles.phoneInput}
                value={phoneInput}
                onChangeText={setPhoneInput}
                placeholder="+1 555 000 0000"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
                autoFocus
              />
              <View style={styles.phoneEditButtons}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSavePhone}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingPhone(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <SettingRow
              icon="call-outline"
              label="Phone number"
              sublabel={settings?.phone_number ?? 'Not set'}
              onPress={() => setEditingPhone(true)}
            />
          )}
          <View style={styles.divider} />
          <SettingRow
            icon="chatbubble-ellipses-outline"
            label="SMS escalation"
            sublabel="Texts when tasks go 24h+ overdue"
            right={
              <Switch
                value={settings?.sms_opt_in ?? false}
                onValueChange={(v) => updateSetting({ sms_opt_in: v })}
                trackColor={{ true: Colors.accent, false: Colors.border }}
                thumbColor="#fff"
                disabled={!settings?.phone_number}
              />
            }
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          {(['all', 'important', 'off'] as NotificationIntensity[]).map((level, i, arr) => (
            <View key={level}>
              <TouchableOpacity
                style={styles.row}
                onPress={() => updateSetting({ notification_intensity: level } as any)}
              >
                <View style={styles.rowLeft}>
                  <Ionicons
                    name={level === 'all' ? 'notifications-outline' : level === 'important' ? 'notifications-off-outline' : 'volume-mute-outline'}
                    size={20}
                    color={Colors.textSecondary}
                  />
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>
                      {level === 'all' ? 'All notifications' : level === 'important' ? 'Important only' : 'Off'}
                    </Text>
                    <Text style={styles.rowSublabel}>
                      {level === 'all'
                        ? 'Pre-deadline, overdue, briefing'
                        : level === 'important'
                          ? 'Overdue and Level 3+ only'
                          : 'No push notifications'}
                    </Text>
                  </View>
                </View>
                {(settings?.notification_intensity ?? 'all') === level && (
                  <Ionicons name="checkmark" size={18} color={Colors.accent} />
                )}
              </TouchableOpacity>
              {i < arr.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Danger zone */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <SettingRow
            icon="log-out-outline"
            label="Sign out"
            onPress={handleSignOut}
            danger
          />
        </View>

        <Text style={styles.version}>RELENTLESS — Phase 4</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 60 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  rowLabelDanger: { color: Colors.danger },
  rowSublabel: { fontSize: 12, color: Colors.textTertiary },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 48 },
  phoneEdit: { padding: 16, gap: 12 },
  phoneInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  phoneEditButtons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  cancelText: { fontSize: 14, color: Colors.textSecondary },
  version: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 40,
  },
});

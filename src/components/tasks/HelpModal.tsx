/**
 * HelpModal
 *
 * Shown when the user taps "Help" on a task.
 * Calls the help-me Edge Function and renders the structured response:
 *   - first_step: the single concrete next action
 *   - why: one-sentence rationale grounded in their history
 *   - similar_tasks: past completed tasks that are semantically similar
 */

import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface HelpResponse {
  first_step: string;
  why: string;
  similar_tasks: string[];
  has_history: boolean;
}

interface Props {
  visible: boolean;
  taskId: string;
  taskTitle: string;
  onClose: () => void;
}

export function HelpModal({ visible, taskId, taskTitle, onClose }: Props) {
  const [result, setResult] = useState<HelpResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!visible || !userId) return;

    setResult(null);
    setError(null);
    setLoading(true);

    supabase.functions
      .invoke('help-me', { body: { taskId, userId } })
      .then(({ data, error: fnError }) => {
        if (fnError) {
          setError('Could not get help right now. Try again.');
        } else {
          setResult(data as HelpResponse);
        }
      })
      .catch(() => setError('Could not get help right now. Try again.'))
      .finally(() => setLoading(false));
  }, [visible, taskId, userId]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="flash" size={18} color={Colors.accent} />
            <Text style={styles.headerLabel}>AI Help</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Task title */}
        <View style={styles.taskContext}>
          <Text style={styles.taskTitle} numberOfLines={3}>{taskTitle}</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.accent} size="large" />
              <Text style={styles.loadingText}>Thinking...</Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.centered}>
              <Ionicons name="warning-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {result && !loading && (
            <View style={styles.resultContainer}>
              {/* First step — the hero card */}
              <View style={styles.firstStepCard}>
                <Text style={styles.firstStepLabel}>Do this now</Text>
                <Text style={styles.firstStepText}>{result.first_step}</Text>
              </View>

              {/* Why */}
              <View style={styles.whyCard}>
                <Text style={styles.sectionLabel}>Why</Text>
                <Text style={styles.whyText}>{result.why}</Text>
              </View>

              {/* Similar past tasks — only if history exists */}
              {result.has_history && result.similar_tasks.length > 0 && (
                <View style={styles.historyCard}>
                  <Text style={styles.sectionLabel}>You've done similar work</Text>
                  {result.similar_tasks.map((t, i) => (
                    <View key={i} style={styles.historyItem}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                      <Text style={styles.historyText}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}

              {!result.has_history && (
                <Text style={styles.noHistoryText}>
                  Complete more tasks to unlock personalized advice based on your history.
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  taskContext: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  resultContainer: {
    gap: 16,
  },
  firstStepCard: {
    backgroundColor: Colors.accent + '15',
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    borderRadius: 12,
    padding: 18,
    gap: 8,
  },
  firstStepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  firstStepText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  whyCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  whyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  historyCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  historyText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  noHistoryText: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
});

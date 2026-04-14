import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import {
  registerForPushNotificationsAsync,
  savePushToken,
  parseNotificationData,
} from '@/lib/notifications';
import { useAuthStore } from '@/stores/authStore';
import { BlockedScreen } from '@/components/common/BlockedScreen';

export default function RootLayout() {
  const { setSession, setLoading, user } = useAuthStore();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading]);

  // ── Push token registration ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        savePushToken(user.id, token);
      }
    });
  }, [user?.id]);

  // ── Notification handlers ───────────────────────────────────────────────────
  useEffect(() => {
    // Foreground notification received — Notifications.setNotificationHandler handles display
    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
      // Refresh task list so badge counts stay accurate
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });

    // User tapped a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const rawData = response.notification.request.content.data ?? {};
      const { taskId } = parseNotificationData(rawData as Record<string, unknown>);

      if (taskId) {
        // Navigate to the specific task — deep link works regardless of app state
        router.push(`/(app)/tasks/${taskId}`);
      } else {
        // Default: open Today view
        router.push('/(app)/today');
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(app)" />
        </Stack>
        {/* Level 4 escalation overlay — renders above everything when active */}
        {user && <BlockedScreen />}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

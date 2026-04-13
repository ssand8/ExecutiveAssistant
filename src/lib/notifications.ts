import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Foreground notification behavior — show banner, play sound, update badge
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'RELENTLESS',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF3B30',
      sound: 'default',
    });
  }

  // Check / request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null; // User declined — respect it, don't spam
  }

  try {
    // projectId is required in SDK 51+ for physical devices
    const projectId: string | undefined =
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
      (Constants as unknown as { easConfig?: { projectId?: string } })?.easConfig?.projectId;

    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    return tokenResult.data;
  } catch (err) {
    console.warn('[notifications] Failed to get push token:', err);
    return null;
  }
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ push_token: token })
    .eq('id', userId);

  if (error) {
    console.warn('[notifications] Failed to save push token:', error.message);
  }
}

// Parse notification tap data and return routing info
export function parseNotificationData(data: Record<string, unknown>): {
  taskId?: string;
  type?: string;
} {
  return {
    taskId: typeof data?.taskId === 'string' ? data.taskId : undefined,
    type: typeof data?.type === 'string' ? data.type : undefined,
  };
}

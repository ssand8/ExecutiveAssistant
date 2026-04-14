import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/colors';

export default function Index() {
  const { session, isLoading, user } = useAuthStore();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from('users')
      .select('onboarding_complete')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        // If no row exists yet (user pre-dates onboarding), treat as complete
        // so existing users aren't forced through onboarding
        if (error || !data) {
          setOnboardingComplete(true);
          return;
        }
        setOnboardingComplete(data.onboarding_complete ?? true);
      });
  }, [user?.id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Still checking onboarding status
  if (onboardingComplete === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (!onboardingComplete) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(app)/today" />;
}

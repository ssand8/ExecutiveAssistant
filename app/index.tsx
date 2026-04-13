import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/colors';

export default function Index() {
  const { session, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(app)/today" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}

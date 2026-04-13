import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Tables } from '@/types/database';

export type UserProfile = Tables<'users'>;

export function useCurrentUser() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!userId,
  });
}

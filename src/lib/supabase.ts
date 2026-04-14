import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SecureStore has a 2048-byte limit per key.
// Supabase session tokens exceed this, so we chunk large values across
// multiple keys and reassemble on read.
const CHUNK_SIZE = 1900; // bytes, safely under the 2048 limit

const ChunkedSecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    // Try reading a chunked value first
    const countStr = await SecureStore.getItemAsync(`${key}_count`);
    if (countStr) {
      const count = parseInt(countStr, 10);
      const chunks: string[] = [];
      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
        if (chunk === null) return null;
        chunks.push(chunk);
      }
      return chunks.join('');
    }
    // Fall back to a plain (non-chunked) value
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      // Small enough — store directly, clean up any old chunks
      await SecureStore.setItemAsync(key, value);
      await SecureStore.deleteItemAsync(`${key}_count`);
      return;
    }

    // Split into chunks
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
    }
    await SecureStore.setItemAsync(`${key}_count`, String(chunks.length));

    // Remove plain key if it existed before
    await SecureStore.deleteItemAsync(key);
  },

  async removeItem(key: string): Promise<void> {
    const countStr = await SecureStore.getItemAsync(`${key}_count`);
    if (countStr) {
      const count = parseInt(countStr, 10);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}_count`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ChunkedSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

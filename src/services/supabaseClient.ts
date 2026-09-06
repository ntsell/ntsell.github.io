// ====================================================================
// SUPABASE CLIENT & LOCAL STORAGE CACHING
// Caching API query với TTL 1-2h để giảm 90% bandwidth Supabase Free Tier
// ====================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mock-student-casio.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-anon-key-student-casio-2026';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

export class CachedDataService {
  private prefix = 'casio_cache_';

  set<T>(key: string, data: T, ttlHours: number = 2): void {
    try {
      const entry: CacheEntry<T> = {
        timestamp: Date.now() + (ttlHours * 60 * 60 * 1000),
        data
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (e) {
      console.warn('LocalStorage cache full or disabled:', e);
    }
  }

  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (!raw) return null;
      const parsed: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() > parsed.timestamp) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  clearAll(): void {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => localStorage.removeItem(k));
  }
}

export const clientCache = new CachedDataService();

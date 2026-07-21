import type { CachedResponse, SupportedLanguageCode } from '../types/chatbot';

/**
 * responseCache — In-memory LRU cache for chatbot responses.
 *
 * Avoids duplicate AI calls for repeated or similar questions.
 * Key = hash of (user message + note context summary).
 * Entries expire after configurable TTL.
 */

interface CacheEntry {
  key: string;
  value: CachedResponse;
  insertedAt: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private maxEntries: number;
  private ttlMs: number;

  constructor(maxEntries = 50, ttlMs = 5 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  /**
   * Generate a deterministic cache key from message and context.
   * Uses a simple djb2 hash for speed (no crypto dependency needed).
   */
  makeKey(userMessage: string, noteContextSnippet?: string): string {
    const raw = `${userMessage.trim().toLowerCase()}|${(noteContextSnippet || '').slice(0, 200)}`;
    let hash = 5381;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) + hash + raw.charCodeAt(i)) | 0;
    }
    return `cache_${hash >>> 0}`;
  }

  get(key: string): CachedResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL expiry
    if (Date.now() - entry.insertedAt > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Move to end for LRU ordering (delete + re-insert)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, response: string, languageCode: SupportedLanguageCode = 'en'): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      key,
      value: {
        response,
        cachedAt: Date.now(),
        languageCode,
      },
      insertedAt: Date.now(),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null; // get() handles TTL check
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/** Singleton cache instance */
export const responseCache = new ResponseCache();

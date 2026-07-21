/**
 * chatbotConfig.ts — THE ONE FILE to change AI providers.
 *
 * Switch providers:
 *   activeProvider: 'gemma' → 'gemini' → 'openai' → 'qwen' → 'claude'
 *
 * That's it. No other file changes needed.
 */

export type ProviderName = 'gemma' | 'gemini' | 'openai' | 'qwen' | 'claude';

export const CHATBOT_CONFIG = {
  /** Primary AI provider — change this ONE value to switch models */
  activeProvider: 'gemma' as ProviderName,

  /** Auto-fallback if primary provider is unavailable */
  fallbackProvider: 'gemini' as ProviderName,

  /** Enable SSE streaming responses (characters appear progressively) */
  enableStreaming: true,

  /** Enable in-memory response cache for repeated questions */
  enableCache: true,

  /** Cache time-to-live in milliseconds (5 minutes) */
  cacheTTLMs: 5 * 60 * 1000,

  /** Maximum cache entries before LRU eviction */
  maxCacheEntries: 50,

  /** Number of recent messages sent to the model for context */
  maxConversationHistory: 10,

  /** Request timeout in milliseconds */
  requestTimeoutMs: 30000,

  /** Retry attempts on transient failures */
  retryAttempts: 2,

  /** Rate limiter: minimum milliseconds between requests */
  minRequestIntervalMs: 300,

  /** Supported languages (ISO 639-1 codes) — add new codes here */
  supportedLanguages: ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa'] as const,
} as const;

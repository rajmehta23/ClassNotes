import type { IAIProvider, AIProviderMessage, AIProviderOptions } from '../providers/types';
import { CHATBOT_CONFIG } from '../config/chatbotConfig';
import type { ProviderName } from '../config/chatbotConfig';
import { GemmaProvider } from '../providers/GemmaProvider';
import { GeminiProvider } from '../providers/GeminiProvider';
import { OpenAIProvider } from '../providers/OpenAIProvider';
import { QwenProvider } from '../providers/QwenProvider';
import { ClaudeProvider } from '../providers/ClaudeProvider';

/**
 * ChatAIGateway — Provider router with rate limiting, retry, and auto-fallback.
 *
 * Architecture:
 *   useChatbot → chatService → ChatAIGateway → [active provider]
 *
 * Reads CHATBOT_CONFIG.activeProvider to resolve which provider handles requests.
 * If the primary fails, auto-falls back to CHATBOT_CONFIG.fallbackProvider.
 * Rate-limits at 300ms intervals to prevent API throttling.
 */

/** Provider registry — lazy-initialized singletons */
const providerInstances = new Map<ProviderName, IAIProvider>();

function getProvider(name: ProviderName): IAIProvider {
  let provider = providerInstances.get(name);
  if (provider) return provider;

  switch (name) {
    case 'gemma':
      provider = new GemmaProvider();
      break;
    case 'gemini':
      provider = new GeminiProvider();
      break;
    case 'openai':
      provider = new OpenAIProvider();
      break;
    case 'qwen':
      provider = new QwenProvider();
      break;
    case 'claude':
      provider = new ClaudeProvider();
      break;
    default:
      throw new Error(`Unknown provider: ${name}`);
  }

  providerInstances.set(name, provider);
  return provider;
}

class ChatAIGateway {
  private lastRequestTime = 0;
  private queue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  /**
   * Get the currently active provider instance.
   */
  getActiveProvider(): IAIProvider {
    return getProvider(CHATBOT_CONFIG.activeProvider);
  }

  /**
   * Send a non-streaming message through the provider pipeline.
   * Handles rate limiting, retry, and fallback.
   */
  async sendMessage(
    messages: AIProviderMessage[],
    options?: AIProviderOptions
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.executeWithFallback(messages, options);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  /**
   * Stream a message through the active provider.
   * Streaming bypasses the queue (it's a long-lived connection).
   */
  async *streamMessage(
    messages: AIProviderMessage[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown> {
    // Rate limit check
    await this.waitForRateLimit();
    this.lastRequestTime = Date.now();

    const primary = getProvider(CHATBOT_CONFIG.activeProvider);

    try {
      yield* primary.streamMessage(messages, options);
    } catch (err) {
      // Fallback to secondary provider
      if (CHATBOT_CONFIG.fallbackProvider !== CHATBOT_CONFIG.activeProvider) {
        const fallback = getProvider(CHATBOT_CONFIG.fallbackProvider);
        try {
          yield* fallback.streamMessage(messages, options);
          return;
        } catch {
          // Both failed — throw original error
        }
      }
      throw err;
    }
  }

  /**
   * Execute request with retry and provider fallback.
   */
  private async executeWithFallback(
    messages: AIProviderMessage[],
    options?: AIProviderOptions
  ): Promise<string> {
    const retries = CHATBOT_CONFIG.retryAttempts;
    const primary = getProvider(CHATBOT_CONFIG.activeProvider);

    // Try primary provider with retries
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await primary.sendMessage(messages, options);
      } catch (err: any) {
        // Don't retry cancellations
        if (err.message?.includes('cancelled') || err.message?.includes('aborted')) {
          throw err;
        }

        if (attempt < retries) {
          // Exponential backoff
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
        }
      }
    }

    // Fallback to secondary provider
    if (CHATBOT_CONFIG.fallbackProvider !== CHATBOT_CONFIG.activeProvider) {
      try {
        const fallback = getProvider(CHATBOT_CONFIG.fallbackProvider);
        return await fallback.sendMessage(messages, options);
      } catch {
        // Fall through to throw
      }
    }

    throw new Error('AI service is temporarily unavailable. Please try again.');
  }

  /**
   * Process the rate-limited request queue sequentially.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.queue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      await this.waitForRateLimit();

      const task = this.queue.shift();
      if (task) {
        this.lastRequestTime = Date.now();
        await task();
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Wait until the rate limit interval has elapsed.
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < CHATBOT_CONFIG.minRequestIntervalMs) {
      await new Promise((r) =>
        setTimeout(r, CHATBOT_CONFIG.minRequestIntervalMs - elapsed)
      );
    }
  }
}

/** Singleton gateway instance */
export const chatAIGateway = new ChatAIGateway();

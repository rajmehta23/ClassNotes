import type { AIProviderMessage } from '../providers/types';
import type { ChatServiceOptions, SupportedLanguageCode } from '../types/chatbot';
import { CHATBOT_CONFIG } from '../config/chatbotConfig';
import { chatAIGateway } from './ChatAIGateway';
import { responseCache } from './responseCache';
import { detectLanguage } from './languageDetector';

/**
 * chatService — High-level chat orchestrator.
 *
 * Pipeline:
 *   1. Detect language of user's message
 *   2. Check cache → return if hit
 *   3. Build system prompt with ClassNotes context + language hint
 *   4. Route through ChatAIGateway (streaming or non-streaming)
 *   5. Cache successful response
 *   6. Sanitize output (basic XSS prevention)
 */

/** Sanitize markdown output — prevent script injection */
function sanitizeMarkdown(text: string): string {
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/** Truncate note context if too long */
function truncateContext(text: string, maxLen = 8000): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '\n\n[Context truncated for length]';
}

export const chatService = {
  /**
   * Send a chat message (non-streaming).
   * Returns the full sanitized AI response.
   */
  async sendMessage(
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: string,
    options: ChatServiceOptions = {}
  ): Promise<{ response: string; languageCode: SupportedLanguageCode; cached: boolean }> {
    // 1. Detect language
    const langResult = detectLanguage(userMessage);

    // 2. Check cache
    if (CHATBOT_CONFIG.enableCache) {
      const cacheKey = responseCache.makeKey(userMessage, options.noteContext);
      const cached = responseCache.get(cacheKey);
      if (cached) {
        return {
          response: cached.response,
          languageCode: cached.languageCode,
          cached: true,
        };
      }
    }

    // 3. Build message array
    const messages: AIProviderMessage[] = conversationHistory
      .slice(-CHATBOT_CONFIG.maxConversationHistory)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Ensure the current user message is included
    if (messages.length === 0 || messages[messages.length - 1].content !== userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }

    // 4. Call gateway
    const noteContext = options.noteContext ? truncateContext(options.noteContext) : undefined;

    const rawResponse = await chatAIGateway.sendMessage(messages, {
      noteContext,
      languageCode: langResult.code,
      timeoutMs: CHATBOT_CONFIG.requestTimeoutMs,
      signal: options.signal,
    });

    // 5. Sanitize
    const sanitized = sanitizeMarkdown(rawResponse);

    // 6. Cache
    if (CHATBOT_CONFIG.enableCache) {
      const cacheKey = responseCache.makeKey(userMessage, options.noteContext);
      responseCache.set(cacheKey, sanitized, langResult.code);
    }

    return {
      response: sanitized,
      languageCode: langResult.code,
      cached: false,
    };
  },

  /**
   * Stream a chat response (yields partial text chunks).
   */
  async *streamMessage(
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: string,
    options: ChatServiceOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    // Detect language
    const langResult = detectLanguage(userMessage);

    // Build message array
    const messages: AIProviderMessage[] = conversationHistory
      .slice(-CHATBOT_CONFIG.maxConversationHistory)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    if (messages.length === 0 || messages[messages.length - 1].content !== userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }

    const noteContext = options.noteContext ? truncateContext(options.noteContext) : undefined;

    let fullResponse = '';

    for await (const chunk of chatAIGateway.streamMessage(messages, {
      noteContext,
      languageCode: langResult.code,
      timeoutMs: CHATBOT_CONFIG.requestTimeoutMs,
      signal: options.signal,
    })) {
      fullResponse += chunk;
      yield chunk;
    }

    // Cache the full streamed response
    if (CHATBOT_CONFIG.enableCache && fullResponse.trim()) {
      const cacheKey = responseCache.makeKey(userMessage, options.noteContext);
      responseCache.set(cacheKey, sanitizeMarkdown(fullResponse), langResult.code);
    }
  },

  /**
   * Clear the response cache.
   */
  clearCache(): void {
    responseCache.clear();
  },

  /**
   * Get name of active provider for UI display.
   */
  getActiveProviderName(): string {
    return chatAIGateway.getActiveProvider().name;
  },
};

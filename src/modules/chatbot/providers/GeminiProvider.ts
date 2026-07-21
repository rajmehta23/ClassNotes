import type { IAIProvider, AIProviderMessage, AIProviderOptions } from './types';

/**
 * GeminiProvider — Fallback provider that wraps the existing geminiService.
 *
 * This adapter delegates to the same Google AI Studio endpoint but uses
 * Gemini models (gemini-2.5-flash / gemini-1.5-flash). It provides a
 * clean IAIProvider interface over the existing REST call pattern.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODEL = 'gemini-1.5-flash';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 2048;

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key || typeof key !== 'string' || key.trim() === '') {
    throw new Error('API key not configured. Set VITE_GEMINI_API_KEY in .env');
  }
  return key.trim();
}

export class GeminiProvider implements IAIProvider {
  readonly name = 'gemini';

  async sendMessage(
    messages: AIProviderMessage[],
    options: AIProviderOptions = {}
  ): Promise<string> {
    const apiKey = getApiKey();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const temperature = options.temperature ?? DEFAULT_TEMPERATURE;
    const maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_TOKENS;

    // Build system prompt
    let systemPrompt = options.systemInstruction || 
      `You are the official AI Study Chatbot for ClassNotes, a collaborative academic platform.
Your role is to help students with their studies, lecture notes, exam prep, course concepts, and platform questions.
Be friendly, concise, encouraging, clear, and structured in your responses. Use markdown formatting where helpful.`;

    if (options.noteContext && options.noteContext.trim()) {
      systemPrompt += `\n\n[CURRENTLY ACTIVE NOTE CONTEXT]\n${options.noteContext.trim()}\n`;
    }

    // Convert to Gemini conversation format
    const conversationHistory = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'Student' : 'AI Assistant'}: ${m.content}`)
      .join('\n\n');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (options.signal) {
      if (options.signal.aborted) {
        clearTimeout(timeoutId);
        throw new Error('Request was cancelled.');
      }
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await this.callApi(
        GEMINI_MODEL, apiKey, systemPrompt, conversationHistory,
        temperature, maxOutputTokens, controller.signal
      );

      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);

      // Retry with fallback model on certain errors
      if (err.name !== 'AbortError') {
        try {
          return await this.callApi(
            GEMINI_FALLBACK_MODEL, apiKey, systemPrompt, conversationHistory,
            temperature, maxOutputTokens, options.signal || null
          );
        } catch {
          // Fall through to throw original error
        }
      }

      if (err.name === 'AbortError') {
        throw new Error('Request was cancelled or timed out.');
      }
      throw err;
    }
  }

  /**
   * Streaming via SSE — same pattern as GemmaProvider but targeting Gemini models.
   */
  async *streamMessage(
    messages: AIProviderMessage[],
    options: AIProviderOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const apiKey = getApiKey();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const temperature = options.temperature ?? DEFAULT_TEMPERATURE;
    const maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_TOKENS;

    let systemPrompt = options.systemInstruction ||
      `You are the official AI Study Chatbot for ClassNotes. Help students with studies. Be friendly and concise.`;

    if (options.noteContext && options.noteContext.trim()) {
      systemPrompt += `\n\n[CURRENTLY ACTIVE NOTE CONTEXT]\n${options.noteContext.trim()}\n`;
    }

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (options.signal) {
      if (options.signal.aborted) { clearTimeout(timeoutId); throw new Error('Cancelled.'); }
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature, maxOutputTokens },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini streaming error (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Streaming not supported.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') return;

          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunk) yield chunk;
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') return;
      throw err;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = getApiKey();
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}?key=${apiKey}`,
        { method: 'GET', signal: AbortSignal.timeout(5000) }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private async callApi(
    model: string,
    apiKey: string,
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxOutputTokens: number,
    signal: AbortSignal | null
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt.trim()}\n\n--- INPUT ---\n${userPrompt.trim()}` }],
          },
        ],
        generationConfig: { temperature, maxOutputTokens },
      }),
    };

    if (signal) {
      fetchOptions.signal = signal;
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`Gemini API error (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      throw new Error('Empty response from Gemini.');
    }

    return text.trim();
  }
}

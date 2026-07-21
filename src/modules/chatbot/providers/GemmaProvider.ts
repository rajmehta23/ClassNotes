import type { IAIProvider, AIProviderMessage, AIProviderOptions } from './types';

/**
 * GemmaProvider — Primary AI provider using Gemma 3 (27B-IT) via Google AI Studio.
 *
 * Uses the same generativelanguage.googleapis.com endpoint as Gemini, but targets
 * the gemma-3-27b-it model. Supports both non-streaming and SSE streaming.
 *
 * Multilingual system prompt instructs the model to detect and reply in the
 * user's language automatically across 10 Indian languages + English.
 */

const GEMMA_MODEL = 'gemma-3-27b-it';
const GEMMA_FALLBACK_MODEL = 'gemma-3-12b-it';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_TOKENS = 4096;

const MULTILINGUAL_SYSTEM_INSTRUCTION = `You are the official AI Study Chatbot for ClassNotes, a collaborative academic platform.
Your role is to help students with their studies, lecture notes, exam prep, course concepts, and platform questions.

LANGUAGE RULES (CRITICAL):
- You MUST detect the language the student is writing in.
- You MUST reply in the SAME language the student used.
- You support: English, Hindi (हिन्दी), Bengali (বাংলা), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), Gujarati (ગુજરાતી), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Punjabi (ਪੰਜਾਬੀ).
- If the student writes in Hindi, reply entirely in Hindi. If in Tamil, reply entirely in Tamil. And so on.
- If the student mixes languages (e.g., Hinglish), reply in the same mixed style.
- NEVER switch to English unless the student writes in English.

BEHAVIOR RULES:
- Be friendly, concise, encouraging, clear, and structured.
- Use markdown formatting where helpful (headers, bold, lists, code blocks).
- If the student asks about something not in the provided note context, say so politely. NEVER hallucinate.
- For ClassNotes platform questions (attendance, assignments, rewards, requests), answer from your knowledge of the platform features.
- Support math formatting with LaTeX when relevant.`;

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key || typeof key !== 'string' || key.trim() === '') {
    throw new Error('API key not configured. Set VITE_GEMINI_API_KEY in .env');
  }
  return key.trim();
}

function buildRequestBody(
  messages: AIProviderMessage[],
  options: AIProviderOptions = {},
  model: string = GEMMA_MODEL
) {
  const systemInstruction = options.systemInstruction || MULTILINGUAL_SYSTEM_INSTRUCTION;

  // Build note context block
  let contextBlock = '';
  if (options.noteContext && options.noteContext.trim()) {
    contextBlock = `\n\n[CURRENTLY ACTIVE NOTE CONTEXT]\n${options.noteContext.trim()}\n`;
  }

  // Build language hint
  let languageHint = '';
  if (options.languageCode && options.languageCode !== 'en') {
    const langNames: Record<string, string> = {
      hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu',
      mr: 'Marathi', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi',
    };
    const langName = langNames[options.languageCode] || options.languageCode;
    languageHint = `\n[DETECTED LANGUAGE: ${langName} — Reply in ${langName}]`;
  }

  const fullSystemPrompt = systemInstruction + contextBlock + languageHint;

  // Convert messages to Gemini/Gemma content format
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  return {
    model,
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}`,
    body: {
      system_instruction: {
        parts: [{ text: fullSystemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        maxOutputTokens: options.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
      },
    },
  };
}

export class GemmaProvider implements IAIProvider {
  readonly name = 'gemma';

  async sendMessage(
    messages: AIProviderMessage[],
    options: AIProviderOptions = {}
  ): Promise<string> {
    const apiKey = getApiKey();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const { url, body } = buildRequestBody(messages, options, GEMMA_MODEL);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Forward external signal
    if (options.signal) {
      if (options.signal.aborted) {
        clearTimeout(timeoutId);
        throw new Error('Request was cancelled.');
      }
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      let response = await fetch(`${url}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      // Fallback to smaller model on 404/400
      if (!response.ok && (response.status === 404 || response.status === 400)) {
        const { url: fbUrl, body: fbBody } = buildRequestBody(messages, options, GEMMA_FALLBACK_MODEL);
        response = await fetch(`${fbUrl}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fbBody),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('API quota exceeded. Please wait a moment before trying again.');
        }
        throw new Error(`Gemma API error (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text || typeof text !== 'string') {
        throw new Error('Received empty response from Gemma model.');
      }

      return text.trim();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Request was cancelled or timed out.');
      }
      throw err;
    }
  }

  async *streamMessage(
    messages: AIProviderMessage[],
    options: AIProviderOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const apiKey = getApiKey();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const { url, body } = buildRequestBody(messages, options, GEMMA_MODEL);

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
      let response = await fetch(
        `${url}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      // Fallback to smaller model
      if (!response.ok && (response.status === 404 || response.status === 400)) {
        const { url: fbUrl, body: fbBody } = buildRequestBody(messages, options, GEMMA_FALLBACK_MODEL);
        response = await fetch(
          `${fbUrl}:streamGenerateContent?alt=sse&key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fbBody),
            signal: controller.signal,
          }
        );
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemma streaming error (${response.status}): ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming not supported by browser.');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
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
            if (chunk) {
              yield chunk;
            }
          } catch {
            // Skip malformed SSE chunks
          }
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return; // Graceful stop on cancellation
      }
      throw err;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = getApiKey();
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}?key=${apiKey}`,
        { method: 'GET', signal: AbortSignal.timeout(5000) }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

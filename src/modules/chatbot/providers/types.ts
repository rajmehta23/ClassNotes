/**
 * IAIProvider — Contract every AI provider must implement.
 * Adding a new provider (e.g., Mistral) requires only implementing this interface
 * and registering it in chatbotConfig.ts.
 */

export interface AIProviderMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIProviderOptions {
  /** System instruction prepended to conversation */
  systemInstruction?: string;
  /** Sampling temperature (0–2) */
  temperature?: number;
  /** Max tokens in response */
  maxOutputTokens?: number;
  /** Request timeout in ms */
  timeoutMs?: number;
  /** External AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Optional note context to inject */
  noteContext?: string;
  /** Detected language code (ISO 639-1) */
  languageCode?: string;
}

export interface IAIProvider {
  /** Unique provider identifier (e.g., 'gemma', 'gemini', 'openai') */
  readonly name: string;

  /**
   * Send a non-streaming chat completion request.
   * Returns the full response text.
   */
  sendMessage(
    messages: AIProviderMessage[],
    options?: AIProviderOptions
  ): Promise<string>;

  /**
   * Send a streaming chat completion request.
   * Yields partial text chunks as they arrive.
   */
  streamMessage(
    messages: AIProviderMessage[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown>;

  /**
   * Health check — returns true if this provider is configured and reachable.
   */
  isAvailable(): Promise<boolean>;
}

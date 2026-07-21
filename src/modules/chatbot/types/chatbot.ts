/**
 * Chatbot-specific types used across the chatbot module.
 */

/** ISO 639-1 language codes supported by the chatbot */
export type SupportedLanguageCode =
  | 'en' // English
  | 'hi' // Hindi
  | 'bn' // Bengali
  | 'ta' // Tamil
  | 'te' // Telugu
  | 'mr' // Marathi
  | 'gu' // Gujarati
  | 'kn' // Kannada
  | 'ml' // Malayalam
  | 'pa'; // Punjabi

export interface LanguageDetectionResult {
  code: SupportedLanguageCode;
  name: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface CachedResponse {
  response: string;
  cachedAt: number;
  languageCode: SupportedLanguageCode;
}

export interface StreamingState {
  isStreaming: boolean;
  streamingText: string;
  abortController: AbortController | null;
}

export interface ChatServiceOptions {
  noteContext?: string;
  signal?: AbortSignal;
  streaming?: boolean;
  onChunk?: (chunk: string) => void;
}

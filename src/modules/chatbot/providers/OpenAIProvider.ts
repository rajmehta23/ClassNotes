import type { IAIProvider, AIProviderMessage, AIProviderOptions } from './types';

/**
 * OpenAIProvider — Stub for OpenAI-compatible API (GPT-4o, GPT-4, etc.)
 *
 * To activate:
 * 1. Set VITE_OPENAI_API_KEY in .env
 * 2. Change chatbotConfig.ts activeProvider to 'openai'
 * 3. Implement sendMessage / streamMessage below
 */
export class OpenAIProvider implements IAIProvider {
  readonly name = 'openai';

  async sendMessage(
    _messages: AIProviderMessage[],
    _options?: AIProviderOptions
  ): Promise<string> {
    throw new Error('OpenAI provider is not yet implemented. Set a different provider in chatbotConfig.ts.');
  }

  async *streamMessage(
    _messages: AIProviderMessage[],
    _options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown> {
    throw new Error('OpenAI streaming is not yet implemented.');
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}

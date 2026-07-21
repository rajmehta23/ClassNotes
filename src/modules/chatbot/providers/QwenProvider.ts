import type { IAIProvider, AIProviderMessage, AIProviderOptions } from './types';

/**
 * QwenProvider — Stub for Alibaba Qwen models.
 *
 * To activate:
 * 1. Set VITE_QWEN_API_KEY in .env
 * 2. Change chatbotConfig.ts activeProvider to 'qwen'
 * 3. Implement sendMessage / streamMessage below
 */
export class QwenProvider implements IAIProvider {
  readonly name = 'qwen';

  async sendMessage(
    _messages: AIProviderMessage[],
    _options?: AIProviderOptions
  ): Promise<string> {
    throw new Error('Qwen provider is not yet implemented. Set a different provider in chatbotConfig.ts.');
  }

  async *streamMessage(
    _messages: AIProviderMessage[],
    _options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown> {
    throw new Error('Qwen streaming is not yet implemented.');
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}

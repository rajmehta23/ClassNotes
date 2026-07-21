import type { IAIProvider, AIProviderMessage, AIProviderOptions } from './types';

/**
 * ClaudeProvider — Stub for Anthropic Claude models.
 *
 * To activate:
 * 1. Set VITE_CLAUDE_API_KEY in .env
 * 2. Change chatbotConfig.ts activeProvider to 'claude'
 * 3. Implement sendMessage / streamMessage below
 */
export class ClaudeProvider implements IAIProvider {
  readonly name = 'claude';

  async sendMessage(
    _messages: AIProviderMessage[],
    _options?: AIProviderOptions
  ): Promise<string> {
    throw new Error('Claude provider is not yet implemented. Set a different provider in chatbotConfig.ts.');
  }

  async *streamMessage(
    _messages: AIProviderMessage[],
    _options?: AIProviderOptions
  ): AsyncGenerator<string, void, unknown> {
    throw new Error('Claude streaming is not yet implemented.');
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}

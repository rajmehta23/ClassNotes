import { useCallback, useRef } from 'react';
import { useAIStore } from '@/features/ai/useAIStore';
import { chatService } from '../services/chatService';
import { CHATBOT_CONFIG } from '../config/chatbotConfig';

/**
 * useChatbot — React hook that replaces direct geminiService calls in AIChatbot.
 *
 * Provides:
 * - sendMessage(text) — streaming or non-streaming chat
 * - stopGeneration() — cancel in-flight request
 * - retryLast() — re-send last user message
 * - regenerateLast() — remove old response, re-send
 * - isStreaming, streamingText, error state
 *
 * Cancels previous request automatically on new message.
 */
export function useChatbot() {
  const activeNoteText = useAIStore((s) => s.activeNoteText);
  const chatMessages = useAIStore((s) => s.chatMessages);
  const addChatMessage = useAIStore((s) => s.addChatMessage);
  const setStreamingText = useAIStore((s) => s.setStreamingText);
  const streamingText = useAIStore((s) => s.streamingText);
  const removeLastAssistantMessage = useAIStore((s) => s.removeLastAssistantMessage);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(false);

  /**
   * Send a message through the modular AI pipeline.
   */
  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim() || isStreamingRef.current) return;

      // Cancel any previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      isStreamingRef.current = true;

      // Build conversation history from store
      const history = chatMessages
        .filter((m) => m.type === 'text')
        .slice(-CHATBOT_CONFIG.maxConversationHistory)
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      try {
        if (CHATBOT_CONFIG.enableStreaming) {
          // Streaming path
          setStreamingText('');
          let accumulated = '';

          for await (const chunk of chatService.streamMessage(
            history,
            text,
            {
              noteContext: activeNoteText || undefined,
              signal: controller.signal,
            }
          )) {
            if (controller.signal.aborted) break;
            accumulated += chunk;
            setStreamingText(accumulated);
          }

          // Commit final message
          if (accumulated.trim()) {
            addChatMessage({
              role: 'assistant',
              content: accumulated.trim(),
              type: 'text',
            });
          }
          setStreamingText('');
        } else {
          // Non-streaming path
          setStreamingText('⏳');

          const result = await chatService.sendMessage(
            history,
            text,
            {
              noteContext: activeNoteText || undefined,
              signal: controller.signal,
            }
          );

          addChatMessage({
            role: 'assistant',
            content: result.response,
            type: 'text',
          });
          setStreamingText('');
        }
      } catch (err: any) {
        setStreamingText('');

        if (err.name === 'AbortError' || err.message?.includes('cancelled') || err.message?.includes('aborted')) {
          // User intentionally stopped — don't show error
          return;
        }

        addChatMessage({
          role: 'assistant',
          content: `⚠️ AI service is temporarily unavailable. ${err.message || 'Please try again.'}`,
          type: 'text',
        });
      } finally {
        isStreamingRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [chatMessages, activeNoteText, addChatMessage, setStreamingText]
  );

  /**
   * Stop the current streaming generation.
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isStreamingRef.current = false;

    // Commit whatever was streamed so far
    const currentStreaming = useAIStore.getState().streamingText;
    if (currentStreaming && currentStreaming.trim() && currentStreaming !== '⏳') {
      addChatMessage({
        role: 'assistant',
        content: currentStreaming.trim() + '\n\n*[Generation stopped]*',
        type: 'text',
      });
    }
    setStreamingText('');
  }, [addChatMessage, setStreamingText]);

  /**
   * Retry the last user message (on error).
   */
  const retryLast = useCallback(async () => {
    const lastUserMsg = [...chatMessages]
      .reverse()
      .find((m) => m.role === 'user');
    if (lastUserMsg) {
      await sendMessage(lastUserMsg.content);
    }
  }, [chatMessages, sendMessage]);

  /**
   * Regenerate: remove last assistant message, re-send last user message.
   */
  const regenerateLast = useCallback(async () => {
    removeLastAssistantMessage();
    const lastUserMsg = [...chatMessages]
      .reverse()
      .find((m) => m.role === 'user');
    if (lastUserMsg) {
      await sendMessage(lastUserMsg.content);
    }
  }, [chatMessages, removeLastAssistantMessage, sendMessage]);

  return {
    sendMessage,
    stopGeneration,
    retryLast,
    regenerateLast,
    isStreaming: isStreamingRef.current,
    streamingText,
  };
}

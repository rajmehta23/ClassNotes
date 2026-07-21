import { useMutation, useQueryClient } from '@tanstack/react-query';
import { geminiService, GeminiError } from '@/services/ai/gemini';
import type { SummaryResponse, QuizPayload } from '@/services/ai/prompts';
import { useAIStore } from '@/features/ai/useAIStore';

/**
 * Hook to summarize the currently active note
 */
export function useSummarizeNote() {
  const queryClient = useQueryClient();
  const activeNote = useAIStore((s) => s.activeNote);
  const activeNoteText = useAIStore((s) => s.activeNoteText);

  return useMutation<SummaryResponse, GeminiError, void>({
    mutationKey: ['ai', 'summarize', activeNote?.id],
    mutationFn: async () => {
      const cacheKey = ['ai-cache', 'summary', activeNote?.id];
      const cached = queryClient.getQueryData<SummaryResponse>(cacheKey);
      if (cached) return cached;

      if (!activeNoteText || activeNoteText.trim().length === 0) {
        throw new GeminiError('Note content is empty. Cannot generate summary.', 'EMPTY_NOTE');
      }

      const res = await geminiService.summarizeNote(activeNoteText);
      queryClient.setQueryData(cacheKey, res);
      return res;
    },
    retry: 1
  });
}

/**
 * Hook to explain selected text
 */
export function useExplainText() {
  const queryClient = useQueryClient();

  return useMutation<string, GeminiError, string>({
    mutationFn: async (textToExplain: string) => {
      if (!textToExplain || textToExplain.trim().length === 0) {
        throw new GeminiError('Please provide or select text to explain.', 'EMPTY_SELECTION');
      }
      const cacheKey = ['ai-cache', 'explain', textToExplain.trim()];
      const cached = queryClient.getQueryData<string>(cacheKey);
      if (cached) return cached;

      const res = await geminiService.explainText(textToExplain);
      queryClient.setQueryData(cacheKey, res);
      return res;
    },
    retry: 1
  });
}

/**
 * Hook to ask questions about the current note
 */
export function useAskNote() {
  const activeNoteText = useAIStore((s) => s.activeNoteText);

  return useMutation<string, GeminiError, string>({
    mutationFn: async (question: string) => {
      if (!activeNoteText || activeNoteText.trim().length === 0) {
        throw new GeminiError('No active note selected. Please select a note to ask questions.', 'NO_ACTIVE_NOTE');
      }
      if (!question || question.trim().length === 0) {
        throw new GeminiError('Please enter a question.', 'EMPTY_QUESTION');
      }

      return await geminiService.askNote(activeNoteText, question);
    },
    retry: 1
  });
}

/**
 * Hook to generate 5 MCQs for the current note
 */
export function useGenerateQuiz() {
  const queryClient = useQueryClient();
  const activeNote = useAIStore((s) => s.activeNote);
  const activeNoteText = useAIStore((s) => s.activeNoteText);

  return useMutation<QuizPayload, GeminiError, void>({
    mutationKey: ['ai', 'quiz', activeNote?.id],
    mutationFn: async () => {
      const cacheKey = ['ai-cache', 'quiz', activeNote?.id];
      const cached = queryClient.getQueryData<QuizPayload>(cacheKey);
      if (cached) return cached;

      if (!activeNoteText || activeNoteText.trim().length === 0) {
        throw new GeminiError('Note content is empty. Cannot generate quiz.', 'EMPTY_NOTE');
      }

      const res = await geminiService.generateQuiz(activeNoteText);
      queryClient.setQueryData(cacheKey, res);
      return res;
    },
    retry: 1
  });
}

import { 
  SUMMARIZE_SYSTEM_PROMPT, 
  EXPLAIN_SYSTEM_PROMPT, 
  ASK_NOTE_SYSTEM_PROMPT, 
  QUIZ_SYSTEM_PROMPT,
  type SummaryResponse,
  type QuizPayload
} from './prompts';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODEL = 'gemini-1.5-flash';
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
const MAX_NOTE_LENGTH = 150000; // ~150k chars safety cutoff

export class GeminiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'GeminiError';
  }
}

/**
 * Gets the Gemini API key from environment variables
 */
function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key || typeof key !== 'string' || key.trim() === '') {
    throw new GeminiError(
      'Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.',
      'MISSING_KEY'
    );
  }
  return key.trim();
}

/**
 * Base fetcher wrapper for Google Gemini REST API with timeout, retry, and error mapping
 */
async function callGeminiApi(
  systemPrompt: string,
  userPrompt: string,
  responseSchemaJson: boolean = false,
  isRetry: boolean = false
): Promise<string> {
  const apiKey = getApiKey();
  const modelToUse = isRetry ? GEMINI_FALLBACK_MODEL : GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;

  // Check network connection online state
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new GeminiError('No internet connection. Please check your network and try again.', 'NO_INTERNET');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const requestBody: any = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${systemPrompt.trim()}\n\n--- INPUT CONTENT ---\n${userPrompt.trim()}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    }
  };

  if (responseSchemaJson) {
    requestBody.generationConfig.responseMimeType = 'application/json';
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        throw new GeminiError('API quota exceeded. Please wait a moment before trying again.', 'QUOTA_EXCEEDED');
      }
      if (response.status === 400 || response.status === 404) {
        if (!isRetry) {
          // Retry once with fallback model
          return await callGeminiApi(systemPrompt, userPrompt, responseSchemaJson, true);
        }
        throw new GeminiError(`Invalid request or model unavailable (${response.status}).`, 'INVALID_REQUEST');
      }
      if (response.status >= 500) {
        if (!isRetry) {
          return await callGeminiApi(systemPrompt, userPrompt, responseSchemaJson, true);
        }
        throw new GeminiError('Gemini service is temporarily unavailable. Please try again later.', 'SERVER_ERROR');
      }
      const errText = await response.text().catch(() => '');
      throw new GeminiError(`Gemini API Error (${response.status}): ${errText || response.statusText}`, 'API_ERROR');
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText || typeof candidateText !== 'string') {
      throw new GeminiError('Received invalid or empty response from AI model.', 'EMPTY_RESPONSE');
    }

    return candidateText.trim();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error instanceof GeminiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new GeminiError('AI request timed out. Please try again with a shorter prompt or text.', 'TIMEOUT');
    }

    if (!isRetry) {
      // Automatic 1-time retry on unexpected fetch errors
      try {
        return await callGeminiApi(systemPrompt, userPrompt, responseSchemaJson, true);
      } catch (retryError) {
        if (retryError instanceof GeminiError) throw retryError;
      }
    }

    throw new GeminiError(error.message || 'Failed to communicate with AI service.', 'UNKNOWN_ERROR');
  }
}

/**
 * Truncate input text safely if it exceeds max size limit
 */
function sanitizeInputText(text: string): string {
  if (!text || text.trim().length === 0) {
    throw new GeminiError('Note content is empty. Cannot process empty notes.', 'EMPTY_NOTE');
  }
  if (text.length > MAX_NOTE_LENGTH) {
    return text.substring(0, MAX_NOTE_LENGTH) + '\n\n[Note content truncated due to size limits]';
  }
  return text;
}

/**
 * Helper to strip markdown JSON formatting ticks if model wraps JSON output
 */
function cleanJsonText(rawText: string): string {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

export const geminiService = {
  /**
   * 1. Summarize Note
   */
  async summarizeNote(noteText: string): Promise<SummaryResponse> {
    const sanitized = sanitizeInputText(noteText);
    const rawJson = await callGeminiApi(SUMMARIZE_SYSTEM_PROMPT, sanitized, true);
    
    try {
      const parsed = JSON.parse(cleanJsonText(rawJson));
      return {
        summary: parsed.summary || 'Summary unavailable.',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : []
      };
    } catch {
      // Fallback if model returned plain markdown text instead of strict JSON
      return {
        summary: rawJson,
        keyPoints: []
      };
    }
  },

  /**
   * 2. Explain Selected Text
   */
  async explainText(selectedText: string): Promise<string> {
    if (!selectedText || selectedText.trim().length === 0) {
      throw new GeminiError('Please select or enter text to explain.', 'EMPTY_SELECTION');
    }
    const sanitized = sanitizeInputText(selectedText);
    return await callGeminiApi(EXPLAIN_SYSTEM_PROMPT, sanitized, false);
  },

  /**
   * 3. Ask Question About Current Note
   */
  async askNote(noteText: string, question: string): Promise<string> {
    if (!question || question.trim().length === 0) {
      throw new GeminiError('Please enter a question.', 'EMPTY_QUESTION');
    }
    const sanitizedNote = sanitizeInputText(noteText);
    const combinedPrompt = `[NOTE CONTENT]\n${sanitizedNote}\n\n[STUDENT QUESTION]\n${question.trim()}`;
    return await callGeminiApi(ASK_NOTE_SYSTEM_PROMPT, combinedPrompt, false);
  },

  /**
   * 4. Generate 5 MCQ Quiz
   */
  async generateQuiz(noteText: string): Promise<QuizPayload> {
    const sanitized = sanitizeInputText(noteText);
    const rawJson = await callGeminiApi(QUIZ_SYSTEM_PROMPT, sanitized, true);
    
    try {
      const parsed = JSON.parse(cleanJsonText(rawJson));
      if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error('Invalid quiz structure');
      }

      // Ensure each question has 4 options and valid correct answer index
      const questions = parsed.questions.slice(0, 5).map((q: any) => ({
        question: String(q.question || 'Untitled Question'),
        options: (Array.isArray(q.options) && q.options.length >= 4 
          ? q.options.slice(0, 4) 
          : ['Option A', 'Option B', 'Option C', 'Option D']) as [string, string, string, string],
        correctAnswerIndex: typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex <= 3
          ? q.correctAnswerIndex
          : 0
      }));

      return { questions };
    } catch {
      throw new GeminiError('Failed to parse generated quiz structure. Please try again.', 'PARSE_ERROR');
    }
  },

  /**
   * 5. Interactive Chatbot Multi-Turn Conversation
   */
  async chatWithGemini(
    messages: { role: 'user' | 'assistant'; content: string }[],
    noteContext?: string
  ): Promise<string> {
    const systemPrompt = `You are the official AI Study Chatbot for ClassNotes, a collaborative academic platform.
Your role is to help students with their studies, lecture notes, exam prep, course concepts, and platform questions.
Be friendly, concise, encouraging, clear, and structured in your responses. Use markdown formatting where helpful.

${noteContext && noteContext.trim() ? `[CURRENTLY ACTIVE NOTE CONTEXT]\n${sanitizeInputText(noteContext)}\n` : ''}`;

    const conversationHistory = messages.map(m => `${m.role === 'user' ? 'Student' : 'AI Assistant'}: ${m.content}`).join('\n\n');

    return await callGeminiApi(systemPrompt, conversationHistory, false);
  }
};


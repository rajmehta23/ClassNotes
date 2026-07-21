export interface AIGatewayRequest {
  prompt: string;
  systemInstruction?: string;
  responseSchema?: any;
  temperature?: number;
  maxOutputTokens?: number;
  maxTokens?: number;
  model?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface AIGatewayResponse<T = any> {
  success: boolean;
  data?: T;
  rawText?: string;
  cached?: boolean;
  fallback?: boolean;
  error?: string;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  topic?: string;
}

export interface DiagnosticQuiz {
  id: string;
  noteId: string;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizResult {
  quizId: string;
  answers: number[]; // Index of chosen options
  score: number; // Percentage or fraction
  confidenceScore: number; // 0 to 100
  strongTopics: string[];
  weakTopics: string[];
  recommendedPractice: string[];
  studyTime: number; // In minutes
  completedAt: string;
}

export interface EssayRubric {
  grammarWeight: number; // Percentage (e.g., 20)
  vocabularyWeight: number; // Percentage
  structureWeight: number; // Percentage
  contentWeight: number; // Percentage
  creativityWeight: number; // Percentage
}

export interface SuggestionItem {
  originalText: string;
  suggestedText: string;
  explanation: string;
}

export interface EssayEvaluation {
  id: string;
  submissionId: string;
  assignmentId: string;
  studentId: string;
  overallScore: number; // e.g. out of 100
  rubricBreakdown: {
    grammar: { score: number; feedback: string };
    vocabulary: { score: number; feedback: string };
    structure: { score: number; feedback: string };
    content: { score: number; feedback: string };
    creativity: { score: number; feedback: string };
  };
  paragraphFeedback: string[];
  grammarSuggestions: SuggestionItem[];
  vocabularySuggestions: SuggestionItem[];
  improvementPlan: string[];
  published: boolean;
  evaluatedAt: string;
  editedByTeacher?: boolean;
}

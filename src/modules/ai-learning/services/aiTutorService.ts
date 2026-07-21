import type { DiagnosticQuiz, QuizQuestion, QuizResult } from '@/modules/shared/types/ai';
import { aiGateway } from '@/modules/shared/services/aiGateway';

const QUIZ_CACHE_PREFIX = 'classnotes_quiz_cache_';
const QUIZ_RESULT_PREFIX = 'classnotes_quiz_result_';

export interface NoteExplanation {
  summary: string;
  keyPoints: string[];
  takeaways: string;
}

export class AITutorService {
  /**
   * Generates or retrieves a cached 5-question diagnostic quiz.
   */
  async generateDiagnosticQuiz(
    noteId: string,
    noteTitle: string,
    noteDescription?: string
  ): Promise<DiagnosticQuiz> {
    // 1. Check local cache first
    const cached = this.getCachedQuiz(noteId);
    if (cached) {
      return cached;
    }

    // 2. Route request through AI Gateway
    const prompt = `Generate a 5-question multiple choice diagnostic quiz for the study note titled "${noteTitle}". Description: ${noteDescription || 'General STEM concepts'}. Return valid JSON array of 5 objects with keys: question, options (array of 4 strings), correctOptionIndex (0-3), explanation, topic.`;

    const gatewayRes = await aiGateway.request<QuizQuestion[]>({
      prompt,
      model: 'gemini-1.5-flash',
      temperature: 0.5,
    });

    let questions: QuizQuestion[] = [];

    if (!gatewayRes.fallback && Array.isArray(gatewayRes.data) && gatewayRes.data.length >= 3) {
      questions = gatewayRes.data;
    } else {
      // Fallback to Modular Local Engine
      questions = this.generateLocalFallbackQuestions(noteTitle);
    }

    const quiz: DiagnosticQuiz = {
      id: `quiz_${noteId}`,
      noteId,
      questions,
      createdAt: new Date().toISOString(),
    };

    // 3. Cache generated quiz
    this.cacheQuiz(quiz);

    return quiz;
  }

  /**
   * Analyzes student answers to compute overall score, confidence index, weak/strong topics, and practice recommendations.
   */
  async analyzeQuizAttempt(
    quiz: DiagnosticQuiz,
    userAnswers: number[] // index of selected option per question
  ): Promise<QuizResult> {
    let correctCount = 0;
    const strongTopicsSet = new Set<string>();
    const weakTopicsSet = new Set<string>();

    quiz.questions.forEach((q, idx) => {
      const topicName = q.topic || `Concept ${idx + 1}`;
      if (userAnswers[idx] === q.correctOptionIndex) {
        correctCount++;
        strongTopicsSet.add(topicName);
      } else {
        weakTopicsSet.add(topicName);
      }
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const confidenceScore = Math.min(100, Math.max(20, Math.round(score * 0.95 + 5)));

    const strongTopics = Array.from(strongTopicsSet);
    const weakTopics = Array.from(weakTopicsSet);

    const recommendedPractice = weakTopics.length > 0
      ? weakTopics.map((t) => `Review core definitions & formulas for: ${t}`)
      : ['Excellent mastery! Move on to advanced problem sets and practice applications.'];

    const studyTime = Math.max(10, weakTopics.length * 15);

    const result: QuizResult = {
      quizId: quiz.id,
      answers: userAnswers,
      score,
      confidenceScore,
      weakTopics,
      strongTopics,
      recommendedPractice,
      studyTime,
      completedAt: new Date().toISOString(),
    };

    // Cache quiz attempt result
    this.cacheResult(result);

    return result;
  }

  async explainNote(noteTitle: string, noteDescription?: string): Promise<NoteExplanation> {
    const prompt = `Explain the key concepts of the study note titled "${noteTitle}". Description: ${noteDescription || 'N/A'}. Return valid JSON object with keys: summary (string), keyPoints (array of 3 strings), takeaways (string).`;

    const gatewayRes = await aiGateway.request<NoteExplanation>({
      prompt,
      model: 'gemini-1.5-flash',
    });

    if (!gatewayRes.fallback && gatewayRes.data && typeof gatewayRes.data.summary === 'string') {
      return gatewayRes.data;
    }

    return {
      summary: noteDescription || `This study note details foundational concepts, operational definitions, and analytical principles for ${noteTitle}.`,
      keyPoints: [
        'Pillar A (Theoretical Foundation): Conceptual framing and baseline mathematical/logical models.',
        'Pillar B (Practical Application): Step-by-step problem-solving methods and case scenarios.',
        'Pillar C (System Optimization): Evaluation of system constraints, edge cases, and performance.',
      ],
      takeaways: 'Memorize core equations and terminology definitions. Review step-by-step derivations for midterm problem sets.',
    };
  }

  async askAIQuestion(noteTitle: string, question: string): Promise<string> {
    const prompt = `As an AI Tutor, answer this question about the study note titled "${noteTitle}": ${question}. Provide a concise, clear 2-3 paragraph answer.`;

    const gatewayRes = await aiGateway.request<string>({
      prompt,
      model: 'gemini-1.5-flash',
    });

    if (!gatewayRes.fallback && typeof gatewayRes.data === 'string' && gatewayRes.data.trim()) {
      return gatewayRes.data;
    }

    return `Great question regarding **${noteTitle}**!\n\n` +
      `Regarding "${question}":\n` +
      `1. **Primary Principle**: In ${noteTitle}, the primary mechanism functions by balancing systemic parameters against input conditions.\n` +
      `2. **Key Application**: When applying this concept, always verify baseline assumptions (e.g. boundary conditions, units, and initial states).\n\n` +
      `Let me know if you would like a step-by-step example or practice question on this topic!`;
  }

  // --- Caching Utilities ---
  getCachedQuiz(noteId: string): DiagnosticQuiz | null {
    try {
      const raw = localStorage.getItem(QUIZ_CACHE_PREFIX + noteId);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  cacheQuiz(quiz: DiagnosticQuiz) {
    try {
      localStorage.setItem(QUIZ_CACHE_PREFIX + quiz.noteId, JSON.stringify(quiz));
    } catch (err) {
      console.warn('Failed to cache quiz:', err);
    }
  }

  getCachedResult(quizId: string): QuizResult | null {
    try {
      const raw = localStorage.getItem(QUIZ_RESULT_PREFIX + quizId);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  cacheResult(result: QuizResult) {
    try {
      localStorage.setItem(QUIZ_RESULT_PREFIX + result.quizId, JSON.stringify(result));
    } catch (err) {
      console.warn('Failed to cache quiz result:', err);
    }
  }

  private generateLocalFallbackQuestions(noteTitle: string): QuizQuestion[] {
    return [
      {
        question: `What is the fundamental objective when analyzing ${noteTitle}?`,
        options: [
          'To establish baseline quantitative parameters and system constraints',
          'To bypass theoretical validation and assume ideal states',
          'To eliminate all variable parameters permanently',
          'To isolate isolated noise without evaluating core signal',
        ],
        correctOptionIndex: 0,
        explanation: 'Establishing baseline parameters and system constraints is essential for analytical modeling.',
        topic: 'Foundational Theory',
      },
      {
        question: `Which key law or principle governs operations in ${noteTitle}?`,
        options: [
          'Arbitrary empirical estimation',
          'Conservation of state and energy balance equations',
          'Randomized trial execution',
          'Static unvarying equilibrium',
        ],
        correctOptionIndex: 1,
        explanation: 'Conservation laws provide invariant balance equations governing system state transitions.',
        topic: 'Core Governing Laws',
      },
      {
        question: `When implementing practical solutions for ${noteTitle}, what step is essential?`,
        options: [
          'Ignoring boundary conditions',
          'Rigorous unit normalization and error threshold checks',
          'Skipping validation testing',
          'Using uncalibrated initial inputs',
        ],
        correctOptionIndex: 1,
        explanation: 'Normalization and error bound checking prevent numerical divergence in physical models.',
        topic: 'Practical Implementation',
      },
      {
        question: `How does increasing system load affect the stability of ${noteTitle}?`,
        options: [
          'It causes proportional response according to characteristic transfer curves',
          'It guarantees immediate failure under all circumstances',
          'It reduces system efficiency to zero instantly',
          'It has zero measurable effect',
        ],
        correctOptionIndex: 0,
        explanation: 'System response follows dynamic transfer functions up to operational saturation limits.',
        topic: 'System Dynamics',
      },
      {
        question: `What is a common pitfall when solving exam questions on ${noteTitle}?`,
        options: [
          'Confusing sign conventions or forgetting unit conversions',
          'Writing too clearly',
          'Checking intermediate values twice',
          'Following standard derivation steps',
        ],
        correctOptionIndex: 0,
        explanation: 'Sign errors and unit mismatches are the leading cause of computational mark loss.',
        topic: 'Exam Optimization',
      },
    ];
  }
}

export const aiTutorService = new AITutorService();

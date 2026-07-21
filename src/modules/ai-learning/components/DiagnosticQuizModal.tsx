import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, BrainCircuit, CheckCircle2, AlertCircle, RefreshCw, 
  Award, Clock, ChevronRight, Sparkles, Target
} from 'lucide-react';
import { aiTutorService } from '../services/aiTutorService';
import type { DiagnosticQuiz, QuizResult } from '@/modules/shared/types/ai';
import type { Note } from '@/types/database';

interface DiagnosticQuizModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticQuizModal: React.FC<DiagnosticQuizModalProps> = ({
  note,
  isOpen,
  onClose,
}) => {
  const [quiz, setQuiz] = useState<DiagnosticQuiz | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuiz = async () => {
    if (!note) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCurrentIdx(0);
    setSelectedAnswers({});

    try {
      const q = await aiTutorService.generateDiagnosticQuiz(note.id, note.title, note.description);
      setQuiz(q);
      const prevResult = aiTutorService.getCachedResult(q.id);
      if (prevResult) {
        setResult(prevResult);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate diagnostic quiz.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && note) {
      loadQuiz();
    }
  }, [isOpen, note]);

  if (!isOpen || !note) return null;

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    if (result) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIdx]: optionIdx,
    }));
  };

  const handleNext = async () => {
    if (!quiz) return;
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setIsLoading(true);
      const answerArray = quiz.questions.map((_, i) => selectedAnswers[i] ?? -1);
      const res = await aiTutorService.analyzeQuizAttempt(quiz, answerArray);
      setResult(res);
      setIsLoading(false);
    }
  };

  const currentQ = quiz?.questions[currentIdx];
  const isSelected = selectedAnswers[currentIdx] !== undefined;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-surface border border-border rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar relative text-primary"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <BrainCircuit size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono uppercase tracking-tight text-primary">
                  Diagnostic Quiz
                </h2>
                <p className="text-xs text-primary/60 font-sans truncate max-w-xs sm:max-w-sm">
                  {note.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-14 space-y-3">
              <Sparkles className="w-9 h-9 text-accent animate-spin mx-auto" />
              <p className="text-xs font-mono uppercase tracking-wider text-primary/70">
                Analyzing note concepts & building quiz...
              </p>
            </div>
          )}

          {/* Error & Retry */}
          {error && !isLoading && (
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl space-y-3">
              <div className="flex items-start gap-2 text-danger">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs font-mono">Quiz Generation Error</p>
                  <p className="text-xs font-sans opacity-80">{error}</p>
                </div>
              </div>
              <button
                onClick={loadQuiz}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-danger text-white text-xs font-mono font-bold rounded-lg cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Retry Quiz</span>
              </button>
            </div>
          )}

          {/* Diagnostic Result Screen */}
          {result && !isLoading && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-2xl space-y-3 text-center">
                <div className="inline-flex p-3 rounded-full bg-accent/10 text-accent mb-1">
                  <Award size={32} />
                </div>
                <h3 className="font-mono font-black text-xl text-primary uppercase">
                  Diagnostic Analysis Complete
                </h3>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-background border border-border/50 rounded-xl">
                    <span className="text-[10px] font-mono text-primary/50 uppercase block">
                      Score
                    </span>
                    <span className="text-2xl font-black font-mono text-accent">
                      {result.score}%
                    </span>
                  </div>
                  <div className="p-3 bg-background border border-border/50 rounded-xl">
                    <span className="text-[10px] font-mono text-primary/50 uppercase block">
                      Confidence Index
                    </span>
                    <span className="text-2xl font-black font-mono text-emerald-500">
                      {result.confidenceScore}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Strong Topics */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold uppercase text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Strong Concepts Mastered
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {result.strongTopics.length > 0 ? (
                    result.strongTopics.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-mono rounded-lg"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-primary/40 italic">None detected</span>
                  )}
                </div>
              </div>

              {/* Weak Topics */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold uppercase text-danger flex items-center gap-1">
                  <AlertCircle size={13} /> Weak Concepts Requiring Review
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {result.weakTopics.length > 0 ? (
                    result.weakTopics.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-danger/10 border border-danger/20 text-danger text-xs font-mono rounded-lg"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-emerald-500 font-mono">No weak topics! All clear.</span>
                  )}
                </div>
              </div>

              {/* Recommended Practice & Study Time */}
              <div className="p-4 bg-background border border-border/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-accent">
                  <span className="flex items-center gap-1.5">
                    <Target size={14} /> Recommended Practice Plan
                  </span>
                  <span className="flex items-center gap-1 text-primary/60">
                    <Clock size={13} /> ~{result.studyTime} mins
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-primary/80 font-sans list-disc pl-4">
                  {result.recommendedPractice.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setResult(null)}
                  className="px-4 py-2 text-xs font-mono font-semibold border border-border hover:bg-primary/5 rounded-xl cursor-pointer"
                >
                  Retake Quiz
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-mono font-bold bg-accent text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Active Question Wizard */}
          {quiz && !result && !isLoading && currentQ && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-primary/50">
                  <span>Question {currentIdx + 1} of {quiz.questions.length}</span>
                  <span>{currentQ.topic || 'Concept Verification'}</span>
                </div>
                <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${((currentIdx + 1) / quiz.questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-background border border-border/60 rounded-xl space-y-3">
                <p className="font-semibold text-sm text-primary leading-snug">
                  {currentQ.question}
                </p>

                <div className="space-y-2 pt-1">
                  {currentQ.options.map((opt, optIdx) => {
                    const isChosen = selectedAnswers[currentIdx] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(currentIdx, optIdx)}
                        className={`w-full text-left p-3 rounded-xl border text-xs font-sans transition-all flex items-center justify-between cursor-pointer ${
                          isChosen
                            ? 'bg-accent/10 border-accent text-accent font-semibold shadow-xs'
                            : 'bg-surface border-border/50 hover:border-accent/40 text-primary/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 pr-2">
                          <span className="font-mono text-[10px] font-bold opacity-60">
                            [{String.fromCharCode(65 + optIdx)}]
                          </span>
                          <span>{opt}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-mono text-primary/40">
                  Select answer to continue
                </span>
                <button
                  onClick={handleNext}
                  disabled={!isSelected}
                  className="px-5 py-2 bg-accent disabled:opacity-40 text-white text-xs font-mono font-bold rounded-xl shadow-xs hover:bg-accent/90 transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>{currentIdx === quiz.questions.length - 1 ? 'Finish & Analyze' : 'Next'}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

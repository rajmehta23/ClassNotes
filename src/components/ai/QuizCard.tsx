import React, { useState } from 'react';
import { useGenerateQuiz } from '@/hooks/useAI';
import { useAIStore } from '@/features/ai/useAIStore';
import { HelpCircle, Loader2, AlertCircle, RefreshCw, CheckCircle2, XCircle, BookOpen, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const QuizCard: React.FC = () => {
  const activeNote = useAIStore((s) => s.activeNote);
  const activeNoteText = useAIStore((s) => s.activeNoteText);
  const { mutate: generateQuiz, data, isPending, isError, error, reset } = useGenerateQuiz();
  
  // Track selected answer option for each question index: { [questionIdx]: selectedOptionIdx }
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  const handleOptionSelect = (qIdx: number, optionIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIdx]: optionIdx
    }));
  };

  const handleGenerate = () => {
    setSelectedAnswers({});
    generateQuiz();
  };

  if (!activeNote) {
    return (
      <div className="p-6 text-center space-y-3 bg-surface/50 border border-border/60 rounded-xl">
        <BookOpen className="w-8 h-8 text-primary/30 mx-auto" />
        <p className="text-xs font-semibold text-primary/70">No note selected</p>
        <p className="text-[11px] text-primary/45">
          Select or open a note to generate a 5-question practice quiz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Header Info */}
      <div className="p-3 bg-primary/5 border border-border/60 rounded-lg flex justify-between items-center">
        <div className="min-w-0 pr-2">
          <span className="text-[9px] font-mono uppercase text-accent font-bold tracking-wider">Active Note</span>
          <h4 className="font-bold text-primary truncate text-xs">{activeNote.title}</h4>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isPending || !activeNoteText}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-semibold rounded-md shadow-xs transition-all cursor-pointer text-[11px]"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {data ? 'Regenerate Quiz' : 'Generate 5 MCQs'}
        </button>
      </div>

      {/* Loading State */}
      {isPending && (
        <div className="p-6 bg-surface border border-border/60 rounded-xl space-y-4 animate-pulse">
          <div className="flex items-center gap-2 text-accent font-semibold text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating 5 multiple-choice questions...</span>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 pt-2">
              <div className="h-3.5 bg-primary/10 rounded w-5/6" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-7 bg-primary/5 rounded border border-border/40" />
                <div className="h-7 bg-primary/5 rounded border border-border/40" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl space-y-3">
          <div className="flex items-start gap-2 text-danger">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">Quiz Generation Failed</p>
              <p className="text-[11px] opacity-80">{error?.message || 'Failed to generate quiz.'}</p>
            </div>
          </div>
          <button
            onClick={() => { reset(); handleGenerate(); }}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-danger hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Retry once
          </button>
        </div>
      )}

      {/* Quiz Questions List */}
      {data && !isPending && (
        <div className="space-y-4">
          {data.questions.map((q, qIdx) => {
            const selectedOpt = selectedAnswers[qIdx];
            const isAnswered = selectedOpt !== undefined;

            return (
              <motion.div
                key={qIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: qIdx * 0.05 }}
                className="p-4 bg-surface border border-border/80 rounded-xl space-y-3 shadow-xs"
              >
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent/10 text-accent font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    Q{qIdx + 1}
                  </span>
                  <p className="font-semibold text-primary text-xs leading-snug">{q.question}</p>
                </div>

                <div className="space-y-2 pl-7">
                  {q.options.map((option, optIdx) => {
                    const isSelected = selectedOpt === optIdx;
                    const isCorrect = q.correctAnswerIndex === optIdx;

                    let btnStyle = 'border-border/60 hover:bg-primary/5 text-primary/80';
                    if (isAnswered) {
                      if (isCorrect) {
                        btnStyle = 'border-success/50 bg-success/10 text-success font-semibold';
                      } else if (isSelected && !isCorrect) {
                        btnStyle = 'border-danger/50 bg-danger/10 text-danger font-semibold';
                      }
                    }

                    const optionLabel = String.fromCharCode(65 + optIdx); // A, B, C, D

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleOptionSelect(qIdx, optIdx)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs cursor-pointer ${btnStyle}`}
                      >
                        <span className="flex items-center gap-2 pr-2">
                          <span className="font-mono text-[10px] font-bold opacity-60">[{optionLabel}]</span>
                          <span>{option}</span>
                        </span>

                        {isAnswered && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                        )}
                        {isAnswered && isSelected && !isCorrect && (
                          <XCircle className="w-4 h-4 text-danger shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Initial Empty Trigger Prompt */}
      {!data && !isPending && !isError && (
        <div className="p-6 text-center border border-dashed border-border rounded-xl space-y-3 bg-background/40">
          <HelpCircle className="w-6 h-6 text-accent mx-auto opacity-70" />
          <p className="text-xs text-primary/70 font-medium">Ready to generate 5 practice MCQs.</p>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg shadow-xs transition-all cursor-pointer text-xs"
          >
            Generate Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizCard;

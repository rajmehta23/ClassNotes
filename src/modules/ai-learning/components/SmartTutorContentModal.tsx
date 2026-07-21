import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FileText, BrainCircuit, HelpCircle, Eye, 
  CheckCircle2, XCircle, ChevronRight, Award, Play, Sparkles
} from 'lucide-react';
import type { SmartTutorPack } from '../data/smartTutorPacks';
import type { Note } from '@/types/database';

interface SmartTutorContentModalProps {
  pack: SmartTutorPack;
  activeTab: 'explain' | 'quiz' | 'practice' | 'visual';
  isOpen: boolean;
  onClose: () => void;
  note: Note;
}

export const SmartTutorContentModal: React.FC<SmartTutorContentModalProps> = ({
  pack,
  activeTab: initialTab,
  isOpen,
  onClose,
  note,
}) => {
  const [tab, setTab] = useState<'explain' | 'quiz' | 'practice' | 'visual'>(initialTab);

  // Quiz state
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Sync tab on opening
  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const currentQuestion = pack.quiz[currentQuizIdx];
  const totalQuestions = pack.quiz.length;

  const calculateScore = () => {
    let correct = 0;
    pack.quiz.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answer) correct++;
    });
    return Math.round((correct / totalQuestions) * 100);
  };

  return createPortal(
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md cursor-pointer"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-surface border border-border rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar relative text-primary flex flex-col cursor-default"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent shrink-0">
                <Sparkles size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold truncate flex items-center gap-2">
                  <span>{pack.topic}</span>
                </h3>
                <p className="text-xs text-primary/60 truncate font-mono">
                  Smart Tutor Resource for "{note.title}"
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-primary/5 rounded-xl text-primary/40 hover:text-primary transition-colors cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-background/60 border border-border/60 rounded-xl text-xs font-mono shrink-0 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setTab('explain')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                tab === 'explain'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-primary/70 hover:text-primary hover:bg-surface'
              }`}
            >
              <FileText size={14} />
              <span>Explain</span>
            </button>

            <button
              onClick={() => setTab('quiz')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                tab === 'quiz'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-primary/70 hover:text-primary hover:bg-surface'
              }`}
            >
              <BrainCircuit size={14} />
              <span>Practice Quiz ({pack.quiz.length} Qs)</span>
            </button>

            <button
              onClick={() => setTab('practice')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                tab === 'practice'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-primary/70 hover:text-primary hover:bg-surface'
              }`}
            >
              <HelpCircle size={14} />
              <span>Question Bank</span>
            </button>

            {pack.visualVideoUrl && (
              <button
                onClick={() => setTab('visual')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  tab === 'visual'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-primary/70 hover:text-primary hover:bg-surface'
                }`}
              >
                <Eye size={14} />
                <span>AI Visual Video</span>
              </button>
            )}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {/* TAB 1: EXPLAIN */}
            {tab === 'explain' && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/15 leading-relaxed text-xs text-primary/90">
                  <p className="font-semibold text-accent mb-1 font-mono uppercase text-[11px]">
                    Overview
                  </p>
                  {pack.explain.introduction}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pack.explain.sections.map((section, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-surface border border-border/70 space-y-1.5 shadow-xs"
                    >
                      <h4 className="font-bold text-xs text-primary flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        {section.title}
                      </h4>
                      <p className="text-[11px] text-primary/75 leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border/80 space-y-2">
                  <h4 className="font-bold text-xs text-accent font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={13} /> Key Takeaways Summary
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-primary/80 font-mono">
                    {pack.explain.summary.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-surface p-2 rounded-lg border border-border/40">
                        <CheckCircle2 size={13} className="text-success shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 2: QUIZ */}
            {tab === 'quiz' && (
              <div className="space-y-5">
                {!quizSubmitted ? (
                  <div className="space-y-4">
                    {/* Question header */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-accent">
                        Question {currentQuizIdx + 1} of {totalQuestions}
                      </span>
                      <span className="text-primary/50">
                        {Object.keys(selectedAnswers).length} answered
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-border/40 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-accent h-full transition-all duration-300"
                        style={{ width: `${((currentQuizIdx + 1) / totalQuestions) * 100}%` }}
                      />
                    </div>

                    {/* Question Card */}
                    <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-sm">
                      <h4 className="font-bold text-sm text-primary leading-snug">
                        {currentQuestion.question}
                      </h4>

                      <div className="space-y-2">
                        {currentQuestion.options.map((option, optIdx) => {
                          const isSelected = selectedAnswers[currentQuizIdx] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              onClick={() =>
                                setSelectedAnswers((prev) => ({
                                  ...prev,
                                  [currentQuizIdx]: optIdx,
                                }))
                              }
                              className={`w-full text-left p-3.5 rounded-xl border text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-accent/10 border-accent text-accent font-bold shadow-xs'
                                  : 'bg-background/40 border-border/70 hover:bg-surface text-primary/80'
                              }`}
                            >
                              <span>
                                <b>[{String.fromCharCode(65 + optIdx)}]</b> {option}
                              </span>
                              {isSelected && <CheckCircle2 size={16} className="text-accent shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer Nav Controls */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        disabled={currentQuizIdx === 0}
                        onClick={() => setCurrentQuizIdx((prev) => prev - 1)}
                        className="px-4 py-2 text-xs font-mono border border-border rounded-xl disabled:opacity-40 hover:bg-surface transition-colors cursor-pointer"
                      >
                        Previous
                      </button>

                      {currentQuizIdx < totalQuestions - 1 ? (
                        <button
                          onClick={() => setCurrentQuizIdx((prev) => prev + 1)}
                          className="px-4 py-2 bg-accent text-white text-xs font-mono font-bold rounded-xl hover:bg-accent/90 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>Next</span>
                          <ChevronRight size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setQuizSubmitted(true)}
                          className="px-5 py-2 bg-success text-white text-xs font-mono font-bold rounded-xl hover:bg-success/90 transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
                        >
                          <Award size={14} />
                          <span>Submit & Score</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Quiz Score Results View */
                  <div className="p-6 rounded-2xl bg-surface border border-border text-center space-y-5">
                    <div className="w-16 h-16 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto shadow-inner">
                      <Award size={36} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-primary font-mono">
                        Score: {calculateScore()}%
                      </h4>
                      <p className="text-xs text-primary/60 mt-1 font-mono">
                        Completed offline quiz for {pack.topic}
                      </p>
                    </div>

                    <div className="space-y-3 text-left pt-2">
                      <h5 className="text-xs font-bold font-mono uppercase text-accent">
                        Detailed Answer Review:
                      </h5>
                      {pack.quiz.map((q, qIdx) => {
                        const userAns = selectedAnswers[qIdx];
                        const isCorrect = userAns === q.answer;
                        return (
                          <div
                            key={qIdx}
                            className={`p-3 rounded-xl border text-xs space-y-1 ${
                              isCorrect
                                ? 'bg-success/5 border-success/30'
                                : 'bg-danger/5 border-danger/30'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>
                                Q{qIdx + 1}. {q.question}
                              </span>
                              {isCorrect ? (
                                <span className="text-success flex items-center gap-1 font-mono text-[11px]">
                                  <CheckCircle2 size={12} /> Correct
                                </span>
                              ) : (
                                <span className="text-danger flex items-center gap-1 font-mono text-[11px]">
                                  <XCircle size={12} /> Incorrect
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-primary/70">
                              <b>Correct Answer:</b> [{String.fromCharCode(65 + q.answer)}]{' '}
                              {q.options[q.answer]}
                            </p>
                            <p className="text-[10px] font-mono text-primary/60 italic">
                              💡 {q.explanation}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAnswers({});
                        setQuizSubmitted(false);
                        setCurrentQuizIdx(0);
                      }}
                      className="px-5 py-2.5 bg-accent text-white font-mono font-bold text-xs rounded-xl hover:bg-accent/90 transition-colors cursor-pointer"
                    >
                      Retake Quiz
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PRACTICE QUESTION BANK */}
            {tab === 'practice' && (
              <div className="space-y-5 font-sans">
                {/* Easy Section */}
                <div className="p-4 rounded-2xl bg-success/5 border border-success/20 space-y-2.5">
                  <h4 className="font-bold text-xs text-success font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success" /> Easy Questions (Fundamentals)
                  </h4>
                  <ul className="space-y-1.5 pl-2">
                    {pack.practice.easy.map((q, idx) => (
                      <li key={idx} className="text-xs text-primary/85 flex items-start gap-2">
                        <span className="font-mono text-success font-bold shrink-0">{idx + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Medium Section */}
                <div className="p-4 rounded-2xl bg-warning/5 border border-warning/20 space-y-2.5">
                  <h4 className="font-bold text-xs text-warning font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-warning" /> Medium Questions (Conceptual)
                  </h4>
                  <ul className="space-y-1.5 pl-2">
                    {pack.practice.medium.map((q, idx) => (
                      <li key={idx} className="text-xs text-primary/85 flex items-start gap-2">
                        <span className="font-mono text-warning font-bold shrink-0">{idx + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Hard Section */}
                <div className="p-4 rounded-2xl bg-danger/5 border border-danger/20 space-y-2.5">
                  <h4 className="font-bold text-xs text-danger font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-danger" /> Advanced & Analytical Questions
                  </h4>
                  <ul className="space-y-1.5 pl-2">
                    {pack.practice.hard.map((q, idx) => (
                      <li key={idx} className="text-xs text-primary/85 flex items-start gap-2">
                        <span className="font-mono text-danger font-bold shrink-0">{idx + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 4: AI VISUAL VIDEO */}
            {tab === 'visual' && pack.visualVideoUrl && (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-accent/5 border border-accent/15 rounded-xl text-left space-y-1">
                  <h4 className="font-bold text-xs text-accent flex items-center gap-1.5 font-mono uppercase">
                    <Play size={14} /> Pre-rendered AI Visual Explanation
                  </h4>
                  <p className="text-[11px] text-primary/70">
                    Animated visual walkthrough of {pack.topic} components, architecture, and data flow.
                  </p>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-border shadow-xl bg-black aspect-video max-w-2xl mx-auto">
                  <video
                    src={pack.visualVideoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  >
                    Your browser does not support HTML5 video player.
                  </video>
                </div>
              </div>
            )}
          </div>

          {/* Footer Close Control */}
          <div className="pt-3 border-t border-border/40 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-surface hover:bg-primary/5 border border-border text-primary font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Close Dialog
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

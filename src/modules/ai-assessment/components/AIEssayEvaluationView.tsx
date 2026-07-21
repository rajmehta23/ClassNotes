import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FileCheck2, Award, Sparkles, CheckCircle2, 
  Edit3, Send, Loader2, ArrowRight
} from 'lucide-react';
import { aiEssayService } from '../services/aiEssayService';
import type { EssayEvaluation, EssayRubric } from '@/modules/shared/types/ai';
import type { AssignmentSubmission } from '@/modules/assignments/types';

interface AIEssayEvaluationViewProps {
  submission: AssignmentSubmission | null;
  rubric?: EssayRubric;
  isOpen: boolean;
  onClose: () => void;
  isTeacher?: boolean;
}

export const AIEssayEvaluationView: React.FC<AIEssayEvaluationViewProps> = ({
  submission,
  rubric,
  isOpen,
  onClose,
  isTeacher = false,
}) => {
  const [evaluation, setEvaluation] = useState<EssayEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Editable scores state for Teacher
  const [editScore, setEditScore] = useState<number>(85);
  const [editGrammarScore, setEditGrammarScore] = useState<number>(85);
  const [editVocabScore, setEditVocabScore] = useState<number>(85);
  const [editStructureScore, setEditStructureScore] = useState<number>(85);
  const [editContentScore, setEditContentScore] = useState<number>(85);
  const [editCreativityScore, setEditCreativityScore] = useState<number>(85);

  const loadEvaluation = async () => {
    if (!submission) return;
    setIsLoading(true);
    try {
      const evalData = await aiEssayService.evaluateEssay(
        submission.id,
        submission.assignmentId,
        submission.studentId,
        submission.submissionText,
        rubric
      );
      setEvaluation(evalData);
      setEditScore(evalData.overallScore);
      setEditGrammarScore(evalData.rubricBreakdown.grammar.score);
      setEditVocabScore(evalData.rubricBreakdown.vocabulary.score);
      setEditStructureScore(evalData.rubricBreakdown.structure.score);
      setEditContentScore(evalData.rubricBreakdown.content.score);
      setEditCreativityScore(evalData.rubricBreakdown.creativity.score);
    } catch (err) {
      console.error('Failed to load essay evaluation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && submission) {
      loadEvaluation();
    }
  }, [isOpen, submission]);

  if (!isOpen || !submission) return null;

  const handleSaveTeacherEdit = async () => {
    if (!evaluation) return;
    const updated: EssayEvaluation = {
      ...evaluation,
      overallScore: editScore,
      rubricBreakdown: {
        grammar: { ...evaluation.rubricBreakdown.grammar, score: editGrammarScore },
        vocabulary: { ...evaluation.rubricBreakdown.vocabulary, score: editVocabScore },
        structure: { ...evaluation.rubricBreakdown.structure, score: editStructureScore },
        content: { ...evaluation.rubricBreakdown.content, score: editContentScore },
        creativity: { ...evaluation.rubricBreakdown.creativity, score: editCreativityScore },
      },
    };
    const saved = await aiEssayService.updateEvaluation(updated);
    setEvaluation(saved);
    setIsEditing(false);
  };

  const handlePublish = async () => {
    if (!submission) return;
    const published = await aiEssayService.publishEvaluation(submission.id);
    if (published) {
      setEvaluation(published);
      alert('Essay evaluation published to student!');
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-surface border border-border rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar relative text-primary"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <FileCheck2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono uppercase tracking-tight text-primary">
                  AI Essay Evaluation
                </h2>
                <p className="text-xs text-primary/50 font-sans">
                  Student: <span className="font-semibold text-primary">{submission.studentName}</span>
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

          {isLoading ? (
            <div className="text-center py-16 space-y-3">
              <Loader2 className="w-9 h-9 text-accent animate-spin mx-auto" />
              <p className="text-xs font-mono uppercase tracking-wider text-primary/70">
                Evaluating essay against rubric parameters...
              </p>
            </div>
          ) : evaluation ? (
            <div className="space-y-6 animate-fade-in">
              {/* Status & Action Bar */}
              <div className="flex items-center justify-between p-3.5 bg-background border border-border/60 rounded-xl">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-lg border ${
                      evaluation.published
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}
                  >
                    {evaluation.published ? 'Published to Student' : 'Draft / Under Review'}
                  </span>
                  {evaluation.editedByTeacher && (
                    <span className="text-[10px] font-mono text-accent uppercase font-semibold">
                      • Reviewed by Teacher
                    </span>
                  )}
                </div>

                {isTeacher && (
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <button
                        onClick={handleSaveTeacherEdit}
                        className="px-3 py-1.5 bg-accent text-white text-xs font-mono font-bold rounded-lg shadow-xs cursor-pointer"
                      >
                        Save Edits
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1.5 border border-border text-primary/80 hover:text-primary text-xs font-mono font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 size={13} />
                        <span>Edit Evaluation</span>
                      </button>
                    )}

                    {!evaluation.published && (
                      <button
                        onClick={handlePublish}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Send size={13} />
                        <span>Publish</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Overall Score Header */}
              <div className="p-5 bg-accent/5 border border-accent/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider flex items-center gap-1 justify-center sm:justify-start">
                    <Award size={16} /> Evaluation Summary
                  </span>
                  <p className="text-xs text-primary/70 font-sans">
                    Overall weighted grade based on grammar, vocabulary, structure, content, and creativity rubrics.
                  </p>
                </div>

                <div className="p-4 bg-background border border-accent/30 rounded-2xl text-center shrink-0 min-w-[120px]">
                  <span className="text-[10px] font-mono text-primary/50 uppercase block font-semibold">
                    Overall Score
                  </span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editScore}
                      onChange={(e) => setEditScore(Number(e.target.value))}
                      className="w-20 bg-surface border border-accent rounded text-xl font-black font-mono text-accent text-center mt-1"
                      max={100}
                      min={0}
                    />
                  ) : (
                    <span className="text-3xl font-black font-mono text-accent">
                      {evaluation.overallScore}/100
                    </span>
                  )}
                </div>
              </div>

              {/* Rubric Breakdown Grid */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-primary/70 block">
                  Rubric Breakdown
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(evaluation.rubricBreakdown).map(([key, data]) => (
                    <div
                      key={key}
                      className="p-3.5 bg-background border border-border/50 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold capitalize text-primary">
                          {key}
                        </span>
                        <span className="text-xs font-mono font-bold text-accent">
                          {data.score}/100
                        </span>
                      </div>
                      <p className="text-[11px] text-primary/65 font-sans leading-normal">
                        {data.feedback}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Paragraph Feedback */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-primary/70 block">
                  Paragraph-by-Paragraph Analysis
                </span>
                <div className="space-y-2">
                  {evaluation.paragraphFeedback.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-background border border-border/40 rounded-xl text-xs text-primary/80 font-sans"
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              {/* Grammar & Vocabulary Suggestions (Diff View) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Grammar */}
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold uppercase text-accent flex items-center gap-1">
                    <Sparkles size={13} /> Grammar Enhancements
                  </span>
                  <div className="space-y-2">
                    {evaluation.grammarSuggestions.map((g, i) => (
                      <div
                        key={i}
                        className="p-3 bg-background border border-border/50 rounded-xl space-y-1.5 text-xs"
                      >
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="line-through text-danger opacity-80">{g.originalText}</span>
                          <ArrowRight size={12} className="text-primary/40" />
                          <span className="font-bold text-emerald-500">{g.suggestedText}</span>
                        </div>
                        <p className="text-[11px] text-primary/60 font-sans">{g.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vocabulary */}
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold uppercase text-accent flex items-center gap-1">
                    <Sparkles size={13} /> Vocabulary Suggestions
                  </span>
                  <div className="space-y-2">
                    {evaluation.vocabularySuggestions.map((v, i) => (
                      <div
                        key={i}
                        className="p-3 bg-background border border-border/50 rounded-xl space-y-1.5 text-xs"
                      >
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-primary/60">{v.originalText}</span>
                          <ArrowRight size={12} className="text-primary/40" />
                          <span className="font-bold text-accent">{v.suggestedText}</span>
                        </div>
                        <p className="text-[11px] text-primary/60 font-sans">{v.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actionable Improvement Plan */}
              <div className="p-4 bg-background border border-border/60 rounded-xl space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-accent flex items-center gap-1">
                  <CheckCircle2 size={14} /> Actionable Improvement Plan
                </span>
                <ul className="space-y-1 text-xs text-primary/80 font-sans list-disc pl-4">
                  {evaluation.improvementPlan.map((planItem, i) => (
                    <li key={i}>{planItem}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

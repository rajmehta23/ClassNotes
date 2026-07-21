import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, FileText, Download, Clock, Award, Loader2, Sparkles } from 'lucide-react';
import { assignmentService } from '../services/assignmentService';
import { FEATURE_FLAGS } from '@/modules/config/featureFlags';
import { AIEssayEvaluationView } from '@/modules/ai-assessment/components/AIEssayEvaluationView';
import type { Assignment, AssignmentSubmission } from '../types';

interface SubmissionHistoryModalProps {
  assignment: Assignment | null;
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  userId?: string;
}

export const SubmissionHistoryModal: React.FC<SubmissionHistoryModalProps> = ({
  assignment,
  isOpen,
  onClose,
  userRole = 'student',
  userId = '',
}) => {
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(0);
  const [feedbackInput, setFeedbackInput] = useState<string>('');

  // AI Essay Evaluation state
  const [activeEssaySubmission, setActiveEssaySubmission] = useState<AssignmentSubmission | null>(null);

  useEffect(() => {
    if (isOpen && assignment) {
      setIsLoading(true);
      assignmentService.getSubmissionsForAssignment(assignment.id).then((list) => {
        if (userRole === 'teacher' || userRole === 'admin') {
          setSubmissions(list);
        } else {
          setSubmissions(list.filter((s) => s.studentId === userId));
        }
        setIsLoading(false);
      });
    }
  }, [isOpen, assignment, userRole, userId]);

  if (!isOpen || !assignment) return null;

  const handleGradeSubmit = async (submissionId: string) => {
    const success = await assignmentService.updateSubmissionGrade(
      submissionId,
      gradeInput,
      feedbackInput
    );
    if (success) {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? { ...s, grade: gradeInput, feedback: feedbackInput, status: 'graded' }
            : s
        )
      );
      setGradingSubmissionId(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface border border-border rounded-2xl shadow-luxury max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent/10 text-accent">
                <History size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono uppercase tracking-tight text-primary">
                  Submissions History
                </h2>
                <p className="text-xs text-primary/50 font-sans truncate max-w-xs sm:max-w-md">
                  {assignment.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-primary/50 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8 text-primary/50">
              <Loader2 className="animate-spin w-6 h-6" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center p-8 space-y-2">
              <Clock className="w-8 h-8 text-primary/30 mx-auto" />
              <p className="text-xs font-mono text-primary/50 uppercase">No submissions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 bg-background border border-border/60 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs font-mono text-primary">
                        {sub.studentName}
                      </span>
                      <span className="text-[10px] text-primary/40 font-mono block">
                        Submitted at: {new Date(sub.submittedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                          sub.status === 'graded'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : sub.status === 'late'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-accent/10 text-accent border border-accent/20'
                        }`}
                      >
                        {sub.status}
                      </span>
                      {sub.grade !== undefined && (
                        <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">
                          {sub.grade} / {assignment.maxPoints || 100}
                        </span>
                      )}
                    </div>
                  </div>

                  {sub.submissionText && (
                    <div className="p-3 bg-surface border border-border/40 rounded-lg text-xs text-primary/80 font-sans whitespace-pre-wrap">
                      {sub.submissionText}
                    </div>
                  )}

                  {/* Attachment links */}
                  {sub.attachments && sub.attachments.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-mono uppercase text-primary/50 block font-semibold">
                        Submitted Files:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {sub.attachments.map((file, i) => (
                          <a
                            key={i}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-primary/5 border border-border rounded-lg text-xs font-mono text-accent transition-colors"
                          >
                            <FileText size={12} />
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <Download size={12} className="opacity-60" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons: Teacher Grading & AI Essay Evaluation */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                    {FEATURE_FLAGS.AI_ESSAY && (
                      <button
                        type="button"
                        onClick={() => setActiveEssaySubmission(sub)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <Sparkles size={12} />
                        <span>AI Essay Evaluation</span>
                      </button>
                    )}

                    {(userRole === 'teacher' || userRole === 'admin') && (
                      <div>
                        {gradingSubmissionId === sub.id ? (
                          <div className="p-3 bg-accent/5 border border-accent/20 rounded-xl space-y-2 w-full mt-2">
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                value={gradeInput}
                                onChange={(e) => setGradeInput(Number(e.target.value))}
                                max={assignment.maxPoints || 100}
                                min={0}
                                placeholder="Grade"
                                className="w-24 bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-mono"
                              />
                              <span className="text-xs font-mono text-primary/50">
                                / {assignment.maxPoints || 100} Points
                              </span>
                            </div>
                            <input
                              type="text"
                              value={feedbackInput}
                              onChange={(e) => setFeedbackInput(e.target.value)}
                              placeholder="Teacher feedback comments..."
                              className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-sans"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setGradingSubmissionId(null)}
                                className="px-3 py-1 text-xs font-mono border border-border rounded-lg"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGradeSubmit(sub.id)}
                                className="px-3 py-1 text-xs font-mono bg-accent text-white rounded-lg"
                              >
                                Save Grade
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setGradingSubmissionId(sub.id);
                              setGradeInput(sub.grade || 85);
                              setFeedbackInput(sub.feedback || '');
                            }}
                            className="text-xs font-mono text-accent hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Award size={12} />
                            <span>{sub.grade !== undefined ? 'Edit Grade' : 'Grade Submission'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {sub.feedback && (
                    <div className="p-2.5 bg-accent/5 border border-accent/15 rounded-lg text-xs">
                      <span className="font-mono font-bold text-accent block text-[10px] uppercase">
                        Teacher Feedback:
                      </span>
                      <p className="text-primary/80 font-sans mt-0.5">{sub.feedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <AIEssayEvaluationView
        submission={activeEssaySubmission}
        rubric={assignment?.rubric}
        isOpen={!!activeEssaySubmission}
        onClose={() => setActiveEssaySubmission(null)}
        isTeacher={userRole === 'teacher' || userRole === 'admin'}
      />
    </AnimatePresence>
  );
};

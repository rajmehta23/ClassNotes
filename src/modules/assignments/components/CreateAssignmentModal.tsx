import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, FileText, Plus, Trash2, Sliders, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useAssignmentStore } from '../stores/useAssignmentStore';
import { storageService } from '@/services/storage';
import { FEATURE_FLAGS } from '@/modules/config/featureFlags';
import { RubricConfigModal } from '@/modules/ai-assessment/components/RubricConfigModal';
import type { FileAttachment, SupportedFileType } from '../types';
import type { EssayRubric } from '@/modules/shared/types/ai';

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const createAssignment = useAssignmentStore((s) => s.createAssignment);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [course, setCourse] = useState(user?.course || 'BCA');
  const [semester, setSemester] = useState(user?.semester || '1');
  const [dueDate, setDueDate] = useState('');
  const [maxPoints, setMaxPoints] = useState(100);

  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Essay Rubric Config State
  const [rubric, setRubric] = useState<EssayRubric | undefined>(undefined);
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let type: SupportedFileType = 'other';
      if (file.type.includes('pdf')) type = 'pdf';
      else if (file.type.includes('image')) type = 'image';
      else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) type = 'docx';
      else if (file.type.includes('text')) type = 'text';

      const fileUrl = await storageService.uploadFile(
        file,
        'assignments',
        (percent) => setUploadProgress(percent)
      );

      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          url: fileUrl,
          type,
          size: file.size,
          mimeType: file.type,
        },
      ]);
    } catch (err: any) {
      alert(err?.message || 'Failed to upload attachment');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !subject || !dueDate || !user) {
      alert('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    const success = await createAssignment(
      {
        title,
        description,
        subject,
        course,
        semester,
        dueDate: new Date(dueDate).toISOString(),
        attachments,
        maxPoints,
      },
      user.uid,
      user.displayName || 'Teacher'
    );
    setIsSubmitting(false);

    if (success) {
      setTitle('');
      setDescription('');
      setSubject('');
      setAttachments([]);
      setRubric(undefined);
      onClose();
    }
  };

  if (!isOpen || user?.role !== 'admin') return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface border border-border rounded-2xl shadow-luxury max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent/10 text-accent">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono uppercase tracking-tight text-primary">
                  Create Assignment
                </h2>
                <p className="text-xs text-primary/50 font-sans">
                  Post a new assignment for students to solve
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-mono uppercase text-primary/70">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Data Structures Assignment 3"
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold font-mono uppercase text-primary/70">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Operating Systems"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold font-mono uppercase text-primary/70">
                  Due Date *
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-accent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold font-mono uppercase text-primary/70">
                  Course
                </label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-accent cursor-pointer"
                >
                  <option value="BCA">BCA</option>
                  <option value="BBA">BBA</option>
                  <option value="B.Tech">B.Tech</option>
                  <option value="B.Sc">B.Sc</option>
                  <option value="B.Com">B.Com</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold font-mono uppercase text-primary/70">
                  Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-accent cursor-pointer"
                >
                  {[...Array(8)].map((_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      Sem {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold font-mono uppercase text-primary/70">
                  Max Points
                </label>
                <input
                  type="number"
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-accent"
                  min={10}
                  max={500}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-mono uppercase text-primary/70">
                Instructions / Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Provide detailed instructions for student submission..."
                className="w-full bg-background border border-border rounded-xl p-3 text-xs focus:outline-none focus:border-accent custom-scrollbar"
                required
              />
            </div>

            {/* AI Essay Rubric Config Section (Behind AI_ESSAY feature flag) */}
            {FEATURE_FLAGS.AI_ESSAY && (
              <div className="p-3.5 bg-accent/5 border border-accent/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-accent">
                    <Sparkles size={14} />
                    <span>AI Essay Evaluation Rubric</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRubricModalOpen(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Sliders size={12} />
                    <span>{rubric ? 'Edit Rubric' : 'Configure Rubric'}</span>
                  </button>
                </div>
                {rubric && (
                  <div className="text-[10px] font-mono text-primary/60 flex flex-wrap gap-2 pt-1">
                    <span>Grammar: {rubric.grammarWeight}%</span>
                    <span>Vocab: {rubric.vocabularyWeight}%</span>
                    <span>Structure: {rubric.structureWeight}%</span>
                    <span>Content: {rubric.contentWeight}%</span>
                    <span>Creativity: {rubric.creativityWeight}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Attachments Section */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold font-mono uppercase text-primary/70">
                  Resource Attachments (PDF, DOCX, Images, Text)
                </label>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold rounded-lg transition-colors">
                  {isUploading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Plus size={12} />
                  )}
                  <span>{isUploading ? `${uploadProgress}%` : 'Attach File'}</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-background border border-border rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={14} className="text-accent shrink-0" />
                        <span className="truncate font-mono">{att.name}</span>
                        <span className="text-[10px] uppercase font-mono text-primary/40 px-1.5 py-0.5 bg-primary/5 rounded">
                          {att.type}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-danger hover:text-danger/80 p-1 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/40 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold font-mono text-primary/70 hover:text-primary rounded-xl border border-border hover:bg-primary/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="px-5 py-2 text-xs font-semibold font-mono uppercase tracking-wider text-white bg-accent hover:bg-accent/90 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <span>Post Assignment</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      <RubricConfigModal
        isOpen={isRubricModalOpen}
        onClose={() => setIsRubricModalOpen(false)}
        initialRubric={rubric}
        onSave={(r) => setRubric(r)}
      />
    </AnimatePresence>
  );
};

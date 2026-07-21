import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, FileText, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useAssignmentStore } from '../stores/useAssignmentStore';
import { storageService } from '@/services/storage';
import type { Assignment, FileAttachment, SupportedFileType } from '../types';

interface SubmitAssignmentModalProps {
  assignment: Assignment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SubmitAssignmentModal: React.FC<SubmitAssignmentModalProps> = ({
  assignment,
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const submitAssignment = useAssignmentStore((s) => s.submitAssignment);

  const [submissionText, setSubmissionText] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !assignment) return null;

  const isPastDue = new Date() > new Date(assignment.dueDate);

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
        'assignment_submissions',
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
    if (!user) return;
    if (!submissionText.trim() && attachments.length === 0) {
      alert('Please provide submission text or attach at least one file.');
      return;
    }

    setIsSubmitting(true);
    const success = await submitAssignment(
      {
        assignmentId: assignment.id,
        submissionText,
        attachments,
      },
      user.uid,
      user.displayName || 'Student'
    );
    setIsSubmitting(false);

    if (success) {
      setSubmissionText('');
      setAttachments([]);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface border border-border rounded-2xl shadow-luxury max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent/10 text-accent">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono uppercase tracking-tight text-primary">
                  Submit Work
                </h2>
                <p className="text-xs text-primary/50 font-sans truncate max-w-xs">
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

          {isPastDue && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-xl text-warning text-xs font-mono">
              <AlertCircle size={16} className="shrink-0" />
              <span>Note: Due date has passed. Submission will be marked as LATE.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-mono uppercase text-primary/70">
                Submission Notes / Answer
              </label>
              <textarea
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                rows={5}
                placeholder="Type your response, links, or submission details here..."
                className="w-full bg-background border border-border rounded-xl p-3 text-xs focus:outline-none focus:border-accent custom-scrollbar"
              />
            </div>

            {/* File Attachments */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold font-mono uppercase text-primary/70">
                  Attach Files (Text, PDF, DOCX, Images)
                </label>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold rounded-lg transition-colors">
                  {isUploading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Upload size={12} />
                  )}
                  <span>{isUploading ? `${uploadProgress}%` : 'Upload File'}</span>
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
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Submit Assignment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

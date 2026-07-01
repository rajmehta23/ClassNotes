import React, { useState } from 'react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { noteRequestsService } from '@/services/noteRequests';
import { AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RequestNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export const RequestNotesModal: React.FC<RequestNotesModalProps> = ({ isOpen, onClose, onSubmitSuccess }) => {
  const { user } = useAuthStore();
  
  // Form states for creating request
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle request form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!subject.trim()) {
      setFormError('Subject is required');
      return;
    }
    if (subject.trim().length > 50) {
      setFormError('Subject must be under 50 characters');
      return;
    }
    if (!topic.trim()) {
      setFormError('Topic is required');
      return;
    }
    if (topic.trim().length > 100) {
      setFormError('Topic must be under 100 characters');
      return;
    }
    if (description.trim().length > 500) {
      setFormError('Description must be under 500 characters');
      return;
    }
    
    setIsSubmitting(true);
    setFormError(null);
    try {
      await noteRequestsService.createRequest({
        subject: subject.trim(),
        topic: topic.trim(),
        description: description.trim()
      }, user);
      
      // Reset form
      setSubject('');
      setTopic('');
      setDescription('');
      onClose();
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary/20 backdrop-blur-md"
          />
          
          {/* Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="premium-card w-full max-w-md p-6 relative z-10 border border-border/40 shadow-2xl space-y-4 bg-surface/95 backdrop-blur-xl"
          >
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <h3 className="text-base font-bold tracking-tight">Request Cohort Notes</h3>
              <button 
                onClick={onClose}
                className="text-primary/40 hover:text-primary transition-all p-1 hover:bg-primary/5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-danger/10 border border-danger/25 text-danger rounded-lg flex items-start gap-2 text-xs font-sans">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
              {/* Subject */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-mono uppercase tracking-wider text-primary/50 font-bold">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter your subject"
                  className="block w-full rounded-md border border-border/60 px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent focus:ring-accent/20 transition-all text-primary"
                />
              </div>

              {/* Topic */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-mono uppercase tracking-wider text-primary/50 font-bold">
                  Topic *
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter your topic"
                  className="block w-full rounded-md border border-border/60 px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent focus:ring-accent/20 transition-all text-primary"
                />
              </div>

              {/* Optional Description */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-mono uppercase tracking-wider text-primary/50 font-bold">
                  Optional Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Looking for handwritten lecture notes, slides, or study guides."
                  className="block w-full rounded-md border border-border/60 px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent focus:ring-accent/20 transition-all resize-none text-primary"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg bg-accent text-white font-semibold hover:bg-accent/90 shadow-md shadow-accent/15 transition-all active-scale disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin mr-2" />
                    <span>Creating Request...</span>
                  </>
                ) : (
                  <span>Submit Request</span>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RequestNotesModal;

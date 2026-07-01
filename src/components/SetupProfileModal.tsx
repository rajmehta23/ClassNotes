import React, { useState } from 'react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { X, Check, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SetupProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupProfileModal: React.FC<SetupProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuthStore();
  const [course, setCourse] = useState(user?.course || 'BCA');
  const [semester, setSemester] = useState(user?.semester || '1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await updateProfile({ course, semester });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-primary/15 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-sm bg-surface/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-luxury z-50 overflow-hidden flex flex-col mx-4 font-sans"
            role="dialog"
            aria-modal="true"
          >
            <div className="border-b border-border/40 px-5 py-4 flex items-center justify-between bg-surface/80 shrink-0">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-accent bg-accent/5 px-2 py-0.5 rounded font-bold">Configure Profile</span>
                <h2 className="font-extrabold text-sm text-primary mt-1">Select Course & Semester</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 border border-border/60 hover:bg-background text-primary/70 hover:text-primary rounded-md transition-colors cursor-pointer active-scale"
                title="Close setup modal"
              >
                <X size={13} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-danger/5 border border-danger/25 text-danger rounded-md text-xs flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="modal-course" className="block text-[9px] font-mono uppercase tracking-wider text-primary/50 font-bold">
                  Course / Major
                </label>
                <select
                  id="modal-course"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  disabled={isSubmitting}
                  className="block w-full rounded-md border border-border/60 px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent focus:ring-accent/20 transition-all cursor-pointer text-primary"
                >
                  <option value="BCA">BCA</option>
                  <option value="BBA">BBA</option>
                  <option value="B.Tech">B.Tech</option>
                  <option value="B.Sc">B.Sc</option>
                  <option value="B.Com">B.Com</option>
                  <option value="BA">BA</option>
                  <option value="B.Ed">B.Ed</option>
                  <option value="B.Arch">B.Arch</option>
                  <option value="BFA">BFA</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="modal-semester" className="block text-[9px] font-mono uppercase tracking-wider text-primary/50 font-bold">
                  Current Semester
                </label>
                <select
                  id="modal-semester"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  disabled={isSubmitting}
                  className="block w-full rounded-md border border-border/60 px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent focus:ring-accent/20 transition-all cursor-pointer text-primary"
                >
                  {[...Array(8)].map((_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      Semester {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg shadow-md text-xs font-semibold text-white bg-accent hover:bg-accent/90 focus:outline-none transition-all active-scale disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer font-sans"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin mr-2" />
                      <span>Saving profile...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} className="mr-1.5" />
                      <span>Save Preferences</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

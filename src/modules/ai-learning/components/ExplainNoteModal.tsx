import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { aiTutorService } from '../services/aiTutorService';
import type { Note } from '@/types/database';

interface ExplainNoteModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExplainNoteModal: React.FC<ExplainNoteModalProps> = ({
  note,
  isOpen,
  onClose,
}) => {
  const [explanation, setExplanation] = useState<{
    summary: string;
    keyPoints: string[];
    takeaways: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && note) {
      setIsLoading(true);
      aiTutorService.explainNote(note.title, note.description).then((data) => {
        setExplanation(data);
        setIsLoading(false);
      });
    }
  }, [isOpen, note]);

  if (!isOpen || !note) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-surface border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar relative text-primary"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono uppercase tracking-tight text-primary">
                  Explain Note
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

          {isLoading ? (
            <div className="text-center py-14 space-y-3">
              <Loader2 className="w-9 h-9 text-accent animate-spin mx-auto" />
              <p className="text-xs font-mono uppercase tracking-wider text-primary/70">
                Analyzing concepts & generating summary...
              </p>
            </div>
          ) : explanation ? (
            <div className="space-y-5">
              {/* Executive Summary */}
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl space-y-1.5">
                <span className="text-xs font-mono font-bold uppercase text-accent flex items-center gap-1.5">
                  <Sparkles size={14} /> Concept Summary
                </span>
                <p className="text-xs text-primary/90 font-sans leading-relaxed">
                  {explanation.summary}
                </p>
              </div>

              {/* Key Points */}
              <div className="space-y-2.5">
                <span className="text-xs font-mono font-bold uppercase text-primary/70 block">
                  Key Pillars & Definitions:
                </span>
                <div className="space-y-2">
                  {explanation.keyPoints.map((pt, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-3 bg-background border border-border/60 rounded-xl text-xs shadow-xs"
                    >
                      <CheckCircle2 size={15} className="text-accent shrink-0 mt-0.5" />
                      <span className="text-primary/90 font-sans leading-relaxed">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exam Takeaway */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                <span className="text-[11px] font-mono uppercase font-bold text-amber-500 block">
                  Pro Exam Tip:
                </span>
                <p className="text-xs font-sans text-primary/90 leading-relaxed">{explanation.takeaways}</p>
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

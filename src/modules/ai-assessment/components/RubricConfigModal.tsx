import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sliders, Check, AlertCircle } from 'lucide-react';
import type { EssayRubric } from '@/modules/shared/types/ai';

interface RubricConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRubric?: EssayRubric;
  onSave: (rubric: EssayRubric) => void;
}

export const RubricConfigModal: React.FC<RubricConfigModalProps> = ({
  isOpen,
  onClose,
  initialRubric,
  onSave,
}) => {
  const [grammar, setGrammar] = useState(initialRubric?.grammarWeight ?? 20);
  const [vocabulary, setVocabulary] = useState(initialRubric?.vocabularyWeight ?? 20);
  const [structure, setStructure] = useState(initialRubric?.structureWeight ?? 20);
  const [content, setContent] = useState(initialRubric?.contentWeight ?? 20);
  const [creativity, setCreativity] = useState(initialRubric?.creativityWeight ?? 20);

  if (!isOpen) return null;

  const totalWeight = grammar + vocabulary + structure + content + creativity;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalWeight !== 100) {
      alert(`Rubric weights must total exactly 100%. Current total is ${totalWeight}%.`);
      return;
    }

    onSave({
      grammarWeight: grammar,
      vocabularyWeight: vocabulary,
      structureWeight: structure,
      contentWeight: content,
      creativityWeight: creativity,
    });
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-surface border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 relative text-primary max-h-[85vh] overflow-y-auto custom-scrollbar"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-accent/10 text-accent rounded-xl">
                <Sliders size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold font-mono uppercase tracking-tight text-primary">
                  Configure Essay Rubric
                </h2>
                <p className="text-xs text-primary/50 font-sans">
                  Set evaluation percentage weights for AI grading
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs font-mono">
            {/* Total Indicator */}
            <div
              className={`p-3 border rounded-xl flex items-center justify-between font-bold ${
                totalWeight === 100
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {totalWeight === 100 ? <Check size={14} /> : <AlertCircle size={14} />}
                Total Weight:
              </span>
              <span>{totalWeight}% / 100%</span>
            </div>

            {/* Sliders */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Grammar & Mechanics</span>
                  <span className="text-accent font-bold">{grammar}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={grammar}
                  onChange={(e) => setGrammar(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Vocabulary & Terminology</span>
                  <span className="text-accent font-bold">{vocabulary}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={vocabulary}
                  onChange={(e) => setVocabulary(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Structure & Coherence</span>
                  <span className="text-accent font-bold">{structure}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={structure}
                  onChange={(e) => setStructure(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Content & Arguments</span>
                  <span className="text-accent font-bold">{content}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={content}
                  onChange={(e) => setContent(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Creativity & Originality</span>
                  <span className="text-accent font-bold">{creativity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={creativity}
                  onChange={(e) => setCreativity(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono text-primary/70 hover:text-primary rounded-xl border border-border hover:bg-primary/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={totalWeight !== 100}
                className="px-5 py-2 text-xs font-mono uppercase font-bold text-white bg-accent hover:bg-accent/90 disabled:opacity-40 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Save Rubric
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

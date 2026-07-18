import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Edit3,
  TrendingUp,
  TrendingDown,
  Trash2,
} from 'lucide-react';
import type { SubjectWithCalculations } from '../../types';
import { bottomSheetVariants, modalBackdropVariants } from '../../animations/variants';

interface SubjectBottomSheetProps {
  subject: SubjectWithCalculations | null;
  targetPercentage: number;
  onClose: () => void;
  onEdit: (subjectId: string) => void;
  onDelete: (subjectId: string) => void;
  onQuickUpdate: (subjectId: string, heldDelta: number, attendedDelta: number) => void;
}

export const SubjectBottomSheet: React.FC<SubjectBottomSheetProps> = ({
  subject,
  targetPercentage,
  onClose,
  onEdit,
  onDelete,
  onQuickUpdate,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!subject) return null;

  const { name, color, held, attended, calculations, lastUpdated } = subject;
  const { percentage, absent, needClasses, safeLeaves, riskLevel, nextClassPrediction } =
    calculations;

  const handleQuickAdd = (type: 'present' | 'absent') => {
    if (type === 'present') {
      onQuickUpdate(subject.id, 1, 1);
    } else {
      onQuickUpdate(subject.id, 1, 0);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
          className="absolute inset-0"
        />

        <motion.div
          variants={bottomSheetVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 apple-shadow-lg border border-slate-100 max-h-[90vh] overflow-y-auto z-10"
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />

          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: color || '#6366F1' }}
              />
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{name}</h2>
                <p className="text-xs font-medium text-slate-400">Target: {targetPercentage}%</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/80 mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Current Attendance
              </div>
              <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {percentage.toFixed(1)}%
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  riskLevel === 'Safe'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : riskLevel === 'Warning'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {riskLevel === 'Safe' ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                {riskLevel}
              </span>
              <span className="text-[11px] text-slate-400">Updated: {lastUpdated || 'Today'}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-xs text-slate-500 font-medium mb-1">Held</div>
              <div className="text-lg font-bold text-slate-900">{held}</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
              <div className="text-xs text-emerald-700 font-medium mb-1">Attended</div>
              <div className="text-lg font-bold text-emerald-900">{attended}</div>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100 text-center">
              <div className="text-xs text-rose-700 font-medium mb-1">Absent</div>
              <div className="text-lg font-bold text-rose-900">{absent}</div>
            </div>
          </div>

          <div className="space-y-2.5 mb-6">
            {needClasses > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Need next {needClasses} classes</span> consecutively
                  to reach your target of {targetPercentage}%.
                </div>
              </div>
            )}

            {safeLeaves > 0 && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Can skip {safeLeaves} classes safely</span> without
                  dropping below {targetPercentage}%.
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                Next Class Impact Prediction
              </div>

              <div className="flex items-center justify-between text-emerald-700 bg-emerald-50/80 p-2 rounded-xl border border-emerald-100">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" /> If Attended:
                </span>
                <span className="font-bold text-sm">
                  {nextClassPrediction.ifAttended.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-rose-700 bg-rose-50/80 p-2 rounded-xl border border-rose-100">
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4" /> If Missed:
                </span>
                <span className="font-bold text-sm">
                  {nextClassPrediction.ifMissed.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Quick Update Today
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickAdd('present')}
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                +1 Present
              </button>

              <button
                type="button"
                onClick={() => handleQuickAdd('absent')}
                className="py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                +1 Absent
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {!confirmDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="p-2.5 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors text-xs font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(subject.id);
                  }}
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Edit3 className="w-4 h-4" /> Edit Subject
                </button>
              </>
            ) : (
              <div className="w-full p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-rose-800">Confirm deletion?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onDelete(subject.id);
                      onClose();
                    }}
                    className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs font-bold"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

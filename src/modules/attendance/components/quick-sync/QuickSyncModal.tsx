import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, X, AlertTriangle, ArrowRight, CheckCircle2, History } from 'lucide-react';
import { useQuickSync } from '../../hooks';
import { modalBackdropVariants, modalContentVariants } from '../../animations/variants';
import { useAttendanceStore } from '../../stores/useAttendanceStore';

export const QuickSyncModal: React.FC = () => {
  const {
    subjects,
    inputs,
    deltas,
    isFormValid,
    hasChanges,
    quickSyncLogs,
    updateInput,
    executeSync,
  } = useQuickSync();

  const setActiveModal = useAttendanceStore((s) => s.setActiveModal);
  const activeModal = useAttendanceStore((s) => s.activeModal);

  if (activeModal !== 'quicksync') return null;

  const handleClose = () => setActiveModal(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !hasChanges) return;
    await executeSync();
  };

  // Helper validation function for individual field display
  const getFieldError = (val: string, otherVal: string, field: 'held' | 'attended'): string | null => {
    if (!val || val.trim() === '') {
      return field === 'held' ? 'Total held is required' : 'Total attended is required';
    }
    if (val.includes('.')) {
      return 'Decimal values are not allowed';
    }
    const num = Number(val);
    if (isNaN(num)) {
      return 'Please enter a valid number';
    }
    if (num < 0) {
      return 'Negative numbers are not allowed';
    }
    if (!Number.isInteger(num)) {
      return 'Must be an integer';
    }

    const otherNum = Number(otherVal);
    if (!isNaN(otherNum) && otherNum >= 0) {
      if (field === 'held' && num < otherNum) {
        return 'Held classes must be ≥ attended classes';
      }
      if (field === 'attended' && num > otherNum) {
        return 'Attended classes cannot exceed total held';
      }
    }

    return null;
  };

  return (
    <motion.div
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/30 backdrop-blur-xs overflow-y-auto"
    >
      {/* Hide number input spinner arrows across browsers */}
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      <motion.div
        variants={modalContentVariants}
        className="w-full max-w-2xl bg-surface rounded-2xl p-6 md:p-8 shadow-luxury border border-border/40 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary tracking-tight">Portal Quick Sync</h2>
              <p className="text-xs text-primary/50 font-mono">
                Sync current totals straight from your college portal
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            type="button"
            className="p-2 rounded-full text-primary/40 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto my-2 pr-1 space-y-4">
          {subjects.map((sub) => {
            const inputVal = inputs[sub.id] || {
              held: sub.held.toString(),
              attended: sub.attended.toString(),
            };

            const delta = deltas.find((d) => d.subjectId === sub.id);
            const heldError = getFieldError(inputVal.held, inputVal.attended, 'held');
            const attendedError = getFieldError(inputVal.attended, inputVal.held, 'attended');

            return (
              <div
                key={sub.id}
                className="p-4 rounded-xl bg-background/50 border border-border/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color || '#6366F1' }}
                    />
                    <span className="font-bold text-primary text-sm">{sub.name}</span>
                  </div>

                  <div className="text-xs text-primary/50 font-mono">
                    Current: <strong className="text-primary">{sub.attended}</strong> / {sub.held}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono">
                  {/* Portal Total Held */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary/50 mb-1">
                      Portal Total Held
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={inputVal.held}
                      onChange={(e) => updateInput(sub.id, 'held', e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border bg-surface text-sm text-primary font-bold transition-colors focus:outline-none ${
                        heldError
                          ? 'border-rose-500 bg-rose-500/5 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20'
                          : 'border-border focus:border-accent'
                      }`}
                    />
                    {heldError && (
                      <p className="text-[11px] text-rose-500 font-mono mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{heldError}</span>
                      </p>
                    )}
                  </div>

                  {/* Portal Total Attended */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-primary/50 mb-1">
                      Portal Total Attended
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={inputVal.attended}
                      onChange={(e) => updateInput(sub.id, 'attended', e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border bg-surface text-sm text-primary font-bold transition-colors focus:outline-none ${
                        attendedError
                          ? 'border-rose-500 bg-rose-500/5 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20'
                          : 'border-border focus:border-accent'
                      }`}
                    />
                    {attendedError && (
                      <p className="text-[11px] text-rose-500 font-mono mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{attendedError}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Delta status / info */}
                {delta && (
                  <div className="text-xs pt-2 border-t border-border/30 flex items-center justify-between font-mono">
                    {!delta.isValid ? (
                      <span className="text-rose-600 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> {delta.errorMessage}
                      </span>
                    ) : delta.deltaHeld !== 0 || delta.deltaAttended !== 0 ? (
                      <span className={`font-semibold flex items-center gap-1.5 ${
                        delta.deltaHeld >= 0 && delta.deltaAttended >= 0 ? 'text-accent' : 'text-amber-600'
                      }`}>
                        <ArrowRight className="w-3.5 h-3.5" /> Delta:{' '}
                        {delta.deltaHeld >= 0 ? `+${delta.deltaHeld}` : delta.deltaHeld} Held,{' '}
                        {delta.deltaAttended >= 0 ? `+${delta.deltaAttended}` : delta.deltaAttended} Attended
                      </span>
                    ) : (
                      <span className="text-primary/40">No change</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {quickSyncLogs.length > 0 && (
            <div className="pt-4 border-t border-border/30 font-mono">
              <h4 className="text-xs font-bold text-primary/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-primary/40" /> Recent Sync History
              </h4>

              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {quickSyncLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-background/50 text-xs border border-border/30 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-primary">{log.subjectName}</span>
                      <span className="text-primary/40 ml-2">{log.date}</span>
                    </div>
                    <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md font-bold">
                      {log.deltaAttended >= 0 ? `+${log.deltaAttended}` : log.deltaAttended} /{' '}
                      {log.deltaHeld >= 0 ? `+${log.deltaHeld}` : log.deltaHeld}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="pt-4 border-t border-border/40 flex items-center justify-between gap-3 font-mono">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border border-border bg-surface text-primary font-semibold text-xs uppercase tracking-wider hover:bg-primary/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || !hasChanges}
            className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold text-xs uppercase tracking-wider shadow-md shadow-accent/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active-scale"
          >
            <CheckCircle2 className="w-4 h-4" /> Apply Sync Immediately
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

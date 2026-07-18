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

  return (
    <motion.div
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <motion.div
        variants={modalContentVariants}
        className="w-full max-w-2xl bg-white rounded-3xl p-6 md:p-8 apple-shadow-lg border border-slate-100 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Portal Quick Sync</h2>
              <p className="text-xs text-slate-500">
                Sync current totals straight from your college portal
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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

            return (
              <div
                key={sub.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color || '#6366F1' }}
                    />
                    <span className="font-bold text-slate-900 text-sm">{sub.name}</span>
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    Current: <strong className="text-slate-800">{sub.attended}</strong> / {sub.held}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Portal Total Held
                    </label>
                    <input
                      type="number"
                      min={sub.held}
                      value={inputVal.held}
                      onChange={(e) => updateInput(sub.id, 'held', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Portal Total Attended
                    </label>
                    <input
                      type="number"
                      min={sub.attended}
                      value={inputVal.attended}
                      onChange={(e) => updateInput(sub.id, 'attended', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {delta && (
                  <div className="text-xs pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    {!delta.isValid ? (
                      <span className="text-rose-600 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> {delta.errorMessage}
                      </span>
                    ) : delta.deltaHeld > 0 || delta.deltaAttended > 0 ? (
                      <span className="text-indigo-600 font-semibold flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5" /> Adding +{delta.deltaHeld} Held, +
                        {delta.deltaAttended} Attended
                      </span>
                    ) : (
                      <span className="text-slate-400">No change</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {quickSyncLogs.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" /> Recent Sync History
              </h4>

              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {quickSyncLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-slate-50 text-xs border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{log.subjectName}</span>
                      <span className="text-slate-400 ml-2">
                        {log.date}
                      </span>
                    </div>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                      +{log.deltaAttended} / +{log.deltaHeld}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || !hasChanges}
            className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> Apply Sync Immediately
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

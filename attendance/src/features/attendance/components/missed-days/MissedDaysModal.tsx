import React from 'react';
import { motion } from 'framer-motion';
import { Clock, RefreshCw, Calendar, X } from 'lucide-react';
import { useMissedDays } from '../../hooks';
import { modalBackdropVariants, modalContentVariants } from '../../animations/variants';

export const MissedDaysModal: React.FC = () => {
  const { pendingMissedDays, isOpen, openQuickSync, dismissMissedDays } = useMissedDays();

  if (!isOpen || !pendingMissedDays) return null;

  const { missedCount, lastUpdatedDate, todayDate } = pendingMissedDays;

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
        className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 apple-shadow-lg border border-slate-100 flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <button
            onClick={dismissMissedDays}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">
          Attendance Pending ({missedCount} Days)
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Your last update was on <strong className="text-slate-700">{lastUpdatedDate}</strong>. Today is{' '}
          <strong className="text-slate-700">{todayDate}</strong>. Choose how you'd like to update.
        </p>

        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={() => {
              dismissMissedDays();
              openQuickSync();
            }}
            className="w-full p-4 rounded-2xl bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-100 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-600 group-hover:rotate-180 transition-transform duration-500" />
                Quick Sync Portal (Recommended)
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-indigo-600 text-white rounded-full">
                Instant
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Enter latest total held & attended values directly from college portal.
            </p>
          </button>

          <button
            type="button"
            onClick={dismissMissedDays}
            className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-600" />
                Update Day Wise
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Step through missed dates date-by-date using the daily tracker.
            </p>
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={dismissMissedDays}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium underline"
          >
            Remind me later
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

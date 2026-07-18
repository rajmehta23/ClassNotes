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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/30 backdrop-blur-xs overflow-y-auto"
    >
      <motion.div
        variants={modalContentVariants}
        className="w-full max-w-md bg-surface rounded-2xl p-6 md:p-8 shadow-luxury border border-border/40 flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <button
            onClick={dismissMissedDays}
            className="p-2 rounded-full text-primary/40 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-primary tracking-tight mb-1">
          Attendance Pending ({missedCount} Days)
        </h2>
        <p className="text-xs text-primary/50 mb-6 font-mono">
          Your last update was on <strong className="text-primary">{lastUpdatedDate}</strong>. Today is{' '}
          <strong className="text-primary">{todayDate}</strong>. Choose how you'd like to update.
        </p>

        <div className="space-y-3 mb-6 font-sans">
          <button
            type="button"
            onClick={() => {
              dismissMissedDays();
              openQuickSync();
            }}
            className="w-full p-4 rounded-xl bg-accent/10 hover:bg-accent/15 border border-accent/20 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-primary text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-accent group-hover:rotate-180 transition-transform duration-500" />
                Quick Sync Portal (Recommended)
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-accent text-white rounded-full font-mono">
                Instant
              </span>
            </div>
            <p className="text-xs text-primary/60 font-mono">
              Enter latest total held & attended values directly from college portal.
            </p>
          </button>

          <button
            type="button"
            onClick={dismissMissedDays}
            className="w-full p-4 rounded-xl bg-background/50 hover:bg-background border border-border/40 text-left transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-primary text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary/70" />
                Update Day Wise
              </span>
            </div>
            <p className="text-xs text-primary/60 font-mono">
              Step through missed dates date-by-date using the daily tracker.
            </p>
          </button>
        </div>

        <div className="text-center font-mono">
          <button
            type="button"
            onClick={dismissMissedDays}
            className="text-xs text-primary/45 hover:text-primary font-medium underline cursor-pointer"
          >
            Remind me later
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

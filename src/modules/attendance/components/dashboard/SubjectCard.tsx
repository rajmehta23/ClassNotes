import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, ChevronRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { SubjectWithCalculations } from '../../types';
import { cardContainerVariants } from '../../animations/variants';

interface SubjectCardProps {
  subject: SubjectWithCalculations;
  index?: number;
  onSelect: (id: string) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({ subject, index = 0, onSelect }) => {
  const { name, color, held, attended, calculations, lastUpdated } = subject;
  const { percentage, absent, needClasses, safeLeaves, riskLevel } = calculations;

  const badgeConfig = {
    Safe: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      bar: 'bg-emerald-500',
      icon: ShieldCheck,
      label: 'Safe Status',
    },
    Warning: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
      bar: 'bg-amber-500',
      icon: AlertTriangle,
      label: 'Warning Status',
    },
    Critical: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200/60',
      bar: 'bg-rose-500',
      icon: AlertTriangle,
      label: 'Critical Risk',
    },
  }[riskLevel];

  const RiskIcon = badgeConfig.icon;

  return (
    <motion.div
      custom={index}
      variants={cardContainerVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(subject.id)}
      className="bg-surface rounded-2xl p-5 border border-border/40 shadow-luxury hover:border-accent/30 transition-all cursor-pointer flex flex-col justify-between select-none"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: color || '#6366F1' }}
            />
            <h3 className="font-bold text-primary text-base tracking-tight truncate">{name}</h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${badgeConfig.bg}`}
            >
              <RiskIcon className="w-3 h-3" />
              {riskLevel}
            </span>
            <ChevronRight className="w-4 h-4 text-primary/30 ml-0.5" />
          </div>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-primary tracking-tight font-mono">
              {percentage.toFixed(1)}%
            </span>
            <span className="text-xs font-medium text-primary/45">attendance</span>
          </div>

          <div className="text-xs font-semibold text-primary/60 font-mono">
            {attended} / {held} <span className="font-normal text-primary/40">Held</span>
          </div>
        </div>

        <div className="w-full h-2.5 bg-primary/5 rounded-full overflow-hidden mb-4 p-0.5 border border-border/30">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${badgeConfig.bar}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/40 text-xs">
        <div className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-border/30">
          <div className="flex items-center gap-1.5 text-primary/70 font-medium">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Present</span>
          </div>
          <span className="font-bold text-primary font-mono">{attended}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-border/30">
          <div className="flex items-center gap-1.5 text-primary/70 font-medium">
            <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Absent</span>
          </div>
          <span className="font-bold text-primary font-mono">{absent}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-border/30">
          <div className="flex items-center gap-1.5 text-primary/70 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>Need</span>
          </div>
          <span className={`font-bold font-mono ${needClasses > 0 ? 'text-amber-600' : 'text-primary/40'}`}>
            {needClasses > 0 ? `${needClasses} classes` : '0'}
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-border/30">
          <div className="flex items-center gap-1.5 text-primary/70 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Skip</span>
          </div>
          <span className={`font-bold font-mono ${safeLeaves > 0 ? 'text-emerald-600' : 'text-primary/40'}`}>
            {safeLeaves > 0 ? `${safeLeaves} safe` : '0'}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-primary/40 font-medium font-mono">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> Updated: {lastUpdated || 'Today'}
        </span>
        <span className="text-accent font-bold hover:underline">Details &rarr;</span>
      </div>
    </motion.div>
  );
};

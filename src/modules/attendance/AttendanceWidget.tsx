import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarCheck, ArrowRight, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAttendanceStore } from './stores/useAttendanceStore';
import { calculateOverallStats } from './calculations';
import { useAuthStore } from '@/features/auth/useAuthStore';

import { SyncStatusBadge } from './components/common/SyncStatusBadge';

export const AttendanceWidget: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  
  const subjects = useAttendanceStore((s) => s.subjects);
  const settings = useAttendanceStore((s) => s.settings);
  const isInitialized = useAttendanceStore((s) => s.isInitialized);
  const isLoading = useAttendanceStore((s) => s.isLoading);
  const initModule = useAttendanceStore((s) => s.initModule);

  useEffect(() => {
    if (!isInitialized && user?.uid) {
      initModule(user.uid);
    }
  }, [isInitialized, user?.uid, initModule]);

  const overall = calculateOverallStats(subjects, settings.targetPercentage);

  const getStatusBadge = () => {
    if (overall.overallRiskLevel === 'Safe') {
      return {
        bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        icon: ShieldCheck,
        label: 'Safe',
      };
    }
    if (overall.overallRiskLevel === 'Warning') {
      return {
        bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        icon: AlertTriangle,
        label: 'Warning',
      };
    }
    return {
      bg: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      icon: AlertTriangle,
      label: 'Critical',
    };
  };

  const badge = getStatusBadge();
  const BadgeIcon = badge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      onClick={() => navigate('/attendance')}
      className="premium-card p-6 flex flex-col justify-between hover-scale relative overflow-hidden card-glow-accent group cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-primary/55 font-bold">Attendance</span>
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.bg}`}>
            <BadgeIcon size={10} />
            {badge.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SyncStatusBadge compact />
          <div className="p-2.5 bg-accent/5 rounded-lg border border-accent/15 text-accent group-hover:scale-110 transition-transform duration-300">
            <CalendarCheck size={16} />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-extrabold font-mono tracking-tight leading-none text-primary">
            {isLoading && !isInitialized ? (
              <RefreshCw size={20} className="animate-spin text-primary/30" />
            ) : (
              `${overall.overallPercentage.toFixed(1)}%`
            )}
          </p>
          <span className="text-xs font-mono text-primary/45">
            {overall.totalAttended}/{overall.totalHeld} classes
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden mt-3 border border-border/30">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overall.overallRiskLevel === 'Safe'
                ? 'bg-emerald-500'
                : overall.overallRiskLevel === 'Warning'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, overall.overallPercentage))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono mt-3">
          <span className="text-primary/55 font-medium">
            {overall.needClassesForTarget > 0 ? (
              <strong className="text-amber-600">Need {overall.needClassesForTarget} Classes</strong>
            ) : overall.safeLeavesRemaining > 0 ? (
              <strong className="text-emerald-600">Can skip {overall.safeLeavesRemaining} safe</strong>
            ) : (
              <span>Target: {settings.targetPercentage}%</span>
            )}
          </span>
          <span className="text-accent font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
            View Details <ArrowRight size={10} />
          </span>
        </div>
      </div>

      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
    </motion.div>
  );
};

export default AttendanceWidget;

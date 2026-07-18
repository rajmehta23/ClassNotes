import React from 'react';
import { ShieldCheck, AlertTriangle, Target, CheckCircle2 } from 'lucide-react';
import type { OverallAttendanceStats } from '../../types';

interface SmartInsightsProps {
  overall: OverallAttendanceStats;
  targetPercentage: number;
}

export const SmartInsights: React.FC<SmartInsightsProps> = ({ overall, targetPercentage }) => {
  const { overallPercentage, overallRiskLevel, needClassesForTarget, safeLeavesRemaining, bestSubject, worstSubject } =
    overall;

  return (
    <div className="bg-surface rounded-2xl p-6 border border-border/40 shadow-luxury mb-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between ${
            overallRiskLevel === 'Safe'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'
              : overallRiskLevel === 'Warning'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-700'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary/50">
              Attendance Health
            </span>
            {overallRiskLevel === 'Safe' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div>
            <div className="text-2xl font-extrabold tracking-tight mb-1 font-mono">{overallRiskLevel}</div>
            <p className="text-xs opacity-80 font-mono">
              Overall percentage is {overallPercentage.toFixed(1)}% vs target {targetPercentage}%.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-background/50 border border-border/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary/50">
              Action Plan
            </span>
            <Target className="w-5 h-5 text-accent" />
          </div>
          <div>
            {needClassesForTarget > 0 ? (
              <>
                <div className="text-2xl font-extrabold text-amber-600 tracking-tight mb-1 font-mono">
                  Need {needClassesForTarget} Classes
                </div>
                <p className="text-xs text-primary/50 font-mono">
                  Attend next {needClassesForTarget} classes consecutively to bring total to {targetPercentage}%.
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-extrabold text-emerald-600 tracking-tight mb-1 font-mono">
                  Skip {safeLeavesRemaining} Safely
                </div>
                <p className="text-xs text-primary/50 font-mono">
                  You can leave up to {safeLeavesRemaining} classes without falling below {targetPercentage}%.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-background/50 border border-border/30 flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/50">
              Highlights
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="space-y-1.5 text-xs">
            {bestSubject && (
              <div className="flex items-center justify-between">
                <span className="text-primary/50">Best Subject:</span>
                <span className="font-bold text-primary">{bestSubject.name} ({bestSubject.calculations.percentage.toFixed(1)}%)</span>
              </div>
            )}
            {worstSubject && (
              <div className="flex items-center justify-between">
                <span className="text-primary/50">Needs Focus:</span>
                <span className="font-bold text-rose-600">{worstSubject.name} ({worstSubject.calculations.percentage.toFixed(1)}%)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

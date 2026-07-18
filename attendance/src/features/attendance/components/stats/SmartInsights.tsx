import React from 'react';
import { ShieldCheck, AlertTriangle, Sparkles, Target, CheckCircle2 } from 'lucide-react';
import type { OverallAttendanceStats } from '../../types';

interface SmartInsightsProps {
  overall: OverallAttendanceStats;
  targetPercentage: number;
}

export const SmartInsights: React.FC<SmartInsightsProps> = ({ overall, targetPercentage }) => {
  const { overallPercentage, overallRiskLevel, needClassesForTarget, safeLeavesRemaining, bestSubject, worstSubject } =
    overall;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 apple-shadow mb-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-base tracking-tight">Smart Attendance Insights</h3>
          <p className="text-xs text-slate-400">Automated recommendations and risk analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between ${
            overallRiskLevel === 'Safe'
              ? 'bg-emerald-50/60 border-emerald-100 text-emerald-950'
              : overallRiskLevel === 'Warning'
              ? 'bg-amber-50/60 border-amber-100 text-amber-950'
              : 'bg-rose-50/60 border-rose-100 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Attendance Health
            </span>
            {overallRiskLevel === 'Safe' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div>
            <div className="text-2xl font-extrabold tracking-tight mb-1">{overallRiskLevel}</div>
            <p className="text-xs opacity-80">
              Overall percentage is {overallPercentage.toFixed(1)}% vs target {targetPercentage}%.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Action Plan
            </span>
            <Target className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            {needClassesForTarget > 0 ? (
              <>
                <div className="text-2xl font-extrabold text-amber-600 tracking-tight mb-1">
                  Need {needClassesForTarget} Classes
                </div>
                <p className="text-xs text-slate-500">
                  Attend next {needClassesForTarget} classes consecutively to bring total to {targetPercentage}%.
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-extrabold text-emerald-600 tracking-tight mb-1">
                  Skip {safeLeavesRemaining} Safely
                </div>
                <p className="text-xs text-slate-500">
                  You can leave up to {safeLeavesRemaining} classes without falling below {targetPercentage}%.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Highlights
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="space-y-1.5 text-xs">
            {bestSubject && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Best Subject:</span>
                <span className="font-bold text-slate-900">{bestSubject.name} ({bestSubject.calculations.percentage.toFixed(1)}%)</span>
              </div>
            )}
            {worstSubject && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Needs Focus:</span>
                <span className="font-bold text-rose-600">{worstSubject.name} ({worstSubject.calculations.percentage.toFixed(1)}%)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

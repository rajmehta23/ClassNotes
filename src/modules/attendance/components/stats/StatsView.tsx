import React from 'react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import { useAttendanceStats } from '../../hooks';
import { SmartInsights } from './SmartInsights';
import { CurrentMonthDailyTrend } from './CurrentMonthDailyTrend';
import { Award, BarChart2 } from 'lucide-react';

export const StatsView: React.FC = () => {
  const { overall, weeklyTrends, rankedSubjects, targetPercentage } =
    useAttendanceStats();

  return (
    <div className="space-y-6">
      <SmartInsights overall={overall} targetPercentage={targetPercentage} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="bg-surface rounded-2xl p-5 border border-border/40 shadow-luxury">
          <div className="text-[10px] font-bold text-primary/45 uppercase tracking-wider mb-1">
            Overall Attendance
          </div>
          <div className="text-3xl font-extrabold text-primary tracking-tight">
            {overall.overallPercentage.toFixed(1)}%
          </div>
          <span className="text-xs text-primary/50 font-medium">Target: {targetPercentage}%</span>
        </div>

        <div className="bg-surface rounded-2xl p-5 border border-border/40 shadow-luxury">
          <div className="text-[10px] font-bold text-primary/45 uppercase tracking-wider mb-1">
            Total Held Classes
          </div>
          <div className="text-3xl font-extrabold text-primary tracking-tight">
            {overall.totalHeld}
          </div>
          <span className="text-xs text-primary/50 font-medium">All subjects combined</span>
        </div>

        <div className="bg-surface rounded-2xl p-5 border border-border/40 shadow-luxury">
          <div className="text-[10px] font-bold text-primary/45 uppercase tracking-wider mb-1">
            Total Attended
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
            {overall.totalAttended}
          </div>
          <span className="text-xs text-emerald-600 font-medium">Classes present</span>
        </div>

        <div className="bg-surface rounded-2xl p-5 border border-border/40 shadow-luxury">
          <div className="text-[10px] font-bold text-primary/45 uppercase tracking-wider mb-1">
            Total Absent
          </div>
          <div className="text-3xl font-extrabold text-rose-600 tracking-tight">
            {overall.totalAbsent}
          </div>
          <span className="text-xs text-rose-600 font-medium">Classes missed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Month Daily Attendance Trend Section */}
        <CurrentMonthDailyTrend />

        <div className="bg-surface rounded-2xl p-6 border border-border/40 shadow-luxury flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-primary text-base">Weekly Activity Breakdown</h3>
          </div>

          <div className="h-64 w-full font-mono text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'currentColor' }} />
                <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    borderColor: 'rgba(0,0,0,0.1)',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="presentCount" name="Present" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="absentCount" name="Absent" fill="#F43F5E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-6 border border-border/40 shadow-luxury">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-accent" />
          <h3 className="font-bold text-primary text-base">Subject Performance Ranking</h3>
        </div>

        <div className="space-y-3">
          {rankedSubjects.map((sub, idx) => (
            <div
              key={sub.id}
              className="p-4 rounded-xl bg-background/50 border border-border/30 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center font-bold text-primary text-xs shadow-xs font-mono">
                  #{idx + 1}
                </span>
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: sub.color || '#6366F1' }}
                />
                <div>
                  <h4 className="font-bold text-primary text-sm">{sub.name}</h4>
                  <span className="text-xs text-primary/45 font-mono">
                    {sub.attended} attended / {sub.held} held
                  </span>
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-base font-extrabold text-primary">
                  {sub.calculations.percentage.toFixed(1)}%
                </div>
                <span
                  className={`text-[11px] font-bold ${
                    sub.calculations.riskLevel === 'Safe'
                      ? 'text-emerald-600'
                      : sub.calculations.riskLevel === 'Warning'
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
                >
                  {sub.calculations.riskLevel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

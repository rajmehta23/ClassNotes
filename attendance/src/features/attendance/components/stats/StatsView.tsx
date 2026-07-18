import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import { useAttendanceStats } from '../../hooks';
import { SmartInsights } from './SmartInsights';
import { Award, TrendingUp, BarChart2 } from 'lucide-react';

export const StatsView: React.FC = () => {
  const { overall, weeklyTrends, monthlyTrends, rankedSubjects, targetPercentage } =
    useAttendanceStats();

  return (
    <div className="space-y-6">
      <SmartInsights overall={overall} targetPercentage={targetPercentage} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 apple-shadow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Overall Attendance
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {overall.overallPercentage.toFixed(1)}%
          </div>
          <span className="text-xs text-slate-500 font-medium">Target: {targetPercentage}%</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 apple-shadow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Held Classes
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {overall.totalHeld}
          </div>
          <span className="text-xs text-slate-500 font-medium">All subjects combined</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 apple-shadow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Attended
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
            {overall.totalAttended}
          </div>
          <span className="text-xs text-emerald-600 font-medium">Classes present</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 apple-shadow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Absent
          </div>
          <div className="text-3xl font-extrabold text-rose-600 tracking-tight">
            {overall.totalAbsent}
          </div>
          <span className="text-xs text-rose-600 font-medium">Classes missed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 apple-shadow">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Monthly Attendance Trend</h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    borderColor: '#E2E8F0',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Attendance']}
                />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="#6366F1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPct)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 apple-shadow">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Weekly Activity Breakdown</h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    borderColor: '#E2E8F0',
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

      <div className="bg-white rounded-3xl p-6 border border-slate-100 apple-shadow">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-base">Subject Performance Ranking</h3>
        </div>

        <div className="space-y-3">
          {rankedSubjects.map((sub, idx) => (
            <div
              key={sub.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shadow-sm">
                  #{idx + 1}
                </span>
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: sub.color || '#6366F1' }}
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{sub.name}</h4>
                  <span className="text-xs text-slate-400">
                    {sub.attended} attended / {sub.held} held
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-base font-extrabold text-slate-900">
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

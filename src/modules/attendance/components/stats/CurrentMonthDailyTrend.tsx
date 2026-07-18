import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
  ShieldCheck,
  Target,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { format, parseISO, addMonths, subMonths, startOfMonth, isAfter } from 'date-fns';
import { useAttendanceStore } from '../../stores/useAttendanceStore';
import { calculateNeedClasses, calculateSafeLeaves } from '../../calculations';

interface DailyPointData {
  day: number;
  fullDate: string;
  dateLabel: string;
  percentage: number;
  dayPresent: number;
  dayAbsent: number;
  cumulativeHeld: number;
  cumulativeAttended: number;
  needClasses: number;
  safeLeaves: number;
  pointColor: string;
}

export const CurrentMonthDailyTrend: React.FC = () => {
  const history = useAttendanceStore((s) => s.history);
  const subjects = useAttendanceStore((s) => s.subjects);
  const targetPercentage = useAttendanceStore((s) => s.settings.targetPercentage);

  // Current selected month state (e.g. "2026-07")
  const [selectedDateObj, setSelectedDateObj] = useState<Date>(() => startOfMonth(new Date()));

  const selectedMonthStr = format(selectedDateObj, 'yyyy-MM');
  const selectedMonthLabel = format(selectedDateObj, 'MMMM yyyy');

  const isCurrentOrFuture = useMemo(() => {
    const nextMonth = startOfMonth(addMonths(selectedDateObj, 1));
    return isAfter(nextMonth, startOfMonth(new Date()));
  }, [selectedDateObj]);

  const handlePrevMonth = () => {
    setSelectedDateObj((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    if (!isCurrentOrFuture) {
      setSelectedDateObj((prev) => addMonths(prev, 1));
    }
  };

  // Process data for selected month
  const { chartData, presentDaysCount, absentDaysCount, monthPercentage } = useMemo(() => {
    const monthLogs = history
      .filter((log) => log.date.startsWith(selectedMonthStr))
      .sort((a, b) => a.date.localeCompare(b.date));

    const currentHeld = subjects.reduce((sum, s) => sum + s.held, 0);
    const currentAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
    const currentAbsent = Math.max(0, currentHeld - currentAttended);

    // Sum deltas across all logs in this month
    let monthTotalHeldDelta = 0;
    let monthTotalAttendedDelta = 0;

    const parsedLogs = monthLogs.map((record) => {
      let dayPresent = 0;
      let dayAbsent = 0;

      Object.values(record.statuses || {}).forEach((status) => {
        if (status === 'present') dayPresent++;
        else if (status === 'absent') dayAbsent++;
      });

      monthTotalHeldDelta += dayPresent + dayAbsent;
      monthTotalAttendedDelta += dayPresent;

      return {
        record,
        dayPresent,
        dayAbsent,
      };
    });

    // Base prior to this month's logs
    const baseHeld = Math.max(0, currentHeld - monthTotalHeldDelta);
    const baseAttended = Math.max(0, currentAttended - monthTotalAttendedDelta);

    let runningHeld = baseHeld;
    let runningAttended = baseAttended;

    const points: DailyPointData[] = [];

    parsedLogs.forEach(({ record, dayPresent, dayAbsent }) => {
      runningHeld += dayPresent + dayAbsent;
      runningAttended += dayPresent;

      const pct = runningHeld > 0 ? (runningAttended / runningHeld) * 100 : 100;
      const formattedPct = parseFloat(pct.toFixed(1));

      const dayNum = parseInt(record.date.split('-')[2], 10);
      const dateLabel = format(parseISO(record.date), 'dd MMM yyyy');

      const needClasses = calculateNeedClasses(runningHeld, runningAttended, targetPercentage);
      const safeLeaves = calculateSafeLeaves(runningHeld, runningAttended, targetPercentage);

      let pointColor = '#10B981'; // Green
      if (formattedPct < targetPercentage) {
        pointColor = '#EF4444'; // Red
      } else if (formattedPct <= targetPercentage + 3) {
        pointColor = '#F59E0B'; // Orange
      }

      points.push({
        day: dayNum,
        fullDate: record.date,
        dateLabel,
        percentage: formattedPct,
        dayPresent,
        dayAbsent,
        cumulativeHeld: runningHeld,
        cumulativeAttended: runningAttended,
        needClasses,
        safeLeaves,
        pointColor,
      });
    });

    const finalPct = currentHeld > 0 ? (currentAttended / currentHeld) * 100 : 100;

    return {
      chartData: points,
      presentDaysCount: currentAttended,
      absentDaysCount: currentAbsent,
      monthPercentage: parseFloat(finalPct.toFixed(1)),
    };
  }, [history, subjects, selectedMonthStr, targetPercentage]);

  // Custom Dot component
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;
    const fill = payload.pointColor || '#3B82F6';
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={2}
        className="transition-all duration-300"
      />
    );
  };

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: DailyPointData = payload[0].payload;
    return (
      <div className="bg-surface/95 backdrop-blur-md border border-border/50 p-3.5 rounded-2xl shadow-luxury font-mono text-xs space-y-1.5 min-w-[200px] z-50">
        <div className="font-bold text-primary border-b border-border/40 pb-1.5 flex justify-between items-center gap-4">
          <span>{data.dateLabel}</span>
          <span className="text-accent font-black text-sm">{data.percentage}%</span>
        </div>
        <div className="text-[11px] space-y-1 text-primary/70 pt-1">
          <div className="flex justify-between items-center">
            <span>Present Classes:</span>
            <span className="font-bold text-emerald-600">+{data.dayPresent}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Absent Classes:</span>
            <span className="font-bold text-rose-600">+{data.dayAbsent}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Total Cumulative Held:</span>
            <span className="font-bold text-primary">{data.cumulativeHeld}</span>
          </div>
          <div className="flex justify-between items-center border-t border-border/30 pt-1">
            <span>Need Classes:</span>
            <span className="font-bold text-amber-600">{data.needClasses}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Safe Leaves:</span>
            <span className="font-bold text-emerald-600">{data.safeLeaves}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-surface rounded-2xl p-6 border border-border/40 shadow-luxury space-y-6">
      {/* Header & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider font-mono">
            <TrendingUp className="w-4 h-4" /> Current Month Daily Attendance Trend
          </div>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2 bg-background/50 border border-border/40 p-1.5 rounded-xl font-mono">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-xs font-bold text-primary px-2 min-w-[100px] text-center select-none">
            {selectedMonthLabel}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={isCurrentOrFuture}
            className="p-1.5 rounded-lg text-primary/70 hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary Row Above Graph */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
        <div className="p-2 rounded-xl bg-background/50 border border-border/30">
          <span className="text-[9px] uppercase tracking-wider text-primary/45 block font-bold">Present / Absent</span>
          <div className="flex items-center gap-2 mt-0.5 font-extrabold text-sm">
            <span className="text-emerald-600 flex items-center gap-0.5"><CheckCircle2 size={12} /> {presentDaysCount}</span>
            <span className="text-rose-600 flex items-center gap-0.5"><XCircle size={12} /> {absentDaysCount}</span>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-background/50 border border-border/30">
          <span className="text-[9px] uppercase tracking-wider text-primary/45 block font-bold">Month %</span>
          <span className="text-sm font-extrabold text-primary mt-0.5 block">
            {chartData.length > 0 ? `${monthPercentage}%` : 'N/A'}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-background/50 border border-border/30">
          <span className="text-[9px] uppercase tracking-wider text-primary/45 block font-bold">Target</span>
          <span className="text-sm font-extrabold text-amber-600 flex items-center gap-1 mt-0.5">
            <Target size={12} /> {targetPercentage}%
          </span>
        </div>

        <div className="p-2 rounded-xl bg-background/50 border border-border/30">
          <span className="text-[9px] uppercase tracking-wider text-primary/45 block font-bold">Health Status</span>
          <span className="text-xs font-bold mt-0.5 block truncate">
            {monthPercentage >= targetPercentage + 3 ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <ShieldCheck size={12} /> Above Buffer
              </span>
            ) : monthPercentage >= targetPercentage ? (
              <span className="text-amber-600">On Target</span>
            ) : (
              <span className="text-rose-600">Below Target</span>
            )}
          </span>
        </div>
      </div>

      {/* Main Chart Area or Empty State */}
      <AnimatePresence mode="wait">
        {chartData.length === 0 ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 rounded-2xl bg-background/30 border border-dashed border-border/50 text-center space-y-2 flex flex-col items-center justify-center min-h-[220px]"
          >
            {/* SVG Illustration */}
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Calendar size={24} />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-primary text-sm">
                No daily attendance records for this month yet.
              </h4>
              <p className="text-xs text-primary/50 font-mono">
                Start marking attendance daily to see your monthly progress.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`chart-${selectedMonthStr}`}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.2 }}
            className="h-64 w-full font-mono text-xs"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 20, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />

                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                  label={{ value: 'Day of Month', position: 'insideBottom', offset: -5, fill: 'currentColor', fontSize: 10 }}
                />

                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                />

                <Tooltip content={<CustomTooltip />} />

                {/* Target Reference Line */}
                <ReferenceLine
                  y={targetPercentage}
                  stroke="#F97316"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Target (${targetPercentage}%)`,
                    fill: '#F97316',
                    fontSize: 10,
                    position: 'top',
                    fontWeight: 'bold',
                  }}
                />

                {/* Cumulative Attendance Line */}
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={<CustomDot />}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: '#ffffff' }}
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Legend Footer */}
            <div className="flex items-center justify-between text-[10px] text-primary/50 pt-2 border-t border-border/30 select-none">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Attendance Line
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Target ({targetPercentage}%)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Above Target
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Near Target (±3%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Below Target
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CurrentMonthDailyTrend;

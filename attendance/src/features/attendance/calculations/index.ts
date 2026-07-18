import type {
  DailyAttendanceRecord,
  MissedDayDetection,
  MonthlyTrendPoint,
  OverallAttendanceStats,
  RiskLevel,
  Subject,
  SubjectSyncDelta,
  SubjectWithCalculations,
  WeeklyTrendPoint,
} from '../types';
import { RISK_THRESHOLDS } from '../constants';
import { differenceInCalendarDays, parseISO, format, addDays } from 'date-fns';

// ============================================================================
// SECTION 1: ATTENDANCE CORE CALCULATIONS
// ============================================================================

/**
 * Calculates raw attendance percentage rounded to 1 decimal place.
 * Returns 100 if held is 0.
 */
export function calculateAttendancePercentage(attended: number, held: number): number {
  if (held <= 0) return 100.0;
  if (attended < 0) attended = 0;
  if (attended > held) attended = held;
  const percentage = (attended / held) * 100;
  return Math.round(percentage * 10) / 10;
}

/**
 * Calculates total absent classes.
 */
export function calculateAbsentClasses(held: number, attended: number): number {
  const diff = held - attended;
  return diff > 0 ? diff : 0;
}

/**
 * Calculates number of consecutive classes student must attend to reach target percentage.
 */
export function calculateNeedClasses(held: number, attended: number, targetPercentage: number): number {
  if (targetPercentage <= 0 || targetPercentage > 100) targetPercentage = 75;
  const targetRatio = targetPercentage / 100;

  if (held <= 0) return 0;
  const currentRatio = attended / held;
  if (currentRatio >= targetRatio) return 0;

  const numerator = targetRatio * held - attended;
  const denominator = 1 - targetRatio;

  if (denominator <= 0) return 0;

  const needed = Math.ceil(numerator / denominator);
  return needed > 0 ? needed : 0;
}

/**
 * Calculates maximum number of classes student can skip without dropping below target percentage.
 */
export function calculateSafeLeaves(held: number, attended: number, targetPercentage: number): number {
  if (targetPercentage <= 0 || targetPercentage > 100) targetPercentage = 75;
  const targetRatio = targetPercentage / 100;

  if (held <= 0) return 0;
  const currentRatio = attended / held;
  if (currentRatio < targetRatio) return 0;

  const numerator = attended - targetRatio * held;
  const leaves = Math.floor(numerator / targetRatio);

  return leaves > 0 ? leaves : 0;
}

/**
 * Determines risk level based on percentage vs target percentage.
 */
export function calculateRiskLevel(percentage: number, targetPercentage: number): RiskLevel {
  const safeThreshold = targetPercentage + RISK_THRESHOLDS.SAFE_BUFFER;
  if (percentage >= safeThreshold) {
    return 'Safe';
  } else if (percentage >= targetPercentage) {
    return 'Warning';
  } else {
    return 'Critical';
  }
}

/**
 * Calculates attendance percentage predictions if the next class is attended or missed.
 */
export function calculateNextClassPrediction(held: number, attended: number): { ifAttended: number; ifMissed: number } {
  const nextHeld = held + 1;
  const ifAttended = calculateAttendancePercentage(attended + 1, nextHeld);
  const ifMissed = calculateAttendancePercentage(attended, nextHeld);
  return { ifAttended, ifMissed };
}

/**
 * Combines subject data with full calculated metrics.
 */
export function getSubjectWithCalculations(subject: Subject, targetPercentage: number = 75): SubjectWithCalculations {
  const percentage = calculateAttendancePercentage(subject.attended, subject.held);
  const absent = calculateAbsentClasses(subject.held, subject.attended);
  const needClasses = calculateNeedClasses(subject.held, subject.attended, targetPercentage);
  const safeLeaves = calculateSafeLeaves(subject.held, subject.attended, targetPercentage);
  const riskLevel = calculateRiskLevel(percentage, targetPercentage);
  const nextClassPrediction = calculateNextClassPrediction(subject.held, subject.attended);

  return {
    ...subject,
    calculations: {
      percentage,
      absent,
      needClasses,
      safeLeaves,
      riskLevel,
      nextClassPrediction,
    },
  };
}

// ============================================================================
// SECTION 2: MISSED DAYS & QUICK SYNC CALCULATIONS
// ============================================================================

/**
 * Detects missed days between last updated date and today's date.
 */
export function detectMissedDays(lastUpdatedDate: string, todayDate: string): MissedDayDetection {
  if (!lastUpdatedDate) {
    return {
      lastUpdatedDate: todayDate,
      todayDate,
      missedCount: 0,
      missedDates: [],
      hasPendingMissedDays: false,
    };
  }

  const startDate = parseISO(lastUpdatedDate);
  const endDate = parseISO(todayDate);
  const diffDays = differenceInCalendarDays(endDate, startDate);

  if (diffDays <= 1) {
    return {
      lastUpdatedDate,
      todayDate,
      missedCount: 0,
      missedDates: [],
      hasPendingMissedDays: false,
    };
  }

  const missedDates: string[] = [];
  for (let i = 1; i <= diffDays; i++) {
    const nextDate = addDays(startDate, i);
    missedDates.push(format(nextDate, 'yyyy-MM-dd'));
  }

  return {
    lastUpdatedDate,
    todayDate,
    missedCount: missedDates.length,
    missedDates,
    hasPendingMissedDays: missedDates.length > 0,
  };
}

/**
 * Calculates and validates Quick Sync deltas for a subject.
 */
export function calculateQuickSyncDelta(
  subject: Subject,
  newHeld: number,
  newAttended: number
): SubjectSyncDelta {
  const currentHeld = subject.held || 0;
  const currentAttended = subject.attended || 0;

  let isValid = true;
  let errorMessage: string | undefined = undefined;

  if (isNaN(newHeld) || isNaN(newAttended)) {
    isValid = false;
    errorMessage = 'Please enter valid numerical values.';
  } else if (newHeld < currentHeld) {
    isValid = false;
    errorMessage = `New held classes (${newHeld}) cannot be less than current held classes (${currentHeld}).`;
  } else if (newAttended < currentAttended) {
    isValid = false;
    errorMessage = `New attended classes (${newAttended}) cannot exceed current attended classes (${currentAttended}).`;
  } else if (newAttended > newHeld) {
    isValid = false;
    errorMessage = `Attended classes (${newAttended}) cannot exceed total held classes (${newHeld}).`;
  } else if (newHeld - currentHeld < newAttended - currentAttended) {
    isValid = false;
    errorMessage = `Increase in attended classes cannot exceed increase in held classes.`;
  }

  const deltaHeld = newHeld - currentHeld;
  const deltaAttended = newAttended - currentAttended;

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    currentHeld,
    currentAttended,
    newHeld,
    newAttended,
    deltaHeld: deltaHeld > 0 ? deltaHeld : 0,
    deltaAttended: deltaAttended > 0 ? deltaAttended : 0,
    isValid,
    errorMessage,
  };
}

// ============================================================================
// SECTION 3: STATS & TRENDS CALCULATIONS
// ============================================================================

/**
 * Computes overall aggregated stats for a collection of subjects.
 */
export function calculateOverallStats(
  subjects: Subject[],
  targetPercentage: number = 75
): OverallAttendanceStats {
  if (!subjects || subjects.length === 0) {
    return {
      totalHeld: 0,
      totalAttended: 0,
      totalAbsent: 0,
      overallPercentage: 100,
      overallRiskLevel: 'Safe',
      needClassesForTarget: 0,
      safeLeavesRemaining: 0,
      bestSubject: null,
      worstSubject: null,
      subjectsCount: 0,
    };
  }

  const subjectsWithCalc: SubjectWithCalculations[] = subjects.map((sub) =>
    getSubjectWithCalculations(sub, targetPercentage)
  );

  let totalHeld = 0;
  let totalAttended = 0;

  subjectsWithCalc.forEach((sub) => {
    totalHeld += sub.held;
    totalAttended += sub.attended;
  });

  const totalAbsent = calculateAbsentClasses(totalHeld, totalAttended);
  const overallPercentage = calculateAttendancePercentage(totalAttended, totalHeld);
  const overallRiskLevel = calculateRiskLevel(overallPercentage, targetPercentage);
  const needClassesForTarget = calculateNeedClasses(totalHeld, totalAttended, targetPercentage);
  const safeLeavesRemaining = calculateSafeLeaves(totalHeld, totalAttended, targetPercentage);

  const sorted = [...subjectsWithCalc].sort(
    (a, b) => b.calculations.percentage - a.calculations.percentage
  );

  const bestSubject = sorted.length > 0 ? sorted[0] : null;
  const worstSubject = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  return {
    totalHeld,
    totalAttended,
    totalAbsent,
    overallPercentage,
    overallRiskLevel,
    needClassesForTarget,
    safeLeavesRemaining,
    bestSubject,
    worstSubject,
    subjectsCount: subjects.length,
  };
}

/**
 * Computes weekly trend points from daily attendance history logs.
 */
export function calculateWeeklyTrends(historyLogs: DailyAttendanceRecord[]): WeeklyTrendPoint[] {
  if (!historyLogs || historyLogs.length === 0) {
    return [];
  }

  const sortedLogs = [...historyLogs].sort((a, b) => a.date.localeCompare(b.date));
  const recentLogs = sortedLogs.slice(-7);

  return recentLogs.map((log) => {
    let presentCount = 0;
    let absentCount = 0;

    Object.values(log.statuses || {}).forEach((status) => {
      if (status === 'present') presentCount++;
      if (status === 'absent') absentCount++;
    });

    const total = presentCount + absentCount;
    const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 100;

    return {
      week: log.date.slice(5),
      percentage,
      presentCount,
      absentCount,
    };
  });
}

/**
 * Computes monthly aggregated attendance trends.
 */
export function calculateMonthlyTrends(
  historyLogs: DailyAttendanceRecord[],
  subjects: Subject[]
): MonthlyTrendPoint[] {
  if (!historyLogs || historyLogs.length === 0) {
    const overall = calculateOverallStats(subjects);
    return [
      {
        month: 'Current',
        percentage: overall.overallPercentage,
        held: overall.totalHeld,
        attended: overall.totalAttended,
      },
    ];
  }

  const monthMap: Record<string, { present: number; absent: number }> = {};

  historyLogs.forEach((log) => {
    const monthKey = log.date.slice(0, 7);
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { present: 0, absent: 0 };
    }

    Object.values(log.statuses || {}).forEach((status) => {
      if (status === 'present') monthMap[monthKey].present++;
      if (status === 'absent') monthMap[monthKey].absent++;
    });
  });

  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, data]) => {
      const held = data.present + data.absent;
      const percentage = held > 0 ? Math.round((data.present / held) * 100 * 10) / 10 : 100;
      return {
        month: monthKey,
        percentage,
        held,
        attended: data.present,
      };
    });
}

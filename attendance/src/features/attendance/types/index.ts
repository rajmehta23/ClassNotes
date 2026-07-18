export type RiskLevel = 'Safe' | 'Warning' | 'Critical';

export type AttendanceStatus = 'present' | 'absent' | 'no_class';

export interface Subject {
  id: string;
  name: string;
  code?: string;
  color?: string;
  held: number;
  attended: number;
  lastUpdated: string;
  createdAt: string;
}

export interface AttendanceCalculations {
  percentage: number;
  absent: number;
  needClasses: number;
  safeLeaves: number;
  riskLevel: RiskLevel;
  nextClassPrediction: {
    ifAttended: number;
    ifMissed: number;
  };
}

export interface SubjectWithCalculations extends Subject {
  calculations: AttendanceCalculations;
}

export interface DailyAttendanceRecord {
  date: string;
  timestamp: number;
  statuses: Record<string, AttendanceStatus>;
  notes?: string;
}

export interface QuickSyncLog {
  id: string;
  timestamp: string;
  date: string;
  subjectId: string;
  subjectName: string;
  previousHeld: number;
  previousAttended: number;
  newHeld: number;
  newAttended: number;
  deltaHeld: number;
  deltaAttended: number;
}

export interface AttendanceSettings {
  targetPercentage: number;
  reminderTime?: string;
  notificationsEnabled: boolean;
  installationDate: string;
}

export interface OverallAttendanceStats {
  totalHeld: number;
  totalAttended: number;
  totalAbsent: number;
  overallPercentage: number;
  overallRiskLevel: RiskLevel;
  needClassesForTarget: number;
  safeLeavesRemaining: number;
  bestSubject: SubjectWithCalculations | null;
  worstSubject: SubjectWithCalculations | null;
  subjectsCount: number;
}

export interface MonthlyTrendPoint {
  month: string;
  percentage: number;
  held: number;
  attended: number;
}

export interface WeeklyTrendPoint {
  week: string;
  percentage: number;
  presentCount: number;
  absentCount: number;
}

export interface MissedDayDetection {
  lastUpdatedDate: string;
  todayDate: string;
  missedCount: number;
  missedDates: string[];
  hasPendingMissedDays: boolean;
}

export interface SubjectSyncDelta {
  subjectId: string;
  subjectName: string;
  currentHeld: number;
  currentAttended: number;
  newHeld: number;
  newAttended: number;
  deltaHeld: number;
  deltaAttended: number;
  isValid: boolean;
  errorMessage?: string;
}

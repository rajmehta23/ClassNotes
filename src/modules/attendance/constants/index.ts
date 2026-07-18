import type { AttendanceSettings } from '../types';

export const DEFAULT_SETTINGS: AttendanceSettings = {
  targetPercentage: 75,
  reminderTime: '20:00',
  notificationsEnabled: true,
  installationDate: new Date().toISOString(),
};

export const TARGET_PERCENTAGE_OPTIONS = [70, 75, 80, 85, 90];

export const RISK_THRESHOLDS = {
  SAFE_BUFFER: 5,
};

export const SUBJECT_COLOR_PALETTE = [
  { hex: '#6366F1', name: 'Indigo' },
  { hex: '#3B82F6', name: 'Blue' },
  { hex: '#0EA5E9', name: 'Sky' },
  { hex: '#10B981', name: 'Emerald' },
  { hex: '#8B5CF6', name: 'Violet' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#14B8A6', name: 'Teal' },
];

export const FIRESTORE_PATHS = {
  ATTENDANCE_ROOT: (userId: string) => `users/${userId}/attendance`,
  SUBJECTS: (userId: string) => `users/${userId}/attendance/subjects/items`,
  HISTORY: (userId: string) => `users/${userId}/attendance/history/logs`,
  QUICK_SYNC: (userId: string) => `users/${userId}/attendance/quickSync/records`,
  SETTINGS: (userId: string) => `users/${userId}/attendance/settings/config`,
  STATISTICS: (userId: string) => `users/${userId}/attendance/statistics/summary`,
};

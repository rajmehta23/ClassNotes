import { create } from 'zustand';
import type {
  AttendanceSettings,
  AttendanceStatus,
  DailyAttendanceRecord,
  MissedDayDetection,
  QuickSyncLog,
  Subject,
  SubjectSyncDelta,
} from '../types';
import { DEFAULT_SETTINGS, SUBJECT_COLOR_PALETTE } from '../constants';
import { FirestoreAttendanceService } from '../services/firebase/firestoreAttendanceService';
import { detectMissedDays } from '../calculations';
import { format } from 'date-fns';

export interface AttendanceState {
  userId: string;
  subjects: Subject[];
  settings: AttendanceSettings;
  history: DailyAttendanceRecord[];
  quickSyncLogs: QuickSyncLog[];
  isLoading: boolean;
  isInitialized: boolean;
  selectedSubjectId: string | null;
  activeModal: 'setup' | 'quicksync' | 'missedDays' | 'addSubject' | 'editSubject' | null;
  editingSubjectId: string | null;
  pendingMissedDays: MissedDayDetection | null;

  initModule: (userId?: string) => Promise<void>;
  setUserId: (userId: string) => void;
  saveSetupSubjects: (
    subjectsData: Array<{ name: string; held: number; attended: number; color?: string }>
  ) => Promise<void>;
  addSubject: (subject: { name: string; held: number; attended: number; color?: string }) => Promise<void>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  markDailyAttendance: (date: string, statuses: Record<string, AttendanceStatus>) => Promise<void>;
  applyQuickSync: (deltas: SubjectSyncDelta[]) => Promise<void>;
  updateSettings: (newSettings: Partial<AttendanceSettings>) => Promise<void>;
  setSelectedSubjectId: (id: string | null) => void;
  setActiveModal: (modal: AttendanceState['activeModal'], subjectId?: string) => void;
  checkMissedDays: () => void;
  dismissMissedDays: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  userId: 'guest_user',
  subjects: [],
  settings: DEFAULT_SETTINGS,
  history: [],
  quickSyncLogs: [],
  isLoading: true,
  isInitialized: false,
  selectedSubjectId: null,
  activeModal: null,
  editingSubjectId: null,
  pendingMissedDays: null,

  setUserId: (userId: string) => set({ userId }),

  initModule: async (providedUserId?: string) => {
    const currentUserId = providedUserId || get().userId || 'guest_user';
    set({ userId: currentUserId, isLoading: true });

    try {
      const [fetchedSettings, fetchedSubjects, fetchedHistory, fetchedSyncLogs] = await Promise.all([
        FirestoreAttendanceService.getSettings(currentUserId),
        FirestoreAttendanceService.getSubjects(currentUserId),
        FirestoreAttendanceService.getAttendanceHistory(currentUserId),
        FirestoreAttendanceService.getQuickSyncLogs(currentUserId),
      ]);

      const settings = fetchedSettings || {
        ...DEFAULT_SETTINGS,
        installationDate: new Date().toISOString(),
      };

      const subjects = fetchedSubjects || [];
      const history = fetchedHistory || [];
      const quickSyncLogs = fetchedSyncLogs || [];

      const isFirstSetup = subjects.length === 0;
      let activeModal: AttendanceState['activeModal'] = isFirstSetup ? 'setup' : null;

      let pendingMissedDays: MissedDayDetection | null = null;
      if (!isFirstSetup && subjects.length > 0) {
        const latestSubjectDate = subjects.reduce((latest, sub) => {
          if (!sub.lastUpdated) return latest;
          return sub.lastUpdated > latest ? sub.lastUpdated : latest;
        }, settings.installationDate.slice(0, 10));

        const today = format(new Date(), 'yyyy-MM-dd');
        const missed = detectMissedDays(latestSubjectDate, today);

        if (missed.hasPendingMissedDays) {
          pendingMissedDays = missed;
          if (!activeModal) activeModal = 'missedDays';
        }
      }

      set({
        subjects,
        settings,
        history,
        quickSyncLogs,
        isLoading: false,
        isInitialized: true,
        activeModal,
        pendingMissedDays,
      });
    } catch (err) {
      console.error('Error initializing Attendance module:', err);
      set({ isLoading: false, isInitialized: true });
    }
  },

  saveSetupSubjects: async (subjectsData) => {
    const { userId, settings } = get();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const newSubjects: Subject[] = subjectsData.map((s, idx) => ({
      id: `sub_${Date.now()}_${idx}`,
      name: s.name.trim(),
      held: Math.max(0, s.held),
      attended: Math.min(Math.max(0, s.attended), Math.max(0, s.held)),
      color: s.color || SUBJECT_COLOR_PALETTE[idx % SUBJECT_COLOR_PALETTE.length].hex,
      lastUpdated: todayStr,
      createdAt: new Date().toISOString(),
    }));

    const updatedSettings: AttendanceSettings = {
      ...settings,
      installationDate: new Date().toISOString(),
    };

    set({ subjects: newSubjects, settings: updatedSettings, activeModal: null });

    await Promise.all([
      FirestoreAttendanceService.saveSubjects(userId, newSubjects),
      FirestoreAttendanceService.saveSettings(userId, updatedSettings),
    ]);
  },

  addSubject: async (subjectData) => {
    const { userId, subjects } = get();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const newSub: Subject = {
      id: `sub_${Date.now()}`,
      name: subjectData.name.trim(),
      held: Math.max(0, subjectData.held),
      attended: Math.min(Math.max(0, subjectData.attended), Math.max(0, subjectData.held)),
      color:
        subjectData.color ||
        SUBJECT_COLOR_PALETTE[subjects.length % SUBJECT_COLOR_PALETTE.length].hex,
      lastUpdated: todayStr,
      createdAt: new Date().toISOString(),
    };

    const updated = [...subjects, newSub];
    set({ subjects: updated, activeModal: null });
    await FirestoreAttendanceService.saveSubjects(userId, updated);
  },

  updateSubject: async (id, updates) => {
    const { userId, subjects } = get();
    const updated = subjects.map((sub) => {
      if (sub.id !== id) return sub;
      const nextHeld = updates.held !== undefined ? Math.max(0, updates.held) : sub.held;
      const nextAttended =
        updates.attended !== undefined
          ? Math.min(Math.max(0, updates.attended), nextHeld)
          : Math.min(sub.attended, nextHeld);

      return {
        ...sub,
        ...updates,
        held: nextHeld,
        attended: nextAttended,
        lastUpdated: format(new Date(), 'yyyy-MM-dd'),
      };
    });

    set({ subjects: updated, activeModal: null, editingSubjectId: null });
    await FirestoreAttendanceService.saveSubjects(userId, updated);
  },

  deleteSubject: async (id) => {
    const { userId, subjects, selectedSubjectId } = get();
    const updated = subjects.filter((s) => s.id !== id);
    set({
      subjects: updated,
      selectedSubjectId: selectedSubjectId === id ? null : selectedSubjectId,
      activeModal: null,
    });

    await FirestoreAttendanceService.deleteSubject(userId, id);
  },

  markDailyAttendance: async (dateStr, statuses) => {
    const { userId, subjects, history } = get();

    const existingLog = history.find((h) => h.date === dateStr);
    const prevStatuses = existingLog?.statuses || {};

    const updatedSubjects = subjects.map((sub) => {
      const prevStatus = prevStatuses[sub.id] || 'no_class';
      const newStatus = statuses[sub.id] || 'no_class';

      if (prevStatus === newStatus) return sub;

      let heldDelta = 0;
      let attendedDelta = 0;

      if (prevStatus === 'present') {
        heldDelta -= 1;
        attendedDelta -= 1;
      } else if (prevStatus === 'absent') {
        heldDelta -= 1;
      }

      if (newStatus === 'present') {
        heldDelta += 1;
        attendedDelta += 1;
      } else if (newStatus === 'absent') {
        heldDelta += 1;
      }

      const nextHeld = Math.max(0, sub.held + heldDelta);
      const nextAttended = Math.min(Math.max(0, sub.attended + attendedDelta), nextHeld);

      return {
        ...sub,
        held: nextHeld,
        attended: nextAttended,
        lastUpdated: dateStr,
      };
    });

    const newRecord: DailyAttendanceRecord = {
      date: dateStr,
      timestamp: Date.now(),
      statuses,
    };

    const updatedHistory = [...history.filter((h) => h.date !== dateStr), newRecord].sort(
      (a, b) => b.date.localeCompare(a.date)
    );

    set({ subjects: updatedSubjects, history: updatedHistory });
    await FirestoreAttendanceService.saveDailyAttendance(userId, newRecord, updatedSubjects);
  },

  applyQuickSync: async (deltas) => {
    const { userId, subjects, quickSyncLogs } = get();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const nowIso = new Date().toISOString();

    const newSyncLogs: QuickSyncLog[] = [];

    const updatedSubjects = subjects.map((sub) => {
      const delta = deltas.find((d) => d.subjectId === sub.id);
      if (!delta || !delta.isValid) return sub;

      if (delta.deltaHeld > 0 || delta.deltaAttended > 0) {
        newSyncLogs.push({
          id: `sync_${Date.now()}_${sub.id}`,
          timestamp: nowIso,
          date: todayStr,
          subjectId: sub.id,
          subjectName: sub.name,
          previousHeld: delta.currentHeld,
          previousAttended: delta.currentAttended,
          newHeld: delta.newHeld,
          newAttended: delta.newAttended,
          deltaHeld: delta.deltaHeld,
          deltaAttended: delta.deltaAttended,
        });
      }

      return {
        ...sub,
        held: delta.newHeld,
        attended: delta.newAttended,
        lastUpdated: todayStr,
      };
    });

    const updatedSyncLogs = [...newSyncLogs, ...quickSyncLogs];

    set({
      subjects: updatedSubjects,
      quickSyncLogs: updatedSyncLogs,
      activeModal: null,
      pendingMissedDays: null,
    });

    await FirestoreAttendanceService.applyQuickSync(userId, updatedSubjects, newSyncLogs);
  },

  updateSettings: async (newSettings) => {
    const { userId, settings } = get();
    const updated = { ...settings, ...newSettings };
    set({ settings: updated });
    await FirestoreAttendanceService.saveSettings(userId, updated);
  },

  setSelectedSubjectId: (id) => set({ selectedSubjectId: id }),

  setActiveModal: (modal, subjectId) =>
    set({ activeModal: modal, editingSubjectId: subjectId || null }),

  checkMissedDays: () => {
    const { subjects, settings } = get();
    if (!subjects.length) return;
    const latestSubjectDate = subjects.reduce((latest, sub) => {
      if (!sub.lastUpdated) return latest;
      return sub.lastUpdated > latest ? sub.lastUpdated : latest;
    }, settings.installationDate.slice(0, 10));

    const today = format(new Date(), 'yyyy-MM-dd');
    const missed = detectMissedDays(latestSubjectDate, today);

    if (missed.hasPendingMissedDays) {
      set({ pendingMissedDays: missed, activeModal: 'missedDays' });
    }
  },

  dismissMissedDays: () => set({ pendingMissedDays: null, activeModal: null }),
}));

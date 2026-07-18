import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { getAttendanceDb } from './firebaseConfig';
import { FIRESTORE_PATHS } from '../../constants';
import type {
  AttendanceSettings,
  DailyAttendanceRecord,
  QuickSyncLog,
  Subject,
} from '../../types';

const LOCAL_STORAGE_KEY_PREFIX = 'classnotes_attendance_';

/**
 * Defensive localStorage parser that recovers gracefully from corrupted caches.
 */
function safeGetLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted cache - purge key safely
    try {
      localStorage.removeItem(key);
    } catch {}
    return null;
  }
}

/**
 * Sanitizes technical error logs to prevent exposing internal stack traces in production.
 */
function logDevWarning(msg: string, err?: any): void {
  if (import.meta.env.DEV) {
    console.warn(`[AttendanceService] ${msg}`, err);
  }
}

/**
 * Sanitizes subject fields before persisting to prevent malformed or negative data.
 */
function sanitizeSubject(sub: Subject): Subject {
  const held = Math.min(100000, Math.max(0, Math.floor(sub.held || 0)));
  const attended = Math.min(held, Math.max(0, Math.floor(sub.attended || 0)));
  const name = (sub.name || 'Subject').trim().slice(0, 100);

  return {
    ...sub,
    name: name || 'Subject',
    held,
    attended,
    lastUpdated: sub.lastUpdated || new Date().toISOString().slice(0, 10),
  };
}

export class FirestoreAttendanceService {
  static async getSettings(userId: string): Promise<AttendanceSettings | null> {
    if (!userId || userId === 'guest_user') return null;

    try {
      const db = getAttendanceDb();
      const settingsRef = doc(db, FIRESTORE_PATHS.SETTINGS(userId));
      const snap = await Promise.race([
        getDoc(settingsRef),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500)),
      ]);

      if (snap && snap.exists()) {
        const data = snap.data() as AttendanceSettings;
        if (data && typeof data.targetPercentage === 'number') {
          return data;
        }
      }
    } catch (err) {
      logDevWarning('getSettings error, using local fallback:', err);
    }

    return safeGetLocal<AttendanceSettings>(`${LOCAL_STORAGE_KEY_PREFIX}settings_${userId}`);
  }

  static async saveSettings(userId: string, settings: AttendanceSettings): Promise<void> {
    if (!userId || userId === 'guest_user') return;

    const sanitizedSettings: AttendanceSettings = {
      ...settings,
      targetPercentage: Math.min(100, Math.max(1, Math.floor(settings.targetPercentage || 75))),
    };

    try {
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY_PREFIX}settings_${userId}`,
        JSON.stringify(sanitizedSettings)
      );
    } catch {}

    try {
      const db = getAttendanceDb();
      const settingsRef = doc(db, FIRESTORE_PATHS.SETTINGS(userId));
      await setDoc(settingsRef, sanitizedSettings, { merge: true });
    } catch (err) {
      logDevWarning('saveSettings warning:', err);
    }
  }

  static async getSubjects(userId: string): Promise<Subject[]> {
    if (!userId || userId === 'guest_user') return [];

    try {
      const db = getAttendanceDb();
      const subjectsCol = collection(db, FIRESTORE_PATHS.SUBJECTS(userId));
      const snap = await Promise.race([
        getDocs(subjectsCol),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500)),
      ]);

      if (snap && !snap.empty) {
        const subjects = snap.docs.map((d) => sanitizeSubject({ id: d.id, ...d.data() } as Subject));
        try {
          localStorage.setItem(
            `${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`,
            JSON.stringify(subjects)
          );
        } catch {}
        return subjects;
      }
    } catch (err) {
      logDevWarning('getSubjects error, reading local fallback:', err);
    }

    const local = safeGetLocal<Subject[]>(`${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`);
    return local ? local.map(sanitizeSubject) : [];
  }

  static async saveSubjects(userId: string, subjects: Subject[]): Promise<void> {
    if (!userId || userId === 'guest_user') return;

    const sanitized = subjects.map(sanitizeSubject);

    try {
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`,
        JSON.stringify(sanitized)
      );
    } catch {}

    try {
      const db = getAttendanceDb();
      const batch = writeBatch(db);

      sanitized.forEach((sub) => {
        const subRef = doc(db, FIRESTORE_PATHS.SUBJECTS(userId), sub.id);
        batch.set(subRef, sub, { merge: true });
      });

      await batch.commit();
    } catch (err) {
      logDevWarning('saveSubjects warning:', err);
    }
  }

  static async deleteSubject(userId: string, subjectId: string): Promise<void> {
    if (!userId || userId === 'guest_user' || !subjectId) return;

    const localSubjects = safeGetLocal<Subject[]>(`${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`) || [];
    const updated = localSubjects.filter((s) => s.id !== subjectId);

    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`, JSON.stringify(updated));
    } catch {}

    try {
      const db = getAttendanceDb();
      const subRef = doc(db, FIRESTORE_PATHS.SUBJECTS(userId), subjectId);
      const batch = writeBatch(db);
      batch.delete(subRef);
      await batch.commit();
    } catch (err) {
      logDevWarning('deleteSubject warning:', err);
    }
  }

  static async saveDailyAttendance(
    userId: string,
    record: DailyAttendanceRecord,
    updatedSubjects: Subject[]
  ): Promise<void> {
    if (!userId || userId === 'guest_user') return;

    const sanitizedSubjects = updatedSubjects.map(sanitizeSubject);
    const sanitizedRecord: DailyAttendanceRecord = {
      date: record.date.slice(0, 10),
      timestamp: record.timestamp || Date.now(),
      statuses: record.statuses || {},
    };

    try {
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`,
        JSON.stringify(sanitizedSubjects)
      );

      const history = safeGetLocal<DailyAttendanceRecord[]>(`${LOCAL_STORAGE_KEY_PREFIX}history_${userId}`) || [];
      const existingIdx = history.findIndex((h) => h.date === sanitizedRecord.date);

      if (existingIdx >= 0) {
        history[existingIdx] = sanitizedRecord;
      } else {
        history.push(sanitizedRecord);
      }

      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}history_${userId}`, JSON.stringify(history));
    } catch {}

    try {
      const db = getAttendanceDb();
      const batch = writeBatch(db);

      const historyRef = doc(db, FIRESTORE_PATHS.HISTORY(userId), sanitizedRecord.date);
      batch.set(historyRef, sanitizedRecord, { merge: true });

      sanitizedSubjects.forEach((sub) => {
        const subRef = doc(db, FIRESTORE_PATHS.SUBJECTS(userId), sub.id);
        batch.set(subRef, sub, { merge: true });
      });

      await batch.commit();
    } catch (err) {
      logDevWarning('saveDailyAttendance warning:', err);
    }
  }

  static async applyQuickSync(
    userId: string,
    updatedSubjects: Subject[],
    syncLogs: QuickSyncLog[]
  ): Promise<void> {
    if (!userId || userId === 'guest_user') return;

    const sanitizedSubjects = updatedSubjects.map(sanitizeSubject);

    try {
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`,
        JSON.stringify(sanitizedSubjects)
      );
      const existingLogs = safeGetLocal<QuickSyncLog[]>(`${LOCAL_STORAGE_KEY_PREFIX}quicksync_${userId}`) || [];
      const combinedSync = [...syncLogs, ...existingLogs];
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY_PREFIX}quicksync_${userId}`,
        JSON.stringify(combinedSync)
      );
    } catch {}

    try {
      const db = getAttendanceDb();
      const batch = writeBatch(db);

      sanitizedSubjects.forEach((sub) => {
        const subRef = doc(db, FIRESTORE_PATHS.SUBJECTS(userId), sub.id);
        batch.set(subRef, sub, { merge: true });
      });

      syncLogs.forEach((log) => {
        const syncRef = doc(db, FIRESTORE_PATHS.QUICK_SYNC(userId), log.id);
        batch.set(syncRef, log);
      });

      await batch.commit();
    } catch (err) {
      logDevWarning('applyQuickSync warning:', err);
    }
  }

  static async getAttendanceHistory(userId: string): Promise<DailyAttendanceRecord[]> {
    if (!userId || userId === 'guest_user') return [];

    try {
      const db = getAttendanceDb();
      const historyCol = collection(db, FIRESTORE_PATHS.HISTORY(userId));
      const q = query(historyCol, orderBy('date', 'desc'));
      const snap = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500)),
      ]);

      if (snap && !snap.empty) {
        const history = snap.docs.map((d) => d.data() as DailyAttendanceRecord);
        try {
          localStorage.setItem(
            `${LOCAL_STORAGE_KEY_PREFIX}history_${userId}`,
            JSON.stringify(history)
          );
        } catch {}
        return history;
      }
    } catch (err) {
      logDevWarning('getAttendanceHistory error, using local fallback:', err);
    }

    const local = safeGetLocal<DailyAttendanceRecord[]>(`${LOCAL_STORAGE_KEY_PREFIX}history_${userId}`);
    return local || [];
  }

  static async getQuickSyncLogs(userId: string): Promise<QuickSyncLog[]> {
    if (!userId || userId === 'guest_user') return [];

    try {
      const db = getAttendanceDb();
      const syncCol = collection(db, FIRESTORE_PATHS.QUICK_SYNC(userId));
      const q = query(syncCol, orderBy('timestamp', 'desc'));
      const snap = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500)),
      ]);

      if (snap && !snap.empty) {
        const logs = snap.docs.map((d) => d.data() as QuickSyncLog);
        try {
          localStorage.setItem(
            `${LOCAL_STORAGE_KEY_PREFIX}quicksync_${userId}`,
            JSON.stringify(logs)
          );
        } catch {}
        return logs;
      }
    } catch (err) {
      logDevWarning('getQuickSyncLogs warning, using local fallback:', err);
    }

    const local = safeGetLocal<QuickSyncLog[]>(`${LOCAL_STORAGE_KEY_PREFIX}quicksync_${userId}`);
    return local || [];
  }
}

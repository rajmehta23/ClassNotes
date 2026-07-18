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

export class FirestoreAttendanceService {
  static async getSettings(userId: string): Promise<AttendanceSettings | null> {
    try {
      const db = getAttendanceDb();
      const settingsRef = doc(db, FIRESTORE_PATHS.SETTINGS(userId));
      const snap = await Promise.race([
        getDoc(settingsRef),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500)),
      ]);
      if (snap && snap.exists()) {
        return snap.data() as AttendanceSettings;
      }
    } catch (err) {
      console.warn('Firestore getSettings error, reading local fallback:', err);
    }
    const local = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}settings_${userId}`);
    return local ? JSON.parse(local) : null;
  }

  static async saveSettings(userId: string, settings: AttendanceSettings): Promise<void> {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}settings_${userId}`, JSON.stringify(settings));
    try {
      const db = getAttendanceDb();
      const settingsRef = doc(db, FIRESTORE_PATHS.SETTINGS(userId));
      setDoc(settingsRef, settings, { merge: true }).catch((err) =>
        console.warn('Firestore async saveSettings warning:', err)
      );
    } catch (err) {
      console.warn('Firestore saveSettings warning:', err);
    }
  }

  static async getSubjects(userId: string): Promise<Subject[]> {
    try {
      const db = getAttendanceDb();
      const subjectsCol = collection(db, FIRESTORE_PATHS.SUBJECTS(userId));
      const snap = await Promise.race([
        getDocs(subjectsCol),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500)),
      ]);
      if (snap && !snap.empty) {
        const subjects = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Subject));
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`, JSON.stringify(subjects));
        return subjects;
      }
    } catch (err) {
      console.warn('Firestore getSubjects error, reading local fallback:', err);
    }

    const local = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`);
    return local ? JSON.parse(local) : [];
  }

  static async saveSubjects(userId: string, subjects: Subject[]): Promise<void> {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`, JSON.stringify(subjects));
    try {
      const db = getAttendanceDb();
      const batch = writeBatch(db);

      subjects.forEach((sub) => {
        const subRef = doc(db, FIRESTORE_PATHS.SUBJECTS(userId), sub.id);
        batch.set(subRef, sub, { merge: true });
      });

      batch.commit().catch((err) => console.warn('Firestore async saveSubjects warning:', err));
    } catch (err) {
      console.warn('Firestore saveSubjects warning:', err);
    }
  }

  static async deleteSubject(userId: string, subjectId: string): Promise<void> {
    const localSubjects: Subject[] = JSON.parse(
      localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`) || '[]'
    );
    const updated = localSubjects.filter((s) => s.id !== subjectId);
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`, JSON.stringify(updated));

    try {
      const db = getAttendanceDb();
      const subRef = doc(db, FIRESTORE_PATHS.SUBJECTS(userId), subjectId);
      const batch = writeBatch(db);
      batch.delete(subRef);
      batch.commit().catch((err) => console.warn('Firestore async deleteSubject warning:', err));
    } catch (err) {
      console.warn('Firestore deleteSubject warning:', err);
    }
  }

  static async saveDailyAttendance(
    userId: string,
    record: DailyAttendanceRecord,
    updatedSubjects: Subject[]
  ): Promise<void> {
    localStorage.setItem(
      `${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`,
      JSON.stringify(updatedSubjects)
    );

    const history: DailyAttendanceRecord[] = JSON.parse(
      localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}history_${userId}`) || '[]'
    );
    const existingIdx = history.findIndex((h) => h.date === record.date);
    if (existingIdx >= 0) {
      history[existingIdx] = record;
    } else {
      history.push(record);
    }
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}history_${userId}`, JSON.stringify(history));

    try {
      const db = getAttendanceDb();
      const batch = writeBatch(db);

      const historyRef = doc(db, FIRESTORE_PATHS.HISTORY(userId), record.date);
      batch.set(historyRef, record, { merge: true });

      updatedSubjects.forEach((sub) => {
        const subRef = doc(db, FIRESTORE_PATHS.SUBJECTS(userId), sub.id);
        batch.set(subRef, sub, { merge: true });
      });

      batch.commit().catch((err) => console.warn('Firestore async saveDailyAttendance warning:', err));
    } catch (err) {
      console.warn('Firestore saveDailyAttendance warning:', err);
    }
  }

  static async applyQuickSync(
    userId: string,
    updatedSubjects: Subject[],
    syncLogs: QuickSyncLog[]
  ): Promise<void> {
    localStorage.setItem(
      `${LOCAL_STORAGE_KEY_PREFIX}subjects_${userId}`,
      JSON.stringify(updatedSubjects)
    );
    const existingLogs: QuickSyncLog[] = JSON.parse(
      localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}quicksync_${userId}`) || '[]'
    );
    const combinedSync = [...syncLogs, ...existingLogs];
    localStorage.setItem(
      `${LOCAL_STORAGE_KEY_PREFIX}quicksync_${userId}`,
      JSON.stringify(combinedSync)
    );

    try {
      const db = getAttendanceDb();
      const batch = writeBatch(db);

      updatedSubjects.forEach((sub) => {
        const subRef = doc(db, FIRESTORE_PATHS.SUBJECTS(userId), sub.id);
        batch.set(subRef, sub, { merge: true });
      });

      syncLogs.forEach((log) => {
        const syncRef = doc(db, FIRESTORE_PATHS.QUICK_SYNC(userId), log.id);
        batch.set(syncRef, log);
      });

      batch.commit().catch((err) => console.warn('Firestore async applyQuickSync warning:', err));
    } catch (err) {
      console.warn('Firestore applyQuickSync warning:', err);
    }
  }

  static async getAttendanceHistory(userId: string): Promise<DailyAttendanceRecord[]> {
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
        localStorage.setItem(
          `${LOCAL_STORAGE_KEY_PREFIX}history_${userId}`,
          JSON.stringify(history)
        );
        return history;
      }
    } catch (err) {
      console.warn('Firestore getAttendanceHistory error, using local fallback:', err);
    }

    const local = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}history_${userId}`);
    return local ? JSON.parse(local) : [];
  }

  static async getQuickSyncLogs(userId: string): Promise<QuickSyncLog[]> {
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
        localStorage.setItem(
          `${LOCAL_STORAGE_KEY_PREFIX}quicksync_${userId}`,
          JSON.stringify(logs)
        );
        return logs;
      }
    } catch (err) {
      console.warn('Firestore getQuickSyncLogs warning, using local fallback:', err);
    }

    const local = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}quicksync_${userId}`);
    return local ? JSON.parse(local) : [];
  }
}

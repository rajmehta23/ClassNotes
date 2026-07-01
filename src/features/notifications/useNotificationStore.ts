import { create } from 'zustand';
import { db as fbDb } from '@/firebase/config';
import { sandboxService } from '@/services/sandbox';
import {
  doc, getDocs, setDoc, updateDoc, deleteDoc,
  collection, query, orderBy, limit
} from 'firebase/firestore';

export interface Notification {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  type: 'upload' | 'download' | 'announcement' | 'reward' | 'request' | 'alert';
  createdAt: string;
  userId?: string;
  noteId?: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  
  initialize: (userId?: string) => void;
  addNotification: (title: string, content: string, type: Notification['type'], userId?: string, noteId?: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = 'classnotes_notifications';

const seedNotifications: Notification[] = [
  {
    id: 'notif-seed-1',
    title: 'Welcome to ClassNotes!',
    content: 'Start uploading lecture notes to earn rewards points and download resources.',
    isRead: false,
    type: 'reward',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-seed-2',
    title: 'Platform Guide & Notices',
    content: 'Welcome to the platform! Access all lecture notes, schedules, and bookmarks from your sidebar dashboard. Keep an eye on announcements for notices.',
    isRead: false,
    type: 'announcement',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  }
];




export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  initialize: async (userId?: string) => {
    // Firestore mode: fetch user's notifications from Firestore
    if (!sandboxService.isSandboxActive() && fbDb && userId) {
      try {
        const notifQuery = query(
          collection(fbDb!, 'notifications'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(notifQuery);
        const loaded: Notification[] = [];

        snapshot.forEach(d => {
          const data = d.data() as Notification;
          if (data.title === 'Exams schedule published') {
            deleteDoc(doc(fbDb!, 'notifications', d.id)).catch(console.error);
            return;
          }
          if (!data.userId || data.userId === userId) {
            loaded.push(data);
          }
        });

        const seedFlag = `seeded_notifs_${userId}`;
        if (loaded.length === 0 && !localStorage.getItem(seedFlag)) {
          // Seed the first-time welcome notifications in Firestore for this user
          for (const n of seedNotifications) {
            const withUser = { ...n, userId };
            await setDoc(doc(fbDb!, 'notifications', `${n.id}-${userId}`), withUser);
            loaded.push(withUser);
          }
          localStorage.setItem(seedFlag, 'true');
        } else if (loaded.length > 0) {
          localStorage.setItem(seedFlag, 'true');
        }

        set({
          notifications: loaded,
          unreadCount: loaded.filter(n => !n.isRead).length
        });
        return;
      } catch (err) {
        console.warn('Failed to load Firestore notifications, falling back to localStorage.', err);
      }
    }

    // Sandbox / localStorage fallback
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as Notification[];
      const filtered = parsed.filter(n => {
        if (n.title === 'Exams schedule published') return false;
        return !n.userId || n.userId === userId;
      });
      if (filtered.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
      set({
        notifications: filtered,
        unreadCount: filtered.filter(n => !n.isRead).length
      });
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedNotifications));
      set({
        notifications: seedNotifications,
        unreadCount: seedNotifications.filter(n => !n.isRead).length
      });
    }
  },

  addNotification: async (title, content, type, userId?: string, noteId?: string) => {
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      title,
      content,
      isRead: false,
      type,
      createdAt: new Date().toISOString(),
      userId: userId || '',
      noteId: noteId || '',
    };

    const updated = [newNotif, ...get().notifications];

    // Persist to Firestore if available
    if (!sandboxService.isSandboxActive() && fbDb) {
      try {
        await setDoc(doc(fbDb!, 'notifications', newNotif.id), newNotif);
      } catch (err) {
        console.warn('Failed to persist notification to Firestore.', err);
      }
    }

    // Always update localStorage as fallback cache
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    set({
      notifications: updated,
      unreadCount: updated.filter(n => !n.isRead).length
    });
  },

  markAsRead: async (id) => {
    const updated = get().notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    );

    // Update Firestore document
    if (!sandboxService.isSandboxActive() && fbDb) {
      try {
        await updateDoc(doc(fbDb!, 'notifications', id), { isRead: true });
      } catch (err) {
        console.warn('Failed to mark Firestore notification as read.', err);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    set({
      notifications: updated,
      unreadCount: updated.filter(n => !n.isRead).length
    });
  },

  markAllAsRead: async () => {
    const notifications = get().notifications;
    const updated = notifications.map(n => ({ ...n, isRead: true }));

    // Update all Firestore documents
    if (!sandboxService.isSandboxActive() && fbDb) {
      try {
        for (const n of notifications) {
          if (!n.isRead) {
            await updateDoc(doc(fbDb!, 'notifications', n.id), { isRead: true });
          }
        }
      } catch (err) {
        console.warn('Failed to mark all Firestore notifications as read.', err);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    set({
      notifications: updated,
      unreadCount: 0
    });
  },

  clearAll: async () => {
    const notifications = get().notifications;

    // Delete all Firestore notification documents for this user
    if (!sandboxService.isSandboxActive() && fbDb) {
      try {
        for (const n of notifications) {
          await deleteDoc(doc(fbDb!, 'notifications', n.id));
        }
      } catch (err) {
        console.warn('Failed to delete Firestore notifications.', err);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    set({
      notifications: [],
      unreadCount: 0
    });
  }
}));

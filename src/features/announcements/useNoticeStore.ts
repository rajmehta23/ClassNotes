import { create } from 'zustand';
import { announcementsService } from '@/services/announcements';
import type { Announcement, AnnouncementInput } from '@/types/database';

interface NoticeStore {
  announcements: Announcement[];
  isLoading: boolean;
  error: string | null;
  
  fetchAnnouncements: () => Promise<void>;
  createAnnouncement: (input: AnnouncementInput, author: { uid: string; displayName: string }) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
}

export const useNoticeStore = create<NoticeStore>((set) => ({
  announcements: [],
  isLoading: false,
  error: null,

  fetchAnnouncements: async () => {
    set({ isLoading: true, error: null });
    try {
      const announcements = await announcementsService.getAnnouncements();
      set({ announcements, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch announcements';
      set({ error: msg, isLoading: false });
    }
  },

  createAnnouncement: async (input, author) => {
    set({ isLoading: true, error: null });
    try {
      const newAnn = await announcementsService.createAnnouncement(input, author);
      set((state) => ({
        announcements: [newAnn, ...state.announcements],
        isLoading: false
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to publish announcement';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  deleteAnnouncement: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await announcementsService.deleteAnnouncement(id);
      set((state) => ({
        announcements: state.announcements.filter((a) => a.id !== id),
        isLoading: false
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete announcement';
      set({ error: msg, isLoading: false });
      throw err;
    }
  }
}));

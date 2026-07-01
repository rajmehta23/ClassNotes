import { create } from 'zustand';
import { calendarService } from '@/services/calendar';
import type { CalendarEvent, CalendarEventInput } from '@/types/database';

interface CalendarStore {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  typeFilter: string;

  fetchEvents: () => Promise<void>;
  createEvent: (input: CalendarEventInput) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  setTypeFilter: (filter: string) => void;
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  events: [],
  isLoading: false,
  error: null,
  typeFilter: '',

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const events = await calendarService.getEvents();
      set({ events, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch calendar events';
      set({ error: msg, isLoading: false });
    }
  },

  createEvent: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const newEvent = await calendarService.createEvent(input);
      set((state) => ({
        events: [...state.events, newEvent].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
        isLoading: false
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add calendar event';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  deleteEvent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await calendarService.deleteEvent(id);
      set((state) => ({
        events: state.events.filter((e) => e.id !== id),
        isLoading: false
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete calendar event';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  setTypeFilter: (typeFilter) => set({ typeFilter })
}));

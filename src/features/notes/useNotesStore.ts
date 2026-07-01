import { create } from 'zustand';
import { notesService } from '@/services/notes';
import type { Note, NoteUploadInput } from '@/types/database';

interface NotesStore {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  categoryFilter: string;
  subjectFilter: string;
  
  fetchNotes: (includePending?: boolean) => Promise<void>;
  createNote: (input: NoteUploadInput, file: File, author: { uid: string; displayName: string }) => Promise<Note>;
  rateNote: (noteId: string, rating: number) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  approveNote: (id: string) => Promise<void>;
  rejectNote: (id: string) => Promise<void>;
  reportNote: (id: string) => Promise<void>;
  dismissReports: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setSubjectFilter: (subject: string) => void;
}

export const useNotesStore = create<NotesStore>((set) => ({
  notes: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  categoryFilter: '',
  subjectFilter: '',

  fetchNotes: async (includePending?: boolean) => {
    set({ isLoading: true, error: null });
    try {
      const notes = await notesService.getAllNotes(includePending);
      set({ notes, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch notes';
      set({ error: msg, isLoading: false });
    }
  },

  createNote: async (input, file, author) => {
    set({ isLoading: true, error: null });
    try {
      const newNote = await notesService.createNote(input, file, author);
      set((state) => ({
        notes: [newNote, ...state.notes],
        isLoading: false
      }));
      return newNote;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload note';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  rateNote: async (noteId, rating) => {
    try {
      const updatedNote = await notesService.addRating(noteId, rating);
      set((state) => ({
        notes: state.notes.map((n) => (n.id === noteId ? updatedNote : n))
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to rate note';
      set({ error: msg });
      throw err;
    }
  },

  deleteNote: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await notesService.deleteNote(id);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        isLoading: false
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete note';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  approveNote: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await notesService.approveNote(id);
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? { ...n, status: 'approved' } : n)),
        isLoading: false
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to approve note';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  rejectNote: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await notesService.rejectNote(id);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        isLoading: false
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reject note';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  reportNote: async (id) => {
    try {
      await notesService.reportNote(id);
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? { ...n, reportsCount: (n.reportsCount || 0) + 1 } : n))
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to report note';
      set({ error: msg });
      throw err;
    }
  },

  dismissReports: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await notesService.dismissReports(id);
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? { ...n, reportsCount: 0 } : n)),
        isLoading: false
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to dismiss reports';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setSubjectFilter: (subjectFilter) => set({ subjectFilter })
}));

import { create } from 'zustand';
import type { 
  Assignment, 
  AssignmentSubmission, 
  CreateAssignmentInput, 
  SubmitAssignmentInput 
} from '../types';
import { assignmentService } from '../services/assignmentService';

interface AssignmentState {
  assignments: Assignment[];
  studentSubmissions: AssignmentSubmission[];
  activeAssignment: Assignment | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedSubject: string;

  // Actions
  fetchAssignments: () => Promise<void>;
  fetchStudentSubmissions: (studentId: string) => Promise<void>;
  createAssignment: (
    input: CreateAssignmentInput, 
    teacherId: string, 
    teacherName: string
  ) => Promise<boolean>;
  submitAssignment: (
    input: SubmitAssignmentInput, 
    studentId: string, 
    studentName: string
  ) => Promise<boolean>;
  deleteAssignment: (id: string) => Promise<boolean>;
  setActiveAssignment: (assignment: Assignment | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedSubject: (subject: string) => void;
}

export const useAssignmentStore = create<AssignmentState>((set) => ({
  assignments: [],
  studentSubmissions: [],
  activeAssignment: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedSubject: 'all',

  fetchAssignments: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await assignmentService.getAssignments();
      set({ assignments: data, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch assignments', isLoading: false });
    }
  },

  fetchStudentSubmissions: async (studentId: string) => {
    try {
      const subs = await assignmentService.getStudentSubmissions(studentId);
      set({ studentSubmissions: subs });
    } catch (err: any) {
      console.error('Failed to fetch student submissions:', err);
    }
  },

  createAssignment: async (input, teacherId, teacherName) => {
    set({ isLoading: true, error: null });
    try {
      const created = await assignmentService.createAssignment(input, teacherId, teacherName);
      set((state) => ({
        assignments: [created, ...state.assignments],
        isLoading: false,
      }));
      return true;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to create assignment', isLoading: false });
      return false;
    }
  },

  submitAssignment: async (input, studentId, studentName) => {
    set({ isLoading: true, error: null });
    try {
      const submission = await assignmentService.submitAssignment(input, studentId, studentName);
      set((state) => {
        const filtered = state.studentSubmissions.filter((s) => s.assignmentId !== input.assignmentId);
        return {
          studentSubmissions: [submission, ...filtered],
          isLoading: false,
        };
      });
      return true;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to submit assignment', isLoading: false });
      return false;
    }
  },

  deleteAssignment: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const ok = await assignmentService.deleteAssignment(id);
      if (ok) {
        set((state) => ({
          assignments: state.assignments.filter((a) => a.id !== id),
          isLoading: false,
        }));
      }
      return ok;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to delete assignment', isLoading: false });
      return false;
    }
  },

  setActiveAssignment: (assignment) => set({ activeAssignment: assignment }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedSubject: (subject) => set({ selectedSubject: subject }),
}));

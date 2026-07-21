import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db, isSandboxMode } from '@/firebase/config';
import type { 
  Assignment, 
  AssignmentSubmission, 
  CreateAssignmentInput, 
  SubmitAssignmentInput 
} from '../types';

const ASSIGNMENTS_COLLECTION = 'assignments';
const SUBMISSIONS_COLLECTION = 'assignment_submissions';
const LOCAL_ASSIGNMENTS_KEY = 'classnotes_assignments_sandbox';
const LOCAL_SUBMISSIONS_KEY = 'classnotes_submissions_sandbox';

// Initial Mock Assignments for Sandbox Mode
const INITIAL_MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: 'assign_1',
    title: 'Data Structures: Binary Trees & Heaps Implementation',
    description: 'Implement a min-heap and AVL tree balance operation in C++ or Java. Provide test cases and time complexity analysis.',
    subject: 'Data Structures',
    course: 'BCA',
    semester: '3',
    teacherId: 'teacher_1',
    teacherName: 'Prof. Sharma',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    attachments: [
      {
        name: 'Assignment_Specification.pdf',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        type: 'pdf',
        size: 1048576,
      },
    ],
    status: 'active',
    maxPoints: 100,
  },
  {
    id: 'assign_2',
    title: 'Operating Systems: Process Synchronization Essay',
    description: 'Write an essay comparing Semaphores, Mutexes, and Monitors in multi-threaded environment with practical deadlock scenarios.',
    subject: 'Operating Systems',
    course: 'B.Tech',
    semester: '4',
    teacherId: 'teacher_2',
    teacherName: 'Dr. Anita Verma',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [],
    status: 'active',
    maxPoints: 50,
  },
];

function getLocalAssignments(): Assignment[] {
  try {
    const raw = localStorage.getItem(LOCAL_ASSIGNMENTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(INITIAL_MOCK_ASSIGNMENTS));
      return INITIAL_MOCK_ASSIGNMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_MOCK_ASSIGNMENTS;
  }
}

function saveLocalAssignments(items: Assignment[]) {
  try {
    localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save assignments to local storage:', err);
  }
}

function getLocalSubmissions(): AssignmentSubmission[] {
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSubmissions(items: AssignmentSubmission[]) {
  try {
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save submissions to local storage:', err);
  }
}

export class AssignmentService {
  async getAssignments(): Promise<Assignment[]> {
    if (isSandboxMode || !db) {
      return getLocalAssignments();
    }
    try {
      const colRef = collection(db, ASSIGNMENTS_COLLECTION);
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: Assignment[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Assignment);
      });
      return list.length > 0 ? list : getLocalAssignments();
    } catch (err) {
      console.warn('Firestore fetch assignments failed, using local sandbox fallback:', err);
      return getLocalAssignments();
    }
  }

  async getAssignmentById(id: string): Promise<Assignment | null> {
    if (isSandboxMode || !db) {
      const list = getLocalAssignments();
      return list.find((a) => a.id === id) || null;
    }
    try {
      const docRef = doc(db, ASSIGNMENTS_COLLECTION, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Assignment;
      }
      const list = getLocalAssignments();
      return list.find((a) => a.id === id) || null;
    } catch {
      const list = getLocalAssignments();
      return list.find((a) => a.id === id) || null;
    }
  }

  async createAssignment(
    input: CreateAssignmentInput,
    teacherId: string,
    teacherName: string
  ): Promise<Assignment> {
    const newAssignment: Assignment = {
      id: `assign_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: input.title,
      description: input.description,
      subject: input.subject,
      course: input.course,
      semester: input.semester,
      teacherId,
      teacherName,
      dueDate: input.dueDate,
      createdAt: new Date().toISOString(),
      attachments: input.attachments || [],
      status: 'active',
      maxPoints: input.maxPoints || 100,
    };

    if (isSandboxMode || !db) {
      const list = getLocalAssignments();
      const updated = [newAssignment, ...list];
      saveLocalAssignments(updated);
      return newAssignment;
    }

    try {
      const docRef = doc(db, ASSIGNMENTS_COLLECTION, newAssignment.id);
      await setDoc(docRef, newAssignment);
      return newAssignment;
    } catch (err) {
      console.warn('Firestore setDoc failed, saving to local storage fallback:', err);
      const list = getLocalAssignments();
      const updated = [newAssignment, ...list];
      saveLocalAssignments(updated);
      return newAssignment;
    }
  }

  async submitAssignment(
    input: SubmitAssignmentInput,
    studentId: string,
    studentName: string
  ): Promise<AssignmentSubmission> {
    const assignment = await this.getAssignmentById(input.assignmentId);
    const now = new Date();
    const dueDate = assignment ? new Date(assignment.dueDate) : now;
    const isLate = now > dueDate;

    const submission: AssignmentSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      assignmentId: input.assignmentId,
      studentId,
      studentName,
      submissionText: input.submissionText,
      attachments: input.attachments || [],
      submittedAt: now.toISOString(),
      status: isLate ? 'late' : 'submitted',
    };

    if (isSandboxMode || !db) {
      const subs = getLocalSubmissions();
      // Replace existing submission if student resubmits
      const filtered = subs.filter((s) => !(s.assignmentId === input.assignmentId && s.studentId === studentId));
      const updated = [submission, ...filtered];
      saveLocalSubmissions(updated);
      return submission;
    }

    try {
      const docRef = doc(db, SUBMISSIONS_COLLECTION, submission.id);
      await setDoc(docRef, submission);
      return submission;
    } catch (err) {
      console.warn('Firestore submission failed, using local fallback:', err);
      const subs = getLocalSubmissions();
      const filtered = subs.filter((s) => !(s.assignmentId === input.assignmentId && s.studentId === studentId));
      const updated = [submission, ...filtered];
      saveLocalSubmissions(updated);
      return submission;
    }
  }

  async getSubmissionsForAssignment(assignmentId: string): Promise<AssignmentSubmission[]> {
    if (isSandboxMode || !db) {
      const subs = getLocalSubmissions();
      return subs.filter((s) => s.assignmentId === assignmentId);
    }
    try {
      const colRef = collection(db, SUBMISSIONS_COLLECTION);
      const q = query(colRef, where('assignmentId', '==', assignmentId), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      const list: AssignmentSubmission[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AssignmentSubmission);
      });
      return list;
    } catch {
      const subs = getLocalSubmissions();
      return subs.filter((s) => s.assignmentId === assignmentId);
    }
  }

  async getStudentSubmissions(studentId: string): Promise<AssignmentSubmission[]> {
    if (isSandboxMode || !db) {
      const subs = getLocalSubmissions();
      return subs.filter((s) => s.studentId === studentId);
    }
    try {
      const colRef = collection(db, SUBMISSIONS_COLLECTION);
      const q = query(colRef, where('studentId', '==', studentId));
      const snap = await getDocs(q);
      const list: AssignmentSubmission[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AssignmentSubmission);
      });
      return list;
    } catch {
      const subs = getLocalSubmissions();
      return subs.filter((s) => s.studentId === studentId);
    }
  }

  async updateSubmissionGrade(
    submissionId: string, 
    grade: number, 
    feedback?: string
  ): Promise<boolean> {
    if (isSandboxMode || !db) {
      const subs = getLocalSubmissions();
      const idx = subs.findIndex((s) => s.id === submissionId);
      if (idx !== -1) {
        subs[idx].grade = grade;
        subs[idx].feedback = feedback;
        subs[idx].status = 'graded';
        saveLocalSubmissions(subs);
        return true;
      }
      return false;
    }
    try {
      const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
      await updateDoc(docRef, {
        grade,
        feedback,
        status: 'graded',
      });
      return true;
    } catch {
      const subs = getLocalSubmissions();
      const idx = subs.findIndex((s) => s.id === submissionId);
      if (idx !== -1) {
        subs[idx].grade = grade;
        subs[idx].feedback = feedback;
        subs[idx].status = 'graded';
        saveLocalSubmissions(subs);
        return true;
      }
      return false;
    }
  }

  async deleteAssignment(id: string): Promise<boolean> {
    if (isSandboxMode || !db) {
      const list = getLocalAssignments();
      const filtered = list.filter((a) => a.id !== id);
      saveLocalAssignments(filtered);
      return true;
    }
    try {
      const docRef = doc(db, ASSIGNMENTS_COLLECTION, id);
      await deleteDoc(docRef);
      const list = getLocalAssignments();
      const filtered = list.filter((a) => a.id !== id);
      saveLocalAssignments(filtered);
      return true;
    } catch (err) {
      console.warn('Firestore deleteDoc assignment failed, updating local fallback:', err);
      const list = getLocalAssignments();
      const filtered = list.filter((a) => a.id !== id);
      saveLocalAssignments(filtered);
      return true;
    }
  }
}

export const assignmentService = new AssignmentService();

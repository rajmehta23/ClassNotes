import { db as fbDb } from '@/firebase/config';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  deleteDoc, increment, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { sandboxService } from './sandbox';
import { storageService } from './storage';
import { rewardsService } from './rewards';
import type { Note, NoteUploadInput } from '@/types/database';

const NOTES_CACHE_KEY = 'classnotes_notes';

// Unique UUID generator helper with fallback support
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Seed mock notes for Sandbox
export const SEED_NOTES: Note[] = [
  {
    id: 'seed-note-1',
    title: 'Introduction to Computer Science',
    description: 'Basic concepts of algorithms, data structures, complexity, and computer architecture diagrams.',
    subject: 'Computer Science',
    category: 'Lecture Notes',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileType: 'pdf',
    authorId: 'demo-admin-uid',
    authorName: 'Admin Instructor',
    downloadsCount: 42,
    ratingsAverage: 4.8,
    ratingsCount: 15,
    status: 'approved',
    reportsCount: 0,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    course: 'BCA',
    semester: '3'
  },
  {
    id: 'seed-note-2',
    title: 'Calculus I: Limits & Derivatives',
    description: 'Quick reference sheet for limits, derivative rules, optimization formulas, and integration patterns.',
    subject: 'Mathematics',
    category: 'Cheat Sheets',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileType: 'pdf',
    authorId: 'demo-admin-uid',
    authorName: 'Admin Instructor',
    downloadsCount: 29,
    ratingsAverage: 4.5,
    ratingsCount: 8,
    status: 'approved',
    reportsCount: 0,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    course: 'BBA',
    semester: '2'
  },
  {
    id: 'seed-note-3',
    title: 'Organic Chemistry Study Guide',
    description: 'Comprehensive study guide covering carbon bonds, stereochemistry, naming conventions, and reaction mechanisms.',
    subject: 'Chemistry',
    category: 'Study Guides',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileType: 'pdf',
    authorId: 'demo-student-uid',
    authorName: 'Jane Doe',
    downloadsCount: 12,
    ratingsAverage: 5.0,
    ratingsCount: 5,
    status: 'approved',
    reportsCount: 0,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    course: 'B.Tech',
    semester: '4'
  }
];

const seedSandboxNotes = () => {
  const cached = localStorage.getItem(NOTES_CACHE_KEY);
  if (!cached) {
    localStorage.setItem(NOTES_CACHE_KEY, JSON.stringify(SEED_NOTES));
  } else {
    try {
      const parsed = JSON.parse(cached) as Note[];
      let updated = false;
      const newNotes = parsed.map(note => {
        const seedMatch = SEED_NOTES.find(s => s.id === note.id);
        if (seedMatch && (!note.course || !note.semester)) {
          updated = true;
          return { ...note, course: seedMatch.course, semester: seedMatch.semester };
        }
        return note;
      });
      if (updated) {
        localStorage.setItem(NOTES_CACHE_KEY, JSON.stringify(newNotes));
      }
    } catch (e) {
      console.error('Failed to parse cached notes, resetting seed notes:', e);
      localStorage.setItem(NOTES_CACHE_KEY, JSON.stringify(SEED_NOTES));
    }
  }
};

if (sandboxService.isSandboxActive()) {
  seedSandboxNotes();
}

export interface INotesService {
  getAllNotes(includePending?: boolean): Promise<Note[]>;
  getNoteById(id: string): Promise<Note | null>;
  createNote(input: NoteUploadInput, file: File, author: { uid: string; displayName: string }): Promise<Note>;
  incrementDownloads(noteId: string, userId?: string): Promise<void>;
  addRating(noteId: string, rating: number): Promise<Note>;
  deleteNote(noteId: string): Promise<void>;
  approveNote(noteId: string): Promise<void>;
  rejectNote(noteId: string): Promise<void>;
  reportNote(noteId: string): Promise<void>;
  dismissReports(noteId: string): Promise<void>;
}

class FirebaseNotesService implements INotesService {
  async getAllNotes(includePending?: boolean): Promise<Note[]> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    const notesQuery = query(collection(fbDb, 'notes'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(notesQuery);
    const list = snapshot.docs.map(d => d.data() as Note);
    
    if (includePending) return list;
    return list.filter(n => n.status === 'approved' || !n.status);
  }

  async getNoteById(id: string): Promise<Note | null> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    const docRef = doc(fbDb, 'notes', id);
    const docSnap = await getDoc(docRef);
    
    return docSnap.exists() ? (docSnap.data() as Note) : null;
  }

  async createNote(input: NoteUploadInput, file: File, author: { uid: string; displayName: string }): Promise<Note> {
    if (!fbDb) throw new Error('Firestore not initialized.');

    const originalFileName = file.name;
    const uuid = generateUUID();
    const extension = originalFileName.split('.').pop() || 'pdf';
    const storageFileName = `${uuid}.${extension}`;
    const storagePath = `notes/${storageFileName}`;

    // Upload attachment to Storage at unique UUID path
    const fileUrl = await storageService.uploadFile(file, storagePath);
    
    const settingsStr = localStorage.getItem('classnotes_admin_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : { autoApprove: false };
    const status = settings.autoApprove ? 'approved' : 'pending';

    const noteId = `note-${Date.now()}`;
    const newNote: Note = {
      id: noteId,
      title: input.title,
      description: input.description,
      subject: input.subject,
      category: input.category,
      fileUrl,
      fileType: input.fileType,
      authorId: author.uid,
      authorName: author.displayName,
      downloadsCount: 0,
      ratingsAverage: 0,
      ratingsCount: 0,
      status,
      reportsCount: 0,
      createdAt: new Date().toISOString(),
      originalFileName,
      storageFileName,
      storagePath,
      mimeType: file.type || 'application/pdf',
      fileSize: file.size,
      course: input.course,
      semester: input.semester,
      ...(input.learningResourceUrl ? { learningResourceUrl: input.learningResourceUrl } : {})
    };

    await setDoc(doc(fbDb, 'notes', noteId), newNote);
    return newNote;
  }

  async incrementDownloads(noteId: string, userId?: string): Promise<void> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    const docRef = doc(fbDb, 'notes', noteId);
    await updateDoc(docRef, {
      downloadsCount: increment(1)
    });

    // Log this download event to the downloads collection for analytics
    const downloadId = `dl-${noteId}-${Date.now()}`;
    await setDoc(doc(fbDb, 'downloads', downloadId), {
      id: downloadId,
      noteId,
      userId: userId || 'anonymous',
      downloadedAt: serverTimestamp()
    });

    // Log analytics view event
    const analyticsId = `view-${noteId}-${Date.now()}`;
    await setDoc(doc(fbDb, 'analytics', analyticsId), {
      id: analyticsId,
      event: 'download',
      noteId,
      userId: userId || 'anonymous',
      timestamp: serverTimestamp()
    });
  }

  async addRating(noteId: string, rating: number): Promise<Note> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    const docRef = doc(fbDb, 'notes', noteId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Note does not exist.');
    
    const note = docSnap.data() as Note;
    const newCount = note.ratingsCount + 1;
    const newAverage = parseFloat(
      ((note.ratingsAverage * note.ratingsCount + rating) / newCount).toFixed(2)
    );
    
    const updated = {
      ...note,
      ratingsAverage: newAverage,
      ratingsCount: newCount
    };
    
    await setDoc(docRef, updated);
    return updated;
  }

  async deleteNote(noteId: string): Promise<void> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    await deleteDoc(doc(fbDb, 'notes', noteId));
  }

  async approveNote(noteId: string): Promise<void> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    const docRef = doc(fbDb, 'notes', noteId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Note not found');
    const note = snap.data() as Note;
    
    if (note.status === 'approved') return;
    
    await updateDoc(docRef, { status: 'approved' });
    
    const settingsStr = localStorage.getItem('classnotes_admin_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : { uploadRewardPoints: 50 };
    await rewardsService.addPoints(note.authorId, settings.uploadRewardPoints);
  }

  async rejectNote(noteId: string): Promise<void> {
    await this.deleteNote(noteId);
  }

  async reportNote(noteId: string): Promise<void> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    const docRef = doc(fbDb, 'notes', noteId);
    await updateDoc(docRef, {
      reportsCount: increment(1)
    });
  }

  async dismissReports(noteId: string): Promise<void> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    const docRef = doc(fbDb, 'notes', noteId);
    await updateDoc(docRef, {
      reportsCount: 0
    });
  }
}

class SandboxNotesService implements INotesService {
  private getLocalNotes(): Note[] {
    const data = localStorage.getItem(NOTES_CACHE_KEY);
    return data ? JSON.parse(data) : SEED_NOTES;
  }

  private setLocalNotes(notes: Note[]) {
    localStorage.setItem(NOTES_CACHE_KEY, JSON.stringify(notes));
  }

  async getAllNotes(includePending?: boolean): Promise<Note[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const list = this.getLocalNotes();
    
    const filtered = includePending 
      ? list 
      : list.filter(n => n.status === 'approved' || !n.status);

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getNoteById(id: string): Promise<Note | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const notes = this.getLocalNotes();
    const note = notes.find(n => n.id === id);
    return note || null;
  }

  async createNote(input: NoteUploadInput, file: File, author: { uid: string; displayName: string }): Promise<Note> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const notes = this.getLocalNotes();
    const isDuplicate = notes.some(
      n => n.title.toLowerCase() === input.title.toLowerCase() && n.authorId === author.uid
    );
    if (isDuplicate) {
      throw new Error('A lecture note with this title has already been uploaded by you.');
    }

    const originalFileName = file.name;
    const uuid = generateUUID();
    const extension = originalFileName.split('.').pop() || 'pdf';
    const storageFileName = `${uuid}.${extension}`;
    const storagePath = `notes/${storageFileName}`;

    const fileUrl = await storageService.uploadFile(file, storagePath);
    
    const settingsStr = localStorage.getItem('classnotes_admin_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : { autoApprove: false };
    const status = settings.autoApprove ? 'approved' : 'pending';

    const newNote: Note = {
      id: `sandbox-note-${Date.now()}`,
      title: input.title,
      description: input.description,
      subject: input.subject,
      category: input.category,
      fileUrl,
      fileType: input.fileType,
      authorId: author.uid,
      authorName: author.displayName,
      downloadsCount: 0,
      ratingsAverage: 0,
      ratingsCount: 0,
      status,
      reportsCount: 0,
      createdAt: new Date().toISOString(),
      originalFileName,
      storageFileName,
      storagePath,
      mimeType: file.type || 'application/pdf',
      fileSize: file.size,
      course: input.course,
      semester: input.semester,
      ...(input.learningResourceUrl ? { learningResourceUrl: input.learningResourceUrl } : {})
    };

    notes.push(newNote);
    this.setLocalNotes(notes);
    return newNote;
  }

  async incrementDownloads(noteId: string): Promise<void> {
    const notes = this.getLocalNotes();
    const noteIdx = notes.findIndex(n => n.id === noteId);
    if (noteIdx !== -1) {
      notes[noteIdx].downloadsCount += 1;
      this.setLocalNotes(notes);
    }
  }

  async addRating(noteId: string, rating: number): Promise<Note> {
    const notes = this.getLocalNotes();
    const noteIdx = notes.findIndex(n => n.id === noteId);
    if (noteIdx === -1) throw new Error('Note not found.');
    
    const note = notes[noteIdx];
    const newCount = note.ratingsCount + 1;
    const newAverage = parseFloat(
      ((note.ratingsAverage * note.ratingsCount + rating) / newCount).toFixed(2)
    );
    
    notes[noteIdx] = {
      ...note,
      ratingsAverage: newAverage,
      ratingsCount: newCount
    };
    
    this.setLocalNotes(notes);
    return notes[noteIdx];
  }

  async deleteNote(noteId: string): Promise<void> {
    const notes = this.getLocalNotes();
    const filtered = notes.filter(n => n.id !== noteId);
    this.setLocalNotes(filtered);
  }

  async approveNote(noteId: string): Promise<void> {
    const notes = this.getLocalNotes();
    const noteIdx = notes.findIndex(n => n.id === noteId);
    if (noteIdx === -1) throw new Error('Note not found');
    
    if (notes[noteIdx].status === 'approved') return;
    
    notes[noteIdx].status = 'approved';
    this.setLocalNotes(notes);
    
    const settingsStr = localStorage.getItem('classnotes_admin_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : { uploadRewardPoints: 50 };
    await rewardsService.addPoints(notes[noteIdx].authorId, settings.uploadRewardPoints);
  }

  async rejectNote(noteId: string): Promise<void> {
    await this.deleteNote(noteId);
  }

  async reportNote(noteId: string): Promise<void> {
    const notes = this.getLocalNotes();
    const noteIdx = notes.findIndex(n => n.id === noteId);
    if (noteIdx !== -1) {
      notes[noteIdx].reportsCount = (notes[noteIdx].reportsCount || 0) + 1;
      this.setLocalNotes(notes);
    }
  }

  async dismissReports(noteId: string): Promise<void> {
    const notes = this.getLocalNotes();
    const noteIdx = notes.findIndex(n => n.id === noteId);
    if (noteIdx !== -1) {
      notes[noteIdx].reportsCount = 0;
      this.setLocalNotes(notes);
    }
  }
}


/**
 * Hybrid Notes Service:
 * - Real Firebase Auth users → FirebaseNotesService (Firestore + Firebase Storage)
 * - Demo accounts (uid starts with 'demo-' or 'sandbox-') → SandboxNotesService
 * - Falls back gracefully on Firestore errors
 */
import { auth as fbAuth } from '@/firebase/config';

class HybridNotesService implements INotesService {
  private firebase = new FirebaseNotesService();
  private sandbox = new SandboxNotesService();

  private isRealFirebaseUser(): boolean {
    if (!fbAuth?.currentUser) return false;
    const uid = fbAuth.currentUser.uid;
    return !uid.startsWith('demo-') && !uid.startsWith('sandbox-');
  }

  private get service(): INotesService {
    if (!sandboxService.isSandboxActive() && fbDb && this.isRealFirebaseUser()) {
      return this.firebase;
    }
    return this.sandbox;
  }

  async getAllNotes(includePending?: boolean): Promise<Note[]> {
    try {
      return await this.service.getAllNotes(includePending);
    } catch (err) {
      console.warn('Notes fetch failed, falling back to sandbox:', err);
      return this.sandbox.getAllNotes(includePending);
    }
  }

  async getNoteById(id: string): Promise<Note | null> {
    try {
      return await this.service.getNoteById(id);
    } catch (err) {
      console.warn('getNoteById failed, falling back to sandbox:', err);
      return this.sandbox.getNoteById(id);
    }
  }

  async createNote(input: NoteUploadInput, file: File, author: { uid: string; displayName: string }): Promise<Note> {
    try {
      return await this.service.createNote(input, file, author);
    } catch (err) {
      console.warn('createNote failed, falling back to sandbox:', err);
      return this.sandbox.createNote(input, file, author);
    }
  }

  async incrementDownloads(noteId: string, userId?: string): Promise<void> {
    try {
      return await this.service.incrementDownloads(noteId, userId);
    } catch (err) {
      console.warn('incrementDownloads failed:', err);
    }
  }

  async addRating(noteId: string, rating: number): Promise<Note> {
    try {
      return await this.service.addRating(noteId, rating);
    } catch (err) {
      console.warn('addRating failed, falling back to sandbox:', err);
      return this.sandbox.addRating(noteId, rating);
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    // Try both services since we don't know where the note lives
    await Promise.allSettled([
      this.firebase.deleteNote(noteId).catch(() => {}),
      this.sandbox.deleteNote(noteId).catch(() => {})
    ]);
  }

  async approveNote(noteId: string): Promise<void> {
    try {
      return await this.service.approveNote(noteId);
    } catch (err) {
      console.warn('approveNote failed, falling back to sandbox:', err);
      return this.sandbox.approveNote(noteId);
    }
  }

  async rejectNote(noteId: string): Promise<void> {
    try {
      return await this.service.rejectNote(noteId);
    } catch (err) {
      console.warn('rejectNote failed, falling back to sandbox:', err);
      return this.sandbox.rejectNote(noteId);
    }
  }

  async reportNote(noteId: string): Promise<void> {
    try {
      return await this.service.reportNote(noteId);
    } catch (err) {
      console.warn('reportNote failed, falling back to sandbox:', err);
      return this.sandbox.reportNote(noteId);
    }
  }

  async dismissReports(noteId: string): Promise<void> {
    try {
      return await this.service.dismissReports(noteId);
    } catch (err) {
      console.warn('dismissReports failed, falling back to sandbox:', err);
      return this.sandbox.dismissReports(noteId);
    }
  }
}

export const notesService: INotesService = new HybridNotesService();


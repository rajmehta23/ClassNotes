import { db as fbDb } from '@/firebase/config';
import { 
  collection, doc, getDocs, setDoc, updateDoc, 
  query, where, runTransaction, onSnapshot, deleteDoc
} from 'firebase/firestore';
import { sandboxService } from './sandbox';
import type { NoteRequest } from '@/types/database';
import type { UserProfile } from '@/types/auth';

const REQUESTS_CACHE_KEY = 'classnotes_note_requests';

// Unique UUID helper
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

// Seed note requests for Sandbox
export const SEED_REQUESTS: NoteRequest[] = [
  {
    requestId: 'seed-req-1',
    subject: 'Operating System',
    topic: 'Unit 3: Deadlocks & Semaphores',
    description: 'Need detailed handwritten notes explaining Banker\'s Algorithm and Dining Philosophers problem with diagrams.',
    requestedBy: 'demo-student-uid',
    requestedByName: 'Jane Doe',
    course: 'BCA',
    semester: '3',
    batch: '2024-2027',
    department: 'Computer Science',
    interestedCount: 14,
    interestedUsers: ['demo-student-uid', 'user-2', 'user-3', 'user-4'],
    status: 'pending',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    requestId: 'seed-req-2',
    subject: 'DBMS',
    topic: 'Normalization (1NF, 2NF, 3NF, BCNF)',
    description: 'Looking for a cheat sheet containing functional dependencies and lossless decomposition rules.',
    requestedBy: 'user-5',
    requestedByName: 'Rajnish Kumar',
    course: 'BCA',
    semester: '3',
    batch: '2024-2027',
    department: 'Computer Science',
    interestedCount: 22,
    interestedUsers: ['user-5', 'demo-student-uid', 'user-6'],
    status: 'pending',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    requestId: 'seed-req-3',
    subject: 'Java',
    topic: 'Multithreading & ExecutorService',
    description: 'Need simplified lecture notes covering thread lifecycle, synchronization, and custom thread pools.',
    requestedBy: 'user-7',
    requestedByName: 'Amit Sharma',
    course: 'BCA',
    semester: '3',
    batch: '2024-2027',
    department: 'Computer Science',
    interestedCount: 8,
    interestedUsers: ['user-7'],
    status: 'fulfilled',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    fulfilledBy: 'demo-admin-uid',
    fulfilledNoteId: 'seed-note-1',
    fulfilledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const seedSandboxRequests = () => {
  const cached = localStorage.getItem(REQUESTS_CACHE_KEY);
  if (!cached) {
    localStorage.setItem(REQUESTS_CACHE_KEY, JSON.stringify(SEED_REQUESTS));
  }
};

if (sandboxService.isSandboxActive()) {
  seedSandboxRequests();
}

export interface INoteRequestsService {
  getRequestsForUser(user: UserProfile): Promise<NoteRequest[]>;
  subscribeRequests(user: UserProfile, callback: (requests: NoteRequest[]) => void, onError?: (error: any) => void): () => void;
  createRequest(request: { subject: string; topic: string; description?: string }, user: UserProfile): Promise<NoteRequest>;
  voteRequest(requestId: string, userId: string): Promise<NoteRequest>;
  fulfillRequest(requestId: string, noteId: string, fulfilledBy: string, fulfilledByName: string): Promise<void>;
  getCommunityStats(user: UserProfile): Promise<{ active: number; fulfilledToday: number; waitingForYou: number }>;
  deleteRequest(requestId: string): Promise<void>;
}

class FirebaseNoteRequestsService implements INoteRequestsService {
  async getRequestsForUser(user: UserProfile): Promise<NoteRequest[]> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    console.log('[Firestore Query Log] Fetching requests. User Profile:', {
      uid: user.uid,
      displayName: user.displayName,
      role: user.role,
      course: user.course,
      semester: user.semester,
      batch: user.batch
    });

    let q;
    if (user.role === 'admin') {
      console.log('[Firestore Query Log] Admin query active: all requests.');
      q = query(
        collection(fbDb, 'noteRequests')
      );
    } else {
      console.log('[Firestore Query Log] Student query active. Filters:', {
        course: user.course || 'BCA',
        semester: user.semester || '1',
        batch: user.batch || '2024-2027'
      });
      q = query(
        collection(fbDb, 'noteRequests'),
        where('course', '==', user.course || 'BCA'),
        where('semester', '==', user.semester || '1'),
        where('batch', '==', user.batch || '2024-2027')
      );
    }
    
    const snapshot = await getDocs(q);
    console.log(`[Firestore Query Log] Response Count: ${snapshot.size}`);
    
    return snapshot.docs
      .map(d => {
        const data = d.data() as NoteRequest;
        console.log(`[Firestore Query Log] Document: "${data.topic}" | Course: "${data.course}" | Semester: "${data.semester}" | Batch: "${data.batch}"`);
        return data;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  subscribeRequests(user: UserProfile, callback: (requests: NoteRequest[]) => void, onError?: (error: any) => void): () => void {
    if (!fbDb) {
      if (onError) onError(new Error('Firestore not initialized.'));
      return () => {};
    }

    console.log('[Firestore Subscribe Log] Subscribing to requests. User Profile:', {
      uid: user.uid,
      displayName: user.displayName,
      role: user.role,
      course: user.course,
      semester: user.semester,
      batch: user.batch
    });

    let q;
    if (user.role === 'admin') {
      console.log('[Firestore Subscribe Log] Admin subscription active: all requests.');
      q = query(
        collection(fbDb, 'noteRequests')
      );
    } else {
      console.log('[Firestore Subscribe Log] Student subscription active. Filters:', {
        course: user.course || 'BCA',
        semester: user.semester || '1',
        batch: user.batch || '2024-2027'
      });
      q = query(
        collection(fbDb, 'noteRequests'),
        where('course', '==', user.course || 'BCA'),
        where('semester', '==', user.semester || '1'),
        where('batch', '==', user.batch || '2024-2027')
      );
    }

    return onSnapshot(q, (snapshot) => {
      console.log(`[Firestore Subscribe Log] Received live update. Document Count: ${snapshot.size}`);
      const list = snapshot.docs
        .map(d => {
          const data = d.data() as NoteRequest;
          console.log(`[Firestore Subscribe Log] Live Doc: "${data.topic}" | Course: "${data.course}" | Semester: "${data.semester}" | Batch: "${data.batch}"`);
          return data;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    }, (err) => {
      console.error('[Firestore Subscribe Log] Live subscription error:', err);
      if (onError) onError(err);
    });
  }

  async createRequest(request: { subject: string; topic: string; description?: string }, user: UserProfile): Promise<NoteRequest> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    const requestId = generateUUID();
    const newRequest: NoteRequest = {
      requestId,
      subject: request.subject,
      topic: request.topic,
      description: request.description || '',
      requestedBy: user.uid,
      requestedByName: user.displayName || 'Anonymous Student',
      course: user.course || 'BCA',
      semester: user.semester || '1',
      batch: user.batch || '2024-2027',
      department: user.department || 'Computer Science',
      interestedCount: 1,
      interestedUsers: [user.uid],
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(fbDb, 'noteRequests', requestId), newRequest);
    return newRequest;
  }

  async voteRequest(requestId: string, userId: string): Promise<NoteRequest> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    const docRef = doc(fbDb, 'noteRequests', requestId);
    let updatedRequest!: NoteRequest;

    await runTransaction(fbDb, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) throw new Error('Note request not found.');
      
      const req = snap.data() as NoteRequest;
      let users = req.interestedUsers || [];
      let count = req.interestedCount || 0;
      
      if (users.includes(userId)) {
        // Toggle vote: unvote
        users = users.filter(id => id !== userId);
        count = Math.max(0, count - 1);
      } else {
        // Vote
        users = [...users, userId];
        count += 1;
      }
      
      updatedRequest = { ...req, interestedUsers: users, interestedCount: count };
      transaction.update(docRef, {
        interestedUsers: users,
        interestedCount: count
      });
    });

    return updatedRequest;
  }

  async fulfillRequest(requestId: string, noteId: string, fulfilledBy: string, fulfilledByName: string): Promise<void> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    const docRef = doc(fbDb, 'noteRequests', requestId);
    await updateDoc(docRef, {
      status: 'fulfilled',
      fulfilledBy,
      fulfilledByName,
      fulfilledNoteId: noteId,
      fulfilledAt: new Date().toISOString()
    });
  }

  async getCommunityStats(user: UserProfile): Promise<{ active: number; fulfilledToday: number; waitingForYou: number }> {
    const list = await this.getRequestsForUser(user);
    const active = list.filter(r => r.status === 'pending').length;
    
    const today = new Date().setHours(0,0,0,0);
    const fulfilledToday = list.filter(r => 
      r.status === 'fulfilled' && 
      r.fulfilledAt && 
      new Date(r.fulfilledAt).getTime() >= today
    ).length;
    
    const waitingForYou = list.filter(r => 
      r.status === 'pending' && 
      r.requestedBy !== user.uid && 
      !(r.interestedUsers || []).includes(user.uid)
    ).length;

    return { active, fulfilledToday, waitingForYou };
  }

  async deleteRequest(requestId: string): Promise<void> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    await deleteDoc(doc(fbDb, 'noteRequests', requestId));
  }
}

export class SandboxNoteRequestsService implements INoteRequestsService {
  private getLocalRequests(): NoteRequest[] {
    const data = localStorage.getItem(REQUESTS_CACHE_KEY);
    return data ? JSON.parse(data) : SEED_REQUESTS;
  }

  private setLocalRequests(requests: NoteRequest[]) {
    localStorage.setItem(REQUESTS_CACHE_KEY, JSON.stringify(requests));
  }

  async getRequestsForUser(user: UserProfile): Promise<NoteRequest[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const list = this.getLocalRequests();
    
    if (user.role === 'admin') {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    // Cohort match course + semester + batch
    return list
      .filter(r => 
        r.course === (user.course || 'BCA') && 
        r.semester === (user.semester || '1') && 
        r.batch === (user.batch || '2024-2027')
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  subscribeRequests(user: UserProfile, callback: (requests: NoteRequest[]) => void): () => void {
    this.getRequestsForUser(user).then(callback);
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === REQUESTS_CACHE_KEY) {
        this.getRequestsForUser(user).then(callback);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }

  async createRequest(request: { subject: string; topic: string; description?: string }, user: UserProfile): Promise<NoteRequest> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const list = this.getLocalRequests();
    
    const requestId = generateUUID();
    const newRequest: NoteRequest = {
      requestId,
      subject: request.subject,
      topic: request.topic,
      description: request.description || '',
      requestedBy: user.uid,
      requestedByName: user.displayName || 'Anonymous Student',
      course: user.course || 'BCA',
      semester: user.semester || '3',
      batch: user.batch || '2024-2027',
      department: user.department || 'Computer Science',
      interestedCount: 1,
      interestedUsers: [user.uid],
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    list.unshift(newRequest);
    this.setLocalRequests(list);
    return newRequest;
  }

  async voteRequest(requestId: string, userId: string): Promise<NoteRequest> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const list = this.getLocalRequests();
    const idx = list.findIndex(r => r.requestId === requestId);
    if (idx === -1) throw new Error('Note request not found.');
    
    const req = list[idx];
    let users = req.interestedUsers || [];
    let count = req.interestedCount || 0;
    
    if (users.includes(userId)) {
      users = users.filter(id => id !== userId);
      count = Math.max(0, count - 1);
    } else {
      users = [...users, userId];
      count += 1;
    }
    
    list[idx] = { ...req, interestedUsers: users, interestedCount: count };
    this.setLocalRequests(list);
    return list[idx];
  }

  async fulfillRequest(requestId: string, noteId: string, fulfilledBy: string, fulfilledByName: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const list = this.getLocalRequests();
    const idx = list.findIndex(r => r.requestId === requestId);
    if (idx === -1) throw new Error('Note request not found.');
    
    list[idx] = {
      ...list[idx],
      status: 'fulfilled',
      fulfilledBy,
      fulfilledByName,
      fulfilledNoteId: noteId,
      fulfilledAt: new Date().toISOString()
    };
    this.setLocalRequests(list);
  }

  async getCommunityStats(user: UserProfile): Promise<{ active: number; fulfilledToday: number; waitingForYou: number }> {
    const list = await this.getRequestsForUser(user);
    const active = list.filter(r => r.status === 'pending').length;
    
    const today = new Date().setHours(0,0,0,0);
    const fulfilledToday = list.filter(r => 
      r.status === 'fulfilled' && 
      r.fulfilledAt && 
      new Date(r.fulfilledAt).getTime() >= today
    ).length;
    
    const waitingForYou = list.filter(r => 
      r.status === 'pending' && 
      r.requestedBy !== user.uid && 
      !(r.interestedUsers || []).includes(user.uid)
    ).length;

    return { active, fulfilledToday, waitingForYou };
  }

  async deleteRequest(requestId: string): Promise<void> {
    const list = this.getLocalRequests();
    const filtered = list.filter(r => r.requestId !== requestId);
    this.setLocalRequests(filtered);
  }
}

class HybridNoteRequestsService implements INoteRequestsService {
  private firebase = new FirebaseNoteRequestsService();

  private get service(): INoteRequestsService {
    // All Note Request data must be stored and retrieved from Cloud Firestore.
    // Do not fall back to LocalStorage sandbox for note requests.
    return this.firebase;
  }

  async getRequestsForUser(user: UserProfile): Promise<NoteRequest[]> {
    return this.service.getRequestsForUser(user);
  }

  subscribeRequests(user: UserProfile, callback: (requests: NoteRequest[]) => void, onError?: (error: any) => void): () => void {
    return this.service.subscribeRequests(user, callback, onError);
  }

  async createRequest(request: { subject: string; topic: string; description?: string }, user: UserProfile): Promise<NoteRequest> {
    return this.service.createRequest(request, user);
  }

  async voteRequest(requestId: string, userId: string): Promise<NoteRequest> {
    return this.service.voteRequest(requestId, userId);
  }

  async fulfillRequest(requestId: string, noteId: string, fulfilledBy: string, fulfilledByName: string): Promise<void> {
    return this.service.fulfillRequest(requestId, noteId, fulfilledBy, fulfilledByName);
  }

  async getCommunityStats(user: UserProfile): Promise<{ active: number; fulfilledToday: number; waitingForYou: number }> {
    return this.service.getCommunityStats(user);
  }

  async deleteRequest(requestId: string): Promise<void> {
    return this.service.deleteRequest(requestId);
  }
}

export const noteRequestsService: INoteRequestsService = new HybridNoteRequestsService();

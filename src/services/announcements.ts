import { db as fbDb } from '@/firebase/config';
import { 
  collection, doc, getDocs, setDoc, deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { sandboxService } from './sandbox';
import type { Announcement, AnnouncementInput } from '@/types/database';

const ANNOUNCEMENTS_CACHE_KEY = 'classnotes_announcements';

// Seed mock announcements
export const SEED_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'seed-ann-welcome',
    title: 'Welcome to ClassNotes Portal',
    content: 'We are excited to welcome you to the new ClassNotes application. You can view, bookmark, and download notes for your course and semester. Upload your own notes to earn reward points!',
    authorId: 'demo-admin-uid',
    authorName: 'System Admin',
    priority: 'info',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'seed-ann-guidelines',
    title: 'Note Uploading Guidelines',
    content: 'To keep our library high-quality, please make sure all uploaded notes are clear, legible, and properly categorized by course and semester. Thank you for contributing to our student community!',
    authorId: 'demo-admin-uid',
    authorName: 'System Admin',
    priority: 'important',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const seedSandboxAnnouncements = () => {
  if (!localStorage.getItem(ANNOUNCEMENTS_CACHE_KEY)) {
    localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(SEED_ANNOUNCEMENTS));
  }
};

if (sandboxService.isSandboxActive()) {
  seedSandboxAnnouncements();
}

export interface IAnnouncementsService {
  getAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(input: AnnouncementInput, author: { uid: string; displayName: string }): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;
}

class FirebaseAnnouncementsService implements IAnnouncementsService {
  async getAnnouncements(): Promise<Announcement[]> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    const annQuery = query(collection(fbDb, 'announcements'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(annQuery);
    return snapshot.docs.map(d => d.data() as Announcement);
  }

  async createAnnouncement(input: AnnouncementInput, author: { uid: string; displayName: string }): Promise<Announcement> {
    if (!fbDb) throw new Error('Firestore not initialized.');

    const annId = `ann-${Date.now()}`;
    const newAnnouncement: Announcement = {
      id: annId,
      title: input.title,
      content: input.content,
      authorId: author.uid,
      authorName: author.displayName,
      priority: input.priority,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(fbDb, 'announcements', annId), newAnnouncement);
    return newAnnouncement;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    await deleteDoc(doc(fbDb, 'announcements', id));
  }
}

class SandboxAnnouncementsService implements IAnnouncementsService {
  private getLocalAnnouncements(): Announcement[] {
    const data = localStorage.getItem(ANNOUNCEMENTS_CACHE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as Announcement[];
      const filtered = parsed.filter(a => a.id !== 'seed-ann-1' && a.id !== 'seed-ann-2' && a.id !== 'seed-ann-3');
      if (filtered.length !== parsed.length) {
        localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(filtered));
      }
      return filtered;
    }
    return SEED_ANNOUNCEMENTS;
  }

  private setLocalAnnouncements(anns: Announcement[]) {
    localStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(anns));
  }

  async getAnnouncements(): Promise<Announcement[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.getLocalAnnouncements().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createAnnouncement(input: AnnouncementInput, author: { uid: string; displayName: string }): Promise<Announcement> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const anns = this.getLocalAnnouncements();
    
    const newAnnouncement: Announcement = {
      id: `sandbox-ann-${Date.now()}`,
      title: input.title,
      content: input.content,
      authorId: author.uid,
      authorName: author.displayName,
      priority: input.priority,
      createdAt: new Date().toISOString()
    };

    anns.push(newAnnouncement);
    this.setLocalAnnouncements(anns);
    return newAnnouncement;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    const anns = this.getLocalAnnouncements();
    const filtered = anns.filter(a => a.id !== id);
    this.setLocalAnnouncements(filtered);
  }
}

export const announcementsService: IAnnouncementsService = sandboxService.isSandboxActive()
  ? new SandboxAnnouncementsService()
  : new FirebaseAnnouncementsService();

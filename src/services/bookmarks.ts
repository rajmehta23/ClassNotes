import { db as fbDb } from '@/firebase/config';
import { 
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where 
} from 'firebase/firestore';
import { sandboxService } from './sandbox';
import type { Bookmark } from '@/types/database';

const BOOKMARKS_CACHE_KEY = 'classnotes_bookmarks';

export interface IBookmarksService {
  getBookmarks(userId: string): Promise<Bookmark[]>;
  toggleBookmark(userId: string, noteId: string): Promise<boolean>; // Returns true if bookmarked, false if unbookmarked
  isBookmarked(userId: string, noteId: string): Promise<boolean>;
}

class FirebaseBookmarksService implements IBookmarksService {
  async getBookmarks(userId: string): Promise<Bookmark[]> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    const bookmarksQuery = query(
      collection(fbDb, 'bookmarks'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(bookmarksQuery);
    return snapshot.docs.map(d => d.data() as Bookmark);
  }

  async toggleBookmark(userId: string, noteId: string): Promise<boolean> {
    if (!fbDb) throw new Error('Firestore not initialized.');

    const bookmarkId = `bookmark-${userId}-${noteId}`;
    const docRef = doc(fbDb, 'bookmarks', bookmarkId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await deleteDoc(docRef);
      return false; // Removed bookmark
    } else {
      const newBookmark: Bookmark = {
        id: bookmarkId,
        userId,
        noteId,
        bookmarkedAt: new Date().toISOString(),
      };
      await setDoc(docRef, newBookmark);
      return true; // Added bookmark
    }
  }

  async isBookmarked(userId: string, noteId: string): Promise<boolean> {
    if (!fbDb) return false;
    const bookmarkId = `bookmark-${userId}-${noteId}`;
    const docSnap = await getDoc(doc(fbDb, 'bookmarks', bookmarkId));
    return docSnap.exists();
  }
}

class SandboxBookmarksService implements IBookmarksService {
  private getLocalBookmarks(): Bookmark[] {
    const data = localStorage.getItem(BOOKMARKS_CACHE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private setLocalBookmarks(bookmarks: Bookmark[]) {
    localStorage.setItem(BOOKMARKS_CACHE_KEY, JSON.stringify(bookmarks));
  }

  async getBookmarks(userId: string): Promise<Bookmark[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getLocalBookmarks().filter(b => b.userId === userId);
  }

  async toggleBookmark(userId: string, noteId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const bookmarks = this.getLocalBookmarks();
    const idx = bookmarks.findIndex(b => b.userId === userId && b.noteId === noteId);

    if (idx !== -1) {
      // Remove bookmark
      bookmarks.splice(idx, 1);
      this.setLocalBookmarks(bookmarks);
      return false;
    } else {
      // Add bookmark
      const newBookmark: Bookmark = {
        id: `sandbox-bookmark-${userId}-${noteId}`,
        userId,
        noteId,
        bookmarkedAt: new Date().toISOString()
      };
      bookmarks.push(newBookmark);
      this.setLocalBookmarks(bookmarks);
      return true;
    }
  }

  async isBookmarked(userId: string, noteId: string): Promise<boolean> {
    const bookmarks = this.getLocalBookmarks();
    return bookmarks.some(b => b.userId === userId && b.noteId === noteId);
  }
}

export const bookmarksService: IBookmarksService = sandboxService.isSandboxActive()
  ? new SandboxBookmarksService()
  : new FirebaseBookmarksService();

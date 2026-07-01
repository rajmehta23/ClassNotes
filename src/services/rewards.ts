import { db as fbDb } from '@/firebase/config';
import { 
  collection, doc, getDocs, runTransaction, setDoc, deleteDoc
} from 'firebase/firestore';
import { sandboxService } from './sandbox';
import type { RewardItem } from '@/types/database';
import type { UserProfile } from '@/types/auth';

const REWARDS_CACHE_KEY = 'classnotes_rewards';
const USERS_CACHE_KEY = 'classnotes_seeded_users';
const CURRENT_USER_CACHE_KEY = 'classnotes_session_user';

// Seed mock reward items
export const SEED_REWARDS: RewardItem[] = [
  {
    id: 'reward-1',
    title: 'Advanced React 19 Cheat Sheet',
    description: 'Detailed quick-reference guide on React 19 compiler hooks, server actions, dynamic contexts, and optimization patterns.',
    pointsRequired: 30,
    imageUrl: '/study_guide_cover.png',
    downloadsCount: 15,
    stock: 50,
    type: 'cheat_sheet',
    createdAt: new Date().toISOString(),
    course: 'BCA',
    semester: '3'
  },
  {
    id: 'reward-2',
    title: 'Data Structures & Algorithms Guide',
    description: 'Comprehensive study guide covering binary trees, graphs, heaps, complexity proofs, and standard sorting templates.',
    pointsRequired: 50,
    imageUrl: '/study_guide_cover.png',
    downloadsCount: 22,
    stock: 30,
    type: 'guide',
    createdAt: new Date().toISOString(),
    course: 'BCA',
    semester: '3'
  },
  {
    id: 'reward-3',
    title: 'Vite & Rolldown Performance Summary',
    description: 'Advanced notes on optimizing tree-shaking, bundle sizes, custom Vite plugins, and Rolldown build configurations.',
    pointsRequired: 20,
    imageUrl: '/study_guide_cover.png',
    downloadsCount: 8,
    stock: 100,
    type: 'summary',
    createdAt: new Date().toISOString(),
    course: 'BBA',
    semester: '2'
  },
  {
    id: 'reward-4',
    title: 'Chemistry Midterm Mock Exam Paper',
    description: 'A full mock examination covering carbon reactions, structures, and nomenclature, with annotated sample solutions.',
    pointsRequired: 60,
    imageUrl: '/study_guide_cover.png',
    downloadsCount: 14,
    stock: 15,
    type: 'mock_exam',
    createdAt: new Date().toISOString(),
    course: 'B.Tech',
    semester: '4'
  }
];

const seedSandboxRewards = () => {
  const cached = localStorage.getItem(REWARDS_CACHE_KEY);
  if (!cached) {
    localStorage.setItem(REWARDS_CACHE_KEY, JSON.stringify(SEED_REWARDS));
  } else {
    try {
      const parsed = JSON.parse(cached) as RewardItem[];
      let updated = false;
      const newItems = parsed.map(item => {
        const seedMatch = SEED_REWARDS.find(s => s.id === item.id);
        if (seedMatch && (!item.course || !item.semester)) {
          updated = true;
          return { ...item, course: seedMatch.course, semester: seedMatch.semester };
        }
        return item;
      });
      if (updated) {
        localStorage.setItem(REWARDS_CACHE_KEY, JSON.stringify(newItems));
      }
    } catch (e) {
      console.error('Failed to parse cached rewards, resetting seed rewards:', e);
      localStorage.setItem(REWARDS_CACHE_KEY, JSON.stringify(SEED_REWARDS));
    }
  }
};

if (sandboxService.isSandboxActive()) {
  seedSandboxRewards();
}

export interface IRewardsService {
  getRewardItems(): Promise<RewardItem[]>;
  claimReward(userId: string, itemId: string): Promise<void>;
  addPoints(userId: string, amount: number): Promise<number>; // returns updated points
  deductPoints(userId: string, amount: number): Promise<number>; // returns updated points
  addRewardItem(item: Omit<RewardItem, 'id' | 'createdAt' | 'downloadsCount'>): Promise<RewardItem>;
  deleteRewardItem(itemId: string): Promise<void>;
}

class FirebaseRewardsService implements IRewardsService {
  async getRewardItems(): Promise<RewardItem[]> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    const snapshot = await getDocs(collection(fbDb, 'rewards'));
    return snapshot.docs.map(d => d.data() as RewardItem);
  }

  async claimReward(userId: string, itemId: string): Promise<void> {
    if (!fbDb) throw new Error('Firestore not initialized.');

    const userRef = doc(fbDb, 'users', userId);
    const rewardRef = doc(fbDb, 'rewards', itemId);

    await runTransaction(fbDb, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const rewardSnap = await transaction.get(rewardRef);

      if (!userSnap.exists()) throw new Error('User profile does not exist.');
      if (!rewardSnap.exists()) throw new Error('Reward item does not exist.');

      const user = userSnap.data() as UserProfile;
      const reward = rewardSnap.data() as RewardItem;

      if (reward.stock <= 0) {
        throw new Error('This reward item is currently out of stock.');
      }
      if (user.points < reward.pointsRequired) {
        throw new Error('Insufficient points balance to claim this reward.');
      }

      // Perform updates
      transaction.update(userRef, {
        points: user.points - reward.pointsRequired
      });
      transaction.update(rewardRef, {
        stock: reward.stock - 1,
        downloadsCount: reward.downloadsCount + 1
      });
    });
  }

  async addPoints(userId: string, amount: number): Promise<number> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    const userRef = doc(fbDb, 'users', userId);
    let updatedPoints = 0;
    
    await runTransaction(fbDb, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('User does not exist.');
      
      const user = userSnap.data() as UserProfile;
      updatedPoints = user.points + amount;
      transaction.update(userRef, { points: updatedPoints });
    });
    
    return updatedPoints;
  }

  async deductPoints(userId: string, amount: number): Promise<number> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    const userRef = doc(fbDb, 'users', userId);
    let updatedPoints = 0;
    
    await runTransaction(fbDb, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('User does not exist.');
      
      const user = userSnap.data() as UserProfile;
      if (user.points < amount) throw new Error('Insufficient points.');
      updatedPoints = user.points - amount;
      transaction.update(userRef, { points: updatedPoints });
    });
    
    return updatedPoints;
  }

  async addRewardItem(item: Omit<RewardItem, 'id' | 'createdAt' | 'downloadsCount'>): Promise<RewardItem> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    const rewardRef = doc(collection(fbDb, 'rewards'));
    const newReward: RewardItem = {
      ...item,
      id: rewardRef.id,
      downloadsCount: 0,
      createdAt: new Date().toISOString()
    };
    await setDoc(rewardRef, newReward);
    return newReward;
  }

  async deleteRewardItem(itemId: string): Promise<void> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    await deleteDoc(doc(fbDb, 'rewards', itemId));
  }
}

class SandboxRewardsService implements IRewardsService {
  private getLocalItems(): RewardItem[] {
    const data = localStorage.getItem(REWARDS_CACHE_KEY);
    return data ? JSON.parse(data) : SEED_REWARDS;
  }

  private setLocalItems(items: RewardItem[]) {
    localStorage.setItem(REWARDS_CACHE_KEY, JSON.stringify(items));
  }

  private getLocalUsers(): UserProfile[] {
    const data = localStorage.getItem(USERS_CACHE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private setLocalUsers(users: UserProfile[]) {
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
  }

  async getRewardItems(): Promise<RewardItem[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return this.getLocalItems();
  }

  async claimReward(userId: string, itemId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const items = this.getLocalItems();
    const itemIdx = items.findIndex(i => i.id === itemId);
    if (itemIdx === -1) throw new Error('Reward item not found.');
    
    const item = items[itemIdx];
    if (item.stock <= 0) {
      throw new Error('This reward item is currently out of stock.');
    }

    // Update user profile in local db
    const users = this.getLocalUsers();
    const userIdx = users.findIndex(u => u.uid === userId);
    if (userIdx === -1) throw new Error('User not found.');
    
    const user = users[userIdx];
    if (user.points < item.pointsRequired) {
      throw new Error('Insufficient points balance to claim this reward.');
    }

    // Deduct points
    users[userIdx].points -= item.pointsRequired;
    this.setLocalUsers(users);

    // Update item stock
    items[itemIdx].stock -= 1;
    items[itemIdx].downloadsCount += 1;
    this.setLocalItems(items);

    // Also update session user cache so UI updates instantly
    const sessionStr = localStorage.getItem(CURRENT_USER_CACHE_KEY) || sessionStorage.getItem(CURRENT_USER_CACHE_KEY);
    if (sessionStr) {
      const sessionUser = JSON.parse(sessionStr) as UserProfile;
      if (sessionUser.uid === userId) {
        sessionUser.points -= item.pointsRequired;
        const updatedUserStr = JSON.stringify(sessionUser);
        if (localStorage.getItem(CURRENT_USER_CACHE_KEY)) {
          localStorage.setItem(CURRENT_USER_CACHE_KEY, updatedUserStr);
        } else {
          sessionStorage.setItem(CURRENT_USER_CACHE_KEY, updatedUserStr);
        }
        // Force window storage event reload
        window.dispatchEvent(new Event('storage'));
      }
    }
  }

  async addPoints(userId: string, amount: number): Promise<number> {
    const users = this.getLocalUsers();
    const userIdx = users.findIndex(u => u.uid === userId);
    if (userIdx === -1) throw new Error('User not found.');
    
    users[userIdx].points += amount;
    this.setLocalUsers(users);

    const sessionStr = localStorage.getItem(CURRENT_USER_CACHE_KEY) || sessionStorage.getItem(CURRENT_USER_CACHE_KEY);
    if (sessionStr) {
      const sessionUser = JSON.parse(sessionStr) as UserProfile;
      if (sessionUser.uid === userId) {
        sessionUser.points += amount;
        const updatedUserStr = JSON.stringify(sessionUser);
        if (localStorage.getItem(CURRENT_USER_CACHE_KEY)) {
          localStorage.setItem(CURRENT_USER_CACHE_KEY, updatedUserStr);
        } else {
          sessionStorage.setItem(CURRENT_USER_CACHE_KEY, updatedUserStr);
        }
        window.dispatchEvent(new Event('storage'));
      }
    }

    return users[userIdx].points;
  }

  async deductPoints(userId: string, amount: number): Promise<number> {
    const users = this.getLocalUsers();
    const userIdx = users.findIndex(u => u.uid === userId);
    if (userIdx === -1) throw new Error('User not found.');
    
    if (users[userIdx].points < amount) throw new Error('Insufficient points.');
    users[userIdx].points -= amount;
    this.setLocalUsers(users);

    const sessionStr = localStorage.getItem(CURRENT_USER_CACHE_KEY) || sessionStorage.getItem(CURRENT_USER_CACHE_KEY);
    if (sessionStr) {
      const sessionUser = JSON.parse(sessionStr) as UserProfile;
      if (sessionUser.uid === userId) {
        sessionUser.points -= amount;
        const updatedUserStr = JSON.stringify(sessionUser);
        if (localStorage.getItem(CURRENT_USER_CACHE_KEY)) {
          localStorage.setItem(CURRENT_USER_CACHE_KEY, updatedUserStr);
        } else {
          sessionStorage.setItem(CURRENT_USER_CACHE_KEY, updatedUserStr);
        }
        window.dispatchEvent(new Event('storage'));
      }
    }

    return users[userIdx].points;
  }

  async addRewardItem(item: Omit<RewardItem, 'id' | 'createdAt' | 'downloadsCount'>): Promise<RewardItem> {
    const items = this.getLocalItems();
    const newReward: RewardItem = {
      ...item,
      id: `reward-${Date.now()}`,
      downloadsCount: 0,
      createdAt: new Date().toISOString()
    };
    items.push(newReward);
    this.setLocalItems(items);
    return newReward;
  }

  async deleteRewardItem(itemId: string): Promise<void> {
    const items = this.getLocalItems();
    const updated = items.filter(i => i.id !== itemId);
    this.setLocalItems(updated);
  }
}

export const rewardsService: IRewardsService = sandboxService.isSandboxActive()
  ? new SandboxRewardsService()
  : new FirebaseRewardsService();

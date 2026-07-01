import { create } from 'zustand';
import { rewardsService } from '@/services/rewards';
import type { RewardItem } from '@/types/database';

interface RewardsStore {
  items: RewardItem[];
  isLoading: boolean;
  error: string | null;

  fetchItems: () => Promise<void>;
  claimReward: (userId: string, itemId: string) => Promise<void>;
  addRewardItem: (item: Omit<RewardItem, 'id' | 'createdAt' | 'downloadsCount'>) => Promise<void>;
  deleteRewardItem: (itemId: string) => Promise<void>;
}

export const useRewardsStore = create<RewardsStore>((set) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await rewardsService.getRewardItems();
      set({ items, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch rewards catalog';
      set({ error: msg, isLoading: false });
    }
  },

  claimReward: async (userId, itemId) => {
    set({ isLoading: true, error: null });
    try {
      await rewardsService.claimReward(userId, itemId);
      // Re-fetch catalog to update dynamic stock numbers
      const items = await rewardsService.getRewardItems();
      set({ items, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to claim reward item';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  addRewardItem: async (item) => {
    set({ isLoading: true, error: null });
    try {
      await rewardsService.addRewardItem(item);
      const items = await rewardsService.getRewardItems();
      set({ items, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add reward item';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  deleteRewardItem: async (itemId) => {
    set({ isLoading: true, error: null });
    try {
      await rewardsService.deleteRewardItem(itemId);
      const items = await rewardsService.getRewardItems();
      set({ items, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete reward item';
      set({ error: msg, isLoading: false });
      throw err;
    }
  }
}));

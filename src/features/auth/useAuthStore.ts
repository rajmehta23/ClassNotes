import { create } from 'zustand';
import { authService } from '@/services/auth';
import type { AuthState, UserProfile } from '@/types/auth';

interface AuthStore extends AuthState {
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: (rememberMe: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  initialize: () => () => void; // Returns unsubscribe function
  updatePoints: (points: number) => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  signIn: async (email, password, rememberMe) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signIn(email, password, rememberMe);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  signUp: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signUp(email, password, displayName);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sign up';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  signInWithGoogle: async (rememberMe) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signInWithGoogle(rememberMe);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await authService.signOut();
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sign out';
      set({ error: msg, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  initialize: () => {
    // Listen for auth state modifications globally
    const unsubscribe = authService.onAuthStateChanged((user) => {
      set({ 
        user, 
        isAuthenticated: !!user, 
        isLoading: false 
      });
    });
    return unsubscribe;
  },

  updatePoints: (points) => {
    set((state) => {
      if (state.user) {
        return {
          user: {
            ...state.user,
            points
          }
        };
      }
      return {};
    });
  },

  updateProfile: async (data) => {
    const state = useAuthStore.getState();
    if (!state.user) return;
    const updatedUser = await authService.updateProfile(state.user.uid, data);
    
    // Update session storage / local storage cache
    const sessionKey = 'classnotes_session_user';
    if (localStorage.getItem(sessionKey)) {
      localStorage.setItem(sessionKey, JSON.stringify(updatedUser));
    } else if (sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, JSON.stringify(updatedUser));
    } else {
      localStorage.setItem(sessionKey, JSON.stringify(updatedUser)); // default fallback
    }
    
    set({ user: updatedUser });
  }
}));

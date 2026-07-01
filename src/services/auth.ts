import { auth as fbAuth, db as fbDb } from '@/firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut, 
  sendPasswordResetEmail,
  onAuthStateChanged as fbOnAuthStateChanged,
  signInAnonymously,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sandboxService } from './sandbox';
import type { UserProfile, UserRole } from '@/types/auth';

// Session storage keys
const SESSION_USER_KEY = 'classnotes_session_user';
const SEED_USERS_KEY = 'classnotes_seeded_users';

export function validateAndEnsureUserProfile(profile: UserProfile): UserProfile {
  const fallbacks = {
    role: 'student' as UserRole,
    course: 'BCA',
    semester: '1',
    batch: '2024-2027',
    department: 'Computer Science'
  };

  let modified = false;
  for (const key of Object.keys(fallbacks) as (keyof typeof fallbacks)[]) {
    if (!profile[key]) {
      console.warn(`[UserProfile Warning]: User "${profile.uid}" is missing field "${key}". Falling back to default "${fallbacks[key]}".`);
      (profile as any)[key] = fallbacks[key];
      modified = true;
    }
  }

  // Persist back to firestore if modified
  if (modified && fbAuth && fbAuth.currentUser && fbAuth.currentUser.uid === profile.uid && fbDb) {
    const docRef = doc(fbDb, 'users', profile.uid);
    setDoc(docRef, profile).catch(err => console.error('Failed to auto-update profile defaults in Firestore:', err));
  }

  return profile;
}

interface SandboxUserAccount {
  uid: string;
  email: string;
  password?: string;
  displayName: string;
  role: UserRole;
  points: number;
  createdAt: string;
  course?: string;
  semester?: string;
  batch?: string;
  department?: string;
}

// Demo seed accounts definition
export const DEMO_ACCOUNTS: SandboxUserAccount[] = [
  {
    uid: 'demo-admin-uid',
    email: 'admin@classnotes.com',
    password: 'admin123',
    displayName: 'Admin Instructor',
    role: 'admin' as UserRole,
    points: 500,
    createdAt: new Date().toISOString(),
    course: 'BCA',
    semester: '3',
    batch: '2024-2027',
    department: 'Computer Science'
  },
  {
    uid: 'demo-student-uid',
    email: 'student@classnotes.com',
    password: 'student123',
    displayName: 'Jane Doe',
    role: 'student' as UserRole,
    points: 120,
    createdAt: new Date().toISOString(),
    course: 'BCA',
    semester: '3',
    batch: '2024-2027',
    department: 'Computer Science'
  },
  {
    uid: 'demo-guest-uid',
    email: 'guest@classnotes.com',
    password: 'guest123',
    displayName: 'Visitor Account',
    role: 'guest' as UserRole,
    points: 0,
    createdAt: new Date().toISOString(),
    batch: '2024-2027',
    department: 'General Studies'
  }
];

// Seeding function for Sandbox
const seedSandboxUsers = () => {
  if (!localStorage.getItem(SEED_USERS_KEY)) {
    localStorage.setItem(SEED_USERS_KEY, JSON.stringify(DEMO_ACCOUNTS));
  }
};

// Auto-seed sandbox when this service module loads
if (sandboxService.isSandboxActive()) {
  seedSandboxUsers();
}

/**
 * Interface definition for Authentication operations
 */
export interface IAuthService {
  signIn(email: string, password: string, rememberMe: boolean): Promise<UserProfile>;
  signUp(email: string, password: string, displayName: string): Promise<UserProfile>;
  signInWithGoogle(rememberMe: boolean): Promise<UserProfile>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  getCurrentUser(): UserProfile | null;
  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void;
  updateProfile(uid: string, data: Partial<UserProfile>): Promise<UserProfile>;
}

/**
 * Production Firebase Authentication Service
 */
class FirebaseAuthService implements IAuthService {
  async signIn(email: string, password: string, _rememberMe: boolean): Promise<UserProfile> {
    if (!fbAuth || !fbDb) throw new Error('Firebase Auth not initialized.');
    
    const credential = await signInWithEmailAndPassword(fbAuth, email, password);
    // getUserProfile will auto-create the doc if it doesn't exist
    return this.getUserProfile(credential.user);
  }

  async signUp(email: string, password: string, displayName: string): Promise<UserProfile> {
    if (!fbAuth || !fbDb) throw new Error('Firebase Auth not initialized.');

    const credential = await createUserWithEmailAndPassword(fbAuth, email, password);
    const profile: UserProfile = {
      uid: credential.user.uid,
      email: credential.user.email || email,
      displayName,
      role: 'student', // Default new accounts to student role
      points: 100, // Initial sign-up reward points
      createdAt: new Date().toISOString(),
    };

    // Save profile inside Firestore
    await setDoc(doc(fbDb, 'users', profile.uid), profile);
    return profile;
  }

  async signInWithGoogle(_rememberMe: boolean): Promise<UserProfile> {
    if (!fbAuth || !fbDb) throw new Error('Firebase Auth not initialized.');

    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(fbAuth, provider);
    
    // Check if profile exists, otherwise create it
    const docRef = doc(fbDb, 'users', credential.user.uid);
    const docSnap = await getDoc(docRef);
    let profile: UserProfile;

    if (docSnap.exists()) {
      profile = docSnap.data() as UserProfile;
    } else {
      profile = {
        uid: credential.user.uid,
        email: credential.user.email || '',
        displayName: credential.user.displayName || 'Google Student',
        role: 'student',
        points: 100,
        createdAt: new Date().toISOString(),
      };
      await setDoc(docRef, profile);
    }
    
    if (credential.user.photoURL) {
      profile.googlePhotoURL = credential.user.photoURL;
    }
    return profile;
  }

  async signOut(): Promise<void> {
    if (!fbAuth) return;
    await fbSignOut(fbAuth);
  }

  async sendPasswordReset(email: string): Promise<void> {
    if (!fbAuth) throw new Error('Firebase Auth not initialized.');
    await sendPasswordResetEmail(fbAuth, email);
  }

  getCurrentUser(): UserProfile | null {
    if (!fbAuth) return null;
    const fbUser = fbAuth.currentUser;
    if (!fbUser) return null;
    
    // Synchronous retrieval requires session cache, but we fallback
    // to checking local storage if state updates are pending.
    const cached = localStorage.getItem(SESSION_USER_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as UserProfile;
      } catch {
        return null;
      }
    }
    return null;
  }

  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    if (!fbAuth || !fbDb) {
      callback(null);
      return () => {};
    }

    return fbOnAuthStateChanged(fbAuth, async (user: FirebaseUser | null) => {
      if (user) {
        try {
          const profile = await this.getUserProfile(user);
          localStorage.setItem(SESSION_USER_KEY, JSON.stringify(profile));
          callback(profile);
        } catch (err) {
          console.error('Error fetching user profile:', err);
          callback(null);
        }
      } else {
        localStorage.removeItem(SESSION_USER_KEY);
        callback(null);
      }
    });
  }

  private async getUserProfile(user: FirebaseUser): Promise<UserProfile> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    const docRef = doc(fbDb, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    let profile: UserProfile;
    if (docSnap.exists()) {
      profile = docSnap.data() as UserProfile;
    } else {
      // Auto-create profile for users who signed in but have no Firestore record
      // (e.g. Google sign-in that bypassed the signInWithGoogle button)
      profile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Student',
        role: 'student',
        points: 100,
        createdAt: new Date().toISOString(),
      };
      await setDoc(docRef, profile);
    }
    
    // Automatically attach Google photoURL to in-memory profile if authenticated via Google
    if (user.photoURL && user.providerData.some(p => p.providerId === 'google.com')) {
      profile.googlePhotoURL = user.photoURL;
    }
    return validateAndEnsureUserProfile(profile);
  }

  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<UserProfile> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    const docRef = doc(fbDb, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('User profile not found in database.');
    const currentProfile = docSnap.data() as UserProfile;
    const updatedProfile = { ...currentProfile, ...data };
    await setDoc(docRef, updatedProfile);
    return validateAndEnsureUserProfile(updatedProfile);
  }
}

/**
 * Local Sandbox Offline Authentication Service
 */
class SandboxAuthService implements IAuthService {
  private listeners: ((user: UserProfile | null) => void)[] = [];

  constructor() {
    // Listen to changes in localStorage from other tabs if necessary
    window.addEventListener('storage', (e) => {
      if (e.key === SESSION_USER_KEY) {
        this.triggerListeners();
      }
    });
  }

  private getStoredAccounts(): typeof DEMO_ACCOUNTS {
    const data = localStorage.getItem(SEED_USERS_KEY);
    return data ? JSON.parse(data) : DEMO_ACCOUNTS;
  }

  private setStoredAccounts(accounts: typeof DEMO_ACCOUNTS) {
    localStorage.setItem(SEED_USERS_KEY, JSON.stringify(accounts));
  }

  private getSessionUser(): UserProfile | null {
    // Try localStorage first
    let userStr = localStorage.getItem(SESSION_USER_KEY);
    if (!userStr) {
      // Fallback to sessionStorage
      userStr = sessionStorage.getItem(SESSION_USER_KEY);
    }
    if (userStr) {
      try {
        const profile = JSON.parse(userStr) as UserProfile;
        return validateAndEnsureUserProfile(profile);
      } catch {
        return null;
      }
    }
    return null;
  }

  private setSessionUser(profile: UserProfile | null, rememberMe: boolean) {
    const str = profile ? JSON.stringify(profile) : '';
    if (profile) {
      if (rememberMe) {
        localStorage.setItem(SESSION_USER_KEY, str);
        sessionStorage.removeItem(SESSION_USER_KEY);
      } else {
        sessionStorage.setItem(SESSION_USER_KEY, str);
        localStorage.removeItem(SESSION_USER_KEY);
      }
      if (fbAuth && !fbAuth.currentUser) {
        signInAnonymously(fbAuth).catch(err => console.warn('Sandbox background anonymous sign-in failed:', err));
      }
    } else {
      localStorage.removeItem(SESSION_USER_KEY);
      sessionStorage.removeItem(SESSION_USER_KEY);
      if (fbAuth && fbAuth.currentUser) {
        fbSignOut(fbAuth).catch(err => console.warn('Sandbox background sign-out failed:', err));
      }
    }
    this.triggerListeners();
  }

  private triggerListeners() {
    const user = this.getSessionUser();
    this.listeners.forEach(cb => cb(user));
  }

  async signIn(email: string, password: string, rememberMe: boolean): Promise<UserProfile> {
    // Artificial latency
    await new Promise(resolve => setTimeout(resolve, 500));

    const accounts = this.getStoredAccounts();
    const user = accounts.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password !== password) {
      throw new Error('Invalid email or password.');
    }


    const userStatus = (user as any).status || 'active';
    if (userStatus === 'suspended') {
      throw new Error('This account has been suspended by an administrator.');
    }

    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt,
      points: user.points,
      status: userStatus,
      course: (user as any).course,
      semester: (user as any).semester
    };

    this.setSessionUser(profile, rememberMe);
    return profile;
  }

  async signUp(email: string, password: string, displayName: string): Promise<UserProfile> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const accounts = this.getStoredAccounts();
    const existing = accounts.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      throw new Error('Email address already registered.');
    }

    const newUser = {
      uid: `sandbox-uid-${Date.now()}`,
      email,
      password,
      displayName,
      role: 'student' as UserRole,
      points: 100,
      createdAt: new Date().toISOString()
    };

    accounts.push(newUser);
    this.setStoredAccounts(accounts);

    const profile: UserProfile = {
      uid: newUser.uid,
      email: newUser.email,
      displayName: newUser.displayName,
      role: newUser.role,
      createdAt: newUser.createdAt,
      points: newUser.points,
      course: (newUser as any).course,
      semester: (newUser as any).semester
    };

    this.setSessionUser(profile, false); // Default to session-only for new signs
    return profile;
  }

  async signInWithGoogle(rememberMe: boolean): Promise<UserProfile> {
    if (fbAuth) {
      try {
        const provider = new GoogleAuthProvider();
        const credential = await signInWithPopup(fbAuth, provider);
        const email = credential.user.email || 'google.student@classnotes.com';
        const displayName = credential.user.displayName || 'Google Student Account';
        
        const accounts = this.getStoredAccounts();
        let user = accounts.find(u => u.uid === credential.user.uid || u.email.toLowerCase() === email.toLowerCase());
        
        if (!user) {
          user = {
            uid: credential.user.uid,
            email,
            password: 'googleMockPassword',
            displayName,
            role: 'student' as UserRole,
            points: 100,
            createdAt: new Date().toISOString()
          };
          accounts.push(user);
          this.setStoredAccounts(accounts);
        } else {
          // Update display name if it changed on Google
          user.displayName = displayName;
          this.setStoredAccounts(accounts);
        }
        
        const profile: UserProfile = {
          uid: user!.uid,
          email: user!.email,
          displayName: user!.displayName,
          role: user!.role,
          createdAt: user!.createdAt,
          points: user!.points,
          course: (user! as any).course,
          semester: (user! as any).semester,
          batch: (user! as any).batch,
          department: (user! as any).department
        };
        
        if (credential.user.photoURL) {
          profile.googlePhotoURL = credential.user.photoURL;
        }
        
        this.setSessionUser(profile, rememberMe);
        return profile;
      } catch (err) {
        console.warn('Google Popup Sign-In failed or was cancelled. Falling back to Mock Google account.', err);
      }
    }

    // Fallback to offline Mock Google Login
    await new Promise(resolve => setTimeout(resolve, 500));

    const email = 'google.student@classnotes.com';
    const accounts = this.getStoredAccounts();
    let user = accounts.find(u => u.email === email);

    if (!user) {
      user = {
        uid: 'demo-google-uid',
        email,
        password: 'googleMockPassword',
        displayName: 'Google Student Account',
        role: 'student' as UserRole,
        points: 100,
        createdAt: new Date().toISOString()
      };
      accounts.push(user);
      this.setStoredAccounts(accounts);
    }

    const profile: UserProfile = {
      uid: user!.uid,
      email: user!.email,
      displayName: user!.displayName,
      role: user!.role,
      createdAt: user!.createdAt,
      points: user!.points,
      course: (user! as any).course,
      semester: (user! as any).semester,
      batch: (user! as any).batch,
      department: (user! as any).department
    };

    profile.googlePhotoURL = 'https://lh3.googleusercontent.com/a/default-user=s96-c';

    this.setSessionUser(profile, rememberMe);
    return profile;
  }

  async signOut(): Promise<void> {
    this.setSessionUser(null, false);
  }

  async sendPasswordReset(email: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const accounts = this.getStoredAccounts();
    const user = accounts.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('Email address not found.');
    }
    console.log(`[Sandbox Reset] Password reset link sent to: ${email}`);
  }

  getCurrentUser(): UserProfile | null {
    return this.getSessionUser();
  }

  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.push(callback);
    // Fire callback immediately with current value
    callback(this.getSessionUser());

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const accounts = this.getStoredAccounts();
    const idx = accounts.findIndex(u => u.uid === uid);
    if (idx === -1) throw new Error('User not found.');
    accounts[idx] = { ...accounts[idx], ...data } as any;
    this.setStoredAccounts(accounts);

    const sessionUser = this.getSessionUser();
    if (sessionUser && sessionUser.uid === uid) {
      const updatedProfile = { ...sessionUser, ...data };
      this.setSessionUser(updatedProfile, true); // Update session with rememberMe=true
      return validateAndEnsureUserProfile(updatedProfile);
    }
    
    // If no active session matches, return updated record anyway
    return validateAndEnsureUserProfile({
      uid: accounts[idx].uid,
      email: accounts[idx].email,
      displayName: accounts[idx].displayName,
      role: accounts[idx].role,
      createdAt: accounts[idx].createdAt,
      points: accounts[idx].points,
      course: (accounts[idx] as any).course,
      semester: (accounts[idx] as any).semester,
      batch: (accounts[idx] as any).batch,
      department: (accounts[idx] as any).department
    });
  }
}


/**
 * Hybrid Auth Service — uses Firebase for real accounts (Google, email/password),
 * but transparently routes demo sandbox accounts (admin@classnotes.com etc.) through
 * the SandboxAuthService so they always work regardless of Firebase config.
 */
class HybridAuthService implements IAuthService {
  private firebase = new FirebaseAuthService();
  private sandbox = new SandboxAuthService();

  private isDemoEmail(email: string): boolean {
    return DEMO_ACCOUNTS.some(a => a.email.toLowerCase() === email.toLowerCase());
  }

  async signIn(email: string, password: string, rememberMe: boolean): Promise<UserProfile> {
    // Always use sandbox for demo accounts so they work without Firebase Auth entries
    if (this.isDemoEmail(email)) {
      return this.sandbox.signIn(email, password, rememberMe);
    }
    return this.firebase.signIn(email, password, rememberMe);
  }

  async signUp(email: string, password: string, displayName: string): Promise<UserProfile> {
    if (this.isDemoEmail(email)) {
      throw new Error('This email address is reserved. Please use a different email.');
    }
    return this.firebase.signUp(email, password, displayName);
  }

  async signInWithGoogle(rememberMe: boolean): Promise<UserProfile> {
    return this.firebase.signInWithGoogle(rememberMe);
  }

  async signOut(): Promise<void> {
    // Sign out of both so either active session is cleared
    await Promise.allSettled([
      this.firebase.signOut(),
      this.sandbox.signOut()
    ]);
  }

  async sendPasswordReset(email: string): Promise<void> {
    if (this.isDemoEmail(email)) {
      return this.sandbox.sendPasswordReset(email);
    }
    return this.firebase.sendPasswordReset(email);
  }

  getCurrentUser(): UserProfile | null {
    return this.firebase.getCurrentUser() || this.sandbox.getCurrentUser();
  }

  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    // Listen to both; whichever fires with a non-null value wins
    let latestUser: UserProfile | null = null;

    const unsubFirebase = this.firebase.onAuthStateChanged(user => {
      if (user) {
        latestUser = user;
        callback(user);
      } else if (!latestUser || latestUser.uid.startsWith('demo-') || latestUser.uid.startsWith('sandbox-')) {
        // Only propagate null if no sandbox user is active
        const sandboxUser = this.sandbox.getCurrentUser();
        callback(sandboxUser);
      } else {
        latestUser = null;
        callback(null);
      }
    });

    const unsubSandbox = this.sandbox.onAuthStateChanged(user => {
      // Only emit sandbox user if Firebase has no authenticated user
      if (!fbAuth?.currentUser) {
        latestUser = user;
        callback(user);
      }
    });

    return () => {
      unsubFirebase();
      unsubSandbox();
    };
  }

  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<UserProfile> {
    if (uid.startsWith('demo-') || uid.startsWith('sandbox-')) {
      return this.sandbox.updateProfile(uid, data);
    }
    return this.firebase.updateProfile(uid, data);
  }
}

// Always use hybrid service — it handles both real Firebase and sandbox demo accounts
export const authService: IAuthService = new HybridAuthService();


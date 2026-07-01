import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Evaluate config validity (ensure they aren't empty strings or placeholder text)
const isValidConfig = 
  !!firebaseConfig.apiKey && 
  firebaseConfig.apiKey.trim() !== '' &&
  !!firebaseConfig.projectId &&
  firebaseConfig.projectId.trim() !== '';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
// Firebase Storage is not used — Cloudinary is the file storage provider
const storage = null;
let isSandboxMode = true;

// Force sandbox mode if requested via env or if config is invalid
const forceSandbox = import.meta.env.VITE_FORCE_SANDBOX === 'true';

if (isValidConfig) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('Firebase services initialized successfully.');
  } catch (error) {
    console.warn('Firebase initialization failed.', error);
  }
}

isSandboxMode = forceSandbox || !isValidConfig;
if (isSandboxMode) {
  console.log('Activating Local Sandbox Mode.');
}

export { app, auth, db, storage, isSandboxMode };
export default firebaseConfig;

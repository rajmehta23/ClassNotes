import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef",
};

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;

export function initializeAttendanceFirebase(customInstances?: { app?: FirebaseApp; auth?: Auth; db?: Firestore }) {
  if (customInstances?.app) app = customInstances.app;
  else app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

  if (customInstances?.auth) authInstance = customInstances.auth;
  else authInstance = getAuth(app);

  if (customInstances?.db) dbInstance = customInstances.db;
  else dbInstance = getFirestore(app);

  return { app, auth: authInstance, db: dbInstance };
}

export function getAttendanceDb(): Firestore {
  if (!dbInstance) {
    initializeAttendanceFirebase();
  }
  return dbInstance;
}

export function getAttendanceAuth(): Auth {
  if (!authInstance) {
    initializeAttendanceFirebase();
  }
  return authInstance;
}

import { db as defaultDb, auth as defaultAuth } from '@/firebase/config';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

let appInstance: FirebaseApp | undefined;
let authInstance: Auth | null = defaultAuth;
let dbInstance: Firestore | null = defaultDb;

export function initializeAttendanceFirebase(customInstances?: {
  app?: FirebaseApp;
  auth?: Auth;
  db?: Firestore;
}) {
  if (customInstances?.app) appInstance = customInstances.app;
  if (customInstances?.auth) authInstance = customInstances.auth;
  if (customInstances?.db) dbInstance = customInstances.db;

  return { app: appInstance, auth: authInstance || defaultAuth, db: dbInstance || defaultDb };
}

export function getAttendanceDb(): Firestore {
  if (!dbInstance && defaultDb) {
    dbInstance = defaultDb;
  }
  if (!dbInstance) {
    throw new Error('Firestore DB is not initialized.');
  }
  return dbInstance;
}

export function getAttendanceAuth(): Auth {
  if (!authInstance && defaultAuth) {
    authInstance = defaultAuth;
  }
  if (!authInstance) {
    throw new Error('Firebase Auth is not initialized.');
  }
  return authInstance;
}

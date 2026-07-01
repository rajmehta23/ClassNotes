import { db as fbDb } from '@/firebase/config';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { SEED_NOTES } from './notes';
import { SEED_ANNOUNCEMENTS } from './announcements';
import { SEED_REWARDS } from './rewards';
import { DEMO_ACCOUNTS } from './auth';

export const seedFirestoreIfEmpty = async () => {
  if (!fbDb) {
    console.log('Firestore seeding bypassed: Firebase not initialized.');
    return;
  }

  try {
    // 1. Seed Users
    const usersRef = collection(fbDb, 'users');
    const usersSnap = await getDocs(usersRef);
    if (usersSnap.empty) {
      console.log('Seeding users collection in Firestore...');
      for (const account of DEMO_ACCOUNTS) {
        await setDoc(doc(fbDb, 'users', account.uid), {
          uid: account.uid,
          email: account.email,
          displayName: account.displayName,
          role: account.role,
          createdAt: account.createdAt,
          points: account.points,
          course: (account as any).course || 'BCA',
          semester: (account as any).semester || '3',
          status: 'active'
        });
      }
    }

    // 2. Seed Notes
    const notesRef = collection(fbDb, 'notes');
    const notesSnap = await getDocs(notesRef);
    if (notesSnap.empty) {
      console.log('Seeding notes collection in Firestore...');
      for (const note of SEED_NOTES) {
        await setDoc(doc(fbDb, 'notes', note.id), note);
      }
    }

    // 3. Seed Announcements
    const annRef = collection(fbDb, 'announcements');
    const annSnap = await getDocs(annRef);
    
    // Proactively clean up old dummy seeded announcements from Firestore
    let deletedOld = false;
    for (const d of annSnap.docs) {
      const id = d.id;
      if (id.startsWith('seed-ann-') && id !== 'seed-ann-welcome' && id !== 'seed-ann-guidelines') {
        await deleteDoc(doc(fbDb, 'announcements', id));
        deletedOld = true;
      }
    }

    // Re-check and seed new real notices if empty
    const finalAnnSnap = await getDocs(annRef);
    if (finalAnnSnap.empty || deletedOld || finalAnnSnap.docs.every(d => d.id.startsWith('seed-ann-') && d.id !== 'seed-ann-welcome' && d.id !== 'seed-ann-guidelines')) {
      console.log('Seeding real notices in Firestore...');
      for (const ann of SEED_ANNOUNCEMENTS) {
        await setDoc(doc(fbDb, 'announcements', ann.id), ann);
      }
    }

    // 4. Seed Calendar
    const calRef = collection(fbDb, 'calendar');
    const calSnap = await getDocs(calRef);
    if (calSnap.empty) {
      console.log('Seeding calendar collection in Firestore...');
      const seedEvents = [
        {
          id: 'seed-cal-1',
          title: 'Guest Lecture: Agentic AI Systems',
          description: 'Special pair-programming seminar presented by the Google DeepMind team. Held in Engineering Block Hall B.',
          date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          type: 'lecture',
          courseName: 'Computer Science',
          createdAt: new Date().toISOString()
        },
        {
          id: 'seed-cal-2',
          title: 'Calculus I: Limits Assignment Submission',
          description: 'Submit solutions for exercise sheet 3 (problems 1 through 15) in the student portal before 23:59.',
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          type: 'assignment',
          courseName: 'Mathematics',
          createdAt: new Date().toISOString()
        },
        {
          id: 'seed-cal-3',
          title: 'Chemistry 102: Midterm Examination',
          description: 'Midterm test covering organic nomenclature, stereochemistry, and functional group reactions. Closed-book exam.',
          date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          type: 'exam',
          courseName: 'Chemistry',
          createdAt: new Date().toISOString()
        }
      ];
      for (const ev of seedEvents) {
        await setDoc(doc(fbDb, 'calendar', ev.id), ev);
      }
    }

    // 5. Seed Rewards
    const rewRef = collection(fbDb, 'rewards');
    const rewSnap = await getDocs(rewRef);
    if (rewSnap.empty) {
      console.log('Seeding rewards collection in Firestore...');
      for (const reward of SEED_REWARDS) {
        await setDoc(doc(fbDb, 'rewards', reward.id), reward);
      }
    }

    // 6. Seed default settings document if empty
    const settingsRef = doc(fbDb, 'settings', 'admin');
    const settingsSnap = await getDocs(collection(fbDb, 'settings'));
    if (settingsSnap.empty) {
      console.log('Seeding settings collection in Firestore...');
      await setDoc(settingsRef, {
        autoApprove: false,
        uploadRewardPoints: 50
      });
      localStorage.setItem('classnotes_admin_settings', JSON.stringify({
        autoApprove: false,
        uploadRewardPoints: 50
      }));
    }

    console.log('Firestore checking/seeding finished successfully.');
  } catch (error) {
    console.warn('Firestore checking/seeding skipped or failed:', error);
  }
};

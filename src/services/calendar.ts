import { db as fbDb } from '@/firebase/config';
import { 
  collection, doc, getDocs, setDoc, deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { sandboxService } from './sandbox';
import type { CalendarEvent, CalendarEventInput } from '@/types/database';

const CALENDAR_CACHE_KEY = 'classnotes_calendar';

// Seed mock calendar events (dynamically set in the future relative to runtime)
const getSeedEvents = (): CalendarEvent[] => [
  {
    id: 'seed-cal-1',
    title: 'Guest Lecture: Agentic AI Systems',
    description: 'Special pair-programming seminar presented by the Google DeepMind team. Held in Engineering Block Hall B.',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    type: 'lecture',
    courseName: 'Computer Science',
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed-cal-2',
    title: 'Calculus I: Limits Assignment Submission',
    description: 'Submit solutions for exercise sheet 3 (problems 1 through 15) in the student portal before 23:59.',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days in future
    type: 'assignment',
    courseName: 'Mathematics',
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed-cal-3',
    title: 'Chemistry 102: Midterm Examination',
    description: 'Midterm test covering organic nomenclature, stereochemistry, and functional group reactions. Closed-book exam.',
    date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 days in future
    type: 'exam',
    courseName: 'Chemistry',
    createdAt: new Date().toISOString()
  }
];

const seedSandboxCalendar = () => {
  if (!localStorage.getItem(CALENDAR_CACHE_KEY)) {
    localStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(getSeedEvents()));
  }
};

if (sandboxService.isSandboxActive()) {
  seedSandboxCalendar();
}

export interface ICalendarService {
  getEvents(): Promise<CalendarEvent[]>;
  createEvent(input: CalendarEventInput): Promise<CalendarEvent>;
  deleteEvent(id: string): Promise<void>;
}

class FirebaseCalendarService implements ICalendarService {
  async getEvents(): Promise<CalendarEvent[]> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    
    const eventsQuery = query(collection(fbDb, 'calendar'), orderBy('date', 'asc'));
    const snapshot = await getDocs(eventsQuery);
    return snapshot.docs.map(d => d.data() as CalendarEvent);
  }

  async createEvent(input: CalendarEventInput): Promise<CalendarEvent> {
    if (!fbDb) throw new Error('Firestore not initialized.');

    const eventId = `event-${Date.now()}`;
    const newEvent: CalendarEvent = {
      id: eventId,
      title: input.title,
      description: input.description,
      date: input.date,
      type: input.type,
      courseName: input.courseName,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(fbDb, 'calendar', eventId), newEvent);
    return newEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    if (!fbDb) throw new Error('Firestore not initialized.');
    await deleteDoc(doc(fbDb, 'calendar', id));
  }
}

class SandboxCalendarService implements ICalendarService {
  private getLocalEvents(): CalendarEvent[] {
    const data = localStorage.getItem(CALENDAR_CACHE_KEY);
    return data ? JSON.parse(data) : getSeedEvents();
  }

  private setLocalEvents(events: CalendarEvent[]) {
    localStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(events));
  }

  async getEvents(): Promise<CalendarEvent[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    // Sort by date ascending
    return this.getLocalEvents().sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  async createEvent(input: CalendarEventInput): Promise<CalendarEvent> {
    await new Promise(resolve => setTimeout(resolve, 250));
    const events = this.getLocalEvents();

    const newEvent: CalendarEvent = {
      id: `sandbox-cal-${Date.now()}`,
      title: input.title,
      description: input.description,
      date: input.date,
      type: input.type,
      courseName: input.courseName,
      createdAt: new Date().toISOString()
    };

    events.push(newEvent);
    this.setLocalEvents(events);
    return newEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    const events = this.getLocalEvents();
    const filtered = events.filter(e => e.id !== id);
    this.setLocalEvents(filtered);
  }
}

export const calendarService: ICalendarService = sandboxService.isSandboxActive()
  ? new SandboxCalendarService()
  : new FirebaseCalendarService();

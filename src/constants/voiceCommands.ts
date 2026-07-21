export interface CommandDefinition {
  id: string;
  name: string;
  category: 'Navigation' | 'Notes' | 'Attendance' | 'General';
  description: string;
  examples: string[];
  patterns: RegExp[];
  adminOnly?: boolean;
}

export const SUPPORTED_VOICE_COMMANDS: CommandDefinition[] = [
  // Navigation Commands
  {
    id: 'nav_dashboard',
    name: 'Open Dashboard',
    category: 'Navigation',
    description: 'Navigate to main dashboard overview',
    examples: ['Open Dashboard', 'Go Home', 'Dashboard'],
    patterns: [
      /\b(?:open|go to|show|view)?\s*(?:the\s*)?(?:dashboard|home|main page)\b/i
    ]
  },
  {
    id: 'nav_notes',
    name: 'Open Notes',
    category: 'Navigation',
    description: 'Navigate to Lecture Notes study database',
    examples: ['Open Notes', 'Show Notes', 'Lecture Notes'],
    patterns: [
      /\b(?:open|go to|show|view)?\s*(?:the\s*)?(?:notes|lecture notes|study materials)\b/i
    ]
  },
  {
    id: 'nav_attendance',
    name: 'Open Attendance',
    category: 'Navigation',
    description: 'Navigate to Attendance Tracker module',
    examples: ['Open Attendance', 'Attendance'],
    patterns: [
      /\b(?:open|go to|show|view)?\s*(?:the\s*)?(?:attendance|attendance tracker)\b/i
    ]
  },
  {
    id: 'nav_calendar',
    name: 'Open Calendar',
    category: 'Navigation',
    description: 'Navigate to Academic Calendar',
    examples: ['Open Calendar', 'Show Calendar'],
    patterns: [
      /\b(?:open|go to|show|view)?\s*(?:the\s*)?(?:calendar|academic calendar|events)\b/i
    ]
  },
  {
    id: 'nav_announcements',
    name: 'Open Notices',
    category: 'Navigation',
    description: 'Navigate to Notices and Announcements',
    examples: ['Open Notices', 'Open Announcements'],
    patterns: [
      /\b(?:open|go to|show|view)?\s*(?:the\s*)?(?:notices|announcements|notice board)\b/i
    ]
  },
  {
    id: 'nav_requests',
    name: 'Open Requests',
    category: 'Navigation',
    description: 'Navigate to Community Note Requests',
    examples: ['Open Requests', 'Note Requests'],
    patterns: [
      /\b(?:open|go to|show|view)?\s*(?:the\s*)?(?:requests|note requests|community requests)\b/i
    ]
  },
  {
    id: 'nav_rewards',
    name: 'Open Rewards',
    category: 'Navigation',
    description: 'Navigate to Rewards and Achievements',
    examples: ['Open Rewards', 'My Rewards'],
    patterns: [
      /\b(?:open|go to|show|view)?\s*(?:the\s*)?(?:rewards|achievements|coins)\b/i
    ]
  },
  {
    id: 'nav_settings',
    name: 'Open Profile / Settings',
    category: 'Navigation',
    description: 'Navigate to User Profile and Settings',
    examples: ['Open Profile', 'Open Settings'],
    patterns: [
      /\b(?:open|go to|show|view)?\s*(?:the\s*)?(?:profile|settings|my profile|account)\b/i
    ]
  },
  {
    id: 'nav_admin',
    name: 'Open Admin Panel',
    category: 'Navigation',
    description: 'Navigate to Admin Moderation Dashboard (Admin users)',
    examples: ['Open Admin', 'Admin Panel'],
    adminOnly: true,
    patterns: [
      /\b(?:open|go to|show|view)?\s*(?:the\s*)?(?:admin|admin panel|moderation)\b/i
    ]
  },

  // Notes Action Commands
  {
    id: 'notes_search',
    name: 'Search <subject> notes',
    category: 'Notes',
    description: 'Search notes by keyword or subject name',
    examples: ['Search Java notes', 'Search Mathematics', 'Find Python notes'],
    patterns: [
      /\b(?:search|find|filter|look for)\s+(?:for\s+)?(.+?)(?:\s+notes)?$/i
    ]
  },
  {
    id: 'notes_upload',
    name: 'Upload Notes',
    category: 'Notes',
    description: 'Open the Note Upload dialog',
    examples: ['Upload Notes', 'Upload Note'],
    patterns: [
      /\b(?:upload|add|submit)\s+(?:a\s+)?(?:new\s+)?(?:note|notes)\b/i
    ]
  },
  {
    id: 'notes_bookmarks',
    name: 'Open Bookmarks',
    category: 'Notes',
    description: 'View saved and bookmarked notes',
    examples: ['Open Bookmarks', 'Saved Notes'],
    patterns: [
      /\b(?:open|show|view)?\s*(?:the\s*)?(?:bookmarks|bookmarked|saved notes)\b/i
    ]
  },

  // General Commands
  {
    id: 'general_help',
    name: 'Help',
    category: 'General',
    description: 'Show list of available voice commands',
    examples: ['Help', 'Voice Help', 'Show Commands'],
    patterns: [
      /\b(?:help|voice help|show commands|what can I say)\b/i
    ]
  }
];

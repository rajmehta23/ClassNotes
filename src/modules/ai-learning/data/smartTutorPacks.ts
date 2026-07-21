/**
 * Smart Tutor offline content packs.
 *
 * Each entry is matched against a note's title (case-insensitive substring).
 * When matched, the Explain / Quiz / Practice / Visual buttons serve this
 * pre-built data directly — NO API call is made.
 *
 * To add more topics, simply add another object to the SMART_TUTOR_PACKS array.
 */

export interface SmartTutorSection {
  title: string;
  content: string;
}

export interface SmartTutorExplain {
  title: string;
  introduction: string;
  sections: SmartTutorSection[];
  summary: string[];
}

export interface SmartTutorQuizQuestion {
  question: string;
  options: string[];
  answer: number;       // 0-based index of correct option
  explanation: string;
}

export interface SmartTutorPractice {
  easy: string[];
  medium: string[];
  hard: string[];
}

export interface SmartTutorPack {
  topic: string;
  subject: string;
  /** Keywords to match against note title (case-insensitive) */
  matchKeywords: string[];
  explain: SmartTutorExplain;
  practice: SmartTutorPractice;
  quiz: SmartTutorQuizQuestion[];
  /** Optional path to a visual learning video in /public */
  visualVideoUrl?: string;
}

/**
 * Check if a note title matches any smart tutor pack.
 */
export function findSmartTutorPack(noteTitle: string): SmartTutorPack | null {
  const lower = noteTitle.toLowerCase();
  return SMART_TUTOR_PACKS.find((pack) =>
    pack.matchKeywords.some((kw) => lower.includes(kw.toLowerCase()))
  ) || null;
}

// ─── CONTENT PACKS ────────────────────────────────────────────

export const SMART_TUTOR_PACKS: SmartTutorPack[] = [
  {
    topic: 'Computer Hardware',
    subject: 'Computer Fundamentals',
    matchKeywords: ['computer hardware', 'hardware'],
    visualVideoUrl: '/smart-tutor-visual.mp4',

    explain: {
      title: 'Computer Hardware Explained',
      introduction:
        'Computer hardware refers to all the physical components of a computer that can be seen and touched. Every hardware component has a specific function and together they help the computer perform different tasks.',
      sections: [
        {
          title: 'CPU (Central Processing Unit)',
          content:
            'CPU is known as the brain of the computer. It processes instructions, performs calculations, controls all hardware devices and manages data flow.',
        },
        {
          title: 'Motherboard',
          content:
            'The motherboard is the main circuit board of a computer. It connects all hardware components such as CPU, RAM, storage devices and expansion cards so they can communicate.',
        },
        {
          title: 'RAM',
          content:
            'RAM (Random Access Memory) is temporary memory used while the computer is running. Data stored in RAM is lost when the computer is turned off.',
        },
        {
          title: 'ROM',
          content:
            'ROM (Read Only Memory) stores permanent instructions required to start the computer. Its data remains even after power is turned off.',
        },
        {
          title: 'Storage Devices',
          content:
            'Storage devices save data permanently. Common examples are Hard Disk, SSD, Pen Drive, CD and DVD.',
        },
        {
          title: 'Input Devices',
          content:
            'Input devices allow users to enter data into the computer. Examples include Keyboard, Mouse, Scanner, Microphone and Webcam.',
        },
        {
          title: 'Output Devices',
          content:
            'Output devices display or produce processed information. Examples include Monitor, Printer, Speaker and Projector.',
        },
        {
          title: 'SMPS',
          content:
            'SMPS (Switch Mode Power Supply) converts AC electricity into DC power and supplies the required voltage to computer components.',
        },
      ],
      summary: [
        'Hardware means physical parts of a computer.',
        'CPU processes instructions.',
        'Motherboard connects all components.',
        'RAM stores temporary data.',
        'ROM stores permanent startup instructions.',
        'Storage devices save data permanently.',
        'Input devices enter data.',
        'Output devices display results.',
        'SMPS supplies power.',
      ],
    },

    practice: {
      easy: [
        'Define computer hardware.',
        'What is CPU?',
        'Name any four input devices.',
        'Name any four output devices.',
        'What is RAM?',
        'What is ROM?',
        'What is the function of motherboard?',
        'What is SMPS?',
      ],
      medium: [
        'Differentiate between RAM and ROM.',
        'Differentiate between HDD and SSD.',
        'Explain the function of CPU.',
        'Explain the role of motherboard.',
        'Why is RAM called temporary memory?',
        'Explain storage devices with examples.',
      ],
      hard: [
        'Explain the working of CPU with its main components.',
        'Describe the complete boot process involving ROM, CPU and RAM.',
        'Compare all major hardware components in a table.',
        'Explain how data travels from keyboard to monitor.',
      ],
    },

    quiz: [
      {
        question: 'Which component is called the brain of the computer?',
        options: ['Motherboard', 'CPU', 'RAM', 'SSD'],
        answer: 1,
        explanation: 'CPU executes instructions and controls all operations.',
      },
      {
        question: 'Which memory is temporary?',
        options: ['ROM', 'SSD', 'RAM', 'DVD'],
        answer: 2,
        explanation: 'RAM stores temporary data while the computer is running.',
      },
      {
        question: 'Which device stores data permanently?',
        options: ['RAM', 'Cache', 'Registers', 'SSD'],
        answer: 3,
        explanation: 'SSD stores data permanently.',
      },
      {
        question: 'Which is an input device?',
        options: ['Printer', 'Speaker', 'Keyboard', 'Monitor'],
        answer: 2,
        explanation: 'Keyboard is used to enter data.',
      },
      {
        question: 'Which is an output device?',
        options: ['Mouse', 'Scanner', 'Monitor', 'Keyboard'],
        answer: 2,
        explanation: 'Monitor displays output.',
      },
      {
        question: 'What does SMPS do?',
        options: ['Stores data', 'Supplies power', 'Processes data', 'Displays output'],
        answer: 1,
        explanation: 'SMPS provides DC power to computer components.',
      },
      {
        question: 'The motherboard mainly connects:',
        options: ['Internet', 'All hardware components', 'Only RAM', 'Only CPU'],
        answer: 1,
        explanation: 'Motherboard connects every major hardware component.',
      },
      {
        question: 'ROM stands for:',
        options: ['Random Output Memory', 'Read Only Memory', 'Read Open Memory', 'Random Object Memory'],
        answer: 1,
        explanation: 'ROM means Read Only Memory.',
      },
      {
        question: 'Which storage device is generally faster?',
        options: ['DVD', 'CD', 'SSD', 'Hard Disk'],
        answer: 2,
        explanation: 'SSD is much faster than HDD.',
      },
      {
        question: 'Data stored in RAM is lost when:',
        options: ['Computer is restarted', 'Power is turned off', 'Internet disconnects', 'Printer is removed'],
        answer: 1,
        explanation: 'RAM is volatile memory.',
      },
    ],
  },
];

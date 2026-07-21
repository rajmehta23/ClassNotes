import { create } from 'zustand';
import type { Note } from '@/types/database';
import { extractNoteText } from '@/services/ai/extractNoteText';
import type { SummaryResponse, QuizPayload } from '@/services/ai/prompts';

export type AITab = 'chat' | 'summary' | 'explain' | 'ask' | 'quiz';
export type AIAction = 'summary' | 'ask' | 'quiz';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'text' | 'summary' | 'explain' | 'quiz';
  quizData?: QuizPayload;
  summaryData?: SummaryResponse;
}

interface AIState {
  activeNote: Note | null;
  activeNoteText: string;
  isPanelOpen: boolean;
  activeTab: AITab;
  selectedText: string;
  chatMessages: ChatMessage[];
  pendingAction: AIAction | null;
  streamingText: string;

  setActiveNote: (note: Note | null, preExtractedText?: string) => Promise<void>;
  setIsPanelOpen: (isOpen: boolean) => void;
  togglePanel: () => void;
  setActiveTab: (tab: AITab) => void;
  setSelectedText: (text: string) => void;
  openWithAction: (tab: AITab, selectedText?: string) => void;
  triggerNoteAction: (note: Note, action: AIAction) => Promise<void>;
  clearPendingAction: () => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
  setStreamingText: (text: string) => void;
  removeLastAssistantMessage: () => void;
}

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Hello! 👋 I'm your **AI Helper** for ClassNotes.\nHow can I help you today? You can ask study questions, analyze lecture notes, or use the quick action buttons below!`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  type: 'text'
};

export const useAIStore = create<AIState>((set) => ({
  activeNote: null,
  activeNoteText: '',
  isPanelOpen: false,
  activeTab: 'chat',
  selectedText: '',
  chatMessages: [INITIAL_WELCOME_MESSAGE],
  pendingAction: null,
  streamingText: '',

  setActiveNote: async (note: Note | null, preExtractedText?: string) => {
    if (!note) {
      set({ activeNote: null, activeNoteText: '' });
      return;
    }

    if (preExtractedText !== undefined) {
      set({ activeNote: note, activeNoteText: preExtractedText });
    } else {
      set({ activeNote: note });
      const text = await extractNoteText(note);
      set({ activeNoteText: text });
    }
  },

  setIsPanelOpen: (isOpen: boolean) => set({ isPanelOpen: isOpen }),
  
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  setActiveTab: (tab: AITab) => set({ activeTab: tab }),

  setSelectedText: (text: string) => set({ selectedText: text }),

  openWithAction: (tab: AITab, selectedText?: string) => {
    const update: Partial<AIState> = {
      isPanelOpen: true,
      activeTab: tab
    };
    if (selectedText !== undefined) {
      update.selectedText = selectedText;
    }
    set(update);
  },

  triggerNoteAction: async (note: Note, action: AIAction) => {
    set({ isPanelOpen: true, pendingAction: action, activeNote: note });
    const text = await extractNoteText(note);
    set({ activeNoteText: text });
  },

  clearPendingAction: () => set({ pendingAction: null }),

  addChatMessage: (msg) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    set((state) => ({ chatMessages: [...state.chatMessages, newMsg] }));
  },

  clearChat: () => set({ chatMessages: [INITIAL_WELCOME_MESSAGE], streamingText: '' }),

  setStreamingText: (text: string) => set({ streamingText: text }),

  removeLastAssistantMessage: () =>
    set((state) => {
      const msgs = [...state.chatMessages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs.splice(i, 1);
          break;
        }
      }
      return { chatMessages: msgs };
    }),
}));

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Send, Loader2, Bot } from 'lucide-react';
import { aiTutorService } from '../services/aiTutorService';
import type { Note } from '@/types/database';

interface AskAIModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export const AskAIModal: React.FC<AskAIModalProps> = ({
  note,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: `Hello! I am your AI Tutor. Ask me any question about "${note?.title || 'this note'}" and I will explain it step-by-step.`,
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !note) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const userMsg = inputQuery;
    setInputQuery('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);

    setIsLoading(true);
    try {
      const response = await aiTutorService.askAIQuestion(note.title, userMsg);
      setMessages((prev) => [...prev, { sender: 'ai', text: response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Sorry, I ran into an issue answering your question. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-surface border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 h-[80vh] max-h-[750px] flex flex-col justify-between relative text-primary"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <MessageSquare size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold font-mono uppercase tracking-tight text-primary">
                  Ask AI Tutor
                </h2>
                <p className="text-[11px] text-primary/50 font-sans truncate max-w-xs">
                  {note.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 p-3 bg-background border border-border/50 rounded-xl">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 text-xs ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={13} />
                  </div>
                )}
                <div
                  className={`p-3 rounded-xl max-w-[85%] font-sans whitespace-pre-wrap leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-accent text-white rounded-br-none'
                      : 'bg-surface border border-border/60 text-primary rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs font-mono text-accent p-2">
                <Loader2 size={14} className="animate-spin" />
                <span>AI Tutor thinking...</span>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="flex items-center gap-2 shrink-0 pt-1">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask a question about this note..."
              className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-accent text-primary placeholder:text-primary/40"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="p-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

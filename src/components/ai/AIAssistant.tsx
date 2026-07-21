import React from 'react';
import { useAIStore, type AITab } from '@/features/ai/useAIStore';
import SummaryCard from './SummaryCard';
import ExplainCard from './ExplainCard';
import AskCard from './AskCard';
import QuizCard from './QuizCard';
import { Sparkles, X, FileText, MessageSquareText, HelpCircle, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AIAssistant: React.FC = () => {
  const activeNote = useAIStore((s) => s.activeNote);
  const isPanelOpen = useAIStore((s) => s.isPanelOpen);
  const togglePanel = useAIStore((s) => s.togglePanel);
  const setIsPanelOpen = useAIStore((s) => s.setIsPanelOpen);
  const activeTab = useAIStore((s) => s.activeTab);
  const setActiveTab = useAIStore((s) => s.setActiveTab);

  const tabs: { id: AITab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'summary', label: 'Summarize', icon: FileText },
    { id: 'explain', label: 'Explain', icon: MessageSquareText },
    { id: 'ask', label: 'Ask', icon: HelpCircle },
    { id: 'quiz', label: 'Quiz', icon: Sparkles }
  ];

  return (
    <>
      {/* 1. SINGLE Floating AI Action Button (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40 select-none">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={togglePanel}
          className="relative inline-flex items-center gap-2 px-4 py-3 bg-linear-to-r from-accent via-blue-500 to-accent bg-[length:200%_auto] text-white font-bold text-xs rounded-full shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/40 border border-white/20 transition-all duration-300 cursor-pointer"
          title="Open AI Study Assistant"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="hidden sm:inline font-sans">AI Assistant</span>

          {/* Active Note Indicator Dot */}
          {activeNote && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-success border-2 border-background rounded-full" />
          )}
        </motion.button>
      </div>

      {/* 2. Slide-over Side Panel Drawer */}
      <AnimatePresence>
        {isPanelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPanelOpen(false)}
              className="fixed inset-0 bg-primary/25 backdrop-blur-xs z-50"
            />

            {/* Panel Container */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-surface border-l border-border/80 z-50 shadow-2xl flex flex-col overflow-hidden font-sans select-none"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-border/60 bg-surface flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-primary leading-tight">AI Study Assistant</h3>
                    <p className="text-[10px] text-primary/45 font-mono">Powered by Google Gemini</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="p-1.5 hover:bg-primary/5 text-primary/60 hover:text-primary rounded-lg transition-colors cursor-pointer"
                  title="Close AI Assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Tabs Bar (4 Features) */}
              <div className="px-4 pt-3 pb-2 border-b border-border/40 bg-background/50 grid grid-cols-4 gap-1 shrink-0">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-accent text-white shadow-xs'
                          : 'text-primary/60 hover:bg-primary/5 hover:text-primary'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Note Bar Banner */}
              {activeNote ? (
                <div className="px-4 py-2 bg-accent/5 border-b border-accent/15 flex items-center gap-2 text-[10px] shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="text-primary/60 font-mono">Current:</span>
                  <span className="font-bold text-primary truncate max-w-[260px]">{activeNote.title}</span>
                </div>
              ) : (
                <div className="px-4 py-2 bg-warning/5 border-b border-warning/15 flex items-center gap-2 text-[10px] text-warning-fg shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-warning shrink-0" />
                  <span>No note active. Open any note to analyze it.</span>
                </div>
              )}

              {/* Tab Content View Area */}
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                {activeTab === 'summary' && <SummaryCard />}
                {activeTab === 'explain' && <ExplainCard />}
                {activeTab === 'ask' && <AskCard />}
                {activeTab === 'quiz' && <QuizCard />}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;

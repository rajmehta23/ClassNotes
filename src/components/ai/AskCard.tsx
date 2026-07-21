import React, { useState } from 'react';
import { useAskNote } from '@/hooks/useAI';
import { useAIStore } from '@/features/ai/useAIStore';
import { HelpCircle, Loader2, AlertCircle, Send, BookOpen, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export const AskCard: React.FC = () => {
  const activeNote = useAIStore((s) => s.activeNote);
  const activeNoteText = useAIStore((s) => s.activeNoteText);
  const [question, setQuestion] = useState('');
  const { mutate: ask, data, isPending, isError, error } = useAskNote();

  const handleAsk = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question || question.trim().length === 0) return;
    ask(question.trim());
  };

  if (!activeNote) {
    return (
      <div className="p-6 text-center space-y-3 bg-surface/50 border border-border/60 rounded-xl">
        <BookOpen className="w-8 h-8 text-primary/30 mx-auto" />
        <p className="text-xs font-semibold text-primary/70">No note selected</p>
        <p className="text-[11px] text-primary/45">
          Select or open a note to ask specific questions about its content.
        </p>
      </div>
    );
  }

  const isNotFound = data === "I couldn't find that information in this note.";

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Header Info */}
      <div className="p-3 bg-primary/5 border border-border/60 rounded-lg">
        <span className="text-[9px] font-mono uppercase text-accent font-bold tracking-wider">Note Context</span>
        <h4 className="font-bold text-primary truncate text-xs">{activeNote.title}</h4>
      </div>

      {/* Input Form */}
      <form onSubmit={handleAsk} className="space-y-2">
        <label className="text-[10px] font-mono uppercase font-bold text-primary/60 tracking-wider block">
          Ask a Question About This Note
        </label>
        <div className="relative">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What is the definition of normalization in this note?"
            className="w-full pl-3 pr-10 py-2.5 border border-border/80 bg-background/50 rounded-xl focus:bg-surface focus:border-accent text-xs leading-relaxed focus:ring-2 focus:ring-accent/10 transition-all text-primary"
          />
          <button
            type="submit"
            disabled={isPending || !question.trim() || !activeNoteText}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-lg transition-all cursor-pointer"
            title="Ask Question"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-primary/45">
          AI will answer using strictly the contents of <b>"{activeNote.title}"</b>.
        </p>
      </form>

      {/* Loading State */}
      {isPending && (
        <div className="p-5 bg-surface border border-border/60 rounded-xl space-y-2 animate-pulse">
          <div className="flex items-center gap-2 text-accent font-semibold text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Searching note content for answers...</span>
          </div>
          <div className="h-3 bg-primary/10 rounded w-full" />
          <div className="h-3 bg-primary/10 rounded w-3/4" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl space-y-2">
          <div className="flex items-start gap-2 text-danger">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">Query Failed</p>
              <p className="text-[11px] opacity-80">{error?.message || 'Failed to process question.'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Answer Output */}
      {data && !isPending && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl space-y-2 shadow-xs border ${
            isNotFound 
              ? 'bg-warning/10 border-warning/30 text-warning-fg' 
              : 'bg-surface border-border/80'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold tracking-wider">
            {isNotFound ? (
              <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
            ) : (
              <HelpCircle className="w-3.5 h-3.5 text-accent shrink-0" />
            )}
            <span>{isNotFound ? 'Information Not Found' : 'Answer from Note'}</span>
          </div>

          <div className="text-primary/90 leading-relaxed text-xs whitespace-pre-wrap">
            {data}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AskCard;

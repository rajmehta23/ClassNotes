import React from 'react';
import { useSummarizeNote } from '@/hooks/useAI';
import { useAIStore } from '@/features/ai/useAIStore';
import { Sparkles, Loader2, AlertCircle, Copy, Check, RefreshCw, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export const SummaryCard: React.FC = () => {
  const activeNote = useAIStore((s) => s.activeNote);
  const activeNoteText = useAIStore((s) => s.activeNoteText);
  const { mutate: summarize, data, isPending, isError, error, reset } = useSummarizeNote();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!data) return;
    const textToCopy = `SUMMARY:\n${data.summary}\n\nKEY POINTS:\n${data.keyPoints.map(p => `• ${p}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeNote) {
    return (
      <div className="p-6 text-center space-y-3 bg-surface/50 border border-border/60 rounded-xl">
        <BookOpen className="w-8 h-8 text-primary/30 mx-auto" />
        <p className="text-xs font-semibold text-primary/70">No note selected</p>
        <p className="text-[11px] text-primary/45">
          Open or preview any note in ClassNotes to summarize it with AI.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Header Info */}
      <div className="p-3 bg-primary/5 border border-border/60 rounded-lg flex justify-between items-center">
        <div className="min-w-0 pr-2">
          <span className="text-[9px] font-mono uppercase text-accent font-bold tracking-wider">Active Note</span>
          <h4 className="font-bold text-primary truncate text-xs">{activeNote.title}</h4>
        </div>
        <button
          onClick={() => summarize()}
          disabled={isPending || !activeNoteText}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-semibold rounded-md shadow-xs transition-all cursor-pointer text-[11px]"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {data ? 'Regenerate' : 'Summarize'}
        </button>
      </div>

      {/* Loading State */}
      {isPending && (
        <div className="p-6 bg-surface border border-border/60 rounded-xl space-y-3 animate-pulse">
          <div className="flex items-center gap-2 text-accent font-semibold text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing note content...</span>
          </div>
          <div className="h-3 bg-primary/10 rounded w-3/4" />
          <div className="h-3 bg-primary/10 rounded w-full" />
          <div className="h-3 bg-primary/10 rounded w-5/6" />
          <div className="pt-2 space-y-2">
            <div className="h-3 bg-primary/10 rounded w-1/2" />
            <div className="h-3 bg-primary/10 rounded w-2/3" />
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl space-y-3">
          <div className="flex items-start gap-2 text-danger">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-xs">Summarization Failed</p>
              <p className="text-[11px] opacity-80">{error?.message || 'Failed to generate summary.'}</p>
            </div>
          </div>
          <button
            onClick={() => { reset(); summarize(); }}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-danger hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Retry once
          </button>
        </div>
      )}

      {/* Output Content */}
      {data && !isPending && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-surface border border-border/80 rounded-xl space-y-4 shadow-xs"
        >
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <span className="text-[10px] font-mono uppercase font-bold text-accent tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Short Summary
            </span>
            <button
              onClick={handleCopy}
              className="p-1 text-primary/60 hover:text-primary transition-colors cursor-pointer"
              title="Copy Summary & Key Points"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <p className="text-primary/90 leading-relaxed font-normal text-xs">
            {data.summary}
          </p>

          {data.keyPoints && data.keyPoints.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <span className="text-[10px] font-mono uppercase font-bold text-primary/60 tracking-wider block">
                Key Takeaways
              </span>
              <ul className="space-y-1.5 pl-1">
                {data.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-primary/80 leading-snug text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* Initial Empty Trigger Prompt */}
      {!data && !isPending && !isError && (
        <div className="p-6 text-center border border-dashed border-border rounded-xl space-y-3 bg-background/40">
          <Sparkles className="w-6 h-6 text-accent mx-auto opacity-70" />
          <p className="text-xs text-primary/70 font-medium">Ready to summarize this note.</p>
          <button
            onClick={() => summarize()}
            className="px-4 py-2 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg shadow-xs transition-all cursor-pointer text-xs"
          >
            Generate AI Summary
          </button>
        </div>
      )}
    </div>
  );
};

export default SummaryCard;

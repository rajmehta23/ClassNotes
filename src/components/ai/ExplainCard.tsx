import React, { useState } from 'react';
import { useExplainText } from '@/hooks/useAI';
import { useAIStore } from '@/features/ai/useAIStore';
import { MessageSquareText, Loader2, AlertCircle, Copy, Check, RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const ExplainCard: React.FC = () => {
  const selectedText = useAIStore((s) => s.selectedText);
  const setSelectedText = useAIStore((s) => s.setSelectedText);
  const [inputText, setInputText] = useState(selectedText);
  const { mutate: explain, data, isPending, isError, error, reset } = useExplainText();
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (selectedText) {
      setInputText(selectedText);
    }
  }, [selectedText]);

  const handleExplain = () => {
    if (!inputText || inputText.trim().length === 0) return;
    explain(inputText.trim());
  };

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Input Area */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase font-bold text-primary/60 tracking-wider block">
          Paragraph or Concept to Explain
        </label>
        <textarea
          rows={3}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setSelectedText(e.target.value);
          }}
          placeholder="Paste or select any paragraph/text from your notes to explain in simple language..."
          className="w-full p-3 border border-border/80 bg-background/50 rounded-xl focus:bg-surface focus:border-accent text-xs leading-relaxed focus:ring-2 focus:ring-accent/10 transition-all text-primary"
        />
        <div className="flex justify-between items-center text-[10px] text-primary/45">
          <span>{inputText.length} characters</span>
          <button
            onClick={handleExplain}
            disabled={isPending || !inputText.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-semibold rounded-md shadow-xs transition-all cursor-pointer text-[11px]"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MessageSquareText className="w-3.5 h-3.5" />
            )}
            Explain Simply
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isPending && (
        <div className="p-6 bg-surface border border-border/60 rounded-xl space-y-3 animate-pulse">
          <div className="flex items-center gap-2 text-accent font-semibold text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Simplifying concept...</span>
          </div>
          <div className="h-3 bg-primary/10 rounded w-full" />
          <div className="h-3 bg-primary/10 rounded w-4/5" />
          <div className="h-3 bg-primary/10 rounded w-5/6" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl space-y-3">
          <div className="flex items-start gap-2 text-danger">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">Explanation Failed</p>
              <p className="text-[11px] opacity-80">{error?.message || 'Failed to explain text.'}</p>
            </div>
          </div>
          <button
            onClick={() => { reset(); handleExplain(); }}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-danger hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Retry once
          </button>
        </div>
      )}

      {/* Result Card */}
      {data && !isPending && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-surface border border-border/80 rounded-xl space-y-3 shadow-xs"
        >
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <span className="text-[10px] font-mono uppercase font-bold text-accent tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Simplified Explanation
            </span>
            <button
              onClick={handleCopy}
              className="p-1 text-primary/60 hover:text-primary transition-colors cursor-pointer"
              title="Copy Explanation"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="text-primary/90 leading-relaxed text-xs whitespace-pre-wrap">
            {data}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ExplainCard;

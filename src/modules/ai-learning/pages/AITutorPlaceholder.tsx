import React from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';

export const AITutorPlaceholder: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
      <div className="p-4 bg-accent/10 rounded-full text-accent animate-pulse">
        <BrainCircuit size={48} />
      </div>
      <h1 className="text-3xl font-black tracking-tight uppercase font-mono">
        AI Tutor
      </h1>
      <p className="text-sm text-primary/60 max-w-md font-sans">
        This is a placeholder for the Adaptive AI Tutor page. The AI features are currently disabled via feature flags.
      </p>
      <div className="flex items-center gap-2 text-xs font-mono bg-surface border border-border px-3 py-1.5 rounded-md text-primary/80">
        <Sparkles size={14} className="text-yellow-500" />
        <span>Status: ARCHITECTURE ONLY</span>
      </div>
    </div>
  );
};

export default AITutorPlaceholder;

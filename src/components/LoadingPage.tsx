import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingPage: React.FC = () => {
  return (
    <div className="h-[55vh] w-full flex flex-col justify-center items-center p-6 select-none">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          <Loader2 size={30} className="text-accent animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1 mt-1 text-center">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
            ClassNotes
          </span>
          <span className="text-[10.5px] text-primary/45 font-mono uppercase tracking-wider animate-pulse-slow">
            Syncing database...
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;

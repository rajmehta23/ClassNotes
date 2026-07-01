import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Home } from 'lucide-react';

import { useDocumentMetadata } from '@/hooks/useDocumentMetadata';

export const NotFound: React.FC = () => {
  useDocumentMetadata('404 Page Not Found', 'The requested page was not found in the ClassNotes platform application routing paths.');
  return (
    <div className="min-h-[70vh] bg-background flex flex-col justify-center items-center p-6 text-center animate-fade-in">
      <div className="max-w-md w-full bg-surface border border-border p-8 rounded-lg shadow-sm">
        <div className="w-12 h-12 bg-primary/5 text-primary border border-border rounded-full flex items-center justify-center mx-auto mb-6">
          <HelpCircle size={24} />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tighter text-primary mb-2 font-mono">
          404
        </h1>
        <h2 className="text-xl font-bold tracking-tight text-primary mb-2">
          Page Not Found
        </h2>
        <p className="text-sm text-primary/60 mb-6 font-sans">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-surface font-medium py-2.5 px-4 rounded-md transition-all active:scale-[0.98] select-none"
        >
          <Home size={16} />
          Return Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

import React from 'react';
import type { Note } from '@/types/database';
import { X, ExternalLink, AlertCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentViewerProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  note,
  isOpen,
  onClose
}) => {
  const [safeFileUrl, setSafeFileUrl] = React.useState<string>('');
  const [iframeError, setIframeError] = React.useState(false);

  React.useEffect(() => {
    if (!note) return;
    let isCurrent = true;
    let createdUrl = '';

    const loadUrl = async () => {
      if (note.fileUrl.startsWith('data:')) {
        try {
          const response = await fetch(note.fileUrl);
          const blob = await response.blob();
          if (isCurrent) {
            createdUrl = window.URL.createObjectURL(blob);
            setSafeFileUrl(createdUrl);
          }
        } catch (e) {
          console.error('Failed to convert data URL to blob', e);
          if (isCurrent) {
            setSafeFileUrl(note.fileUrl);
          }
        }
      } else {
        if (isCurrent) {
          setSafeFileUrl(note.fileUrl);
        }
      }
    };

    loadUrl();

    // Reset error state whenever the note changes
    setIframeError(false);

    return () => {
      isCurrent = false;
      if (createdUrl) {
        window.URL.revokeObjectURL(createdUrl);
      }
    };
  }, [note]);

  if (!note) return null;

  // Determine standard rendering layout based on file extension/type
  const renderDocument = () => {
    if (note.fileType === 'pdf') {
      // For remote URLs (Cloudinary, http/https) use Google Docs Viewer to bypass CORS
      const isRemote = safeFileUrl.startsWith('http://') || safeFileUrl.startsWith('https://');
      const viewerSrc = isRemote
        ? `https://docs.google.com/viewer?url=${encodeURIComponent(safeFileUrl)}&embedded=true`
        : `${safeFileUrl}#toolbar=0&navpanes=0`;

      if (iframeError) {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center text-center gap-4 p-8">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-sm">
              <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-primary mb-1">Failed to load PDF document.</p>
              <p className="text-xs text-primary/50 mb-4">The file may still be processing. Try opening it directly.</p>
              <a
                href={safeFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent/80 transition-colors"
              >
                <ExternalLink size={13} />
                Open PDF in new tab
              </a>
            </div>
          </div>
        );
      }

      return (
        <iframe
          key={viewerSrc}
          src={viewerSrc}
          title={note.title}
          className="w-full h-full border-none rounded bg-surface"
          onError={() => setIframeError(true)}
        />
      );
    }

    if (note.fileType === 'image') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-primary/5 p-4 overflow-auto rounded border border-border">
          <img
            src={safeFileUrl}
            alt={note.title}
            className="max-w-full max-h-full object-contain rounded shadow-md"
          />
        </div>
      );
    }

    if (note.fileType === 'text') {
      // If the text is stored as dataURI (e.g. data:text/plain;base64,...) we decode it
      let textContent = 'Loading text contents...';
      if (note.fileUrl.startsWith('data:')) {
        try {
          const base64Data = note.fileUrl.split(',')[1];
          textContent = atob(base64Data);
        } catch (err) {
          console.error('Base64 decode error:', err);
          textContent = 'Failed to decode text file data.';
        }
      } else {
        textContent = 'Retrieving remote note contents. Click external link to view.';
      }

      return (
        <div className="w-full h-full bg-background border border-border p-6 rounded overflow-auto font-mono text-sm leading-relaxed text-primary/80 select-text whitespace-pre-wrap">
          {textContent}
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 text-primary/50 gap-3 border border-border rounded">
        <AlertCircle size={24} className="text-primary/30" />
        <p className="text-xs font-mono">Unsupported attachment format.</p>
      </div>
    );
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.98, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 350 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 select-none">
          {/* Dark Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            className="fixed inset-0 bg-primary/45 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="bg-surface border border-border w-full max-w-5xl h-[85vh] rounded-lg shadow-luxury flex flex-col overflow-hidden relative z-10"
          >
            {/* Header bar */}
            <div className="border-b border-border px-5 py-4 flex items-center justify-between bg-surface shrink-0">
              <div className="space-y-1 pr-6 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono uppercase tracking-wider bg-primary/5 border border-border px-1.5 py-0.5 rounded leading-none text-primary/60">
                    {note.category}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-primary/40 leading-none">
                    {note.subject}
                  </span>
                </div>
                <h2 className="font-bold text-base leading-tight truncate text-primary">
                  {note.fileType === 'text' ? (
                    <span className="inline-flex items-center gap-1.5">
                      <FileText size={14} className="text-primary/65" />
                      {note.title}
                    </span>
                  ) : note.title}
                </h2>
              </div>

              {/* Header actions */}
              <div className="flex items-center gap-2">
                <a
                  href={safeFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 border border-border hover:bg-background text-primary/70 hover:text-primary rounded-md transition-colors"
                  title="Open file in new tab"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={onClose}
                  className="p-1.5 border border-border hover:bg-background text-primary/75 hover:text-primary rounded-md transition-colors cursor-pointer"
                  title="Close document viewer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Document display section */}
            <div className="flex-1 p-5 bg-background/50 overflow-hidden relative">
              {renderDocument()}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DocumentViewer;

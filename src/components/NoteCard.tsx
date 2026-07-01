import React, { useState, useEffect } from 'react';
import type { Note } from '@/types/database';
import { 
  BookOpen, Star, Download, Bookmark, BookmarkCheck, Eye, 
  User, Award, Loader2, Flag, Play, ExternalLink, Globe
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatFileSize, formatRelativeTime } from '@/utils/format';

const getResourceDetails = (urlStr: string) => {
  if (!urlStr) return null;
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      return {
        label: 'Watch Video',
        icon: <Play size={11} className="text-red-500 fill-red-500/10 shrink-0" />,
        color: 'text-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
      };
    }
    if (host.includes('wikipedia.org')) {
      return {
        label: 'Read Wikipedia',
        icon: <BookOpen size={11} className="text-blue-500 shrink-0" />,
        color: 'text-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
      };
    }
    if (
      host.includes('geeksforgeeks.org') ||
      host.includes('w3schools.com') ||
      host.includes('developer.mozilla.org')
    ) {
      return {
        label: 'Open Learning Resource',
        icon: <BookOpen size={11} className="text-blue-500 shrink-0" />,
        color: 'text-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
      };
    }
    return {
      label: 'Read More',
      icon: <Globe size={11} className="text-blue-500 shrink-0" />,
      color: 'text-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
    };
  } catch {
    return null;
  }
};

interface NoteCardProps {
  note: Note;
  isBookmarked: boolean;
  onToggleBookmark: () => Promise<void>;
  onView: () => void;
  onDownload: () => Promise<void>;
  onRate: (rating: number) => Promise<void>;
  onReport: () => Promise<void>;
  currentUserId: string;
}

// Simple animated counter for numbers
export const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 400; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress * (2 - progress); // easeOutQuad
      const current = Math.round(start + (end - start) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>{displayValue}</span>;
};

export const NoteCard: React.FC<NoteCardProps> = React.memo(({
  note,
  isBookmarked,
  onToggleBookmark,
  onView,
  onDownload,
  onRate,
  onReport,
  currentUserId
}) => {
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  // Spotlight Coordinates Tracking
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleToggleBookmark = async () => {
    setIsBookmarking(true);
    try {
      await onToggleBookmark();
    } catch (err) {
      console.error(err);
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRate = async (rating: number) => {
    setIsRating(true);
    try {
      await onRate(rating);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRating(false);
    }
  };

  const handleReport = async () => {
    setIsReporting(true);
    try {
      await onReport();
    } catch (err) {
      console.error(err);
    } finally {
      setIsReporting(false);
      setShowReportConfirm(false);
    }
  };

  const isAuthor = note.authorId === currentUserId;
  const resourceDetails = note.learningResourceUrl ? getResourceDetails(note.learningResourceUrl) : null;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onMouseMove={handleMouseMove}
      className="premium-card p-5 flex flex-col justify-between h-full bg-surface/85 backdrop-blur-md border border-border/40 shadow-sm hover:shadow-premium hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden group cursor-default"
    >
      {/* spotlight overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0"
        style={{
          background: `radial-gradient(350px circle at ${coords.x}px ${coords.y}px, rgba(59, 130, 246, 0.08), transparent 80%)`
        }}
      />

      <div className="space-y-4 relative z-10">
        {/* Notebook Stack / 3D Preview Block */}
        <div className="w-full h-32 bg-linear-to-tr from-accent/[0.03] to-blue-500/[0.03] rounded-lg border border-border/40 relative overflow-hidden flex items-center justify-center shadow-inner select-none">
          <BookOpen className="text-accent/15 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" size={36} />
          
          {/* Subtle grids overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(26,26,26,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(26,26,26,0.02)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />

          {/* Floating Course/Sem Tags */}
          <div className="absolute bottom-2 left-2 flex gap-1 items-center">
            <span className="text-[8px] font-mono font-bold uppercase bg-accent text-white px-1.5 py-0.5 rounded shadow-sm">
              {note.course || 'All'}
            </span>
            <span className="text-[8px] font-mono font-bold uppercase bg-accent text-white px-1.5 py-0.5 rounded shadow-sm">
              Sem {note.semester || 'All'}
            </span>
          </div>

          {/* Verification Badge */}
          {note.status === 'approved' && (
            <div className="absolute top-2 right-2 bg-success/10 border border-success/20 text-success text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
              <span className="w-1 h-1 rounded-full bg-success animate-ping" />
              Verified
            </div>
          )}
        </div>

        {/* Category Badge & Bookmark Icon */}
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-primary/5 border border-border/50 px-2 py-0.5 rounded text-primary/65 select-none">
            {note.category}
          </span>
          
          <button
            onClick={handleToggleBookmark}
            disabled={isBookmarking}
            className={`p-1.5 rounded-full border transition-all ${
              isBookmarked 
                ? 'bg-accent/10 border-accent/25 text-accent hover:bg-accent/15' 
                : 'border-border/60 text-primary/45 hover:text-primary hover:bg-primary/5'
            } disabled:opacity-50 cursor-pointer active-scale`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark note'}
          >
            {isBookmarking ? (
              <Loader2 size={12} className="animate-spin" />
            ) : isBookmarked ? (
              <BookmarkCheck size={12} className="fill-accent text-accent" />
            ) : (
              <Bookmark size={12} />
            )}
          </button>
        </div>

        {/* Note Details */}
        <div className="space-y-1.5">
          <h3 className="font-bold text-sm leading-snug tracking-tight text-primary break-words hover:text-accent transition-colors font-heading">
            {note.title}
          </h3>

          {/* Note Rich Metadata */}
          <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-primary/60 select-none">
            <span className="uppercase font-bold text-accent">{note.fileType || 'pdf'}</span>
            <span>•</span>
            <span>{formatFileSize(note.fileSize)}</span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <AnimatedNumber value={note.downloadsCount} /> {note.downloadsCount === 1 ? 'download' : 'downloads'}
            </span>
            <span>•</span>
            <span>{formatRelativeTime(note.createdAt)}</span>
          </div>

          <p className="text-[11px] text-primary/60 line-clamp-2 leading-relaxed mt-1">
            {note.description}
          </p>
          {resourceDetails && (
            <div className="pt-2 flex items-center select-none">
              <motion.a
                href={note.learningResourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover="hover"
                className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold cursor-pointer group/link ${resourceDetails.color}`}
              >
                {resourceDetails.icon}
                <span className="relative">
                  {resourceDetails.label}
                  <span className="absolute bottom-0 left-0 w-full h-[1px] bg-blue-500 scale-x-0 origin-left transition-transform duration-300 ease-out group-hover/link:scale-x-100" />
                </span>
                <motion.span
                  variants={{
                    hover: { x: 1.5, y: -1.5 }
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  className="inline-block shrink-0"
                >
                  <ExternalLink size={10} className="text-blue-500/70 group-hover/link:text-blue-500 transition-colors" />
                </motion.span>
              </motion.a>
            </div>
          )}
        </div>

        {/* Subject & Author Info */}
        <div className="flex flex-col gap-1 border-t border-border/45 pt-3.5 text-[9px] font-mono text-primary/50 uppercase font-semibold">
          <div className="flex items-center gap-1.5">
            <BookOpen size={9} className="text-accent" />
            <span className="truncate">{note.subject}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User size={9} className="text-primary/45" />
            <span className="truncate">Uploaded by {isAuthor ? 'You' : note.authorName}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-5 border-t border-border/45 pt-3.5 relative z-10">
        {/* Rating and Downloads Summary */}
        <div className="flex justify-between items-center text-xs">
          {/* Star Rating Interaction */}
          <div className="flex items-center gap-1">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  disabled={isRating}
                  className="p-0.5 text-primary/20 hover:text-warning disabled:opacity-75 cursor-pointer transition-colors"
                  title={`Rate ${star} star`}
                >
                  <Star 
                    size={13} 
                    className={`${
                      (hoveredStar !== null ? star <= hoveredStar : star <= Math.round(note.ratingsAverage))
                        ? 'text-warning fill-warning' 
                        : 'text-primary/10'
                    }`} 
                  />
                </button>
              ))}
            </div>
            <span className="font-mono text-[9px] text-primary/45 ml-1 font-bold">
              ({note.ratingsCount > 0 ? note.ratingsAverage.toFixed(1) : 'N/A'})
            </span>
          </div>

          {/* Downloads Counter */}
          <div className="flex items-center gap-1 text-[9px] font-mono text-primary/45 uppercase font-bold">
            <Download size={10} />
            <span>
              <AnimatedNumber value={note.downloadsCount} /> claims
            </span>
          </div>
        </div>

        {/* Action triggers */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onView}
            className="w-full flex items-center justify-center gap-1.5 border border-border/60 bg-surface hover:bg-background text-primary py-2 px-3 rounded-md text-[10px] font-mono uppercase tracking-wider font-bold transition-all active-scale cursor-pointer"
          >
            <Eye size={12} />
            View
          </button>
          
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-1.5 bg-accent text-white hover:bg-accent/90 py-2 px-3 rounded-md text-[10px] font-mono uppercase tracking-wider font-bold transition-all active-scale disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isDownloading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Award size={12} className="text-white" />
            )}
            <span>Download</span>
          </button>

          {/* Report button */}
          <button
            onClick={() => setShowReportConfirm(true)}
            disabled={isReporting || isAuthor}
            className="w-full flex items-center justify-center gap-1.5 border border-danger/30 bg-danger/5 hover:bg-danger/10 text-danger/70 hover:text-danger py-2 px-3 rounded-md text-[10px] font-mono uppercase tracking-wider font-bold transition-all active-scale disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={isAuthor ? 'You cannot report your own note' : 'Report this note'}
          >
            {isReporting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Flag size={12} />
            )}
            Report
          </button>
        </div>

        {/* Report Confirmation Dialog */}
        {showReportConfirm && (
          <div className="mt-2 p-3 bg-danger/5 border border-danger/20 rounded-lg space-y-2">
            <p className="text-[10px] text-danger/80 font-semibold">
              Are you sure you want to report this note for inappropriate or incorrect content?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleReport}
                disabled={isReporting}
                className="flex-1 flex items-center justify-center gap-1 bg-danger text-white py-1.5 px-2 rounded text-[9px] font-mono uppercase font-bold hover:bg-danger/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isReporting ? <Loader2 size={10} className="animate-spin" /> : <Flag size={10} />}
                Confirm Report
              </button>
              <button
                onClick={() => setShowReportConfirm(false)}
                className="flex-1 py-1.5 px-2 border border-border rounded text-[9px] font-mono uppercase font-bold text-primary/60 hover:bg-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default NoteCard;

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useNotesStore } from '@/features/notes/useNotesStore';
import { bookmarksService } from '@/services/bookmarks';
import { rewardsService } from '@/services/rewards';
import { notesService } from '@/services/notes';
import NoteCard from '@/components/NoteCard';
import DocumentViewer from '@/components/DocumentViewer';
import UploadModal from '@/components/UploadModal';
import { useNotificationStore } from '@/features/notifications/useNotificationStore';
import type { Note } from '@/types/database';
import { useDocumentMetadata } from '@/hooks/useDocumentMetadata';
import { Search, Upload, SlidersHorizontal, AlertCircle, FileX } from 'lucide-react';
import { motion } from 'framer-motion';

export const Notes: React.FC = () => {
  useDocumentMetadata('Lecture Notes', 'Browse, search, and download verified study notes and course resources.');
  const { user } = useAuthStore();
  const { 
    notes, fetchNotes, searchQuery, setSearchQuery, 
    categoryFilter, setCategoryFilter, subjectFilter, setSubjectFilter,
    rateNote, reportNote, isLoading 
  } = useNotesStore();

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activePreviewNote, setActivePreviewNote] = useState<Note | null>(null);
  
  // Bookmarks cache state
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('newest');
  
  // Custom toast status notifications
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const userId = user?.uid || '';

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes, userId]);

  // Handle direct preview redirect from notification clicks
  useEffect(() => {
    const previewId = localStorage.getItem('preview_note_id');
    if (previewId) {
      localStorage.removeItem('preview_note_id');
      notesService.getNoteById(previewId).then((note) => {
        if (note) {
          setActivePreviewNote(note);
        }
      }).catch(err => console.error('Failed to auto-preview note:', err));
    }
  }, [notes]);

  // Load bookmark states on mount
  const refreshBookmarks = useCallback(async () => {
    if (user?.uid) {
      try {
        const list = await bookmarksService.getBookmarks(user.uid);
        setBookmarkedIds(list.map(b => b.noteId));
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      }
    }
  }, [user]);

  useEffect(() => {
    refreshBookmarks();
  }, [user, refreshBookmarks]);

  const showToast = (text: string, type: 'error' | 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleBookmark = async (noteId: string) => {
    if (!user) return;
    try {
      const added = await bookmarksService.toggleBookmark(user.uid, noteId);
      if (added) {
        setBookmarkedIds((prev) => [...prev, noteId]);
        showToast('Bookmark added successfully', 'success');
      } else {
        setBookmarkedIds((prev) => prev.filter(id => id !== noteId));
        showToast('Bookmark removed', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle bookmark', 'error');
    }
  };

  const handleReportNote = async (noteId: string, noteTitle: string) => {
    if (!user) return;
    try {
      await reportNote(noteId);
      useNotificationStore.getState().addNotification(
        'Note Reported',
        `You reported "${noteTitle}" for review by admin.`,
        'alert',
        user.uid,
        noteId
      );
      showToast('Note reported successfully. Admin will review it.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to report note', 'error');
    }
  };

  const handleDownload = async (note: Note) => {
    if (!user) return;
    
    // Fetch custom download cost and points constraint settings
    const settingsStr = localStorage.getItem('classnotes_admin_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : { downloadNoteCost: 10, disablePointsConstraint: false };
    const baseCost = settings.downloadNoteCost ?? 10;
    const isFree = settings.disablePointsConstraint ?? false;
    const cost = isFree ? 0 : baseCost;

    // Admins bypass points calculations
    const isStudent = user.role === 'student';

    if (isStudent && cost > 0 && user.points < cost) {
      showToast(`Insufficient points. Note cost is ${cost} points. Please upload notes to earn points.`, 'error');
      return;
    }

    try {
      // 1. Deduct points if student
      let updatedPoints = user.points;
      if (isStudent && cost > 0) {
        updatedPoints = await rewardsService.deductPoints(user.uid, cost);
        // Patch user points locally in store
        useAuthStore.setState((state) => {
          if (state.user) {
            return { user: { ...state.user, points: updatedPoints } };
          }
          return {};
        });
      }

      // 2. Increment note downloads
      await notesService.incrementDownloads(note.id);
      
      // Update local note downloads count in Notes store list
      useNotesStore.setState((state) => ({
        notes: state.notes.map(n => n.id === note.id ? { ...n, downloadsCount: n.downloadsCount + 1 } : n)
      }));

      // Add notification for download
      useNotificationStore.getState().addNotification(
        'Document Downloaded',
        isStudent 
          ? `Downloaded "${note.title}" (-${cost} points).` 
          : `Downloaded "${note.title}" (Admin).`,
        'download',
        user.uid,
        note.id
      );

      showToast(isStudent ? (cost > 0 ? `Note downloaded! ${cost} points deducted.` : 'Note downloaded for free!') : 'Admin note download initialized.', 'success');

      // Derivation logic for download filename
      const getDownloadFileName = () => {
        if (note.originalFileName) {
          return note.originalFileName;
        }

        // Try to parse/derive it from the fileUrl
        if (note.fileUrl && !note.fileUrl.startsWith('data:')) {
          try {
            const decodedUrl = decodeURIComponent(note.fileUrl);
            const urlPath = decodedUrl.split('?')[0]; // strip query params
            
            // Extract the last part after the last slash or backslash
            const lastSlash = Math.max(urlPath.lastIndexOf('/'), urlPath.lastIndexOf('\\'));
            let filename = lastSlash !== -1 ? urlPath.substring(lastSlash + 1) : urlPath;
            
            // Remove storage prefix if present (e.g., "notes/uuid.pdf" or "notes%2Fuuid.pdf")
            filename = filename.replace(/^notes\//i, '').replace(/^notes%2F/i, '');

            // Strip date prefix if pre-existing (e.g. "1719391000_filename.pdf" or "1719391000-filename.pdf")
            filename = filename.replace(/^\d+[-_]/, '');

            if (filename && filename.includes('.')) {
              return filename;
            }
          } catch (err) {
            console.warn('Failed to derive filename from fileUrl:', err);
          }
        }

        // Last fallback: title + extension
        const ext = note.fileType === 'pdf' ? 'pdf' : 
                    note.fileType === 'image' ? 'png' : 
                    note.fileType === 'text' ? 'txt' : 
                    note.fileType === 'docx' ? 'docx' : 
                    note.fileType === 'pptx' ? 'pptx' : 
                    note.fileType === 'zip' ? 'zip' : 'pdf';
        const nameBase = note.title ? note.title.replace(/[/\\?%*:|"<>]/g, '-') : note.id;
        return `${nameBase}.${ext}`;
      };

      const filename = getDownloadFileName();

      // 3. Trigger actual browser file download
      try {
        const response = await fetch(note.fileUrl);
        if (!response.ok) {
          throw new Error(`Server returned HTTP status ${response.status}`);
        }
        const blob = await response.blob();
        
        // Preserve MIME type
        const mimeType = note.mimeType || blob.type || 'application/octet-stream';
        const typedBlob = new Blob([blob], { type: mimeType });
        const blobUrl = window.URL.createObjectURL(typedBlob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (fetchErr) {
        console.warn('Direct blob download failed, using standard link fallback', fetchErr);
        const link = document.createElement('a');
        link.href = note.fileUrl;
        link.target = '_blank';
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      showToast(err.message || 'Download failed.', 'error');
    }
  };

  const handleRateNote = async (noteId: string, rating: number) => {
    try {
      await rateNote(noteId, rating);
      showToast('Rating added successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to rate note', 'error');
    }
  };

  // Memoize filtered and sorted notes reactively
  const sortedNotes = React.useMemo(() => {
    const filtered = notes.filter((note) => {
      const matchesSearch = 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === '' || note.category === categoryFilter;
      
      const matchesSubject = 
        subjectFilter === '' || 
        note.subject.toLowerCase().includes(subjectFilter.toLowerCase());

      const matchesCourse = !note.course || !user?.course || user.role !== 'student' || note.course === user.course;
      const matchesSemester = !note.semester || !user?.semester || user.role !== 'student' || note.semester === user.semester;

      return matchesSearch && matchesCategory && matchesSubject && matchesCourse && matchesSemester;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'downloads') {
        return b.downloadsCount - a.downloadsCount;
      }
      if (sortBy === 'ratings') {
        return b.ratingsAverage - a.ratingsAverage;
      }
      return 0;
    });
  }, [notes, searchQuery, categoryFilter, subjectFilter, sortBy, user]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setSubjectFilter('');
    setSortBy('newest');
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      {/* Dynamic Toast Alerts */}
      <div className="fixed top-20 right-6 z-50 pointer-events-none select-none max-w-sm w-full">
        {toastMessage && (
          <div className={`p-4 rounded-md shadow-lg border flex items-start gap-2.5 bg-surface text-xs font-medium animate-slide-in pointer-events-auto ${
            toastMessage.type === 'error' 
              ? 'border-danger/30 text-danger' 
              : 'border-success/30 text-success'
          }`}>
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{toastMessage.text}</span>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">Study Database</span>
          <h1 className="text-3xl font-bold mt-1 tracking-tight">Lecture Notes</h1>
        </div>

        {/* Upload Trigger */}
        <motion.button
          whileHover="hover"
          whileTap="tap"
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-linear-to-r from-accent via-blue-500 to-accent bg-[length:200%_auto] hover:bg-[right_center] text-white font-semibold px-4 py-2.5 rounded-lg text-xs shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/35 transition-all duration-300 select-none cursor-pointer font-sans"
        >
          <motion.span
            variants={{
              hover: { y: -2, transition: { repeat: Infinity, repeatType: "reverse", duration: 0.4 } }
            }}
          >
            <Upload size={13} />
          </motion.span>
          Upload Note
        </motion.button>
      </div>

      {/* Filters & Actions Shell */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="premium-card p-5 space-y-4"
      >
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/35" />
          <input
            type="text"
            placeholder="Search notes by keywords, titles, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs border border-border/75 bg-background/50 focus:bg-surface focus:border-accent rounded-md focus:ring-4 focus:ring-accent/5 transition-all text-primary font-sans"
          />
        </div>

        {/* Category, Subject, and Sort selectors */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Select */}
            <div className="flex items-center gap-1.5 border border-border/60 rounded px-2.5 py-1.5 bg-background/30 text-primary">
              <SlidersHorizontal size={12} className="text-primary/45" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-primary cursor-pointer pr-1 font-mono uppercase text-[10px] font-bold"
              >
                <option value="">All Categories</option>
                <option value="Lecture Notes">Lecture Notes</option>
                <option value="Cheat Sheets">Cheat Sheets</option>
                <option value="Study Guides">Study Guides</option>
                <option value="Mock Exams">Mock Exams</option>
              </select>
            </div>

            {/* Subject Filter Input */}
            <div className="flex items-center gap-1.5 border border-border/60 rounded px-2.5 py-1.5 bg-background/30 max-w-[160px]">
              <input
                type="text"
                placeholder="Filter by Subject..."
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-primary font-mono uppercase text-[10px] placeholder:text-primary/30"
              />
            </div>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-1.5 border border-border/60 rounded px-2.5 py-1.5 bg-background/30 justify-between">
            <span className="text-primary/45 font-mono uppercase text-[10px] font-bold">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none outline-none text-primary cursor-pointer pr-1 font-mono uppercase text-[10px] font-bold"
            >
              <option value="newest">Newest first</option>
              <option value="downloads">Most Downloaded</option>
              <option value="ratings">Highest Rated</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="premium-card p-5 h-60 flex flex-col justify-between animate-pulse">
              <div className="space-y-4">
                <div className="h-4 bg-primary/5 rounded w-1/4" />
                <div className="h-6 bg-primary/5 rounded w-3/4" />
                <div className="h-10 bg-primary/5 rounded w-full" />
              </div>
              <div className="h-8 bg-primary/5 rounded w-full" />
            </div>
          ))}
        </div>
      ) : sortedNotes.length === 0 ? (
        <div className="premium-card p-12 flex flex-col items-center justify-center text-center select-none min-h-[350px]">
          <div className="w-12 h-12 bg-primary/5 border border-border rounded-full flex items-center justify-center mb-4 text-primary/40">
            <FileX size={20} />
          </div>
          <h3 className="font-bold text-lg text-primary mb-1">No notes matching filter criteria</h3>
          <p className="text-xs text-primary/45 max-w-sm mb-6">
            Try adjusting search terms, clearing filters, or upload a new lecture note to get started.
          </p>
          <button
            onClick={clearAllFilters}
            className="border border-border hover:bg-background px-4 py-2 rounded-md text-xs font-semibold active-scale transition-colors cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isBookmarked={bookmarkedIds.includes(note.id)}
              onToggleBookmark={() => handleToggleBookmark(note.id)}
              onView={() => setActivePreviewNote(note)}
              onDownload={() => handleDownload(note)}
              onRate={(rating) => handleRateNote(note.id, rating)}
              onReport={() => handleReportNote(note.id, note.title)}
              currentUserId={user?.uid || ''}
            />
          ))}
        </div>
      )}

      {/* Note Upload Dialog Modal */}
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />

      {/* Document preview drawer */}
      <DocumentViewer
        note={activePreviewNote}
        isOpen={!!activePreviewNote}
        onClose={() => setActivePreviewNote(null)}
      />
    </div>
  );
};

export default Notes;

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useNotesStore } from '@/features/notes/useNotesStore';
import { useNoticeStore } from '@/features/announcements/useNoticeStore';
import { useCalendarStore } from '@/features/calendar/useCalendarStore';
import { bookmarksService } from '@/services/bookmarks';
import { noteRequestsService } from '@/services/noteRequests';
import { notesService } from '@/services/notes';
import { rewardsService } from '@/services/rewards';
import { useNotificationStore } from '@/features/notifications/useNotificationStore';
import type { Bookmark as BookmarkType } from '@/types/database';
import { 
  BookOpen, Megaphone, Award, 
  ArrowRight, Clock, Star, Download, Bookmark,
  Settings2, Inbox, AlertCircle, X
} from 'lucide-react';

import { useDocumentMetadata } from '@/hooks/useDocumentMetadata';
import { SetupProfileModal } from '@/components/SetupProfileModal';

export const Dashboard: React.FC = () => {
  useDocumentMetadata('Student Dashboard', 'Access your ClassNotes overview, view stats, announcements, recent activity, and calendar updates.');
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Auto-prompt setup if profile course/semester is incomplete
  useEffect(() => {
    if (user && user.role === 'student' && (!user.course || !user.semester)) {
      setIsSetupModalOpen(true);
    }
  }, [user]);
  
  // Zustand Stores
  const { notes, fetchNotes, isLoading: isNotesLoading } = useNotesStore();
  const { announcements, fetchAnnouncements, isLoading: isAnnLoading } = useNoticeStore();
  const { events, fetchEvents, isLoading: isCalLoading } = useCalendarStore();
  
  // Local state for user bookmarks count
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [isBookmarksLoading, setIsBookmarksLoading] = useState(false);
  const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false);
  const [bookmarksList, setBookmarksList] = useState<BookmarkType[]>([]);
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const showToast = (text: string, type: 'error' | 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Local state for note requests stats
  const [requestStats, setRequestStats] = useState({ active: 0, fulfilledToday: 0, waitingForYou: 0 });
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setIsStatsLoading(true);
      noteRequestsService.getCommunityStats(user)
        .then(setRequestStats)
        .catch(err => console.error('Failed to load request stats:', err))
        .finally(() => setIsStatsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.course, user?.semester, user?.batch, user?.role]);

  useEffect(() => {
    // Initial data fetch
    fetchNotes();
    fetchAnnouncements();
    fetchEvents();
  }, [fetchNotes, fetchAnnouncements, fetchEvents]);

  useEffect(() => {
    if (user?.uid) {
      setIsBookmarksLoading(true);
      bookmarksService.getBookmarks(user.uid)
        .then((list) => {
          setBookmarksList(list);
          setBookmarksCount(list.length);
        })
        .catch((err) => console.error('Failed to load bookmarks list:', err))
        .finally(() => setIsBookmarksLoading(false));
    }
  }, [user?.uid]); // Refresh count when authenticated user changes

  const bookmarkedNotes = React.useMemo(() => {
    return notes.filter(note => 
      bookmarksList.some(b => b.noteId === note.id)
    );
  }, [notes, bookmarksList]);

  const handleRemoveBookmark = async (noteId: string) => {
    if (!user) return;
    try {
      const isBookmarkedNow = await bookmarksService.toggleBookmark(user.uid, noteId);
      if (!isBookmarkedNow) {
        setBookmarksList(prev => prev.filter(b => b.noteId !== noteId));
        setBookmarksCount(prev => Math.max(0, prev - 1));
        showToast('Bookmark removed', 'success');
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      showToast('Failed to remove bookmark', 'error');
    }
  };

  const handleDownloadInDashboard = async (note: any) => {
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

        if (note.fileUrl && !note.fileUrl.startsWith('data:')) {
          try {
            const decodedUrl = decodeURIComponent(note.fileUrl);
            const urlPath = decodedUrl.split('?')[0];
            const lastSlash = Math.max(urlPath.lastIndexOf('/'), urlPath.lastIndexOf('\\'));
            let filename = lastSlash !== -1 ? urlPath.substring(lastSlash + 1) : urlPath;
            filename = filename.replace(/^notes\//i, '').replace(/^notes%2F/i, '');
            filename = filename.replace(/^\d+[-_]/, '');
            if (filename && filename.includes('.')) {
              return filename;
            }
          } catch (err) {
            console.warn('Failed to derive filename from fileUrl:', err);
          }
        }

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

  const isLoading = isNotesLoading || isAnnLoading || isCalLoading || isBookmarksLoading;

  // Filter latest items based on course & semester if student
  const filteredNotes = React.useMemo(() => {
    return notes.filter((note) => {
      const matchesCourse = !note.course || !user?.course || user.role !== 'student' || note.course === user.course;
      const matchesSemester = !note.semester || !user?.semester || user.role !== 'student' || note.semester === user.semester;
      return matchesCourse && matchesSemester;
    });
  }, [notes, user]);

  const recentNotes = filteredNotes.slice(0, 3);
  const recentAnnouncements = announcements.slice(0, 2);
  const upcomingEvents = events
    .filter(e => new Date(e.date).getTime() >= new Date().setHours(0,0,0,0))
    .slice(0, 3);

  // SVG Chart Data definition (Uploads and downloads over last 7 days)
  const chartData = [
    { day: 'Mon', downloads: 12, uploads: 2 },
    { day: 'Tue', downloads: 19, uploads: 1 },
    { day: 'Wed', downloads: 15, uploads: 4 },
    { day: 'Thu', downloads: 28, uploads: 3 },
    { day: 'Fri', downloads: 22, uploads: 5 },
    { day: 'Sat', downloads: 8,  uploads: 0 },
    { day: 'Sun', downloads: 14, uploads: 1 }
  ];

  // Calculations for SVG chart path plotting (scale to 450x130)
  const maxVal = 35;
  const chartWidth = 450;
  const chartHeight = 120;
  const padding = 15;
  
  const getX = (index: number) => padding + (index * (chartWidth - 2 * padding)) / (chartData.length - 1);
  const getY = (value: number) => chartHeight - padding - (value * (chartHeight - 2 * padding)) / maxVal;

  const downloadPoints = chartData.map((d, i) => `${getX(i)},${getY(d.downloads)}`).join(' ');
  const downloadAreaPoints = `${getX(0)},${chartHeight - padding} ${downloadPoints} ${getX(chartData.length - 1)},${chartHeight - padding}`;
  
  const uploadPoints = chartData.map((d, i) => `${getX(i)},${getY(d.uploads * 4)}`).join(' '); // scale uploads for visual comparison
  const uploadAreaPoints = `${getX(0)},${chartHeight - padding} ${uploadPoints} ${getX(chartData.length - 1)},${chartHeight - padding}`;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Premium Hero Panel */}
      <div className="premium-card p-8 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-stretch justify-between gap-6 min-h-[220px]">
        {/* Abstract 3D Floating Educational SVGs */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          {/* Floating book */}
          <div className="absolute top-4 right-1/4 w-10 h-10 text-accent/25 animate-float-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10M6 10h10M6 14h8" />
            </svg>
          </div>
          {/* Floating graduation cap */}
          <div className="absolute bottom-8 right-12 w-14 h-14 text-warning/20 animate-float-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
            </svg>
          </div>
          {/* Floating paper plane */}
          <div className="absolute top-12 right-1/3 w-8 h-8 text-primary/10 animate-float-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />
            </svg>
          </div>
          {/* Floating rocket */}
          <div className="absolute -bottom-4 right-1/3 w-12 h-12 text-accent/15 animate-float-1" style={{ animationDelay: '1s' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4.5 16.5c-1.5 1.5-2.5 3.5-2.5 5.5C4 22 6 21 7.5 19.5" />
              <path d="M12 2C7 2 4 6 4 11c0 2.5 1 4.5 2.5 6L17 6.5C15.5 5 13.5 4 12 2Z" />
              <path d="M12 2c5 0 8 4 8 9 0 2.5-1 4.5-2.5 6L7 6.5C8.5 5 10.5 4 12 2Z" />
              <circle cx="12" cy="9" r="1.5" />
            </svg>
          </div>
        </div>

        {/* Left Side: Personalized Welcome info */}
        <div className="space-y-4 relative z-10 flex-1 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest uppercase text-accent bg-accent/10 px-2 py-0.5 rounded font-bold">
                Student Workspace
              </span>
              <span className="text-[10px] font-mono text-primary/45 uppercase">
                • {user?.course || 'General'}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1 bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Welcome back, {user?.displayName || 'Scholar'}!
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-xs text-primary/50 font-medium">
                You are currently registered in <span className="text-primary font-bold">{user?.course || 'No Course'}</span>, <span className="text-primary font-bold">Semester {user?.semester || 'N/A'}</span>.
              </p>
              {user?.role !== 'guest' && (
                <button
                  onClick={() => setIsSetupModalOpen(true)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-border hover:bg-primary/5 hover:text-accent text-[9px] font-bold rounded text-primary/60 transition-all cursor-pointer active-scale bg-surface/50 font-mono uppercase tracking-wider"
                  title="Configure course and semester"
                >
                  <Settings2 size={10} />
                  Setup
                </button>
              )}
            </div>
          </div>

          {/* Gamified education badges/XP summary */}
          <div className="flex flex-wrap gap-4 items-center mt-2">
            <div className="flex items-center gap-2.5 bg-surface/50 border border-border/40 p-2.5 rounded-lg">
              <div className="w-8 h-8 rounded-md bg-accent/5 border border-accent/10 flex items-center justify-center text-accent">
                <Award size={18} />
              </div>
              <div className="text-left font-mono">
                <div className="text-[9px] uppercase tracking-wider text-primary/40 leading-none">XP Balance</div>
                <div className="text-xs font-bold mt-1 text-primary">{user?.points ?? 0} pts</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-surface/50 border border-border/40 p-2.5 rounded-lg">
              <div className="w-8 h-8 rounded-md bg-success/5 border border-success/10 flex items-center justify-center text-success animate-pulse">
                <Star size={18} />
              </div>
              <div className="text-left font-mono">
                <div className="text-[9px] uppercase tracking-wider text-primary/40 leading-none">Learning Streak</div>
                <div className="text-xs font-bold mt-1 text-primary">5 Days 🔥</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-surface/50 border border-border/40 p-2.5 rounded-lg">
              <div className="w-8 h-8 rounded-md bg-warning/5 border border-warning/10 flex items-center justify-center text-warning">
                <Clock size={18} />
              </div>
              <div className="text-left font-mono">
                <div className="text-[9px] uppercase tracking-wider text-primary/40 leading-none">Lvl Progress</div>
                <div className="text-xs font-bold mt-1 text-primary">Level {Math.floor((user?.points ?? 0) / 100) + 1}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Motivational AI Quote & XP progress wheel */}
        <div className="relative z-10 w-full md:w-64 border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between gap-4">
          <div className="space-y-1.5 pt-2.5">
            <p className="text-xs italic text-primary/65 leading-relaxed font-serif">
              "Consistency is the compounding interest of self-improvement. Keep sharing notes, keep reviewing lectures!"
            </p>
          </div>

          <div className="flex items-center gap-3 bg-primary/5 p-2 rounded-lg border border-border/40">
            {/* SVG Level progress wheel */}
            <svg className="w-8 h-8 transform -rotate-90 shrink-0" viewBox="0 0 36 36">
              <path
                className="text-primary/10"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-accent"
                strokeWidth="3.2"
                strokeDasharray={`${(user?.points ?? 0) % 100}, 100`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="font-mono leading-none">
              <span className="text-[10px] font-bold text-primary block">Level {Math.floor((user?.points ?? 0) / 100) + 1}</span>
              <span className="text-[8px] text-primary/45 mt-0.5 block">{(user?.points ?? 0) % 100}% towards Lvl {Math.floor((user?.points ?? 0) / 100) + 2}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Card 1: Total Notes */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate('/notes')}
          className="premium-card p-6 flex flex-col justify-between hover-scale relative overflow-hidden card-glow-accent group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary/55 font-bold">Lecture Notes</span>
            <div className="p-2.5 bg-accent/5 rounded-lg border border-accent/15 text-accent group-hover:scale-110 transition-transform duration-300">
              <BookOpen size={16} />
            </div>
          </div>
          <div className="mt-6">
            <p className="text-3xl font-extrabold font-mono tracking-tight leading-none text-primary">
              {isLoading ? '...' : notes.length}
            </p>
            <span className="text-[10px] text-primary/45 font-mono uppercase tracking-wider mt-2.5 block font-medium">Active uploads</span>
          </div>
          {/* Subtle light effect */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
        </motion.div>

        {/* Card 2: Bookmarked */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setIsBookmarksModalOpen(true)}
          className="premium-card p-6 flex flex-col justify-between hover-scale relative overflow-hidden card-glow-accent group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary/55 font-bold">Bookmarks</span>
            <div className="p-2.5 bg-accent/5 rounded-lg border border-accent/15 text-accent group-hover:scale-110 transition-transform duration-300">
              <Bookmark size={16} />
            </div>
          </div>
          <div className="mt-6">
            <p className="text-3xl font-extrabold font-mono tracking-tight leading-none text-primary">
              {isLoading ? '...' : bookmarksCount}
            </p>
            <span className="text-[10px] text-primary/45 font-mono uppercase tracking-wider mt-2.5 block font-medium">Saved materials</span>
          </div>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
        </motion.div>

        {/* Card 3: Points Balance */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => navigate('/rewards')}
          className="premium-card p-6 flex flex-col justify-between hover-scale relative overflow-hidden card-glow-accent group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary/55 font-bold">Points Balance</span>
            <div className="p-2.5 bg-warning/5 rounded-lg border border-warning/20 text-warning group-hover:scale-110 transition-transform duration-300">
              <Award size={16} />
            </div>
          </div>
          <div className="mt-6">
            <p className="text-3xl font-extrabold font-mono tracking-tight leading-none text-accent">
              {user?.points ?? 0}
            </p>
            <span className="text-[10px] text-primary/45 font-mono uppercase tracking-wider mt-2.5 block font-medium">Available balance</span>
          </div>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-warning/5 rounded-full blur-2xl group-hover:bg-warning/10 transition-colors" />
        </motion.div>

        {/* Card 4: Notice Board */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => navigate('/announcements')}
          className="premium-card p-6 flex flex-col justify-between hover-scale relative overflow-hidden card-glow-accent group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary/55 font-bold">Notices</span>
            <div className="p-2.5 bg-accent/5 rounded-lg border border-accent/15 text-accent group-hover:scale-110 transition-transform duration-300">
              <Megaphone size={16} />
            </div>
          </div>
          <div className="mt-6">
            <p className="text-3xl font-extrabold font-mono tracking-tight leading-none text-primary">
              {isLoading ? '...' : announcements.length}
            </p>
            <span className="text-[10px] text-primary/45 font-mono uppercase tracking-wider mt-2.5 block font-medium">Active bulletins</span>
          </div>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
        </motion.div>
      </div>

      {/* Main Content Grid: Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Analytics Chart & Recent Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Custom SVG Line Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="premium-card p-6 space-y-4"
          >
            <div>
              <h2 className="text-lg font-bold tracking-tight">Study Activity Logs</h2>
              <p className="text-xs text-primary/50">Downloads and uploads trend comparison over the past week</p>
            </div>
            
            <div className="w-full overflow-hidden pt-2">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto text-primary">
                {/* Horizontal grid lines */}
                <line x1={padding} y1={getY(0)} x2={chartWidth - padding} y2={getY(0)} stroke="rgba(26, 26, 26, 0.04)" strokeWidth="0.5" />
                <line x1={padding} y1={getY(15)} x2={chartWidth - padding} y2={getY(15)} stroke="rgba(26, 26, 26, 0.04)" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1={padding} y1={getY(30)} x2={chartWidth - padding} y2={getY(30)} stroke="rgba(26, 26, 26, 0.04)" strokeWidth="0.5" strokeDasharray="4 4" />

                {/* AREA GRADIENTS DEFINITIONS */}
                <defs>
                  <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="ulGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Areas plotting */}
                <polygon points={downloadAreaPoints} fill="url(#dlGrad)" />
                <polygon points={uploadAreaPoints} fill="url(#ulGrad)" />

                {/* Lines plotting */}
                <polyline fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={downloadPoints} />
                <polyline fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2" points={uploadPoints} />

                {/* Node Points for Downloads */}
                {chartData.map((d, i) => (
                  <circle key={`dl-dot-${i}`} cx={getX(i)} cy={getY(d.downloads)} r="3" fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="1.5" />
                ))}

                {/* Axis Labels */}
                {chartData.map((d, i) => (
                  <text key={`lbl-${i}`} x={getX(i)} y={chartHeight - 2} textAnchor="middle" className="text-[8px] font-mono fill-primary/45">
                    {d.day}
                  </text>
                ))}
              </svg>
            </div>

            {/* Chart Legend */}
            <div className="flex gap-4 items-center text-xs font-mono justify-end select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                <span className="text-primary/70">Downloads (Active)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary/40 border border-dashed border-primary" />
                <span className="text-primary/70">Uploads (Scaled x4)</span>
              </div>
            </div>
          </motion.div>

          {/* Recent Notes List */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="premium-card p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Recent uploads</h2>
                <p className="text-xs text-primary/50">Latest materials shared by class peers</p>
              </div>
              <Link to="/notes" className="text-xs font-mono text-accent hover:underline flex items-center gap-1 font-semibold">
                View all <ArrowRight size={13} />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-primary/5 rounded animate-pulse" />
                ))}
              </div>
            ) : recentNotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-primary/40 font-mono uppercase tracking-wider">
                No notes uploaded yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60 select-none">
                {recentNotes.map((note) => (
                  <div key={note.id} className="py-3.5 flex items-center justify-between group first:pt-0 last:pb-0">
                    <div className="space-y-1 max-w-lg">
                      <Link to="/notes" className="font-bold text-sm hover:text-accent transition-colors block leading-tight truncate">
                        {note.title}
                      </Link>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-primary/50 uppercase">
                        <span>{note.subject}</span>
                        <span>•</span>
                        <span>{note.authorName}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-mono text-primary/70">
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-warning fill-warning" />
                        <span className="font-semibold">{note.ratingsAverage > 0 ? note.ratingsAverage : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download size={12} className="text-primary/50" />
                        <span className="font-semibold">{note.downloadsCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Notices feed & Upcoming Calendar */}
        <div className="space-y-6">
          
          {/* Upcoming Events Calendar Widget */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="premium-card p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Schedules</h2>
                <p className="text-xs text-primary/50">Next academic deadlines</p>
              </div>
              <Link to="/calendar" className="text-xs font-mono text-accent hover:underline flex items-center gap-1 font-semibold">
                Full planner <ArrowRight size={13} />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-primary/5 rounded animate-pulse" />
                ))}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-primary/40 font-mono uppercase tracking-wider">
                No upcoming events scheduled.
              </div>
            ) : (
              <div className="space-y-3 select-none">
                {upcomingEvents.map((evt) => {
                  const evDate = new Date(evt.date);
                  const day = evDate.getDate();
                  const month = evDate.toLocaleString('default', { month: 'short' });
                  
                  return (
                    <div key={evt.id} className="flex gap-3 items-start p-2.5 hover:bg-primary/[0.02] border border-border/30 hover:border-accent/20 rounded-lg transition-all">
                      {/* Date block */}
                      <div className="w-10 h-10 bg-primary/5 border border-border/60 rounded-md flex flex-col justify-center items-center shrink-0">
                        <span className="text-[9px] font-mono leading-none uppercase text-primary/45 font-bold">{month}</span>
                        <span className="text-xs font-black font-mono leading-none text-primary mt-1">{day}</span>
                      </div>
                      
                      {/* Event Details */}
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-bold text-xs leading-tight truncate text-primary">{evt.title}</p>
                        <p className="text-[9px] font-mono text-primary/55 uppercase">{evt.type} • {evt.courseName}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Community Requests Widget */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="premium-card p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-accent/5 border border-accent/15 flex items-center justify-center text-accent">
                  <Inbox size={14} />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight">Community Requests</h2>
                  <p className="text-[10px] text-primary/50">Needs in your peer cohort</p>
                </div>
              </div>
              <Link to="/requests" className="text-[10px] font-mono text-accent hover:underline flex items-center gap-0.5 font-semibold">
                View <ArrowRight size={10} />
              </Link>
            </div>

            {isStatsLoading ? (
              <div className="space-y-2 py-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-9 bg-primary/5 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center select-none font-mono">
                <div className="p-2.5 bg-primary/[0.02] border border-border/30 rounded-lg">
                  <span className="text-lg font-black text-primary block leading-none">{requestStats.active}</span>
                  <span className="text-[8px] text-primary/45 uppercase tracking-wider block mt-1.5 font-medium">Active</span>
                </div>
                <div className="p-2.5 bg-success/[0.02] border border-success/10 rounded-lg">
                  <span className="text-lg font-black text-success block leading-none">{requestStats.fulfilledToday}</span>
                  <span className="text-[8px] text-success/70 uppercase tracking-wider block mt-1.5 font-bold">Solved</span>
                </div>
                <div className="p-2.5 bg-warning/[0.02] border border-warning/15 rounded-lg">
                  <span className="text-lg font-black text-warning block leading-none">{requestStats.waitingForYou}</span>
                  <span className="text-[8px] text-warning/70 uppercase tracking-wider block mt-1.5 font-bold">Pending</span>
                </div>
              </div>
            )}

            <Link
              to="/requests"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-accent/5 hover:bg-accent hover:text-white border border-accent/15 hover:border-accent text-[10px] font-bold text-accent rounded-lg transition-all active-scale font-mono uppercase tracking-wider cursor-pointer"
            >
              View Requests
              <ArrowRight size={11} />
            </Link>
          </motion.div>

          {/* Notice Board Widget */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="premium-card p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Notice Board</h2>
                <p className="text-xs text-primary/50">Latest staff announcements</p>
              </div>
              <Link to="/announcements" className="text-xs font-mono text-accent hover:underline flex items-center gap-1 font-semibold">
                Feed board <ArrowRight size={13} />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-16 bg-primary/5 rounded animate-pulse" />
                ))}
              </div>
            ) : recentAnnouncements.length === 0 ? (
              <div className="p-8 text-center text-xs text-primary/40 font-mono uppercase tracking-wider">
                No bulletins published.
              </div>
            ) : (
              <div className="space-y-3 select-none">
                {recentAnnouncements.map((ann) => {
                  const pColors = 
                    ann.priority === 'alert' ? 'bg-danger/10 border-danger/25 text-danger font-bold' : 
                    ann.priority === 'important' ? 'bg-warning/10 border-warning/25 text-warning font-bold' :
                    'bg-primary/5 border-border/40 text-primary/70 font-semibold';

                  return (
                    <div key={ann.id} className="p-3.5 border border-border/40 rounded-lg space-y-2 bg-surface/50 hover:border-accent/10 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-xs leading-tight truncate text-primary">{ann.title}</h4>
                        <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded leading-none shrink-0 border ${pColors}`}>
                          {ann.priority}
                        </span>
                      </div>
                      <p className="text-xs text-primary/65 font-sans leading-relaxed line-clamp-3">
                        {ann.content}
                      </p>
                      <div className="flex items-center justify-between text-[9px] font-mono text-primary/40 pt-1.5 border-t border-border/45">
                        <span>{ann.authorName}</span>
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <SetupProfileModal 
        isOpen={isSetupModalOpen} 
        onClose={() => setIsSetupModalOpen(false)} 
      />

      {/* Bookmarks Saved Materials Modal */}
      <AnimatePresence>
        {isBookmarksModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl bg-surface border border-border rounded-xl shadow-luxury overflow-hidden max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-border flex justify-between items-center bg-surface shrink-0">
                <div>
                  <h3 className="text-base font-bold text-primary">Saved Materials</h3>
                  <p className="text-[10px] text-primary/50 font-mono uppercase tracking-wider mt-0.5">
                    {bookmarkedNotes.length} Note{bookmarkedNotes.length !== 1 ? 's' : ''} Bookmarked
                  </p>
                </div>
                <button
                  onClick={() => setIsBookmarksModalOpen(false)}
                  className="p-1 text-primary/40 hover:text-primary border border-border hover:bg-primary/5 rounded cursor-pointer transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-background/25">
                {bookmarkedNotes.length === 0 ? (
                  <div className="p-12 text-center text-primary/40 font-mono text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2">
                    <Bookmark size={24} className="opacity-40" />
                    <span>No saved materials found</span>
                  </div>
                ) : (
                  bookmarkedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 bg-surface border border-border rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-accent/30 transition-all duration-300 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-mono uppercase font-bold text-accent px-1.5 py-0.5 rounded bg-accent/5 border border-accent/15">
                            {note.subject}
                          </span>
                          <span className="text-[9px] font-mono uppercase font-bold text-primary/50 px-1.5 py-0.5 rounded bg-primary/5 border border-border">
                            {note.category}
                          </span>
                          {note.course && (
                            <span className="text-[9px] font-mono text-primary/40">
                              {note.course} • Sem {note.semester}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-primary mt-2 group-hover:text-accent transition-colors truncate">
                          {note.title}
                        </h4>
                        <p className="text-[11px] text-primary/60 mt-1 line-clamp-2">
                          {note.description}
                        </p>
                        <p className="text-[9px] text-primary/40 mt-1.5 font-mono">
                          Uploaded by {note.authorName}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                        <button
                          onClick={() => handleRemoveBookmark(note.id)}
                          className="p-2 border border-border text-primary/40 hover:text-danger hover:bg-danger/5 hover:border-danger/25 rounded cursor-pointer transition-colors"
                          title="Remove from bookmarks"
                        >
                          <Bookmark size={14} className="fill-current text-accent" />
                        </button>
                        <button
                          onClick={() => handleDownloadInDashboard(note)}
                          className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-surface text-xs font-semibold rounded cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm active-scale"
                          title="Download note"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg border shadow-luxury text-xs font-semibold flex items-center gap-2 animate-slide-in ${
          toastMessage.type === 'error' 
            ? 'bg-danger/5 text-danger border-danger/25' 
            : 'bg-success/5 text-success border-success/25'
        }`}>
          <AlertCircle size={14} />
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useNotesStore } from '@/features/notes/useNotesStore';
import { useNoticeStore } from '@/features/announcements/useNoticeStore';
import { useCalendarStore } from '@/features/calendar/useCalendarStore';
import { useNotificationStore } from '@/features/notifications/useNotificationStore';
import { useRewardsStore } from '@/features/rewards/useRewardsStore';
import type { UserProfile, UserRole } from '@/types/auth';
import type { Note, RewardItem, NoteRequest } from '@/types/database';
import DocumentViewer from '@/components/DocumentViewer';
import { db as fbDb } from '@/firebase/config';
import { sandboxService } from '@/services/sandbox';
import { noteRequestsService } from '@/services/noteRequests';
import {
  collection, doc, getDocs, updateDoc, setDoc
} from 'firebase/firestore';
import { 
  Shield, BookOpen, Megaphone, Calendar as CalendarIcon, Users, 
  Trash2, Search, AlertCircle, Eye, Check, Ban, AlertTriangle, 
  Key, Plus, Minus, Settings, Award
} from 'lucide-react';

import { useDocumentMetadata } from '@/hooks/useDocumentMetadata';

export const Admin: React.FC = () => {
  useDocumentMetadata('Admin Console Portal', 'Access the ClassNotes administration panel to moderate files, verify uploads, and manage sandbox configurations.');
  const { user: currentUser } = useAuthStore();
  const { 
    notes, fetchNotes, deleteNote, approveNote, rejectNote, dismissReports 
  } = useNotesStore();
  const { announcements, fetchAnnouncements, deleteAnnouncement } = useNoticeStore();
  const { events, fetchEvents, deleteEvent } = useCalendarStore();
  const { items: rewardsList, fetchItems: fetchRewards, addRewardItem, deleteRewardItem } = useRewardsStore();

  const [activeTab, setActiveTab] = useState<'notes' | 'verification' | 'reports' | 'announcements' | 'events' | 'users' | 'rewards' | 'settings' | 'requests'>('notes');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Add reward form state
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardType, setRewardType] = useState<RewardItem['type']>('cheat_sheet');
  const [rewardPoints, setRewardPoints] = useState(30);
  const [rewardStock, setRewardStock] = useState(50);
  const [rewardCourse, setRewardCourse] = useState('BCA');
  const [rewardSemester, setRewardSemester] = useState('1');
  
  // Preview Drawer State
  const [activePreviewNote, setActivePreviewNote] = useState<Note | null>(null);

  // Admin settings state
  const [settings, setSettings] = useState({
    autoApprove: false,
    uploadRewardPoints: 50,
    downloadNoteCost: 10,
    disablePointsConstraint: false,
  });
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    type: 'note' | 'announcement' | 'event' | 'reject-note' | 'report-note' | 'reward' | 'request';
  } | null>(null);

  const currentUserId = currentUser?.uid || '';

  const loadUsers = useCallback(async () => {
    // Prefer Firestore users collection if available
    if (!sandboxService.isSandboxActive() && fbDb) {
      try {
        const snapshot = await getDocs(collection(fbDb, 'users'));
        if (!snapshot.empty) {
          const users = snapshot.docs.map(d => d.data() as UserProfile);
          setUsersList(users);
          return;
        }
      } catch (err) {
        console.warn('Failed to load users from Firestore, falling back to localStorage.', err);
      }
    }
    // Sandbox / localStorage fallback
    const cachedUsers = localStorage.getItem('classnotes_seeded_users');
    if (cachedUsers) {
      setUsersList(JSON.parse(cachedUsers));
    }
  }, []);

  const loadSettings = useCallback(async () => {
    // Prefer Firestore settings document if available
    if (!sandboxService.isSandboxActive() && fbDb) {
      try {
        const snapshot = await getDocs(collection(fbDb, 'settings'));
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setSettings(prev => {
            const next = { ...prev, ...data };
            localStorage.setItem('classnotes_admin_settings', JSON.stringify(next));
            return next;
          });
          return;
        }
      } catch (err) {
        console.warn('Failed to load settings from Firestore, falling back to localStorage.', err);
      }
    }
    // Sandbox / localStorage fallback
    const cached = localStorage.getItem('classnotes_admin_settings');
    if (cached) {
      setSettings(JSON.parse(cached));
    }
  }, []);

  useEffect(() => {
    // Fetch all notes including pending - re-run when user changes (account switch)
    fetchNotes(true);
    fetchAnnouncements();
    fetchEvents();
    fetchRewards();
    loadUsers();
    loadSettings();
  }, [fetchNotes, fetchAnnouncements, fetchEvents, fetchRewards, currentUserId, loadUsers, loadSettings]);

  // Re-fetch notes when switching to reports or verification tabs to get latest data
  useEffect(() => {
    if (activeTab === 'reports' || activeTab === 'verification') {
      fetchNotes(true);
    }
  }, [activeTab, fetchNotes]);

  const [requestsList, setRequestsList] = useState<NoteRequest[]>([]);

  useEffect(() => {
    if (!currentUser || activeTab !== 'requests') return;
    const unsubscribe = noteRequestsService.subscribeRequests(
      currentUser,
      (list) => {
        setRequestsList(list);
      },
      (err) => {
        console.error('Failed to subscribe requests:', err);
      }
    );
    return () => unsubscribe();
  }, [currentUser, activeTab]);

  const handleDeleteRequest = (id: string, title: string) => {
    setDeleteTarget({ id, title, type: 'request' });
  };

  const showToast = (text: string, type: 'error' | 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    // Persist to Firestore if available
    if (!sandboxService.isSandboxActive() && fbDb) {
      try {
        await setDoc(doc(fbDb, 'settings', 'admin'), settings);
      } catch (err) {
        console.warn('Failed to save settings to Firestore.', err);
      }
    }
    localStorage.setItem('classnotes_admin_settings', JSON.stringify(settings));
    showToast('Admin settings saved successfully', 'success');
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    // Update Firestore user document if available
    if (!sandboxService.isSandboxActive() && fbDb) {
      try {
        await updateDoc(doc(fbDb, 'users', userId), { role: newRole });
        setUsersList(prev => prev.map(u => u.uid === userId ? { ...u, role: newRole } : u));
        showToast(`User role updated to ${newRole}`, 'success');
        if (currentUser?.uid === userId) {
          useAuthStore.setState(state => state.user ? { user: { ...state.user, role: newRole } } : {});
        }
        return;
      } catch (err) {
        console.warn('Failed to update role in Firestore, falling back to localStorage.', err);
      }
    }
    // Sandbox / localStorage fallback
    const cachedUsers = localStorage.getItem('classnotes_seeded_users');
    if (cachedUsers) {
      const parsed = JSON.parse(cachedUsers) as UserProfile[];
      const updated = parsed.map(u => u.uid === userId ? { ...u, role: newRole } : u);
      localStorage.setItem('classnotes_seeded_users', JSON.stringify(updated));
      setUsersList(updated);
      showToast(`User role updated to ${newRole}`, 'success');
      if (currentUser?.uid === userId) {
        useAuthStore.setState(state => state.user ? { user: { ...state.user, role: newRole } } : {});
        const currentStr = localStorage.getItem('classnotes_session_user') || sessionStorage.getItem('classnotes_session_user');
        if (currentStr) {
          const parsedSession = JSON.parse(currentStr) as UserProfile;
          parsedSession.role = newRole;
          const updatedStr = JSON.stringify(parsedSession);
          if (localStorage.getItem('classnotes_session_user')) {
            localStorage.setItem('classnotes_session_user', updatedStr);
          } else {
            sessionStorage.setItem('classnotes_session_user', updatedStr);
          }
        }
      }
    }
  };

  const toggleUserSuspension = async (userId: string, currentStatus: string) => {
    const newStatus = (currentStatus === 'suspended' ? 'active' : 'suspended') as 'active' | 'suspended';

    // Update Firestore if available
    if (!sandboxService.isSandboxActive() && fbDb) {
      try {
        await updateDoc(doc(fbDb, 'users', userId), { status: newStatus });
        setUsersList(prev => prev.map(u => u.uid === userId ? { ...u, status: newStatus } : u));
        showToast(`User suspension status changed to ${newStatus}`, 'success');
        if (currentUser?.uid === userId && newStatus === 'suspended') {
          useAuthStore.setState({ user: null, isAuthenticated: false });
          localStorage.removeItem('classnotes_session_user');
          sessionStorage.removeItem('classnotes_session_user');
          showToast('Your session has ended because this account was suspended.', 'error');
        }
        return;
      } catch (err) {
        console.warn('Failed to update suspension in Firestore, falling back to localStorage.', err);
      }
    }

    // Sandbox / localStorage fallback
    const cachedUsers = localStorage.getItem('classnotes_seeded_users');
    if (cachedUsers) {
      const parsed = JSON.parse(cachedUsers) as UserProfile[];
      const updated = parsed.map(u => u.uid === userId ? { ...u, status: newStatus } : u);
      localStorage.setItem('classnotes_seeded_users', JSON.stringify(updated));
      setUsersList(updated);
      showToast(`User suspension status changed to ${newStatus}`, 'success');
      if (currentUser?.uid === userId && newStatus === 'suspended') {
        useAuthStore.setState({ user: null, isAuthenticated: false });
        localStorage.removeItem('classnotes_session_user');
        sessionStorage.removeItem('classnotes_session_user');
        showToast('Your session has ended because this account was suspended.', 'error');
      }
    }
  };

  const handleResetPassword = (userId: string, name: string) => {
    const cachedUsers = localStorage.getItem('classnotes_seeded_users');
    if (cachedUsers) {
      const parsed = JSON.parse(cachedUsers) as any[];
      const updated = parsed.map(u => u.uid === userId ? { ...u, password: 'sandbox123' } : u);
      localStorage.setItem('classnotes_seeded_users', JSON.stringify(updated));
      showToast(`Password for ${name} reset to "sandbox123"`, 'success');
    }
  };

  const handleModifyPoints = async (userId: string, amount: number) => {
    const target = usersList.find(u => u.uid === userId);
    if (!target) return;
    const newPoints = Math.max(0, target.points + amount);

    // Update Firestore if available
    if (!sandboxService.isSandboxActive() && fbDb) {
      try {
        await updateDoc(doc(fbDb, 'users', userId), { points: newPoints });
        setUsersList(prev => prev.map(u => u.uid === userId ? { ...u, points: newPoints } : u));
        if (currentUser?.uid === userId) {
          useAuthStore.setState(state => state.user ? { user: { ...state.user, points: newPoints } } : {});
        }
        showToast(`Points adjusted by ${amount > 0 ? '+' : ''}${amount}`, 'success');
        return;
      } catch (err) {
        console.warn('Failed to update points in Firestore, falling back to localStorage.', err);
      }
    }

    // Sandbox / localStorage fallback
    const cachedUsers = localStorage.getItem('classnotes_seeded_users');
    if (cachedUsers) {
      const parsed = JSON.parse(cachedUsers) as UserProfile[];
      const updated = parsed.map(u => {
        if (u.uid === userId) {
          if (currentUser?.uid === userId) {
            useAuthStore.setState(state => state.user ? { user: { ...state.user, points: newPoints } } : {});
            const currentStr = localStorage.getItem('classnotes_session_user') || sessionStorage.getItem('classnotes_session_user');
            if (currentStr) {
              const parsedSession = JSON.parse(currentStr) as UserProfile;
              parsedSession.points = newPoints;
              const updatedStr = JSON.stringify(parsedSession);
              if (localStorage.getItem('classnotes_session_user')) {
                localStorage.setItem('classnotes_session_user', updatedStr);
              } else {
                sessionStorage.setItem('classnotes_session_user', updatedStr);
              }
            }
          }
          return { ...u, points: newPoints };
        }
        return u;
      });
      localStorage.setItem('classnotes_seeded_users', JSON.stringify(updated));
      setUsersList(updated);
      showToast(`Points adjusted by ${amount > 0 ? '+' : ''}${amount}`, 'success');
    }
  };

  const handleDeleteNote = (id: string, title: string) => {
    setDeleteTarget({ id, title, type: 'note' });
  };

  const handleApproveNote = async (id: string, title: string) => {
    const targetNote = notes.find(n => n.id === id);
    const authorId = targetNote?.authorId;
    try {
      await approveNote(id);
      const settingsStr = localStorage.getItem('classnotes_admin_settings');
      const cachedSettings = settingsStr ? JSON.parse(settingsStr) : { uploadRewardPoints: 50 };
      const reward = cachedSettings.uploadRewardPoints ?? 50;

      // Add notification for author
      useNotificationStore.getState().addNotification(
        'Document Approved',
        `Your uploaded note "${title}" has been approved! Earned +${reward} points.`,
        'upload',
        authorId
      );
      showToast(`Note "${title}" approved!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to approve note', 'error');
    }
  };

  const handleRejectNote = (id: string, title: string) => {
    setDeleteTarget({ id, title, type: 'reject-note' });
  };

  const handleDismissReports = async (id: string, title: string) => {
    try {
      await dismissReports(id);
      showToast(`Reports for note "${title}" dismissed.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to dismiss reports', 'error');
    }
  };

  const handleDeleteReportedNote = (id: string, title: string) => {
    setDeleteTarget({ id, title, type: 'report-note' });
  };

  const handleDeleteAnnouncement = (id: string, title: string) => {
    setDeleteTarget({ id, title, type: 'announcement' });
  };

  const handleDeleteEvent = (id: string, title: string) => {
    setDeleteTarget({ id, title, type: 'event' });
  };

  const handleDeleteReward = (id: string, title: string) => {
    setDeleteTarget({ id, title, type: 'reward' });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const { id, title, type } = deleteTarget;
    const targetNote = notes.find(n => n.id === id);
    const authorId = targetNote?.authorId;
    setDeleteTarget(null);
    try {
      if (type === 'note') {
        await deleteNote(id);
        showToast('Note deleted successfully', 'success');
      } else if (type === 'reject-note') {
        await rejectNote(id);
        useNotificationStore.getState().addNotification(
          'Document Rejected',
          `Your uploaded note "${title}" was rejected by an administrator.`,
          'upload',
          authorId
        );
        showToast(`Note "${title}" rejected and deleted.`, 'success');
      } else if (type === 'report-note') {
        await deleteNote(id);
        showToast(`Flagged note "${title}" deleted.`, 'success');
      } else if (type === 'announcement') {
        await deleteAnnouncement(id);
        showToast('Announcement deleted successfully', 'success');
      } else if (type === 'event') {
        await deleteEvent(id);
        showToast('Event deleted successfully', 'success');
      } else if (type === 'reward') {
        await deleteRewardItem(id);
        showToast('Reward item deleted successfully', 'success');
      } else if (type === 'request') {
        await noteRequestsService.deleteRequest(id);
        showToast('Note request deleted successfully', 'success');
      }
    } catch (err: any) {
      showToast(err.message || `Failed to delete ${type}`, 'error');
    }
  };

  // Filters logic memoized for high-performance rendering
  const filteredNotes = React.useMemo(() => {
    return notes.filter(n => 
      (n.status === 'approved' || !n.status) &&
      (n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       n.authorName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [notes, searchQuery]);

  const filteredPendingNotes = React.useMemo(() => {
    return notes.filter(n => 
      n.status === 'pending' &&
      (n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       n.authorName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [notes, searchQuery]);

  const filteredReportedNotes = React.useMemo(() => {
    return notes.filter(n => 
      n.reportsCount > 0 &&
      (n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       n.authorName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [notes, searchQuery]);

  const filteredAnnouncements = React.useMemo(() => {
    return announcements.filter(a => 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [announcements, searchQuery]);

  const filteredEvents = React.useMemo(() => {
    return events.filter(e => 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.courseName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [events, searchQuery]);

  const filteredUsers = React.useMemo(() => {
    return usersList.filter(u => 
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [usersList, searchQuery]);

  const filteredRewards = React.useMemo(() => {
    return rewardsList.filter(r => 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rewardsList, searchQuery]);

  const filteredRequests = React.useMemo(() => {
    return requestsList.filter(r => 
      r.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requestedByName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [requestsList, searchQuery]);

  // Tabs definitions memoized
  const pendingCount = React.useMemo(() => notes.filter(n => n.status === 'pending').length, [notes]);
  const reportedCount = React.useMemo(() => notes.filter(n => n.reportsCount > 0).length, [notes]);

  return (
    <div className="space-y-8 animate-fade-in pb-12 relative">
      {/* Toast popup */}
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
      <div className="border-b border-border pb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-danger font-semibold">Console Control</span>
          <h1 className="text-3xl font-bold mt-1 tracking-tight flex items-center gap-2">
            <Shield size={26} className="text-danger" />
            Admin Portal
          </h1>
        </div>
      </div>

      {/* Tab controls */}
      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        {/* Left Side: Navigation Tabs */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-1 select-none">
          <button
            onClick={() => { setActiveTab('notes'); setSearchQuery(''); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-semibold tracking-wider uppercase transition-all ${
              activeTab === 'notes' 
                ? 'bg-accent text-surface border border-accent' 
                : 'border border-border text-primary/70 hover:bg-primary/5 hover:text-primary'
            } cursor-pointer`}
          >
            <BookOpen size={14} />
            Notes Manager ({notes.filter(n => n.status === 'approved' || !n.status).length})
          </button>

          <button
            onClick={() => { setActiveTab('verification'); setSearchQuery(''); }}
            className={`flex items-center justify-between px-4 py-3 rounded-md text-xs font-semibold tracking-wider uppercase transition-all ${
              activeTab === 'verification' 
                ? 'bg-accent text-surface border border-accent' 
                : 'border border-border text-primary/70 hover:bg-primary/5 hover:text-primary'
            } cursor-pointer`}
          >
            <span className="flex items-center gap-3">
              <Check size={14} />
              Verification Queue
            </span>
            {pendingCount > 0 && (
              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                activeTab === 'verification' ? 'bg-surface text-accent' : 'bg-accent text-surface'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('reports'); setSearchQuery(''); }}
            className={`flex items-center justify-between px-4 py-3 rounded-md text-xs font-semibold tracking-wider uppercase transition-all ${
              activeTab === 'reports' 
                ? 'bg-accent text-surface border border-accent' 
                : 'border border-border text-primary/70 hover:bg-primary/5 hover:text-primary'
            } cursor-pointer`}
          >
            <span className="flex items-center gap-3">
              <AlertTriangle size={14} />
              Reports Log
            </span>
            {reportedCount > 0 && (
              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                activeTab === 'reports' ? 'bg-surface text-danger' : 'bg-danger text-surface'
              }`}>
                {reportedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('requests'); setSearchQuery(''); }}
            className={`flex items-center justify-between px-4 py-3 rounded-md text-xs font-semibold tracking-wider uppercase transition-all ${
              activeTab === 'requests' 
                ? 'bg-accent text-surface border border-accent' 
                : 'border border-border text-primary/70 hover:bg-primary/5 hover:text-primary'
            } cursor-pointer`}
          >
            <span className="flex items-center gap-3">
              <BookOpen size={14} />
              Notes Requests
            </span>
            {requestsList.filter(r => r.status === 'pending').length > 0 && (
              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                activeTab === 'requests' ? 'bg-surface text-accent' : 'bg-accent text-surface'
              }`}>
                {requestsList.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('announcements'); setSearchQuery(''); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-semibold tracking-wider uppercase transition-all ${
              activeTab === 'announcements' 
                ? 'bg-accent text-surface border border-accent' 
                : 'border border-border text-primary/70 hover:bg-primary/5 hover:text-primary'
            } cursor-pointer`}
          >
            <Megaphone size={14} />
            Notice Board ({announcements.length})
          </button>

          <button
            onClick={() => { setActiveTab('events'); setSearchQuery(''); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-semibold tracking-wider uppercase transition-all ${
              activeTab === 'events' 
                ? 'bg-accent text-surface border border-accent' 
                : 'border border-border text-primary/70 hover:bg-primary/5 hover:text-primary'
            } cursor-pointer`}
          >
            <CalendarIcon size={14} />
            Calendar Events ({events.length})
          </button>

          <button
            onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-semibold tracking-wider uppercase transition-all ${
              activeTab === 'users' 
                ? 'bg-accent text-surface border border-accent' 
                : 'border border-border text-primary/70 hover:bg-primary/5 hover:text-primary'
            } cursor-pointer`}
          >
            <Users size={14} />
            Users ({usersList.length})
          </button>

          <button
            onClick={() => { setActiveTab('rewards'); setSearchQuery(''); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-semibold tracking-wider uppercase transition-all ${
              activeTab === 'rewards' 
                ? 'bg-accent text-surface border border-accent' 
                : 'border border-border text-primary/70 hover:bg-primary/5 hover:text-primary'
            } cursor-pointer`}
          >
            <Award size={14} />
            Shop Catalog ({rewardsList.length})
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setSearchQuery(''); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-semibold tracking-wider uppercase transition-all ${
              activeTab === 'settings' 
                ? 'bg-accent text-surface border border-accent' 
                : 'border border-border text-primary/70 hover:bg-primary/5 hover:text-primary'
            } cursor-pointer`}
          >
            <Settings size={14} />
            Settings Console
          </button>
        </div>

        {/* Right Side: Tab Contents console */}
        <div className="flex-1 space-y-6">
          {/* Global Search inside Admin (hidden for settings tab) */}
          {activeTab !== 'settings' && (
            <div className="luxury-card p-4">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/35" />
                <input
                  type="text"
                  placeholder={`Search active tab: ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs border border-border bg-background/50 focus:bg-surface focus:border-accent rounded-md transition-all outline-none"
                />
              </div>
            </div>
          )}

          {/* Active Tab Panel */}
          <div className="luxury-card p-6 bg-surface overflow-x-auto">
            {activeTab === 'notes' && (
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="border-b border-border text-primary/50 uppercase font-mono tracking-wider font-semibold">
                  <tr>
                    <th className="pb-3">Title</th>
                    <th className="pb-3">Subject</th>
                    <th className="pb-3">Author</th>
                    <th className="pb-3">Downloads</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredNotes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-primary/45 font-mono">No approved notes found</td>
                    </tr>
                  ) : (
                    filteredNotes.map((note) => (
                      <tr key={note.id} className="hover:bg-primary/[0.01]">
                        <td className="py-3.5 font-semibold text-primary">{note.title}</td>
                        <td className="py-3.5 text-primary/70 font-mono text-[10px]">{note.subject}</td>
                        <td className="py-3.5 text-primary/70">{note.authorName}</td>
                        <td className="py-3.5 font-mono">{note.downloadsCount}</td>
                        <td className="py-3.5 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => setActivePreviewNote(note)}
                            className="p-1 border border-border text-primary/40 hover:text-accent hover:bg-accent/5 hover:border-accent/25 rounded cursor-pointer transition-colors"
                            title="Preview file"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id, note.title)}
                            className="p-1 border border-border text-primary/40 hover:text-danger hover:bg-danger/5 hover:border-danger/25 rounded cursor-pointer transition-colors"
                            title="Delete note file"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'verification' && (
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="border-b border-border text-primary/50 uppercase font-mono tracking-wider font-semibold">
                  <tr>
                    <th className="pb-3">Title</th>
                    <th className="pb-3">Subject</th>
                    <th className="pb-3">Author</th>
                    <th className="pb-3">Date Uploaded</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPendingNotes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-primary/45 font-mono">Verification queue is empty</td>
                    </tr>
                  ) : (
                    filteredPendingNotes.map((note) => (
                      <tr key={note.id} className="hover:bg-primary/[0.01]">
                        <td className="py-3.5 font-semibold text-primary">{note.title}</td>
                        <td className="py-3.5 text-primary/70 font-mono text-[10px]">{note.subject}</td>
                        <td className="py-3.5 text-primary/70">{note.authorName}</td>
                        <td className="py-3.5 font-mono text-primary/50 text-[10px]">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => setActivePreviewNote(note)}
                            className="p-1 border border-border text-primary/40 hover:text-accent hover:bg-accent/5 hover:border-accent/25 rounded cursor-pointer transition-colors"
                            title="Preview note"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => handleApproveNote(note.id, note.title)}
                            className="p-1 border border-border text-primary/45 hover:text-success hover:bg-success/5 hover:border-success/25 rounded cursor-pointer transition-colors"
                            title="Approve document"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => handleRejectNote(note.id, note.title)}
                            className="p-1 border border-border text-primary/45 hover:text-danger hover:bg-danger/5 hover:border-danger/25 rounded cursor-pointer transition-colors"
                            title="Reject and delete"
                          >
                            <Ban size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'reports' && (
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="border-b border-border text-primary/50 uppercase font-mono tracking-wider font-semibold">
                  <tr>
                    <th className="pb-3">Title</th>
                    <th className="pb-3">Reports Count</th>
                    <th className="pb-3">Author</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredReportedNotes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-primary/45 font-mono">No reported documents found</td>
                    </tr>
                  ) : (
                    filteredReportedNotes.map((note) => (
                      <tr key={note.id} className="hover:bg-primary/[0.01]">
                        <td className="py-3.5 font-semibold text-primary">{note.title}</td>
                        <td className="py-3.5 text-danger font-semibold font-mono flex items-center gap-1.5">
                          <AlertTriangle size={12} className="text-danger shrink-0" />
                          <span>{note.reportsCount} report(s)</span>
                        </td>
                        <td className="py-3.5 text-primary/70">{note.authorName}</td>
                        <td className="py-3.5">
                          <span className={`inline-block border text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-sm ${
                            note.status === 'pending'
                              ? 'bg-warning/5 text-warning border-warning/25'
                              : 'bg-success/5 text-success border-success/25'
                          }`}>
                            {note.status || 'approved'}
                          </span>
                        </td>
                        <td className="py-3.5 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => setActivePreviewNote(note)}
                            className="p-1 border border-border text-primary/40 hover:text-accent hover:bg-accent/5 hover:border-accent/25 rounded cursor-pointer transition-colors"
                            title="Preview note"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => handleDismissReports(note.id, note.title)}
                            className="p-1 border border-border text-primary/45 hover:text-success hover:bg-success/5 hover:border-success/25 rounded cursor-pointer transition-colors"
                            title="Dismiss reports flags"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteReportedNote(note.id, note.title)}
                            className="p-1 border border-border text-primary/45 hover:text-danger hover:bg-danger/5 hover:border-danger/25 rounded cursor-pointer transition-colors"
                            title="Delete note document"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'requests' && (
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="border-b border-border text-primary/50 uppercase font-mono tracking-wider font-semibold">
                  <tr>
                    <th className="pb-3">Subject</th>
                    <th className="pb-3">Topic</th>
                    <th className="pb-3">Cohort Info</th>
                    <th className="pb-3">Requested By</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-primary/45 font-mono">No note requests found</td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => (
                      <tr key={req.requestId} className="hover:bg-primary/[0.01]">
                        <td className="py-3.5 font-semibold text-primary">{req.subject}</td>
                        <td className="py-3.5 text-primary/80">{req.topic}</td>
                        <td className="py-3.5 text-primary/70">
                          {req.course} • Sem {req.semester} • {req.batch}
                        </td>
                        <td className="py-3.5 text-primary/70">{req.requestedByName}</td>
                        <td className="py-3.5">
                          <span className={`inline-block border text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-sm ${
                            req.status === 'fulfilled' 
                              ? 'bg-success/5 text-success border-success/25' 
                              : 'bg-warning/5 text-warning border-warning/25'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteRequest(req.requestId, `${req.subject}: ${req.topic}`)}
                            className="p-1 border border-border text-primary/40 hover:text-danger hover:bg-danger/5 hover:border-danger/25 rounded cursor-pointer transition-colors"
                            title="Delete note request"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'announcements' && (
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="border-b border-border text-primary/50 uppercase font-mono tracking-wider font-semibold">
                  <tr>
                    <th className="pb-3">Notice Title</th>
                    <th className="pb-3">Priority</th>
                    <th className="pb-3">Author</th>
                    <th className="pb-3">Created At</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAnnouncements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-primary/45 font-mono">No notice documents found</td>
                    </tr>
                  ) : (
                    filteredAnnouncements.map((ann) => (
                      <tr key={ann.id} className="hover:bg-primary/[0.01]">
                        <td className="py-3.5 font-semibold text-primary">{ann.title}</td>
                        <td className="py-3.5 text-primary/75">
                          <span className={`inline-block border text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-sm ${
                            ann.priority === 'alert' 
                              ? 'bg-danger/5 text-danger border-danger/25' 
                              : ann.priority === 'important'
                                ? 'bg-warning/5 text-warning border-warning/25'
                                : 'bg-accent/5 text-accent border-accent/25'
                          }`}>
                            {ann.priority}
                          </span>
                        </td>
                        <td className="py-3.5 text-primary/70">{ann.authorName}</td>
                        <td className="py-3.5 font-mono text-primary/50 text-[10px]">
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                            className="p-1 border border-border text-primary/40 hover:text-danger hover:bg-danger/5 hover:border-danger/25 rounded cursor-pointer transition-colors"
                            title="Delete announcement notice"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'events' && (
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="border-b border-border text-primary/50 uppercase font-mono tracking-wider font-semibold">
                  <tr>
                    <th className="pb-3">Event Title</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Subject / Course</th>
                    <th className="pb-3">Schedule Date</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-primary/45 font-mono">No calendar events found</td>
                    </tr>
                  ) : (
                    filteredEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-primary/[0.01]">
                        <td className="py-3.5 font-semibold text-primary">{event.title}</td>
                        <td className="py-3.5">
                          <span className={`inline-block border text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-sm ${
                            event.type === 'exam' 
                              ? 'bg-danger/5 text-danger border-danger/25' 
                              : event.type === 'assignment'
                                ? 'bg-warning/5 text-warning border-warning/25'
                                : event.type === 'lecture'
                                  ? 'bg-accent/5 text-accent border-accent/25'
                                  : 'bg-success/5 text-success border-success/25'
                          }`}>
                            {event.type}
                          </span>
                        </td>
                        <td className="py-3.5 text-primary/70">{event.courseName}</td>
                        <td className="py-3.5 font-mono text-[10px] text-primary/50">{event.date}</td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteEvent(event.id, event.title)}
                            className="p-1 border border-border text-primary/40 hover:text-danger hover:bg-danger/5 hover:border-danger/25 rounded cursor-pointer transition-colors"
                            title="Delete event node"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'users' && (
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="border-b border-border text-primary/50 uppercase font-mono tracking-wider font-semibold">
                  <tr>
                    <th className="pb-3">Display Name</th>
                    <th className="pb-3">Email Address</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Points Balance</th>
                    <th className="pb-3 text-right text-nowrap">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-primary/45 font-mono">No users found</td>
                    </tr>
                  ) : (
                    filteredUsers.map((userProfile) => (
                      <tr key={userProfile.uid} className="hover:bg-primary/[0.01]">
                        <td className="py-3.5 font-semibold text-primary">
                          {userProfile.displayName}
                          {userProfile.uid === currentUser?.uid && (
                            <span className="text-[8px] font-mono text-accent uppercase font-bold border border-accent/25 px-1 ml-2 rounded bg-accent/5">You</span>
                          )}
                        </td>
                        <td className="py-3.5 text-primary/70">{userProfile.email}</td>
                        <td className="py-3.5">
                          <span className={`inline-block border text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-sm ${
                            userProfile.status === 'suspended' 
                              ? 'bg-danger/5 text-danger border-danger/25' 
                              : 'bg-success/5 text-success border-success/25'
                          }`}>
                            {userProfile.status || 'active'}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <select
                            value={userProfile.role}
                            onChange={(e) => handleRoleChange(userProfile.uid, e.target.value as UserRole)}
                            className="text-[10px] border border-border rounded px-2 py-1 bg-surface focus:outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="student">Student</option>
                            <option value="admin">Administrator</option>
                            <option value="guest">Guest</option>
                          </select>
                        </td>
                        <td className="py-3.5 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span>{userProfile.points}</span>
                            <button
                              onClick={() => handleModifyPoints(userProfile.uid, 50)}
                              className="p-0.5 border border-border text-primary/40 hover:text-success hover:border-success/35 rounded cursor-pointer transition-colors"
                              title="Add 50 reward points"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              onClick={() => handleModifyPoints(userProfile.uid, -50)}
                              className="p-0.5 border border-border text-primary/40 hover:text-danger hover:border-danger/35 rounded cursor-pointer transition-colors"
                              title="Deduct 50 reward points"
                            >
                              <Minus size={10} />
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResetPassword(userProfile.uid, userProfile.displayName)}
                              className="px-2 py-1 border border-border text-primary/45 hover:text-accent hover:bg-accent/5 hover:border-accent/25 rounded cursor-pointer transition-colors flex items-center gap-1 text-[10px] font-medium"
                              title="Reset user sandbox password to 'sandbox123'"
                            >
                              <Key size={10} />
                              Reset PW
                            </button>
                            <button
                              onClick={() => toggleUserSuspension(userProfile.uid, userProfile.status || 'active')}
                              className={`px-2 py-1 border text-[10px] font-semibold rounded cursor-pointer transition-colors flex items-center gap-1 ${
                                userProfile.status === 'suspended'
                                  ? 'border-success/20 text-success hover:bg-success/5 hover:border-success/30'
                                  : 'border-danger/20 text-danger hover:bg-danger/5 hover:border-danger/30'
                              }`}
                              title={userProfile.status === 'suspended' ? 'Unsuspend student' : 'Suspend student account'}
                            >
                              <Ban size={10} />
                              {userProfile.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'rewards' && (
              <div className="space-y-8">
                {/* Add New Reward Form */}
                <div className="border border-border rounded-lg p-5 bg-background/25">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-primary/60 border-b border-border pb-2 mb-4 font-bold">
                    Create New Redeemable Shop Item
                  </h3>
                  
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!rewardTitle || !rewardDescription) {
                        showToast('Please fill in all required fields.', 'error');
                        return;
                      }
                      try {
                        await addRewardItem({
                          title: rewardTitle,
                          description: rewardDescription,
                          pointsRequired: rewardPoints,
                          stock: rewardStock,
                          type: rewardType,
                          imageUrl: '/study_guide_cover.png',
                          course: rewardCourse,
                          semester: rewardSemester
                        });
                        showToast(`Successfully created "${rewardTitle}"!`, 'success');
                        // Reset form
                        setRewardTitle('');
                        setRewardDescription('');
                        setRewardPoints(30);
                        setRewardStock(50);
                        setRewardType('cheat_sheet');
                        setRewardCourse('BCA');
                        setRewardSemester('1');
                      } catch (err: any) {
                        showToast(err.message || 'Failed to create reward item.', 'error');
                      }
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
                  >
                    <div className="space-y-1 md:col-span-2">
                      <label className="font-bold text-primary">Item Title</label>
                      <input 
                        type="text" 
                        value={rewardTitle}
                        onChange={(e) => setRewardTitle(e.target.value)}
                        placeholder="e.g. Advanced TypeScript Deep Dive"
                        className="w-full border border-border bg-surface rounded px-3 py-2 focus:outline-none focus:border-accent"
                        required
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="font-bold text-primary">Item Description</label>
                      <textarea 
                        value={rewardDescription}
                        onChange={(e) => setRewardDescription(e.target.value)}
                        placeholder="Provide detailed description of the cheat sheet, guide, or exam contents..."
                        className="w-full border border-border bg-surface rounded px-3 py-2 focus:outline-none focus:border-accent h-20 resize-none"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-primary">Item Type</label>
                      <select 
                        value={rewardType}
                        onChange={(e) => setRewardType(e.target.value as RewardItem['type'])}
                        className="w-full border border-border bg-surface rounded px-3 py-2 focus:outline-none focus:border-accent cursor-pointer"
                      >
                        <option value="cheat_sheet">Cheat Sheet</option>
                        <option value="guide">Study Guide</option>
                        <option value="summary">Summary</option>
                        <option value="mock_exam">Mock Exam</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-primary">Points Required (Cost)</label>
                      <input 
                        type="number" 
                        min={0}
                        value={rewardPoints}
                        onChange={(e) => setRewardPoints(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full border border-border bg-surface rounded px-3 py-2 focus:outline-none focus:border-accent"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-primary">Initial Stock Quantity</label>
                      <input 
                        type="number" 
                        min={0}
                        value={rewardStock}
                        onChange={(e) => setRewardStock(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full border border-border bg-surface rounded px-3 py-2 focus:outline-none focus:border-accent"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-primary">Target Course</label>
                      <select 
                        value={rewardCourse}
                        onChange={(e) => setRewardCourse(e.target.value)}
                        className="w-full border border-border bg-surface rounded px-3 py-2 focus:outline-none focus:border-accent cursor-pointer"
                      >
                        <option value="BCA">BCA</option>
                        <option value="BBA">BBA</option>
                        <option value="B.Tech">B.Tech</option>
                        <option value="B.Sc">B.Sc</option>
                        <option value="B.Com">B.Com</option>
                        <option value="BA">BA</option>
                        <option value="B.Ed">B.Ed</option>
                        <option value="B.Arch">B.Arch</option>
                        <option value="BFA">BFA</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-primary">Target Semester</label>
                      <select 
                        value={rewardSemester}
                        onChange={(e) => setRewardSemester(e.target.value)}
                        className="w-full border border-border bg-surface rounded px-3 py-2 focus:outline-none focus:border-accent cursor-pointer"
                      >
                        {[...Array(8)].map((_, i) => (
                          <option key={i + 1} value={String(i + 1)}>
                            Semester {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end md:col-span-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-accent text-surface text-xs font-bold uppercase tracking-wider rounded border border-accent hover:bg-surface hover:text-accent transition-all cursor-pointer font-mono flex items-center gap-1"
                      >
                        <Plus size={12} />
                        Add New Shop Item
                      </button>
                    </div>
                  </form>
                </div>

                {/* Rewards Catalog Table */}
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="border-b border-border text-primary/50 uppercase font-mono tracking-wider font-semibold">
                    <tr>
                      <th className="pb-3">Title</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Cost (Points)</th>
                      <th className="pb-3">Stock Available</th>
                      <th className="pb-3">Downloads</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRewards.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-primary/45 font-mono">No rewards items found</td>
                      </tr>
                    ) : (
                      filteredRewards.map((item) => (
                        <tr key={item.id} className="hover:bg-primary/[0.01]">
                          <td className="py-3.5 font-semibold text-primary">
                            <div>{item.title}</div>
                            {(item.course || item.semester) && (
                              <div className="text-[10px] font-mono text-primary/45 mt-0.5 uppercase font-medium">
                                {item.course || 'All'} • Semester {item.semester || 'All'}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5">
                            <span className="bg-primary/5 border border-border px-2 py-0.5 rounded-sm text-primary/65 font-mono text-[9px] uppercase">
                              {item.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 font-semibold font-mono text-accent">{item.pointsRequired} pts</td>
                          <td className="py-3.5 font-mono">{item.stock} in stock</td>
                          <td className="py-3.5 font-mono text-primary/50">{item.downloadsCount} claims</td>
                          <td className="py-3.5 text-right">
                            <button
                              onClick={() => handleDeleteReward(item.id, item.title)}
                              className="p-1 border border-border text-primary/40 hover:text-danger hover:bg-danger/5 hover:border-danger/25 rounded cursor-pointer transition-colors"
                              title="Delete reward item"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'settings' && (
              <form onSubmit={handleSaveSettings} className="space-y-6 max-w-lg">
                <div className="space-y-4">
                  <h3 className="text-sm font-mono uppercase tracking-wider text-primary/60 border-b border-border pb-2">Global Document Policies</h3>
                  
                  {/* Auto Approve Toggle */}
                  <div className="flex items-center justify-between p-3 border border-border rounded-md bg-background/30 hover:bg-background/50 transition-colors">
                    <div>
                      <label className="text-xs font-bold text-primary block">Automatic Document Approval</label>
                      <span className="text-[10px] text-primary/50 font-mono">Bypasses verification queue; immediately awards points.</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={settings.autoApprove}
                      onChange={(e) => setSettings({ ...settings, autoApprove: e.target.checked })}
                      className="w-4 h-4 text-accent accent-accent rounded focus:ring-0 cursor-pointer"
                    />
                  </div>

                  {/* Disable points constraint Toggle */}
                  <div className="flex items-center justify-between p-3 border border-border rounded-md bg-background/30 hover:bg-background/50 transition-colors">
                    <div>
                      <label className="text-xs font-bold text-primary block">Allow Free Downloads</label>
                      <span className="text-[10px] text-primary/50 font-mono">Toggle points-based downloading constraint (free access for all).</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={settings.disablePointsConstraint}
                      onChange={(e) => setSettings({ ...settings, disablePointsConstraint: e.target.checked })}
                      className="w-4 h-4 text-accent accent-accent rounded focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-mono uppercase tracking-wider text-primary/60 border-b border-border pb-2">Gamification Parameters</h3>
                  
                  {/* Upload Points Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-primary block">Upload Reward Points</label>
                    <span className="text-[10px] text-primary/50 font-mono block mb-1">Points awarded to authors upon note approval.</span>
                    <input 
                      type="number"
                      min={0}
                      value={settings.uploadRewardPoints}
                      onChange={(e) => setSettings({ ...settings, uploadRewardPoints: parseInt(e.target.value) || 0 })}
                      className="w-full border border-border bg-background/50 rounded px-3 py-2 text-xs focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Download Points Cost Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-primary block">Download Cost Points</label>
                    <span className="text-[10px] text-primary/50 font-mono block mb-1">Points deducted from student account on resource download.</span>
                    <input 
                      type="number"
                      min={0}
                      value={settings.downloadNoteCost}
                      onChange={(e) => setSettings({ ...settings, downloadNoteCost: parseInt(e.target.value) || 0 })}
                      className="w-full border border-border bg-background/50 rounded px-3 py-2 text-xs focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-accent text-surface text-xs font-bold uppercase tracking-wider rounded border border-accent hover:bg-surface hover:text-accent transition-all cursor-pointer font-mono"
                >
                  Save Settings Configuration
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Note preview drawer */}
      {activePreviewNote && (
        <DocumentViewer
          note={activePreviewNote}
          isOpen={activePreviewNote !== null}
          onClose={() => setActivePreviewNote(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="fixed inset-0 bg-primary/45 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 15 }}
              className="bg-surface border border-border w-full max-w-md rounded-lg shadow-luxury p-6 relative z-10 flex flex-col gap-4 text-left"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-danger/10 text-danger border border-danger/25 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-primary">Confirm Deletion</h3>
                  <p className="text-xs text-primary/60 mt-1 leading-relaxed">
                    Are you sure you want to delete <span className="font-semibold text-primary">"{deleteTarget.title}"</span>? This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 border border-border text-primary/70 hover:text-primary rounded-md text-xs font-semibold hover:bg-primary/5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  className="px-4 py-2 bg-danger text-surface hover:bg-danger/95 rounded-md text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-danger focus:outline-none"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;

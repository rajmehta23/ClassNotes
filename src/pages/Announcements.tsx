import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNoticeStore } from '@/features/announcements/useNoticeStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useNotificationStore } from '@/features/notifications/useNotificationStore';
import { AnnouncementInputSchema, type AnnouncementInput, type Announcement } from '@/types/database';
import { 
  Megaphone, Search, Plus, Trash2, Clock, X, AlertTriangle, 
  Info, AlertCircle, Loader2, CheckCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useDocumentMetadata } from '@/hooks/useDocumentMetadata';

export const Announcements: React.FC = () => {
  useDocumentMetadata('Notice Board', 'Read the latest campus announcements, academic alerts, and course notices.');
  const { user } = useAuthStore();
  const { 
    announcements, fetchAnnouncements, createAnnouncement, deleteAnnouncement, isLoading 
  } = useNoticeStore();
  const { addNotification } = useNotificationStore();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  
  // Modals/forms state
  const [isPublishingOpen, setIsPublishingOpen] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast status feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const showToast = (text: string, type: 'error' | 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Setup form with validation schema
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementInput>({
    resolver: zodResolver(AnnouncementInputSchema),
    defaultValues: {
      title: '',
      content: '',
      priority: 'info',
    }
  });

  const onSubmitNotice = async (data: AnnouncementInput) => {
    if (!user) return;
    setFormError(null);
    try {
      await createAnnouncement(data, { uid: user.uid, displayName: user.displayName });
      
      // Trigger notification
      addNotification(
        'New Announcement',
        `Admin published a notice: "${data.title}"`,
        'announcement'
      );
      
      setPublishSuccess(true);
      reset();
      
      showToast('Announcement published successfully', 'success');
      setTimeout(() => {
        setIsPublishingOpen(false);
        setPublishSuccess(false);
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Failed to publish notice. Try again.');
    }
  };

  const handleDeleteNotice = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const executeDeleteNotice = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteAnnouncement(id);
      showToast('Announcement deleted successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete announcement', 'error');
    }
  };

  // Filter notices reactively
  const filteredNotices = announcements.filter((notice) => {
    const matchesSearch = 
      notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notice.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === '' || notice.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getPriorityStyle = (priority: Announcement['priority']) => {
    if (priority === 'alert') {
      return {
        bg: 'bg-danger/5 border-danger/25 text-danger',
        icon: AlertCircle,
        label: 'Alert'
      };
    }
    if (priority === 'important') {
      return {
        bg: 'bg-warning/5 border-warning/25 text-warning',
        icon: AlertTriangle,
        label: 'Important'
      };
    }
    return {
      bg: 'bg-accent/5 border-accent/25 text-accent',
      icon: Info,
      label: 'Info'
    };
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      {/* Toast Alert Feedback */}
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

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">Notice Board</span>
          <h1 className="text-3xl font-bold mt-1 tracking-tight">Announcements</h1>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsPublishingOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-surface font-semibold px-4 py-2.5 rounded-md text-xs shadow-sm active-scale transition-all select-none cursor-pointer"
          >
            <Plus size={14} />
            Publish Notice
          </button>
        )}
      </div>

      {/* Grid of Notices and Search */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Cols: Notices list feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters controls */}
          <div className="luxury-card p-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/35" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-border bg-background/50 focus:bg-surface focus:border-accent rounded-md transition-all outline-none"
              />
            </div>
            
            <div className="flex items-center gap-2 border border-border rounded px-2.5 py-1.5 bg-background/30 text-xs">
              <span className="text-primary/45 font-mono">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-primary cursor-pointer pr-1 font-medium font-sans"
              >
                <option value="">All Priorities</option>
                <option value="info">Info Only</option>
                <option value="important">Important Only</option>
                <option value="alert">Alerts Only</option>
              </select>
            </div>
          </div>

          {/* Notices feed */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, idx) => (
                <div key={idx} className="luxury-card p-6 h-40 animate-pulse bg-surface flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-primary/5 rounded w-1/4" />
                    <div className="h-6 bg-primary/5 rounded w-3/4" />
                    <div className="h-12 bg-primary/5 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="luxury-card p-12 flex flex-col items-center justify-center text-center select-none min-h-[300px]">
              <div className="w-12 h-12 bg-primary/5 border border-border rounded-full flex items-center justify-center mb-4 text-primary/40">
                <Megaphone size={18} />
              </div>
              <h3 className="font-bold text-base text-primary mb-1">No announcements found</h3>
              <p className="text-xs text-primary/45 max-w-sm">
                There are no published notices matching your active filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotices.map((notice) => {
                const conf = getPriorityStyle(notice.priority);
                const ConfIcon = conf.icon;
                return (
                  <motion.article
                    key={notice.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="premium-card p-6 relative flex flex-col justify-between group hover-scale duration-300"
                  >
                    <div className="space-y-3">
                      {/* Priority pill & meta details */}
                      <div className="flex justify-between items-start gap-4">
                        <span className={`inline-flex items-center gap-1.5 text-[8px] font-mono font-bold uppercase tracking-wider border px-2 py-0.5 rounded ${conf.bg}`}>
                          <ConfIcon size={9} />
                          {conf.label}
                        </span>

                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-primary/45">
                          <Clock size={10} />
                          <span>{new Date(notice.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      </div>

                      {/* Title & Content */}
                      <div className="space-y-2 select-text">
                        <h3 className="text-base font-extrabold text-primary leading-tight tracking-tight break-words group-hover:text-accent transition-colors">
                          {notice.title}
                        </h3>
                        <p className="text-xs text-primary/65 leading-relaxed font-sans whitespace-pre-wrap">
                          {notice.content}
                        </p>
                      </div>
                    </div>

                    {/* Author & Actions bar */}
                    <div className="flex justify-between items-center border-t border-border/45 pt-4 mt-6 text-[9px] font-mono text-primary/45 uppercase font-bold">
                      <span>Published by: {notice.authorName}</span>
                      
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteNotice(notice.id, notice.title)}
                          className="p-1 border border-border/60 text-primary/45 hover:text-danger hover:bg-danger/5 hover:border-danger/25 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 active-scale"
                          title="Delete notice"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Quick details/guideline block */}
        <div className="space-y-6">
          <div className="premium-card p-6 space-y-4">
            <div className="w-10 h-10 rounded-full border border-accent/20 bg-accent/5 flex items-center justify-center">
              <Megaphone size={18} className="text-accent" />
            </div>
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm tracking-tight text-primary">Notice Board Guidelines</h3>
              <p className="text-[11px] text-primary/65 leading-relaxed font-sans">
                The notice board is a centralized campus portal. Only administrators and instructors can publish notice alerts. All notices are stored and replicated in real-time, syncing to the dashboard overview feed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Publish Modal overlay */}
      <AnimatePresence>
        {isPublishingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmitting) setIsPublishingOpen(false);
              }}
              className="fixed inset-0 bg-primary/45 backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-surface border border-border w-full max-w-md rounded-lg shadow-luxury flex flex-col relative z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="border-b border-border px-5 py-4 flex items-center justify-between bg-surface shrink-0">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-accent font-semibold">Console Control</span>
                  <h2 className="font-bold text-base text-primary">Publish Announcement</h2>
                </div>
                <button
                  onClick={() => setIsPublishingOpen(false)}
                  disabled={isSubmitting}
                  className="p-1 border border-border hover:bg-background text-primary/70 hover:text-primary rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  title="Close modal"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Form body */}
              <div className="p-5">
                {publishSuccess ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center gap-4 animate-scale-in">
                    <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center border border-success/20">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-primary">Notice Published!</h3>
                      <p className="text-xs text-primary/45 mt-1 font-mono">Broadcasting toNotice Board feed.</p>
                    </div>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={handleSubmit(onSubmitNotice)}>
                    {formError && (
                      <div className="p-3 bg-danger/5 border border-danger/25 text-danger rounded-md text-xs flex items-start gap-2">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* Notice Title */}
                    <div className="space-y-1">
                      <label htmlFor="title" className="block text-[10px] font-mono uppercase tracking-wider text-primary/75">
                        Notice Title
                      </label>
                      <input
                        id="title"
                        type="text"
                        placeholder="e.g. Calculus midterm revision schedule"
                        disabled={isSubmitting}
                        {...register('title')}
                        className={`block w-full rounded-md border px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent transition-all ${
                          errors.title ? 'border-danger focus:ring-danger/20' : 'border-border'
                        }`}
                      />
                      {errors.title && (
                        <p className="text-[11px] text-danger flex items-center gap-1 mt-0.5">
                          <AlertCircle size={12} />
                          {errors.title.message}
                        </p>
                      )}
                    </div>

                    {/* Priority select */}
                    <div className="space-y-1">
                      <label htmlFor="priority" className="block text-[10px] font-mono uppercase tracking-wider text-primary/75">
                        Priority Level
                      </label>
                      <select
                        id="priority"
                        disabled={isSubmitting}
                        {...register('priority')}
                        className="block w-full rounded-md border border-border px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent focus:ring-accent/20 transition-all cursor-pointer text-primary"
                      >
                        <option value="info">Info (Blue Tag)</option>
                        <option value="important">Important (Amber Tag)</option>
                        <option value="alert">Critical Alert (Red Tag)</option>
                      </select>
                    </div>

                    {/* Content text */}
                    <div className="space-y-1">
                      <label htmlFor="content" className="block text-[10px] font-mono uppercase tracking-wider text-primary/75">
                        Notice Description
                      </label>
                      <textarea
                        id="content"
                        rows={5}
                        placeholder="Write notice description details..."
                        disabled={isSubmitting}
                        {...register('content')}
                        className={`block w-full rounded-md border px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent transition-all resize-none ${
                          errors.content ? 'border-danger focus:ring-danger/20' : 'border-border'
                        }`}
                      />
                      {errors.content && (
                        <p className="text-[11px] text-danger flex items-center gap-1 mt-0.5">
                          <AlertCircle size={12} />
                          {errors.content.message}
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-xs font-semibold text-surface bg-accent hover:bg-accent/90 focus:outline-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={14} className="animate-spin mr-2" />
                            <span>Publishing notice...</span>
                          </>
                        ) : (
                          <span>Broadcast Announcement</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    Are you sure you want to delete notice <span className="font-semibold text-primary">"{deleteTarget.title}"</span>? This action is permanent and cannot be undone.
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
                  onClick={executeDeleteNotice}
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

export default Announcements;

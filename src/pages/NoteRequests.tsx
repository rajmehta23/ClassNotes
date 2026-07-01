import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { noteRequestsService } from '@/services/noteRequests';
import { useNotificationStore } from '@/features/notifications/useNotificationStore';
import { rewardsService } from '@/services/rewards';
import type { NoteRequest } from '@/types/database';
import { useDocumentMetadata } from '@/hooks/useDocumentMetadata';
import { formatRelativeTime } from '@/utils/format';
import UploadModal from '@/components/UploadModal';
import RequestNotesModal from '@/components/RequestNotesModal';
import { 
  Plus, Sparkles, ThumbsUp, CheckCircle, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NoteRequests: React.FC = () => {
  useDocumentMetadata('Note Requests', 'Request study materials, course notes and past exams within your cohort.');
  
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<NoteRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<NoteRequest | null>(null);

  // Success animations states
  const [showXPToast, setShowXPToast] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    
    setIsLoading(true);
    const unsubscribe = noteRequestsService.subscribeRequests(
      user,
      (list) => {
        setRequests(list);
        setIsLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to requests:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle I Need This Too vote interaction
  const handleVote = async (requestId: string) => {
    if (!user) return;
    
    // Optimistic UI updates
    setRequests(prev => prev.map(r => {
      if (r.requestId === requestId) {
        const users = r.interestedUsers || [];
        const voted = users.includes(user.uid);
        return {
          ...r,
          interestedUsers: voted ? users.filter(uid => uid !== user.uid) : [...users, user.uid],
          interestedCount: voted ? Math.max(0, r.interestedCount - 1) : r.interestedCount + 1
        };
      }
      return r;
    }));

    try {
      await noteRequestsService.voteRequest(requestId, user.uid);
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  // Launch pre-filled upload note modal
  const triggerFulfillUpload = (request: NoteRequest) => {
    setSelectedRequest(request);
    setIsUploadOpen(true);
  };

  // Successful upload callback to complete request fulfillment
  const handleUploadSuccess = async (noteId: string) => {
    if (!selectedRequest || !user) return;
    
    try {
      // 1. Link request in DB
      await noteRequestsService.fulfillRequest(
        selectedRequest.requestId, 
        noteId, 
        user.uid, 
        user.displayName || 'Contributor'
      );

      // 2. Add +100 XP Rewards points
      const updatedPoints = await rewardsService.addPoints(user.uid, 100);
      
      // Update global auth store points
      useAuthStore.setState((state) => {
        if (state.user) {
          return {
            user: { ...state.user, points: updatedPoints }
          };
        }
        return {};
      });

      // 3. Show success +100 XP toast/badge animation
      setShowXPToast(true);
      setTimeout(() => setShowXPToast(false), 3500);

      // 4. Dispatch notifications to requester and interested voters
      const notificationContent = `The requested notes for "${selectedRequest.topic}" are now available.`;
      const recipients = Array.from(new Set([
        selectedRequest.requestedBy,
        ...(selectedRequest.interestedUsers || [])
      ])).filter(uid => uid !== user.uid); // Don't notify the fulfiller

      const notificationsStore = useNotificationStore.getState();
      for (const recipientId of recipients) {
        await notificationsStore.addNotification(
          'Request Fulfilled',
          notificationContent,
          'upload',
          recipientId,
          noteId // Include noteId for direct preview redirect!
        );
      }

    } catch (err) {
      console.error('Failed to fulfill request details:', err);
    } finally {
      setIsUploadOpen(false);
      setSelectedRequest(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in relative">
      {/* Floating XP Rewards Banner Animation */}
      <AnimatePresence>
        {showXPToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 select-none border border-white/20"
          >
            <Sparkles size={18} className="animate-spin" />
            <span className="font-mono font-bold text-xs uppercase tracking-wider">Note Fulfilled! +100 XP Awarded!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">Community Boards</span>
          <h1 className="text-3xl font-bold mt-1 tracking-tight">Note Requests</h1>
          <p className="text-xs text-primary/50 mt-1">
            Cohort: <span className="font-bold text-primary">{user?.course || 'BCA'}</span> • Semester <span className="font-bold text-primary">{user?.semester || '1'}</span> • Batch <span className="font-bold text-primary">{user?.batch || '2024-2027'}</span>
          </p>
        </div>

        <motion.button
          whileHover="hover"
          whileTap="tap"
          onClick={() => setIsRequestModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-linear-to-r from-accent via-blue-500 to-accent bg-[length:200%_auto] hover:bg-[right_center] text-white font-semibold px-4 py-2.5 rounded-lg text-xs shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/35 transition-all duration-300 select-none cursor-pointer font-sans"
        >
          <motion.span
            variants={{
              hover: { y: -2, transition: { repeat: Infinity, repeatType: "reverse", duration: 0.4 } }
            }}
          >
            <Plus size={13} />
          </motion.span>
          Request Notes
        </motion.button>
      </div>

      {/* List / Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="premium-card p-6 space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="w-20 h-4 bg-primary/5 rounded" />
                <div className="w-16 h-5 bg-primary/5 rounded" />
              </div>
              <div className="w-48 h-6 bg-primary/5 rounded" />
              <div className="w-full h-12 bg-primary/5 rounded" />
              <div className="flex justify-between items-center pt-2">
                <div className="w-24 h-4 bg-primary/5 rounded" />
                <div className="w-20 h-8 bg-primary/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="premium-card p-12 text-center flex flex-col items-center justify-center gap-4 max-w-lg mx-auto mt-8">
          <div className="w-14 h-14 bg-primary/5 border border-border/40 text-primary/40 rounded-full flex items-center justify-center text-2xl">
            📚
          </div>
          <div>
            <h3 className="font-bold text-base">No note requests yet</h3>
            <p className="text-xs text-primary/50 mt-1">Need something? Create the first request within your peer group.</p>
          </div>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-4 py-2 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent/90 shadow-md transition-all active-scale cursor-pointer"
          >
            Request Notes
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {requests.map((request) => {
            const isVoted = request.interestedUsers?.includes(user?.uid || '');
            
            return (
              <motion.div
                key={request.requestId}
                layoutId={`req-card-${request.requestId}`}
                className={`premium-card p-6 flex flex-col justify-between hover-scale relative overflow-hidden group border transition-all ${
                  request.status === 'fulfilled' 
                    ? 'border-success/15 hover:border-success/30' 
                    : 'border-border/40 hover:border-accent/20'
                }`}
              >
                {/* Spotlight hover radial highlight */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-radial from-accent/[0.02] via-transparent to-transparent" />

                <div className="space-y-3 relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-accent bg-accent/5 border border-accent/10 px-2 py-0.5 rounded font-bold">
                      📘 {request.subject}
                    </span>
                    
                    {/* Status Badge */}
                    {request.status === 'fulfilled' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-success bg-success/10 border border-success/20 px-2.5 py-0.5 rounded-full font-bold">
                        <CheckCircle size={10} />
                        Fulfilled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-warning bg-warning/10 border border-warning/20 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                        <Clock size={10} />
                        Waiting
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold tracking-tight text-primary leading-snug">
                      {request.topic}
                    </h3>
                    {request.description && (
                      <p className="text-xs text-primary/60 mt-1.5 leading-relaxed font-sans">
                        {request.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/40 mt-5 pt-4 flex flex-col gap-3 relative z-10">
                  <div className="flex justify-between items-center text-[10px] text-primary/45 font-mono">
                    <span>Requested by <strong className="text-primary/70">{request.requestedByName}</strong></span>
                    <span>{formatRelativeTime(request.createdAt)}</span>
                  </div>

                  {/* Voters & Fulfill Actions Grid */}
                  <div className="flex items-center justify-between gap-4 pt-1.5">
                    {/* Voting button */}
                    <button
                      onClick={() => handleVote(request.requestId)}
                      disabled={request.status === 'fulfilled'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold font-mono transition-all active-scale disabled:opacity-50 select-none cursor-pointer ${
                        isVoted 
                          ? 'bg-accent/10 border-accent/30 text-accent font-bold' 
                          : 'bg-primary/5 hover:bg-primary/10 border-border/60 text-primary/65 hover:text-primary'
                      }`}
                    >
                      <ThumbsUp size={11} className={isVoted ? 'fill-accent' : ''} />
                      <span>👍 {isVoted ? 'I Need This Too' : 'Vote Need'}</span>
                    </button>

                    {/* Fulfill action */}
                    {request.status === 'fulfilled' ? (
                      <div className="text-right select-none font-mono text-[9px]">
                        <p className="font-bold text-success flex items-center gap-1 justify-end">
                          <CheckCircle size={11} />
                          Fulfilled by {request.fulfilledByName || 'Peer'}
                        </p>
                        {request.fulfilledAt && (
                          <p className="text-primary/40 mt-0.5">{formatRelativeTime(request.fulfilledAt)}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => triggerFulfillUpload(request)}
                        className="inline-flex items-center justify-center gap-1 bg-accent text-white hover:bg-accent/90 font-semibold px-3 py-1.5 rounded-lg text-[10px] shadow-sm active-scale transition-all select-none cursor-pointer font-sans"
                      >
                        Upload Notes
                      </button>
                    )}
                  </div>

                  {/* Interested count footer */}
                  {request.status === 'pending' && (
                    <div className="text-[10px] text-accent font-semibold font-mono flex items-center gap-1 bg-accent/5 border border-accent/10 p-2 rounded-lg justify-center mt-1">
                      <span>🔥</span>
                      <span>
                        {request.interestedCount} {request.interestedCount === 1 ? 'student needs' : 'students need'} this
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Request Form */}
      <RequestNotesModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />

      {/* Modal: Note Upload Dialog Modal */}
      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => {
          setIsUploadOpen(false);
          setSelectedRequest(null);
        }}
        initialSubject={selectedRequest?.subject}
        initialTopic={selectedRequest?.topic}
        requestId={selectedRequest?.requestId}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
};

export default NoteRequests;

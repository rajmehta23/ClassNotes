import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Plus, Search, Calendar, Clock, CheckCircle2, 
  AlertCircle, ChevronRight, Paperclip, History, Trash2, X
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useAssignmentStore } from './stores/useAssignmentStore';
import { useDebounce } from '@/hooks/useDebounce';
import { CreateAssignmentModal } from './components/CreateAssignmentModal';
import { SubmitAssignmentModal } from './components/SubmitAssignmentModal';
import { SubmissionHistoryModal } from './components/SubmissionHistoryModal';
import type { Assignment } from './types';

export const AssignmentModule: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const { 
    assignments, 
    studentSubmissions, 
    fetchAssignments, 
    fetchStudentSubmissions,
    deleteAssignment,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedSubject,
    setSelectedSubject
  } = useAssignmentStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitAssignmentTarget, setSubmitAssignmentTarget] = useState<Assignment | null>(null);
  const [historyAssignmentTarget, setHistoryAssignmentTarget] = useState<Assignment | null>(null);
  const [deleteTargetAssignment, setDeleteTargetAssignment] = useState<Assignment | null>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  const handleConfirmDelete = async () => {
    if (!deleteTargetAssignment) return;
    await deleteAssignment(deleteTargetAssignment.id);
    setDeleteTargetAssignment(null);
  };

  useEffect(() => {
    fetchAssignments();
    if (user?.uid) {
      fetchStudentSubmissions(user.uid);
    }
  }, [fetchAssignments, fetchStudentSubmissions, user?.uid]);

  // Extract unique subjects memoized
  const subjects = useMemo(() => {
    return ['all', ...Array.from(new Set(assignments.map((a) => a.subject)))];
  }, [assignments]);

  // Filter assignments memoized with debounced query
  const filteredAssignments = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    return assignments.filter((item) => {
      const matchesSearch = 
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q);
      const matchesSubject = selectedSubject === 'all' || item.subject === selectedSubject;
      return matchesSearch && matchesSubject;
    });
  }, [assignments, debouncedQuery, selectedSubject]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/80 backdrop-blur-md p-6 rounded-2xl border border-border/40 shadow-luxury">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent/10 text-accent rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-mono uppercase tracking-tight text-primary">
                Assignments & Homework
              </h1>
              <p className="text-xs text-primary/60 font-sans">
                Review class assignments, download reference materials, and submit your work before due dates.
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/90 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active-scale cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Create Assignment</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, subject, or description..."
            className="w-full bg-surface/80 border border-border/40 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-accent text-primary placeholder:text-primary/40 font-sans"
          />
        </div>

        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar pb-1">
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                selectedSubject === sub
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-surface/50 text-primary/60 hover:text-primary hover:bg-surface border border-border/30'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment List Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-48 bg-surface/40 border border-border/30 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="text-center py-16 bg-surface/40 border border-border/40 rounded-2xl space-y-3">
          <FileText className="w-12 h-12 text-primary/20 mx-auto" />
          <p className="font-mono text-xs uppercase tracking-wider text-primary/50 font-bold">
            No assignments found
          </p>
          <p className="text-xs text-primary/40 max-w-sm mx-auto">
            {searchQuery ? 'Try adjusting your search criteria.' : 'No assignments posted for your course yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map((assignment) => {
            const dueDate = new Date(assignment.dueDate);
            const now = new Date();
            const isOverdue = now > dueDate;
            const hoursLeft = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
            const isDueSoon = hoursLeft > 0 && hoursLeft <= 48;

            const existingSubmission = studentSubmissions.find((s) => s.assignmentId === assignment.id);
            const isSubmitted = !!existingSubmission;

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface/90 backdrop-blur-md border border-border/50 hover:border-accent/40 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Subject Pill & Due Date Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 bg-accent/10 border border-accent/20 text-accent text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg">
                      {assignment.subject}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isSubmitted ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-mono font-bold uppercase rounded-lg">
                          <CheckCircle2 size={12} />
                          Submitted
                        </span>
                      ) : isOverdue ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-danger/10 border border-danger/20 text-danger text-[10px] font-mono font-bold uppercase rounded-lg">
                          <AlertCircle size={12} />
                          Overdue
                        </span>
                      ) : isDueSoon ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-mono font-bold uppercase rounded-lg animate-pulse">
                          <Clock size={12} />
                          Due Soon ({hoursLeft}h)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-primary/5 border border-border/40 text-primary/60 text-[10px] font-mono font-bold uppercase rounded-lg">
                          <Calendar size={12} />
                          Due: {dueDate.toLocaleDateString()}
                        </span>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => setDeleteTargetAssignment(assignment)}
                          className="p-1 text-primary/40 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Assignment (Admin Only)"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-base text-primary font-sans leading-snug group-hover:text-accent transition-colors">
                      {assignment.title}
                    </h3>
                    <p className="text-xs text-primary/65 font-sans mt-1.5 line-clamp-3 leading-relaxed">
                      {assignment.description}
                    </p>
                  </div>

                  {/* Course / Semester / Author Details */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-primary/45 border-t border-border/30 pt-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-primary/5 rounded">
                        {assignment.course} - Sem {assignment.semester}
                      </span>
                      <span>By {assignment.teacherName}</span>
                    </div>
                    <span>Max: {assignment.maxPoints || 100} pts</span>
                  </div>

                  {/* Attachments list if any */}
                  {assignment.attachments && assignment.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {assignment.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-background border border-border/40 hover:border-accent text-accent text-[10px] font-mono rounded-md transition-colors"
                        >
                          <Paperclip size={10} />
                          <span className="truncate max-w-[120px]">{att.name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40">
                  <button
                    onClick={() => setHistoryAssignmentTarget(assignment)}
                    className="flex items-center gap-1.5 text-xs font-mono font-semibold text-primary/70 hover:text-accent transition-colors cursor-pointer"
                  >
                    <History size={14} />
                    <span>Submissions</span>
                  </button>

                  <button
                    onClick={() => setSubmitAssignmentTarget(assignment)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer ${
                      isSubmitted
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-accent hover:bg-accent/90 text-white'
                    }`}
                  >
                    <span>{isSubmitted ? 'Resubmit Work' : 'Submit Work'}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateAssignmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <SubmitAssignmentModal
        assignment={submitAssignmentTarget}
        isOpen={!!submitAssignmentTarget}
        onClose={() => setSubmitAssignmentTarget(null)}
      />

      <SubmissionHistoryModal
        assignment={historyAssignmentTarget}
        isOpen={!!historyAssignmentTarget}
        onClose={() => setHistoryAssignmentTarget(null)}
        userRole={user?.role || 'student'}
        userId={user?.uid || ''}
      />

      {/* Delete Assignment Confirmation Modal */}
      {deleteTargetAssignment && (
        <div 
          onClick={() => setDeleteTargetAssignment(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-luxury text-primary relative cursor-default"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-danger font-bold font-mono text-sm uppercase">
                <Trash2 size={20} />
                <span>Delete Assignment</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTargetAssignment(null)}
                className="p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-primary/70 font-sans leading-relaxed">
              Are you sure you want to delete <strong className="text-primary font-mono">"{deleteTargetAssignment.title}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetAssignment(null)}
                className="px-4 py-2 text-xs font-mono border border-border/60 hover:bg-primary/5 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-mono font-bold bg-danger hover:bg-danger/90 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentModule;

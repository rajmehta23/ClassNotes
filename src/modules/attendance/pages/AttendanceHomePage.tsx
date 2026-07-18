import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, Plus, AlertTriangle, X } from 'lucide-react';
import { useAttendance } from '../hooks';
import { useAttendanceStore } from '../stores/useAttendanceStore';
import { SubjectCard } from '../components/dashboard/SubjectCard';
import { SubjectBottomSheet } from '../components/bottom-sheet/SubjectBottomSheet';
import { DailyAttendanceTracker } from '../components/daily/DailyAttendanceTracker';
import { QuickSyncModal } from '../components/quick-sync/QuickSyncModal';
import { MissedDaysModal } from '../components/missed-days/MissedDaysModal';
import { SetupWizard } from '../components/setup/SetupWizard';
import { calculateOverallStats } from '../calculations';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { SUBJECT_COLOR_PALETTE } from '../constants';
import { modalBackdropVariants, modalContentVariants } from '../animations/variants';


import { SyncStatusBadge } from '../components/common/SyncStatusBadge';

// ============================================================================
// Add / Edit Subject Modal
// ============================================================================
const AddEditSubjectModal: React.FC = () => {
  const activeModal = useAttendanceStore((s) => s.activeModal);
  const editingSubjectId = useAttendanceStore((s) => s.editingSubjectId);
  const subjects = useAttendanceStore((s) => s.subjects);
  const addSubject = useAttendanceStore((s) => s.addSubject);
  const updateSubject = useAttendanceStore((s) => s.updateSubject);
  const setActiveModal = useAttendanceStore((s) => s.setActiveModal);

  const isAdd = activeModal === 'addSubject';
  const isEdit = activeModal === 'editSubject';

  const editingSubject = isEdit
    ? subjects.find((s) => s.id === editingSubjectId) || null
    : null;

  const [name, setName] = useState('');
  const [held, setHeld] = useState('0');
  const [attended, setAttended] = useState('0');
  const [color, setColor] = useState(SUBJECT_COLOR_PALETTE[0].hex);

  // Reset form when modal opens
  useEffect(() => {
    if (isAdd) {
      setName('');
      setHeld('0');
      setAttended('0');
      setColor(SUBJECT_COLOR_PALETTE[subjects.length % SUBJECT_COLOR_PALETTE.length].hex);
    } else if (isEdit && editingSubject) {
      setName(editingSubject.name);
      setHeld(editingSubject.held.toString());
      setAttended(editingSubject.attended.toString());
      setColor(editingSubject.color || SUBJECT_COLOR_PALETTE[0].hex);
    }
  }, [isAdd, isEdit, editingSubject, subjects.length]);

  if (!isAdd && !isEdit) return null;

  const handleClose = () => setActiveModal(null);

  const handleSave = async () => {
    if (!name.trim()) return;

    const heldNum = parseInt(held, 10) || 0;
    const attendedNum = parseInt(attended, 10) || 0;

    if (isAdd) {
      await addSubject({
        name: name.trim(),
        held: Math.max(0, heldNum),
        attended: Math.min(Math.max(0, attendedNum), Math.max(0, heldNum)),
        color,
      });
    } else if (isEdit && editingSubjectId) {
      await updateSubject(editingSubjectId, {
        name: name.trim(),
        held: Math.max(0, heldNum),
        attended: Math.min(Math.max(0, attendedNum), Math.max(0, heldNum)),
        color,
      });
    }
  };

  return (
    <motion.div
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/30 backdrop-blur-xs overflow-y-auto"
    >
      <motion.div
        variants={modalContentVariants}
        className="w-full max-w-md bg-surface rounded-2xl p-6 shadow-luxury border border-border/40 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-primary text-lg">
            {isAdd ? 'Add New Subject' : 'Edit Subject'}
          </h3>
          <button
            onClick={handleClose}
            className="p-1 text-primary/40 hover:text-primary cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-primary/50 mb-1 font-mono uppercase text-[10px]">
            Subject Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 text-sm font-semibold text-primary focus:outline-none focus:border-accent"
            placeholder="e.g. Data Structures"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 font-mono">
          <div>
            <label className="block text-xs font-semibold text-primary/50 mb-1 uppercase text-[10px]">
              Total Held
            </label>
            <input
              type="number"
              min="0"
              value={held}
              onChange={(e) => setHeld(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 text-sm font-semibold text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary/50 mb-1 uppercase text-[10px]">
              Attended
            </label>
            <input
              type="number"
              min="0"
              value={attended}
              onChange={(e) => setAttended(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 text-sm font-semibold text-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-primary/50 mb-2 font-mono uppercase text-[10px]">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLOR_PALETTE.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColor(c.hex)}
                className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                  color === c.hex
                    ? 'border-primary scale-110 shadow-md'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40 font-mono">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-primary/60 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-bold shadow-md shadow-accent/20 cursor-pointer active-scale uppercase tracking-wider disabled:opacity-50"
          >
            {isAdd ? 'Add Subject' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// Attendance Home Page
// ============================================================================
export const AttendanceHomePage: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  const {
    subjects,
    rawSubjects,
    targetPercentage,
    selectedSubject,
    isLoading,
    isInitialized,
    activeModal,
    setSelectedSubjectId,
    setActiveModal,
    markDailyAttendance,
    updateSubject,
    deleteSubject,
  } = useAttendance();

  const initModule = useAttendanceStore((s) => s.initModule);
  const pendingMissedDays = useAttendanceStore((s) => s.pendingMissedDays);

  useEffect(() => {
    if (!isInitialized && user?.uid) {
      initModule(user.uid);
    }
  }, [isInitialized, user?.uid, initModule]);

  const handleQuickUpdateFromSheet = async (
    subjectId: string,
    heldDelta: number,
    attendedDelta: number
  ) => {
    const target = subjects.find((s) => s.id === subjectId);
    if (!target) return;
    await updateSubject(subjectId, {
      held: target.held + heldDelta,
      attended: target.attended + attendedDelta,
    });
  };

  const overall = calculateOverallStats(rawSubjects, targetPercentage);

  if (isLoading && !isInitialized) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 font-mono">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-primary/50">Loading Attendance Module...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-2xl p-6 border border-border/40 shadow-luxury flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight">
            Attendance Dashboard
          </h1>
          <p className="text-xs text-primary/50 font-mono">
            Overall: <strong className="text-primary">{overall.overallPercentage.toFixed(1)}%</strong> | Target: {targetPercentage}%
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono">
          <SyncStatusBadge />

          <button
            type="button"
            onClick={() => setActiveModal('quicksync')}
            className="px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/20 text-accent font-bold text-xs transition-all flex items-center gap-2 cursor-pointer active-scale uppercase tracking-wider"
          >
            <RefreshCw className="w-4 h-4" /> Quick Sync
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('addSubject')}
            className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs shadow-md shadow-accent/20 transition-all flex items-center gap-2 cursor-pointer active-scale uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>
        </div>
      </div>

      {pendingMissedDays && pendingMissedDays.hasPendingMissedDays && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 flex items-center justify-between gap-3 shadow-luxury font-mono">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Missing {pendingMissedDays.missedCount} Days Attendance</span> — Last updated {pendingMissedDays.lastUpdatedDate}.
            </div>
          </div>

          <button
            onClick={() => setActiveModal('quicksync')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold shrink-0 hover:bg-amber-700 transition-colors cursor-pointer"
          >
            Sync Now
          </button>
        </div>
      )}

      <DailyAttendanceTracker subjects={subjects} onSaveDaily={markDailyAttendance} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary tracking-tight">Your Subjects</h2>
        <span className="text-xs font-semibold text-primary/45 font-mono">{subjects.length} subjects registered</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((sub, idx) => (
          <SubjectCard
            key={sub.id}
            subject={sub}
            index={idx}
            onSelect={(id) => setSelectedSubjectId(id)}
          />
        ))}
      </div>

      <SubjectBottomSheet
        subject={selectedSubject}
        targetPercentage={targetPercentage}
        onClose={() => setSelectedSubjectId(null)}
        onEdit={(id) => setActiveModal('editSubject', id)}
        onDelete={(id) => deleteSubject(id)}
        onQuickUpdate={handleQuickUpdateFromSheet}
      />

      <AnimatePresence>{activeModal === 'quicksync' && <QuickSyncModal />}</AnimatePresence>

      <AnimatePresence>{activeModal === 'missedDays' && <MissedDaysModal />}</AnimatePresence>

      <AnimatePresence>{activeModal === 'setup' && <SetupWizard />}</AnimatePresence>

      <AnimatePresence>
        {(activeModal === 'addSubject' || activeModal === 'editSubject') && <AddEditSubjectModal />}
      </AnimatePresence>
    </div>
  );
};


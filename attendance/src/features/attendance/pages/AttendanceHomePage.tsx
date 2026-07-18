import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, Plus, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAttendance } from '../hooks';
import { useAttendanceStore } from '../stores/useAttendanceStore';
import { SubjectCard } from '../components/dashboard/SubjectCard';
import { SubjectBottomSheet } from '../components/bottom-sheet/SubjectBottomSheet';
import { DailyAttendanceTracker } from '../components/daily/DailyAttendanceTracker';
import { QuickSyncModal } from '../components/quick-sync/QuickSyncModal';
import { MissedDaysModal } from '../components/missed-days/MissedDaysModal';
import { SetupWizard } from '../components/setup/SetupWizard';
import { calculateOverallStats } from '../calculations';

export const AttendanceHomePage: React.FC = () => {
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
    if (!isInitialized) {
      initModule();
    }
  }, [isInitialized, initModule]);

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
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400">Loading Attendance Module...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-100 apple-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> ClassNotes Attendance Module
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Attendance Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Overall: <strong className="text-slate-900">{overall.overallPercentage.toFixed(1)}%</strong> | Target: {targetPercentage}%
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveModal('quicksync')}
            className="px-4 py-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Quick Sync
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('addSubject')}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>
        </div>
      </div>

      {pendingMissedDays && pendingMissedDays.hasPendingMissedDays && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-center justify-between gap-3 apple-shadow">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Missing {pendingMissedDays.missedCount} Days Attendance</span> — Last updated {pendingMissedDays.lastUpdatedDate}.
            </div>
          </div>

          <button
            onClick={() => setActiveModal('quicksync')}
            className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold shrink-0 hover:bg-amber-700 transition-colors cursor-pointer"
          >
            Sync Now
          </button>
        </div>
      )}

      <DailyAttendanceTracker subjects={subjects} onSaveDaily={markDailyAttendance} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Your Subjects</h2>
        <span className="text-xs font-semibold text-slate-400">{subjects.length} subjects registered</span>
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
    </div>
  );
};

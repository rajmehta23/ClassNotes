import { useState, useCallback, useMemo } from 'react';
import { useAttendanceStore } from '../stores/useAttendanceStore';
import {
  calculateMonthlyTrends,
  calculateOverallStats,
  calculateQuickSyncDelta,
  calculateWeeklyTrends,
  getSubjectWithCalculations,
} from '../calculations';
import type { SubjectSyncDelta, SubjectWithCalculations } from '../types';

// ============================================================================
// SECTION 1: useAttendance HOOK
// ============================================================================
export function useAttendance() {
  const subjects = useAttendanceStore((s) => s.subjects);
  const settings = useAttendanceStore((s) => s.settings);
  const selectedSubjectId = useAttendanceStore((s) => s.selectedSubjectId);
  const isLoading = useAttendanceStore((s) => s.isLoading);
  const isInitialized = useAttendanceStore((s) => s.isInitialized);
  const activeModal = useAttendanceStore((s) => s.activeModal);

  const setSelectedSubjectId = useAttendanceStore((s) => s.setSelectedSubjectId);
  const setActiveModal = useAttendanceStore((s) => s.setActiveModal);
  const markDailyAttendance = useAttendanceStore((s) => s.markDailyAttendance);
  const addSubject = useAttendanceStore((s) => s.addSubject);
  const updateSubject = useAttendanceStore((s) => s.updateSubject);
  const deleteSubject = useAttendanceStore((s) => s.deleteSubject);

  const subjectsWithCalculations: SubjectWithCalculations[] = useMemo(() => {
    return subjects.map((sub) =>
      getSubjectWithCalculations(sub, settings.targetPercentage)
    );
  }, [subjects, settings.targetPercentage]);

  const selectedSubject = useMemo(() => {
    if (!selectedSubjectId) return null;
    return (
      subjectsWithCalculations.find((s) => s.id === selectedSubjectId) || null
    );
  }, [subjectsWithCalculations, selectedSubjectId]);

  return {
    subjects: subjectsWithCalculations,
    rawSubjects: subjects,
    targetPercentage: settings.targetPercentage,
    selectedSubject,
    selectedSubjectId,
    isLoading,
    isInitialized,
    activeModal,
    setSelectedSubjectId,
    setActiveModal,
    markDailyAttendance,
    addSubject,
    updateSubject,
    deleteSubject,
  };
}

// ============================================================================
// SECTION 2: useQuickSync HOOK
// ============================================================================
export function useQuickSync() {
  const subjects = useAttendanceStore((s) => s.subjects);
  const quickSyncLogs = useAttendanceStore((s) => s.quickSyncLogs);
  const applyQuickSyncStore = useAttendanceStore((s) => s.applyQuickSync);

  const [inputs, setInputs] = useState<Record<string, { held: string; attended: string }>>(() => {
    const initial: Record<string, { held: string; attended: string }> = {};
    subjects.forEach((sub) => {
      initial[sub.id] = {
        held: sub.held.toString(),
        attended: sub.attended.toString(),
      };
    });
    return initial;
  });

  const updateInput = useCallback((subjectId: string, field: 'held' | 'attended', value: string) => {
    setInputs((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: value,
      },
    }));
  }, []);

  const deltas: SubjectSyncDelta[] = subjects.map((sub) => {
    const subInput = inputs[sub.id] || {
      held: sub.held.toString(),
      attended: sub.attended.toString(),
    };
    const newHeld = parseInt(subInput.held, 10);
    const newAttended = parseInt(subInput.attended, 10);

    return calculateQuickSyncDelta(sub, newHeld, newAttended);
  });

  const isFormValid = deltas.every((d) => d.isValid);
  const hasChanges = deltas.some((d) => d.deltaHeld !== 0 || d.deltaAttended !== 0);

  const executeSync = async () => {
    if (!isFormValid || !hasChanges) return;
    await applyQuickSyncStore(deltas);
  };

  return {
    subjects,
    inputs,
    deltas,
    isFormValid,
    hasChanges,
    quickSyncLogs,
    updateInput,
    executeSync,
  };
}

// ============================================================================
// SECTION 3: useMissedDays HOOK
// ============================================================================
export function useMissedDays() {
  const pendingMissedDays = useAttendanceStore((s) => s.pendingMissedDays);
  const activeModal = useAttendanceStore((s) => s.activeModal);
  const setActiveModal = useAttendanceStore((s) => s.setActiveModal);
  const dismissMissedDays = useAttendanceStore((s) => s.dismissMissedDays);

  const openQuickSync = () => setActiveModal('quicksync');

  return {
    pendingMissedDays,
    isOpen: activeModal === 'missedDays' && !!pendingMissedDays,
    openQuickSync,
    dismissMissedDays,
  };
}

// ============================================================================
// SECTION 4: useAttendanceStats HOOK
// ============================================================================
export function useAttendanceStats() {
  const subjects = useAttendanceStore((s) => s.subjects);
  const settings = useAttendanceStore((s) => s.settings);
  const history = useAttendanceStore((s) => s.history);

  const overall = useMemo(() => {
    return calculateOverallStats(subjects, settings.targetPercentage);
  }, [subjects, settings.targetPercentage]);

  const weeklyTrends = useMemo(() => {
    return calculateWeeklyTrends(history);
  }, [history]);

  const monthlyTrends = useMemo(() => {
    return calculateMonthlyTrends(history, subjects);
  }, [history, subjects]);

  const rankedSubjects = useMemo(() => {
    const calculated = subjects.map((sub) =>
      getSubjectWithCalculations(sub, settings.targetPercentage)
    );
    return [...calculated].sort(
      (a, b) => b.calculations.percentage - a.calculations.percentage
    );
  }, [subjects, settings.targetPercentage]);

  return {
    overall,
    weeklyTrends,
    monthlyTrends,
    rankedSubjects,
    targetPercentage: settings.targetPercentage,
  };
}

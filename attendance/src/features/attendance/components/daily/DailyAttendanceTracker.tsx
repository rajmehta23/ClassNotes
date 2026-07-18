import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, MinusCircle, Save, Calendar as CalendarIcon, Check } from 'lucide-react';
import type { AttendanceStatus, SubjectWithCalculations } from '../../types';
import { format } from 'date-fns';
import { useAttendanceStore } from '../../stores/useAttendanceStore';

interface DailyAttendanceTrackerProps {
  subjects: SubjectWithCalculations[];
  onSaveDaily: (date: string, statuses: Record<string, AttendanceStatus>) => Promise<void>;
}

export const DailyAttendanceTracker: React.FC<DailyAttendanceTrackerProps> = ({
  subjects,
  onSaveDaily,
}) => {
  const history = useAttendanceStore((s) => s.history);
  const [selectedDate, setSelectedDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));

  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const existingLog = history.find((h) => h.date === selectedDate);
    const initial: Record<string, AttendanceStatus> = {};
    subjects.forEach((s) => {
      initial[s.id] = existingLog?.statuses[s.id] || 'no_class';
    });
    setStatuses(initial);
  }, [selectedDate, history, subjects]);

  const handleStatusChange = (subjectId: string, status: AttendanceStatus) => {
    setStatuses((prev) => ({
      ...prev,
      [subjectId]: status,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveDaily(selectedDate, statuses);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving daily attendance:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (subjects.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 apple-shadow mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs uppercase tracking-wider mb-1">
            <CalendarIcon className="w-4 h-4" /> Daily Attendance Marking
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Today's Attendance</h2>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {subjects.map((sub) => {
          const currentStatus = statuses[sub.id] || 'no_class';

          return (
            <div
              key={sub.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:bg-slate-50/80"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: sub.color || '#6366F1' }}
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{sub.name}</h4>
                  <span className="text-xs text-slate-400">
                    Current: {sub.calculations.percentage.toFixed(1)}% ({sub.attended}/{sub.held})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 bg-slate-200/60 p-1 rounded-2xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleStatusChange(sub.id, 'no_class')}
                  className={`px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    currentStatus === 'no_class'
                      ? 'bg-white text-slate-800 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MinusCircle className="w-3.5 h-3.5" /> No Class
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange(sub.id, 'present')}
                  className={`px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    currentStatus === 'present'
                      ? 'bg-emerald-600 text-white shadow-sm font-bold'
                      : 'text-slate-500 hover:text-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Present
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange(sub.id, 'absent')}
                  className={`px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    currentStatus === 'absent'
                      ? 'bg-rose-600 text-white shadow-sm font-bold'
                      : 'text-slate-500 hover:text-rose-700'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" /> Absent
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <span className="text-xs text-slate-400">
          Saves to Firestore automatically with zero delay.
        </span>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={`px-6 py-2.5 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer ${
            saveSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-600/20'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
          }`}
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4" /> Attendance Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Today's Attendance
            </>
          )}
        </button>
      </div>
    </div>
  );
};

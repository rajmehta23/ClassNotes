import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Edit2, CheckCircle2, XCircle, MinusCircle, Check } from 'lucide-react';
import { useAttendanceStore } from '../../stores/useAttendanceStore';
import type { AttendanceStatus } from '../../types';

export const HistoryView: React.FC = () => {
  const history = useAttendanceStore((s) => s.history);
  const subjects = useAttendanceStore((s) => s.subjects);
  const markDailyAttendance = useAttendanceStore((s) => s.markDailyAttendance);

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editStatuses, setEditStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = (dateStr: string, currentStatuses: Record<string, AttendanceStatus>) => {
    setEditingDate(dateStr);
    const initial: Record<string, AttendanceStatus> = {};
    subjects.forEach((s) => {
      initial[s.id] = currentStatuses[s.id] || 'no_class';
    });
    setEditStatuses(initial);
  };

  const handleStatusToggle = (subjectId: string, status: AttendanceStatus) => {
    setEditStatuses((prev) => ({
      ...prev,
      [subjectId]: status,
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingDate) return;
    setIsSaving(true);
    try {
      await markDailyAttendance(editingDate, editStatuses);
      setEditingDate(null);
    } catch (err) {
      console.error('Error updating history date:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 apple-shadow text-center">
        <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 mb-1">No Attendance History Yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          History starts from installation date. Mark daily attendance or quick sync to record entries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Attendance Logs</h2>
          <p className="text-xs text-slate-500">View and edit historical daily records</p>
        </div>
      </div>

      <div className="space-y-3">
        {history.map((record) => {
          const isEditing = editingDate === record.date;

          return (
            <motion.div
              key={record.date}
              layout
              className="bg-white rounded-3xl p-5 border border-slate-100 apple-shadow transition-all"
            >
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{record.date}</span>
                </div>

                {!isEditing ? (
                  <button
                    onClick={() => handleStartEdit(record.date, record.statuses)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Record
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingDate(null)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {subjects.map((sub) => {
                  const status = isEditing
                    ? editStatuses[sub.id] || 'no_class'
                    : record.statuses[sub.id] || 'no_class';

                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color || '#6366F1' }}
                        />
                        <span className="font-semibold text-slate-800">{sub.name}</span>
                      </div>

                      {!isEditing ? (
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1 text-[11px] ${
                            status === 'present'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : status === 'absent'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-200/60 text-slate-600'
                          }`}
                        >
                          {status === 'present' && <CheckCircle2 className="w-3 h-3" />}
                          {status === 'absent' && <XCircle className="w-3 h-3" />}
                          {status === 'no_class' && <MinusCircle className="w-3 h-3" />}
                          {status === 'present'
                            ? 'Present'
                            : status === 'absent'
                            ? 'Absent'
                            : 'No Class'}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(sub.id, 'no_class')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                              status === 'no_class' ? 'bg-white text-slate-800' : 'text-slate-500'
                            }`}
                          >
                            No Class
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(sub.id, 'present')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                              status === 'present' ? 'bg-emerald-600 text-white' : 'text-slate-500'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(sub.id, 'absent')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                              status === 'absent' ? 'bg-rose-600 text-white' : 'text-slate-500'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

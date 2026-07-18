import React, { useState } from 'react';
import { useAttendanceStore } from '../../stores/useAttendanceStore';
import { TARGET_PERCENTAGE_OPTIONS, SUBJECT_COLOR_PALETTE } from '../../constants';
import { Bell, Target, Plus, Edit2, Trash2, Save, Check, X } from 'lucide-react';
import type { Subject } from '../../types';

export const SettingsView: React.FC = () => {
  const settings = useAttendanceStore((s) => s.settings);
  const subjects = useAttendanceStore((s) => s.subjects);
  const updateSettings = useAttendanceStore((s) => s.updateSettings);
  const addSubject = useAttendanceStore((s) => s.addSubject);
  const updateSubject = useAttendanceStore((s) => s.updateSubject);
  const deleteSubject = useAttendanceStore((s) => s.deleteSubject);

  const [targetPct, setTargetPct] = useState(settings.targetPercentage);
  const [reminderTime, setReminderTime] = useState(settings.reminderTime || '20:00');
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingSub, setEditingSub] = useState<Partial<Subject>>({});

  const handleSaveSettings = async () => {
    await updateSettings({
      targetPercentage: targetPct,
      reminderTime,
      notificationsEnabled,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleOpenAdd = () => {
    setEditingSub({
      name: '',
      held: 0,
      attended: 0,
      color: SUBJECT_COLOR_PALETTE[subjects.length % SUBJECT_COLOR_PALETTE.length].hex,
    });
    setModalMode('add');
  };

  const handleOpenEdit = (sub: Subject) => {
    setEditingSub(sub);
    setModalMode('edit');
  };

  const handleSaveSubjectModal = async () => {
    if (!editingSub.name?.trim()) return;

    if (modalMode === 'add') {
      await addSubject({
        name: editingSub.name.trim(),
        held: editingSub.held || 0,
        attended: editingSub.attended || 0,
        color: editingSub.color,
      });
    } else if (modalMode === 'edit' && editingSub.id) {
      await updateSubject(editingSub.id, {
        name: editingSub.name.trim(),
        held: editingSub.held || 0,
        attended: editingSub.attended || 0,
        color: editingSub.color,
      });
    }
    setModalMode(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-100 apple-shadow">
        <div className="flex items-center gap-2.5 mb-4">
          <Target className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-base">Attendance Target</h3>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Set your college required attendance threshold. All calculations adapt dynamically.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {TARGET_PERCENTAGE_OPTIONS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => setTargetPct(pct)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold border transition-all ${
                targetPct === pct
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-500" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Daily Reminder</h4>
                <p className="text-xs text-slate-400">Receive notification to mark daily attendance</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {notificationsEnabled && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-semibold text-slate-600">Reminder Time</span>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="px-3 py-1 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
              />
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            className={`px-6 py-2.5 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" /> Settings Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-100 apple-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-base">Manage Subjects</h3>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>
        </div>

        <div className="space-y-3">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: sub.color || '#6366F1' }}
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{sub.name}</h4>
                  <span className="text-xs text-slate-400">
                    Held: {sub.held} | Attended: {sub.attended}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(sub)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteSubject(sub.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 apple-shadow-lg border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-lg">
                {modalMode === 'add' ? 'Add New Subject' : 'Edit Subject'}
              </h3>
              <button onClick={() => setModalMode(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Subject Name</label>
              <input
                type="text"
                value={editingSub.name || ''}
                onChange={(e) => setEditingSub({ ...editingSub, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="e.g. Data Structures"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Total Held</label>
                <input
                  type="number"
                  min="0"
                  value={editingSub.held || 0}
                  onChange={(e) =>
                    setEditingSub({ ...editingSub, held: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Attended</label>
                <input
                  type="number"
                  min="0"
                  value={editingSub.attended || 0}
                  onChange={(e) =>
                    setEditingSub({ ...editingSub, attended: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSubjectModal}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                Save Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

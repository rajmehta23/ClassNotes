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
      <div className="bg-surface rounded-2xl p-6 border border-border/40 shadow-luxury">
        <div className="flex items-center gap-2.5 mb-4">
          <Target className="w-5 h-5 text-accent" />
          <h3 className="font-bold text-primary text-base">Attendance Target</h3>
        </div>

        <p className="text-xs text-primary/50 mb-4 font-mono">
          Set your college required attendance threshold. All calculations adapt dynamically.
        </p>

        <div className="flex flex-wrap gap-2 mb-6 font-mono">
          {TARGET_PERCENTAGE_OPTIONS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => setTargetPct(pct)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                targetPct === pct
                  ? 'bg-accent text-white border-accent shadow-md shadow-accent/20'
                  : 'bg-background/50 border-border text-primary hover:bg-primary/5'
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-border/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary/50" />
              <div>
                <h4 className="font-bold text-primary text-sm">Daily Reminder</h4>
                <p className="text-xs text-primary/45 font-mono">Receive notification to mark daily attendance</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-primary/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          {notificationsEnabled && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30">
              <span className="text-xs font-semibold text-primary/70 font-mono">Reminder Time</span>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="px-3 py-1 rounded-lg border border-border bg-surface text-xs font-bold text-primary font-mono cursor-pointer"
              />
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-border/40 flex justify-end font-sans">
          <button
            type="button"
            onClick={handleSaveSettings}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer active-scale ${
              saveSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-accent hover:bg-accent/90 text-white shadow-accent/20'
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

      <div className="bg-surface rounded-2xl p-6 border border-border/40 shadow-luxury">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-primary text-base">Manage Subjects</h3>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer font-mono uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>
        </div>

        <div className="space-y-3">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className="p-4 rounded-xl bg-background/50 border border-border/30 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: sub.color || '#6366F1' }}
                />
                <div>
                  <h4 className="font-bold text-primary text-sm">{sub.name}</h4>
                  <span className="text-xs text-primary/45 font-mono">
                    Held: {sub.held} | Attended: {sub.attended}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(sub)}
                  className="p-2 rounded-lg text-primary/60 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteSubject(sub.id)}
                  className="p-2 rounded-lg text-rose-500/70 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/30 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface rounded-2xl p-6 shadow-luxury border border-border/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-primary text-lg">
                {modalMode === 'add' ? 'Add New Subject' : 'Edit Subject'}
              </h3>
              <button onClick={() => setModalMode(null)} className="p-1 text-primary/40 hover:text-primary cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary/50 mb-1 font-mono uppercase text-[10px]">Subject Name</label>
              <input
                type="text"
                value={editingSub.name || ''}
                onChange={(e) => setEditingSub({ ...editingSub, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 text-sm font-semibold text-primary focus:outline-none focus:border-accent"
                placeholder="e.g. Data Structures"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div>
                <label className="block text-xs font-semibold text-primary/50 mb-1 uppercase text-[10px]">Total Held</label>
                <input
                  type="number"
                  min="0"
                  value={editingSub.held || 0}
                  onChange={(e) =>
                    setEditingSub({ ...editingSub, held: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 text-sm font-semibold text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary/50 mb-1 uppercase text-[10px]">Attended</label>
                <input
                  type="number"
                  min="0"
                  value={editingSub.attended || 0}
                  onChange={(e) =>
                    setEditingSub({ ...editingSub, attended: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background/50 text-sm font-semibold text-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40 font-mono">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-primary/60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSubjectModal}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-bold shadow-md shadow-accent/20 cursor-pointer active-scale uppercase tracking-wider"
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

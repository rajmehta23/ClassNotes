import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { useAttendanceStore } from '../../stores/useAttendanceStore';
import {
  calculateAbsentClasses,
  calculateAttendancePercentage,
  calculateNeedClasses,
  calculateRiskLevel,
  calculateSafeLeaves,
} from '../../calculations';
import { modalBackdropVariants, modalContentVariants } from '../../animations/variants';
import { SUBJECT_COLOR_PALETTE } from '../../constants';

interface SubjectInput {
  id: string;
  name: string;
  held: string;
  attended: string;
  color: string;
}

const CS_PLACEHOLDERS = [
  'e.g. Data Structures & Algorithms',
  'e.g. Operating Systems',
  'e.g. Computer Networks',
  'e.g. Database Management Systems',
  'e.g. Object-Oriented Programming',
  'e.g. Software Engineering',
  'e.g. Theory of Computation',
  'e.g. Compiler Design',
];

export const SetupWizard: React.FC = () => {
  const saveSetupSubjects = useAttendanceStore((s) => s.saveSetupSubjects);
  const targetPercentage = useAttendanceStore((s) => s.settings.targetPercentage);

  const [subjects, setSubjects] = useState<SubjectInput[]>([
    { id: '1', name: '', held: '', attended: '', color: SUBJECT_COLOR_PALETTE[0].hex },
    { id: '2', name: '', held: '', attended: '', color: SUBJECT_COLOR_PALETTE[1].hex },
    { id: '3', name: '', held: '', attended: '', color: SUBJECT_COLOR_PALETTE[2].hex },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddRow = () => {
    const nextIdx = subjects.length;
    const color = SUBJECT_COLOR_PALETTE[nextIdx % SUBJECT_COLOR_PALETTE.length].hex;
    setSubjects((prev) => [
      ...prev,
      { id: Date.now().toString(), name: '', held: '', attended: '', color },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (subjects.length <= 1) return;
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubjectChange = (id: string, field: keyof SubjectInput, value: string) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    for (const sub of subjects) {
      if (!sub.name.trim()) {
        setErrorMsg('Please enter a name for all subjects.');
        return;
      }
      const heldNum = parseInt(sub.held, 10);
      const attendedNum = parseInt(sub.attended, 10);

      if (isNaN(heldNum) || heldNum < 0) {
        setErrorMsg(`Invalid total held classes for subject "${sub.name}".`);
        return;
      }
      if (isNaN(attendedNum) || attendedNum < 0) {
        setErrorMsg(`Invalid attended classes for subject "${sub.name}".`);
        return;
      }
      if (attendedNum > heldNum) {
        setErrorMsg(
          `Attended classes (${attendedNum}) cannot exceed total held classes (${heldNum}) in "${sub.name}".`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const formatted = subjects.map((s) => ({
        name: s.name.trim(),
        held: parseInt(s.held, 10) || 0,
        attended: parseInt(s.attended, 10) || 0,
        color: s.color,
      }));

      await saveSetupSubjects(formatted);
    } catch (err) {
      setErrorMsg('Failed to save setup. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        className="w-full max-w-2xl bg-surface rounded-2xl p-6 md:p-8 shadow-luxury border border-border/40 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary tracking-tight">Setup Your Subjects</h2>
            <p className="text-sm text-primary/50 font-mono">Enter current held and attended classes from your portal</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm flex items-center gap-2 font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto my-4 pr-1 space-y-4">
          {subjects.map((sub, idx) => {
            const heldNum = parseInt(sub.held, 10) || 0;
            const attendedNum = parseInt(sub.attended, 10) || 0;
            const valid = attendedNum <= heldNum && heldNum >= 0;

            const pct = valid ? calculateAttendancePercentage(attendedNum, heldNum) : 0;
            const absent = valid ? calculateAbsentClasses(heldNum, attendedNum) : 0;
            const need = valid ? calculateNeedClasses(heldNum, attendedNum, targetPercentage) : 0;
            const skip = valid ? calculateSafeLeaves(heldNum, attendedNum, targetPercentage) : 0;
            const risk = valid ? calculateRiskLevel(pct, targetPercentage) : 'Critical';

            return (
              <div
                key={sub.id}
                className="p-4 rounded-xl bg-background/50 border border-border/30 transition-all hover:border-accent/20"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color }}
                    />
                    <input
                      type="text"
                      placeholder={CS_PLACEHOLDERS[idx % CS_PLACEHOLDERS.length]}
                      value={sub.name}
                      onChange={(e) => handleSubjectChange(sub.id, 'name', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-surface text-sm font-semibold text-primary focus:outline-none focus:border-accent"
                      required
                    />
                  </div>

                  {subjects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(sub.id)}
                      className="p-2 text-primary/40 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove Subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 font-mono">
                  <div>
                    <label className="block text-xs font-medium text-primary/50 mb-1 uppercase text-[10px]">
                      Current Held Classes
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={sub.held}
                      onChange={(e) => handleSubjectChange(sub.id, 'held', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-surface text-sm text-primary font-bold focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-primary/50 mb-1 uppercase text-[10px]">
                      Current Attended Classes
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={sub.attended}
                      onChange={(e) => handleSubjectChange(sub.id, 'attended', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-surface text-sm text-primary font-bold focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-border/30 flex flex-wrap items-center justify-between text-xs gap-2 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary text-sm">
                      {pct.toFixed(1)}% Attendance
                    </span>
                    <span className="text-primary/45">Absent: <strong className="text-primary">{absent}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    {risk === 'Safe' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Safe (Skip {skip})
                      </span>
                    ) : risk === 'Warning' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Warning (Need {need})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Critical (Need {need})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </form>

        <div className="pt-4 border-t border-border/40 flex items-center justify-between gap-3 font-mono">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-4 py-2.5 rounded-xl border border-border bg-surface text-primary font-semibold text-xs uppercase tracking-wider hover:bg-primary/5 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold text-xs uppercase tracking-wider shadow-md shadow-accent/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active-scale"
          >
            <CheckCircle2 className="w-4 h-4" /> Complete Setup
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

import React, { useState } from 'react';
import { 
  Sparkles, FileText, BrainCircuit, HelpCircle, Eye, MessageSquare 
} from 'lucide-react';
import { FEATURE_FLAGS } from '@/modules/config/featureFlags';
import type { Note } from '@/types/database';
import { DiagnosticQuizModal } from './DiagnosticQuizModal';
import { ExplainNoteModal } from './ExplainNoteModal';
import { AskAIModal } from './AskAIModal';
import { VisualLearningModal } from './visual/VisualLearningModal';
import { findSmartTutorPack } from '../data/smartTutorPacks';
import { SmartTutorContentModal } from './SmartTutorContentModal';

interface StudyToolsPanelProps {
  note: Note;
  variant?: 'card' | 'inline' | 'bar';
}

export const StudyToolsPanel: React.FC<StudyToolsPanelProps> = ({
  note,
  variant = 'inline',
}) => {
  // If feature flag is disabled, return null immediately (entire UI disappears)
  if (!FEATURE_FLAGS.AI_TUTOR) {
    return null;
  }

  const [activeModal, setActiveModal] = useState<
    'quiz' | 'explain' | 'practice' | 'visual' | 'ask' | null
  >(null);

  // Check if this note matches a pre-built offline Smart Tutor Pack (e.g. Computer Hardware)
  const smartPack = findSmartTutorPack(note.title);

  return (
    <>
      {variant === 'bar' ? (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-accent/5 border border-accent/20 rounded-xl text-xs font-mono">
          <div className="flex items-center gap-1 text-accent font-bold px-2 py-1">
            <Sparkles size={13} />
            <span>Study Tools</span>
          </div>

          <button
            onClick={() => setActiveModal('explain')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-accent/10 border border-border hover:border-accent text-primary rounded-lg transition-colors cursor-pointer"
          >
            <FileText size={13} className="text-accent" />
            <span>Explain Note</span>
          </button>

          <button
            onClick={() => setActiveModal('quiz')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white font-bold rounded-lg shadow-xs hover:bg-accent/90 transition-colors cursor-pointer"
          >
            <BrainCircuit size={13} />
            <span>Generate Quiz</span>
          </button>

          <button
            onClick={() => setActiveModal('practice')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-accent/10 border border-border hover:border-accent text-primary rounded-lg transition-colors cursor-pointer"
          >
            <HelpCircle size={13} className="text-accent" />
            <span>Practice Questions</span>
          </button>

          <button
            onClick={() => setActiveModal('visual')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-accent/10 border border-border hover:border-accent text-primary rounded-lg transition-colors cursor-pointer"
          >
            <Eye size={13} className="text-accent" />
            <span>Visual Learning</span>
          </button>

          <button
            onClick={() => setActiveModal('ask')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-accent/10 border border-border hover:border-accent text-primary rounded-lg transition-colors cursor-pointer"
          >
            <MessageSquare size={13} className="text-accent" />
            <span>Ask AI</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent flex items-center gap-1">
            <Sparkles size={11} /> AI Study Tools
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px] font-mono">
            <button
              onClick={() => setActiveModal('explain')}
              className="flex items-center justify-center gap-1 p-2 bg-surface hover:bg-accent/10 border border-border/60 rounded-lg text-primary hover:text-accent transition-colors cursor-pointer"
            >
              <FileText size={12} className="text-accent" />
              <span>Explain</span>
            </button>

            <button
              onClick={() => setActiveModal('quiz')}
              className="flex items-center justify-center gap-1 p-2 bg-accent text-white font-bold rounded-lg shadow-xs hover:bg-accent/90 transition-colors cursor-pointer col-span-2 sm:col-span-1"
            >
              <BrainCircuit size={12} />
              <span>Quiz</span>
            </button>

            <button
              onClick={() => setActiveModal('practice')}
              className="flex items-center justify-center gap-1 p-2 bg-surface hover:bg-accent/10 border border-border/60 rounded-lg text-primary hover:text-accent transition-colors cursor-pointer"
            >
              <HelpCircle size={12} className="text-accent" />
              <span>Practice</span>
            </button>

            <button
              onClick={() => setActiveModal('visual')}
              className="flex items-center justify-center gap-1 p-2 bg-surface hover:bg-accent/10 border border-border/60 rounded-lg text-primary hover:text-accent transition-colors cursor-pointer"
            >
              <Eye size={12} className="text-accent" />
              <span>Visual</span>
            </button>

            <button
              onClick={() => setActiveModal('ask')}
              className="flex items-center justify-center gap-1 p-2 bg-surface hover:bg-accent/10 border border-border/60 rounded-lg text-primary hover:text-accent transition-colors cursor-pointer col-span-2 sm:col-span-1"
            >
              <MessageSquare size={12} className="text-accent" />
              <span>Ask AI</span>
            </button>
          </div>
        </div>
      )}

      {/* Offline Pre-built Pack Modal (0 API calls) */}
      {smartPack && activeModal && activeModal !== 'ask' && (
        <SmartTutorContentModal
          pack={smartPack}
          activeTab={activeModal === 'explain' ? 'explain' : activeModal === 'quiz' ? 'quiz' : activeModal === 'practice' ? 'practice' : 'visual'}
          isOpen={true}
          onClose={() => setActiveModal(null)}
          note={note}
        />
      )}

      {/* Fallback API Modals (for topics without an offline pack, or Ask AI) */}
      {(!smartPack || activeModal === 'ask') && (
        <>
          <DiagnosticQuizModal
            note={note}
            isOpen={activeModal === 'quiz' || activeModal === 'practice'}
            onClose={() => setActiveModal(null)}
          />

          <ExplainNoteModal
            note={note}
            isOpen={activeModal === 'explain'}
            onClose={() => setActiveModal(null)}
          />

          <AskAIModal
            note={note}
            isOpen={activeModal === 'ask'}
            onClose={() => setActiveModal(null)}
          />

          <VisualLearningModal
            note={note}
            isOpen={activeModal === 'visual'}
            onClose={() => setActiveModal(null)}
          />
        </>
      )}
    </>
  );
};


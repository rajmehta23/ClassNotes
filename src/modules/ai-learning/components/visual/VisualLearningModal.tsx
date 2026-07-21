import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Eye, Layers, Sparkles } from 'lucide-react';
import { selectVisualAnimation } from './visualSelector';
import type { Note } from '@/types/database';

interface VisualLearningModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VisualLearningModal: React.FC<VisualLearningModalProps> = ({
  note,
  isOpen,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animTopic = note ? selectVisualAnimation(note.title, note.subject) : null;

  const [isPlaying, setIsPlaying] = useState(true);
  const [param1, setParam1] = useState(40);
  const [param2, setParam2] = useState(45);
  const [fps, setFps] = useState(60);

  // Sync param defaults when topic changes
  useEffect(() => {
    if (animTopic) {
      setParam1(animTopic.param1Default);
      setParam2(animTopic.param2Default);
    }
  }, [animTopic]);

  // 60 FPS Canvas Animation Loop
  useEffect(() => {
    if (!isOpen || !animTopic || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let startTime = performance.now();
    let lastTime = startTime;
    let frameCount = 0;
    let lastFpsUpdate = startTime;

    const loop = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      frameCount++;

      if (now - lastFpsUpdate >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = now;
      }

      const isDark = document.documentElement.classList.contains('dark');

      animTopic.render({
        canvas,
        ctx,
        time: isPlaying ? elapsed : lastTime / 1000,
        params: { val1: param1, val2: param2 },
        isDark,
      });

      if (isPlaying) {
        lastTime = now - startTime;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, animTopic, isPlaying, param1, param2]);

  if (!isOpen || !note) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-surface border border-border rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar relative text-primary"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <Eye size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono uppercase tracking-tight text-primary">
                  Visual Learning Engine
                </h2>
                <p className="text-xs text-primary/50 font-sans truncate max-w-xs sm:max-w-md">
                  {note.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Interactive Animation View */}
          {animTopic ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-primary uppercase">
                    {animTopic.title}
                  </h3>
                  <span className="text-[10px] font-mono uppercase text-accent font-semibold">
                    {animTopic.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded font-bold">
                    60 FPS ({fps} FPS)
                  </span>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1.5 bg-accent text-white rounded-lg shadow-xs cursor-pointer"
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                </div>
              </div>

              {/* Canvas Container */}
              <div className="relative w-full h-64 bg-background border border-border/60 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={256}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Interactive Controls Sliders */}
              <div className="p-4 bg-background border border-border/50 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-primary/70">{animTopic.param1Label}</span>
                    <span className="font-bold text-accent">{param1}</span>
                  </div>
                  <input
                    type="range"
                    min={animTopic.param1Min}
                    max={animTopic.param1Max}
                    value={param1}
                    onChange={(e) => setParam1(Number(e.target.value))}
                    className="w-full accent-accent cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-primary/70">{animTopic.param2Label}</span>
                    <span className="font-bold text-accent">{param2}</span>
                  </div>
                  <input
                    type="range"
                    min={animTopic.param2Min}
                    max={animTopic.param2Max}
                    value={param2}
                    onChange={(e) => setParam2(Number(e.target.value))}
                    className="w-full accent-accent cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Fallback Screen: Static Diagram + Explanation */
            <div className="space-y-4 py-4">
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-2xl text-center space-y-2">
                <Layers className="w-10 h-10 text-accent mx-auto" />
                <h3 className="font-mono font-bold text-base text-primary uppercase">
                  Static Concept Diagram & Explanation
                </h3>
                <p className="text-xs text-primary/60 font-sans max-w-md mx-auto">
                  No interactive animation module available for this specific topic. Showing static schematic breakdown instead.
                </p>
              </div>

              {/* Static SVG Diagram */}
              <div className="p-6 bg-background border border-border/60 rounded-xl flex flex-col items-center justify-center space-y-3">
                <svg className="w-32 h-32 text-accent" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                  <circle cx="50" cy="50" r="40" strokeWidth="2" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="10" fill="currentColor" />
                  <path d="M50 10 L50 90 M10 50 L90 50" strokeWidth="1.5" opacity="0.4" />
                </svg>
                <span className="text-[10px] font-mono uppercase text-primary/50 font-bold">
                  Schematic Concept Map: {note.title}
                </span>
              </div>

              {/* Explanation */}
              <div className="p-4 bg-background border border-border/50 rounded-xl space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-accent flex items-center gap-1">
                  <Sparkles size={13} /> Detailed Explanation
                </span>
                <p className="text-xs text-primary/80 font-sans leading-relaxed">
                  {note.description || 'This topic provides standard theoretical foundations and core analytical concepts for study review.'}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

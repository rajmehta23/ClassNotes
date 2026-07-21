import React from 'react';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { SUPPORTED_VOICE_COMMANDS } from '@/constants/voiceCommands';
import { Mic, Volume2, X, HelpCircle, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceAssistantProps {
  onTriggerUpload?: () => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onTriggerUpload }) => {
  const {
    isSupported,
    isListening,
    transcript,
    feedbackMessage,
    isHelpOpen,
    setIsHelpOpen,
    toggleListening
  } = useVoiceCommands(onTriggerUpload);

  return (
    <>
      {/* 1. Floating Microphone Button (Bottom Left to stay clear of AI Chatbot) */}
      <div className="fixed bottom-6 left-6 z-40 select-none">
        <div className="relative">
          {/* Animated Pulsing Audio Wave Rings when Listening */}
          {isListening && (
            <>
              <motion.span
                animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-accent/40 z-0 pointer-events-none"
              />
              <motion.span
                animate={{ scale: [1, 2.2, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                className="absolute inset-0 rounded-full bg-blue-500/30 z-0 pointer-events-none"
              />
            </>
          )}

          {/* Floating Mic Launcher */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={toggleListening}
            className={`relative z-10 inline-flex items-center gap-2 px-3.5 py-3 rounded-full font-bold text-xs shadow-luxury border transition-all duration-300 cursor-pointer ${
              isListening
                ? 'bg-danger text-white border-white/30 shadow-danger/30'
                : 'bg-surface border-border/80 text-primary hover:border-accent hover:text-accent'
            }`}
            title={isListening ? 'Click to stop listening' : 'Click to activate Voice Command Assistant'}
          >
            {isListening ? (
              <Mic className="w-5 h-5 animate-pulse text-white" />
            ) : (
              <Mic className="w-5 h-5 text-accent" />
            )}

            <span className="font-sans font-extrabold tracking-tight hidden sm:inline">
              {isListening ? 'Listening...' : 'Voice Navigation'}
            </span>

            {/* Help Info Badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsHelpOpen(true);
              }}
              className="p-1 text-primary/40 hover:text-accent rounded-full transition-colors cursor-pointer ml-0.5"
              title="View voice commands help"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </motion.button>
        </div>
      </div>

      {/* 2. Real-Time Speech & Feedback Toast Banner */}
      <AnimatePresence>
        {(isListening || Boolean(feedbackMessage)) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-22 left-6 z-50 max-w-sm w-full select-none"
          >
            <div className="p-4 bg-surface border border-border/80 rounded-2xl shadow-luxury backdrop-blur-md space-y-2 font-sans text-xs">
              {/* Listening Transcript Bar */}
              {isListening && (
                <div className="flex items-center gap-2 text-accent font-semibold">
                  <span className="w-2 h-2 rounded-full bg-danger animate-ping shrink-0" />
                  <span className="truncate">
                    {transcript ? `"${transcript}"` : 'Listening for command (e.g. "Open Notes")...'}
                  </span>
                </div>
              )}

              {/* Feedback Message */}
              {feedbackMessage && (
                <div
                  className={`flex items-start gap-2 p-2.5 rounded-xl border font-medium text-xs leading-snug ${
                    feedbackMessage.type === 'success'
                      ? 'bg-success/10 border-success/30 text-success'
                      : feedbackMessage.type === 'error'
                      ? 'bg-danger/10 border-danger/30 text-danger'
                      : 'bg-accent/10 border-accent/30 text-accent'
                  }`}
                >
                  {feedbackMessage.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  {feedbackMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  {feedbackMessage.type === 'info' && <Info className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{feedbackMessage.text}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Voice Commands Help Modal */}
      <AnimatePresence>
        {isHelpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none font-sans">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHelpOpen(false)}
              className="fixed inset-0 bg-primary/30 backdrop-blur-xs"
            />

            {/* Dialog Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-luxury flex flex-col overflow-hidden relative z-10 max-h-[80vh]"
            >
              {/* Header */}
              <div className="p-4 border-b border-border/60 flex items-center justify-between bg-surface shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-primary leading-tight">Supported Voice Commands</h3>
                    <p className="text-[10px] text-primary/45 font-mono">Speak any of these phrases from any page</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="p-1.5 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                  title="Close help"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Commands List */}
              <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar text-xs">
                {['Navigation', 'Notes', 'General'].map((cat) => {
                  const catCmds = SUPPORTED_VOICE_COMMANDS.filter((c) => c.category === cat);
                  if (catCmds.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-2">
                      <h4 className="text-[10px] font-mono uppercase font-bold text-accent tracking-wider">
                        {cat} Commands
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {catCmds.map((cmd) => (
                          <div
                            key={cmd.id}
                            className="p-3 bg-background/50 border border-border/60 rounded-xl space-y-1"
                          >
                            <span className="font-bold text-primary block leading-tight text-xs">{cmd.name}</span>
                            <p className="text-[10px] text-primary/50 leading-snug">{cmd.description}</p>
                            <div className="pt-1 flex flex-wrap gap-1">
                              {cmd.examples.map((ex, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] font-mono bg-primary/5 border border-border/40 px-1.5 py-0.5 rounded text-primary/70"
                                >
                                  "{ex}"
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {!isSupported && (
                  <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl text-danger text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Voice commands are not supported in this browser. Please try Chrome or Edge.</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAssistant;

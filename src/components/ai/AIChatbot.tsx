import React, { useState, useRef, useEffect } from 'react';
import { useAIStore } from '@/features/ai/useAIStore';
import { geminiService } from '@/services/ai/gemini';
import { FEATURE_FLAGS } from '@/modules/config/featureFlags';
import { useChatbot } from '@/modules/chatbot/hooks/useChatbot';
import { 
  Bot, Send, X, Trash2, Sparkles, FileText, HelpCircle, 
  MessageSquareText, BookOpen, Loader2, Copy, Check, CheckCircle2, XCircle, AlertCircle,
  Square, RotateCcw, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AIChatbot: React.FC = () => {
  const activeNote = useAIStore((s) => s.activeNote);
  const activeNoteText = useAIStore((s) => s.activeNoteText);
  const setActiveNote = useAIStore((s) => s.setActiveNote);
  const isPanelOpen = useAIStore((s) => s.isPanelOpen);
  const setIsPanelOpen = useAIStore((s) => s.setIsPanelOpen);
  const togglePanel = useAIStore((s) => s.togglePanel);
  const chatMessages = useAIStore((s) => s.chatMessages);
  const addChatMessage = useAIStore((s) => s.addChatMessage);
  const clearChat = useAIStore((s) => s.clearChat);
  const pendingAction = useAIStore((s) => s.pendingAction);
  const clearPendingAction = useAIStore((s) => s.clearPendingAction);

  // Modular chatbot hook (used when CHATBOT_AI flag is enabled)
  const chatbot = useChatbot();
  const streamingText = useAIStore((s) => s.streamingText);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, Record<number, number>>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isPanelOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping, isPanelOpen, streamingText]);

  // Handle auto-triggered pending action when user clicks an option on NoteCard
  useEffect(() => {
    if (isPanelOpen && pendingAction && activeNoteText) {
      const action = pendingAction;
      clearPendingAction();
      if (action === 'summary') {
        handleActionSummarize();
      } else if (action === 'quiz') {
        handleActionQuiz();
      } else if (action === 'ask') {
        addChatMessage({
          role: 'assistant',
          content: `What question would you like to ask about **"${activeNote?.title}"**? Type your question in the chat below! ❓`,
          type: 'text'
        });
      }
    }
  }, [isPanelOpen, pendingAction, activeNoteText]);

  // Handle standard user text message submission
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isTyping) return;

    if (!textToSend) {
      setInputMessage('');
    }

    // Add user message to state
    addChatMessage({
      role: 'user',
      content: text,
      type: 'text'
    });

    setIsTyping(true);

    try {
      if (FEATURE_FLAGS.CHATBOT_AI) {
        // === NEW MODULAR PATH: useChatbot → chatService → ChatAIGateway → Provider ===
        await chatbot.sendMessage(text);
      } else {
        // === LEGACY PATH: Direct geminiService (rollback-safe) ===
        const recentHistory = chatMessages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content
        }));
        recentHistory.push({ role: 'user', content: text });

        const aiReply = await geminiService.chatWithGemini(recentHistory, activeNoteText);

        addChatMessage({
          role: 'assistant',
          content: aiReply,
          type: 'text'
        });
      }
    } catch (err: any) {
      addChatMessage({
        role: 'assistant',
        content: `Sorry, I encountered an issue: ${err.message || 'Unable to connect to AI service'}. Please try again.`,
        type: 'text'
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Quick Action: Summarize Active Note
  const handleActionSummarize = async () => {
    if (!activeNoteText) {
      addChatMessage({
        role: 'assistant',
        content: 'Please open or preview a note first so I can summarize it for you! 📖',
        type: 'text'
      });
      return;
    }

    addChatMessage({
      role: 'user',
      content: `Please summarize "${activeNote?.title || 'this note'}".`,
      type: 'text'
    });

    setIsTyping(true);

    try {
      const summaryRes = await geminiService.summarizeNote(activeNoteText);
      addChatMessage({
        role: 'assistant',
        content: summaryRes.summary,
        type: 'summary',
        summaryData: summaryRes
      });
    } catch (err: any) {
      addChatMessage({
        role: 'assistant',
        content: `Failed to summarize note: ${err.message || 'Error occurred'}.`,
        type: 'text'
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Quick Action: Generate Quiz
  const handleActionQuiz = async () => {
    if (!activeNoteText) {
      addChatMessage({
        role: 'assistant',
        content: 'Please open or preview a note first so I can generate a 5-question quiz from it! 🎯',
        type: 'text'
      });
      return;
    }

    addChatMessage({
      role: 'user',
      content: `Generate a 5 MCQ practice quiz for "${activeNote?.title}".`,
      type: 'text'
    });

    setIsTyping(true);

    try {
      const quizRes = await geminiService.generateQuiz(activeNoteText);
      addChatMessage({
        role: 'assistant',
        content: `Here is your 5-question multiple choice quiz on **${activeNote?.title}**:`,
        type: 'quiz',
        quizData: quizRes
      });
    } catch (err: any) {
      addChatMessage({
        role: 'assistant',
        content: `Failed to generate quiz: ${err.message || 'Error occurred'}.`,
        type: 'text'
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Handle Quiz option selection
  const handleQuizOptionClick = (msgId: string, qIdx: number, optIdx: number) => {
    setSelectedQuizAnswers((prev) => ({
      ...prev,
      [msgId]: {
        ...(prev[msgId] || {}),
        [qIdx]: optIdx
      }
    }));
  };

  // Copy text to clipboard
  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* 1. Floating Chatbot Launcher Button (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40 select-none">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={togglePanel}
          className="relative inline-flex items-center gap-2.5 px-4 py-3 bg-linear-to-r from-accent via-blue-500 to-accent bg-[length:200%_auto] hover:bg-[right_center] text-white font-bold text-xs rounded-full shadow-luxury border border-white/20 transition-all duration-300 cursor-pointer"
          title="Chat with AI Helper"
        >
          <div className="relative w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-ping" />
          </div>
          <span className="font-sans font-extrabold tracking-tight">AI Helper</span>

          {activeNote && (
            <span className="hidden sm:inline-block text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono uppercase">
              Note Active
            </span>
          )}
        </motion.button>
      </div>

      {/* 2. Slide-over Interactive Chatbot Window */}
      <AnimatePresence>
        {isPanelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPanelOpen(false)}
              className="fixed inset-0 bg-primary/25 backdrop-blur-xs z-50"
            />

            {/* Chatbot Panel Drawer */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-surface border-l border-border/80 z-50 shadow-2xl flex flex-col overflow-hidden font-sans select-none"
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-border/60 bg-surface flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  {/* Attractive Styled Robo Icon Avatar */}
                  <div className="relative w-10 h-10 rounded-2xl bg-linear-to-tr from-accent via-blue-500 to-indigo-600 p-[1.5px] shadow-md shadow-accent/25 flex items-center justify-center shrink-0">
                    <div className="w-full h-full bg-surface rounded-[14px] flex items-center justify-center">
                      <Bot className="w-5 h-5 text-accent animate-pulse" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success border-2 border-surface rounded-full shadow-xs" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-primary leading-tight flex items-center gap-1.5">
                      <span>AI Helper</span>
                      <span className="text-[9px] font-mono uppercase bg-accent/10 text-accent font-bold px-1.5 py-0.2 rounded">
                        ONLINE
                      </span>
                    </h3>
                    <p className="text-[10px] text-primary/45 font-mono">Ask anything or analyze study notes</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={clearChat}
                    className="p-1.5 text-primary/40 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors cursor-pointer"
                    title="Clear chat history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsPanelOpen(false)}
                    className="p-1.5 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                    title="Close AI Helper"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Active Note Banner with Deactivate Option */}
              {activeNote ? (
                <div className="px-4 py-2 bg-accent/5 border-b border-accent/15 flex items-center justify-between text-[10px] shrink-0 gap-2">
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <BookOpen className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="text-primary/60 font-mono">Active Note:</span>
                    <span className="font-bold text-primary truncate">{activeNote.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-mono bg-accent/15 text-accent px-1.5 py-0.5 rounded font-bold uppercase">
                      {activeNote.category}
                    </span>
                    <button
                      onClick={() => setActiveNote(null)}
                      className="flex items-center gap-1 text-[9px] font-mono uppercase font-bold text-danger/80 hover:text-danger bg-danger/5 hover:bg-danger/10 border border-danger/25 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                      title="Deactivate / Close current note context"
                    >
                      <X className="w-3 h-3" />
                      <span>Deactivate</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-2 bg-warning/5 border-b border-warning/15 flex items-center gap-2 text-[10px] text-warning-fg shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
                  <span>No note active. Open any note or chat freely!</span>
                </div>
              )}


              {/* Chat Messages Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-background/30">
                {chatMessages.map((msg) => {
                  const isUser = msg.role === 'user';

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                        {/* Bubble */}
                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed relative group shadow-xs ${
                            isUser
                              ? 'bg-accent text-white rounded-br-none font-medium'
                              : 'bg-surface border border-border/80 text-primary rounded-bl-none'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.content}</div>

                          {/* Render Summary formatted block */}
                          {msg.summaryData && (
                            <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                              <span className="text-[10px] font-mono font-bold uppercase text-accent tracking-wider block">
                                Key Points:
                              </span>
                              <ul className="space-y-1">
                                {msg.summaryData.keyPoints.map((point, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-primary/80">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Render Interactive Quiz block */}
                          {msg.quizData && (
                            <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
                              {msg.quizData.questions.map((q, qIdx) => {
                                const msgAnswers = selectedQuizAnswers[msg.id] || {};
                                const selectedOpt = msgAnswers[qIdx];
                                const isAnswered = selectedOpt !== undefined;

                                return (
                                  <div key={qIdx} className="p-3 bg-background/50 border border-border/60 rounded-xl space-y-2">
                                    <p className="font-semibold text-primary text-xs">
                                      Q{qIdx + 1}. {q.question}
                                    </p>
                                    <div className="space-y-1.5">
                                      {q.options.map((opt, optIdx) => {
                                        const isSelected = selectedOpt === optIdx;
                                        const isCorrect = q.correctAnswerIndex === optIdx;

                                        let btnClass = 'border-border/60 hover:bg-primary/5 text-primary/80';
                                        if (isAnswered) {
                                          if (isCorrect) btnClass = 'border-success/50 bg-success/10 text-success font-semibold';
                                          else if (isSelected && !isCorrect) btnClass = 'border-danger/50 bg-danger/10 text-danger font-semibold';
                                        }

                                        return (
                                          <button
                                            key={optIdx}
                                            onClick={() => handleQuizOptionClick(msg.id, qIdx, optIdx)}
                                            className={`w-full text-left p-2 rounded-lg border text-[11px] flex justify-between items-center transition-all cursor-pointer ${btnClass}`}
                                          >
                                            <span>
                                              <b>[{String.fromCharCode(65 + optIdx)}]</b> {opt}
                                            </span>
                                            {isAnswered && isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />}
                                            {isAnswered && isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5 text-danger shrink-0" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Copy button */}
                          {!isUser && (
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.content)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-primary/40 hover:text-primary transition-all cursor-pointer"
                              title="Copy message"
                            >
                              {copiedId === msg.id ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        {/* Timestamp */}
                        <span className={`text-[9px] font-mono text-primary/35 block px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                          {msg.timestamp}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Streaming Text Display (modular chatbot) */}
                {streamingText && streamingText !== '⏳' && FEATURE_FLAGS.CHATBOT_AI && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2.5 justify-start"
                  >
                    <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="max-w-[85%] space-y-2">
                      <div className="p-3.5 rounded-2xl text-xs leading-relaxed bg-surface border border-border/80 text-primary rounded-bl-none shadow-xs">
                        <div className="whitespace-pre-wrap">{streamingText}</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Typing Indicator */}
                {isTyping && !streamingText && (
                  <div className="flex items-center gap-2 text-xs text-primary/50 font-medium pl-1 animate-pulse">
                    <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <Bot className="w-3.5 h-3.5 animate-spin" />
                    </div>
                    <span>AI Helper is typing...</span>
                  </div>
                )}

                {/* Stop / Retry / Regenerate Controls */}
                {FEATURE_FLAGS.CHATBOT_AI && (
                  <div className="flex items-center gap-1.5 pl-9">
                    {(isTyping || streamingText) && (
                      <button
                        onClick={() => { chatbot.stopGeneration(); setIsTyping(false); }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-danger/80 hover:text-danger bg-danger/5 hover:bg-danger/10 border border-danger/20 rounded-lg transition-all cursor-pointer"
                        title="Stop generation"
                      >
                        <Square className="w-3 h-3" />
                        Stop
                      </button>
                    )}
                    {!isTyping && !streamingText && chatMessages.length > 1 && (
                      <>
                        <button
                          onClick={() => { setIsTyping(true); chatbot.retryLast().finally(() => setIsTyping(false)); }}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-primary/50 hover:text-primary bg-primary/5 hover:bg-primary/10 border border-border/60 rounded-lg transition-all cursor-pointer"
                          title="Retry last message"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Retry
                        </button>
                        <button
                          onClick={() => { setIsTyping(true); chatbot.regenerateLast().finally(() => setIsTyping(false)); }}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-primary/50 hover:text-primary bg-primary/5 hover:bg-primary/10 border border-border/60 rounded-lg transition-all cursor-pointer"
                          title="Regenerate response"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Regenerate
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Action Suggestion Chips */}
              <div className="p-2 bg-background/50 border-t border-border/40 overflow-x-auto flex gap-1.5 custom-scrollbar shrink-0">
                <button
                  onClick={handleActionSummarize}
                  disabled={isTyping}
                  className="px-2.5 py-1 bg-surface border border-border/80 hover:bg-accent hover:text-white text-primary text-[10px] font-bold rounded-full transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-3 h-3" />
                  Summarize
                </button>

                <button
                  onClick={handleActionQuiz}
                  disabled={isTyping}
                  className="px-2.5 py-1 bg-surface border border-border/80 hover:bg-accent hover:text-white text-primary text-[10px] font-bold rounded-full transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" />
                  5 MCQs Quiz
                </button>

                <button
                  onClick={() => handleSendMessage('Explain key study tips for exam preparation.')}
                  disabled={isTyping}
                  className="px-2.5 py-1 bg-surface border border-border/80 hover:bg-accent hover:text-white text-primary text-[10px] font-bold rounded-full transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <MessageSquareText className="w-3 h-3" />
                  Exam Tips
                </button>

                <button
                  onClick={() => handleSendMessage('How can I earn rewards and points on ClassNotes?')}
                  disabled={isTyping}
                  className="px-2.5 py-1 bg-surface border border-border/80 hover:bg-accent hover:text-white text-primary text-[10px] font-bold rounded-full transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <HelpCircle className="w-3 h-3" />
                  Platform Rewards
                </button>
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-surface border-t border-border/60 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    activeNote 
                      ? `Ask AI about "${activeNote.title}" or general studies...` 
                      : 'Ask AI Helper anything about your studies...'
                  }
                  disabled={isTyping}
                  className="flex-1 px-3 py-2 bg-background/50 border border-border/80 rounded-xl focus:bg-surface focus:border-accent text-xs leading-relaxed focus:ring-2 focus:ring-accent/10 transition-all text-primary"
                />
                <button
                  type="submit"
                  disabled={isTyping || !inputMessage.trim()}
                  className="p-2 bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shrink-0"
                  title="Send Message"
                >
                  {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatbot;

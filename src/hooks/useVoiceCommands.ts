import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useNotesStore } from '@/features/notes/useNotesStore';
import { SUPPORTED_VOICE_COMMANDS, type CommandDefinition } from '@/constants/voiceCommands';

// Web Speech API TypeScript Declaration
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useVoiceCommands(onTriggerUpload?: () => void) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const setSearchQuery = useNotesStore((s) => s.setSearchQuery);

  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('SpeechRecognition initialization error:', e);
      setIsSupported(false);
    }
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' | 'info') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const processCommandText = useCallback((text: string) => {
    const cleanedText = text.trim().toLowerCase();
    if (!cleanedText) {
      showFeedback("I couldn't understand. Please try again.", 'error');
      return;
    }

    let matchedCmd: CommandDefinition | null = null;
    let extractedSearchParam: string | null = null;

    for (const cmd of SUPPORTED_VOICE_COMMANDS) {
      for (const pattern of cmd.patterns) {
        const match = pattern.exec(cleanedText);
        if (match) {
          matchedCmd = cmd;
          if (cmd.id === 'notes_search' && match[1]) {
            extractedSearchParam = match[1].trim();
          }
          break;
        }
      }
      if (matchedCmd) break;
    }

    if (!matchedCmd) {
      showFeedback("Sorry, I don't support that command yet.", 'error');
      return;
    }

    // Check Admin restriction
    if (matchedCmd.adminOnly && user?.role !== 'admin') {
      showFeedback("Admin access is required to open the Admin panel.", 'error');
      return;
    }

    // Execute matched command
    switch (matchedCmd.id) {
      case 'nav_dashboard':
        navigate('/');
        showFeedback('Opening Dashboard...', 'success');
        break;
      case 'nav_notes':
        navigate('/notes');
        showFeedback('Opening Lecture Notes...', 'success');
        break;
      case 'nav_attendance':
        navigate('/attendance');
        showFeedback('Opening Attendance...', 'success');
        break;
      case 'nav_calendar':
        navigate('/calendar');
        showFeedback('Opening Calendar...', 'success');
        break;
      case 'nav_announcements':
        navigate('/announcements');
        showFeedback('Opening Notices & Announcements...', 'success');
        break;
      case 'nav_requests':
        navigate('/requests');
        showFeedback('Opening Note Requests...', 'success');
        break;
      case 'nav_rewards':
        navigate('/rewards');
        showFeedback('Opening Rewards...', 'success');
        break;
      case 'nav_settings':
        navigate('/settings');
        showFeedback('Opening Profile & Settings...', 'success');
        break;
      case 'nav_admin':
        navigate('/admin');
        showFeedback('Opening Admin Moderation...', 'success');
        break;
      case 'notes_search':
        if (extractedSearchParam) {
          setSearchQuery(extractedSearchParam);
          navigate('/notes');
          showFeedback(`Searching notes for "${extractedSearchParam}"...`, 'success');
        } else {
          navigate('/notes');
          showFeedback('Opening Notes search...', 'success');
        }
        break;
      case 'notes_upload':
        if (onTriggerUpload) {
          onTriggerUpload();
        } else {
          navigate('/notes');
        }
        showFeedback('Opening Upload dialog...', 'success');
        break;
      case 'notes_bookmarks':
        navigate('/notes');
        showFeedback('Viewing Saved Notes...', 'success');
        break;
      case 'general_help':
        setIsHelpOpen(true);
        showFeedback('Showing supported voice commands...', 'info');
        break;
      default:
        showFeedback("Sorry, I don't support that command yet.", 'error');
    }
  }, [navigate, user, setSearchQuery, onTriggerUpload]);

  // Bind Web Speech API event handlers
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);

      // Final result handling
      if (event.results[0] && event.results[0].isFinal) {
        processCommandText(currentTranscript);
        setTranscript('');
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setTranscript('');
      if (event.error === 'no-speech') {
        showFeedback("I couldn't understand. Please try again.", 'error');
      } else if (event.error === 'network') {
        showFeedback("Network error during speech recognition.", 'error');
      } else if (event.error === 'not-allowed') {
        showFeedback("Microphone permission denied.", 'error');
      } else {
        showFeedback("I couldn't understand. Please try again.", 'error');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setTranscript('');
    };
  }, [processCommandText]);

  const startListening = () => {
    if (!isSupported) {
      showFeedback("Voice commands are not supported in this browser.", 'error');
      return;
    }
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('');
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Failed to start speech recognition:', err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Failed to stop speech recognition:', err);
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return {
    isSupported,
    isListening,
    transcript,
    feedbackMessage,
    isHelpOpen,
    setIsHelpOpen,
    startListening,
    stopListening,
    toggleListening
  };
}

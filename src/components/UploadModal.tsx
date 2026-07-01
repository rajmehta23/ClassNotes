import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NoteUploadSchema, type NoteUploadInput } from '@/types/database';
import { useNotesStore } from '@/features/notes/useNotesStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { rewardsService } from '@/services/rewards';
import { useNotificationStore } from '@/features/notifications/useNotificationStore';
import { X, Upload, File, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: string;
  initialTopic?: string;
  requestId?: string;
  onUploadSuccess?: (noteId: string) => Promise<void> | void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ 
  isOpen, 
  onClose,
  initialSubject,
  initialTopic,
  requestId,
  onUploadSuccess
}) => {
  const { createNote } = useNotesStore();
  const { user } = useAuthStore();
  
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [wasApproved, setWasApproved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<NoteUploadInput>({
    resolver: zodResolver(NoteUploadSchema),
    defaultValues: {
      title: '',
      description: '',
      subject: '',
      category: 'Lecture Notes',
      fileType: 'pdf',
      fileUrl: 'https://classnotes.app/temp-placeholder-url.pdf',
      course: 'BCA',
      semester: '1',
      learningResourceUrl: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        title: initialTopic || '',
        description: '',
        subject: initialSubject || '',
        category: 'Lecture Notes',
        fileType: 'pdf',
        fileUrl: 'https://classnotes.app/temp-placeholder-url.pdf',
        course: user?.course || 'BCA',
        semester: user?.semester || '1',
        learningResourceUrl: '',
      });
      setFile(null);
      setFileError(null);
      setUploadError(null);
      setSuccess(false);
    }
  }, [isOpen, initialTopic, initialSubject, user, reset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateFile(selectedFile);
    }
  };

  const validateFile = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    
    // Validate size limit (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setFileError('File size exceeds the 10 MB limit.');
      setFile(null);
      return;
    }

    // Auto-detect type
    let detectedType: 'pdf' | 'image' | 'text' | 'docx' | 'pptx' | 'zip' | null = null;
    if (ext === 'pdf') {
      detectedType = 'pdf';
    } else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
      detectedType = 'image';
    } else if (['txt', 'md', 'json', 'csv'].includes(ext || '')) {
      detectedType = 'text';
    } else if (ext === 'docx' || ext === 'doc') {
      detectedType = 'docx';
    } else if (ext === 'pptx' || ext === 'ppt') {
      detectedType = 'pptx';
    } else if (ext === 'zip') {
      detectedType = 'zip';
    }

    if (!detectedType) {
      setFileError('Unsupported file format. Please upload PDF, Image, Text, DOC, DOCX, PPT, PPTX, or ZIP documents.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setValue('fileType', detectedType);
    setValue('fileUrl', 'https://classnotes.app/temp-placeholder-url.' + detectedType); // satisfy validator
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFileError(null);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateFile(droppedFile);
    }
  };

  const onSubmit = async (data: NoteUploadInput) => {
    if (!file) {
      setFileError('Please select or attach a lecture file.');
      return;
    }
    if (!user) {
      setUploadError('You must be signed in to upload notes.');
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);
    setSuccess(false);

    try {
      // 1. Create the note
      const newNote = await createNote(data, file, { uid: user.uid, displayName: user.displayName });
      
      const isApproved = newNote.status === 'approved';
      setWasApproved(isApproved);

      const settingsStr = localStorage.getItem('classnotes_admin_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : { uploadRewardPoints: 50 };
      const uploadReward = settings.uploadRewardPoints ?? 50;

      if (isApproved) {
        // Add notification for upload
        useNotificationStore.getState().addNotification(
          'Document Published',
          `Successfully uploaded "${data.title}" and earned +${uploadReward} points.`,
          'upload',
          user.uid
        );
        
        // 2. Add Reward points
        const updatedPoints = await rewardsService.addPoints(user.uid, uploadReward);
        
        // 3. Update global store points state
        useAuthStore.setState((state) => {
          if (state.user) {
            return {
              user: {
                ...state.user,
                points: updatedPoints
              }
            };
          }
          return {};
        });
      } else {
        // Add notification for pending upload
        useNotificationStore.getState().addNotification(
          'Document Uploaded (Pending Review)',
          `Successfully uploaded "${data.title}". It is now pending administrator review.`,
          'upload',
          user.uid
        );
      }

      if (onUploadSuccess && newNote) {
        try {
          await onUploadSuccess(newNote.id);
        } catch (err) {
          console.error('Failed to link upload to note request:', err);
        }
      }

      setSuccess(true);
      setFile(null);
      reset();
      
      // Auto close modal after brief delay (longer for pending review messages to let them read it)
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, isApproved ? 1500 : 2500);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-primary/15 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-lg bg-surface/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-luxury z-50 overflow-hidden flex flex-col mx-4 font-sans"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
          >
            <div className="border-b border-border/40 px-5 py-4 flex items-center justify-between bg-surface/80 shrink-0">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-accent bg-accent/5 px-2 py-0.5 rounded font-bold">Share Files</span>
                <h2 id="upload-modal-title" className="font-extrabold text-sm text-primary mt-1">Upload Lecture Note</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 border border-border/60 hover:bg-background text-primary/70 hover:text-primary rounded-md transition-colors cursor-pointer active-scale"
                title="Close upload modal"
              >
                <X size={13} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[75vh] custom-scrollbar">
              {success ? (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-4 animate-scale-in">
                  <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center border border-success/20 animate-bounce">
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-primary">
                      {wasApproved ? 'Upload Completed!' : 'Upload Received!'}
                    </h3>
                    {wasApproved ? (
                      <p className="text-xs text-success font-bold mt-1 font-mono">
                        +{localStorage.getItem('classnotes_admin_settings') 
                          ? (JSON.parse(localStorage.getItem('classnotes_admin_settings')!).uploadRewardPoints ?? 50) 
                          : 50} Reward Points Added
                      </p>
                    ) : (
                      <p className="text-xs text-primary/65 mt-2 max-w-xs mx-auto font-medium">
                        Your document is pending moderator approval. Points will be awarded once approved.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  
                  {uploadError && (
                    <div className="p-3.5 bg-danger/5 border border-danger/25 text-danger rounded-md text-xs flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span className="font-medium">{uploadError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono uppercase tracking-wider text-primary/50 font-bold">
                      Attach document
                    </label>
                    <div
                      onDragOver={onDragOver}
                      onDrop={onDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border border-dashed rounded-lg p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-primary/[0.01] ${
                        fileError 
                          ? 'border-danger bg-danger/[0.01]' 
                          : file 
                            ? 'border-accent bg-accent/[0.01]' 
                            : 'border-border/60 hover:border-accent/40'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.md,.doc,.docx,.ppt,.pptx,.zip"
                      />
                      
                      {file ? (
                        <>
                          <div className="w-10 h-10 bg-accent/5 rounded-md flex items-center justify-center border border-accent/20 mb-2">
                            <File size={22} className="text-accent" />
                          </div>
                          <p className="text-xs font-bold text-primary truncate max-w-[250px]">{file.name}</p>
                          <p className="text-[9px] font-mono text-primary/45 mt-1 font-bold">{(file.size / 1024).toFixed(1)} KB • {file.type.split('/').pop()?.toUpperCase()}</p>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-primary/5 rounded-md flex items-center justify-center border border-border/40 mb-2 animate-float-1">
                            <Upload size={18} className="text-primary/40" />
                          </div>
                          <p className="text-xs font-bold text-primary">Drag & drop your file here or click to browse</p>
                          <p className="text-[9px] font-mono text-primary/45 mt-1">PDF, JPG, PNG, TXT, DOC, DOCX, PPT, PPTX, ZIP (Max 10 MB)</p>
                        </>
                      )}
                    </div>
                    {fileError && (
                      <p className="text-[10px] text-danger flex items-center gap-1 mt-1 font-sans font-medium">
                        <AlertCircle size={11} />
                        {fileError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="title" className="block text-[9px] font-mono uppercase tracking-wider text-primary/50 font-bold">
                      Document Title
                    </label>
                    <input
                      id="title"
                      type="text"
                      placeholder="e.g. MATH201: Calculus I Limit Theorems Summary"
                      disabled={isSubmitting}
                      {...register('title')}
                      className={`block w-full rounded-md border px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent transition-all ${
                        errors.title ? 'border-danger focus:ring-danger/20' : 'border-border/60 focus:ring-accent/20'
                      }`}
                    />
                    {errors.title && (
                      <p className="text-[10px] text-danger flex items-center gap-1 mt-0.5 font-medium">
                        <AlertCircle size={11} />
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="description" className="block text-[9px] font-mono uppercase tracking-wider text-primary/50 font-bold">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      placeholder="Summarize the core topics covered in this document..."
                      disabled={isSubmitting}
                      {...register('description')}
                      className={`block w-full rounded-md border px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent transition-all resize-none ${
                        errors.description ? 'border-danger focus:ring-danger/20' : 'border-border/60 focus:ring-accent/20'
                      }`}
                    />
                    {errors.description && (
                      <p className="text-[10px] text-danger flex items-center gap-1 mt-0.5 font-medium">
                        <AlertCircle size={11} />
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="learningResourceUrl" className="block text-[9px] font-mono uppercase tracking-wider text-primary/50 font-bold">
                      Learning Resource Link
                    </label>
                    <input
                      id="learningResourceUrl"
                      type="text"
                      placeholder="Paste a YouTube or educational resource link"
                      disabled={isSubmitting}
                      {...register('learningResourceUrl')}
                      className={`block w-full rounded-md border px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent transition-all ${
                        errors.learningResourceUrl ? 'border-danger focus:ring-danger/20' : 'border-border/60 focus:ring-accent/20'
                      }`}
                    />
                    {errors.learningResourceUrl && (
                      <p className="text-[10px] text-danger flex items-center gap-1 mt-0.5 font-medium">
                        <AlertCircle size={11} />
                        {errors.learningResourceUrl.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="subject" className="block text-[9px] font-mono uppercase tracking-wider text-primary/50 font-bold">
                        Subject
                      </label>
                      <input
                        id="subject"
                        type="text"
                        placeholder="e.g. Biology, Economics, History, Engineering"
                        disabled={isSubmitting}
                        {...register('subject')}
                        className={`block w-full rounded-md border px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent transition-all ${
                          errors.subject ? 'border-danger focus:ring-danger/20' : 'border-border/60'
                        }`}
                      />
                      {errors.subject && (
                        <p className="text-[10px] text-danger flex items-center gap-1 mt-0.5 font-medium">
                          <AlertCircle size={11} />
                          {errors.subject.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="category" className="block text-[9px] font-mono uppercase tracking-wider text-primary/50 font-bold">
                        Category
                      </label>
                      <select
                        id="category"
                        disabled={isSubmitting}
                        {...register('category')}
                        className="block w-full rounded-md border border-border/60 px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent focus:ring-accent/20 transition-all cursor-pointer text-primary"
                      >
                        <option value="Lecture Notes">Lecture Notes</option>
                        <option value="Cheat Sheets">Cheat Sheets</option>
                        <option value="Study Guides">Study Guides</option>
                        <option value="Mock Exams">Mock Exams</option>
                      </select>
                    </div>
                  </div>

                  {!requestId && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="course" className="block text-[9px] font-mono uppercase tracking-wider text-primary/50 font-bold">
                          Course
                        </label>
                        <select
                          id="course"
                          disabled={isSubmitting}
                          {...register('course')}
                          className="block w-full rounded-md border border-border/60 px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent focus:ring-accent/20 transition-all cursor-pointer text-primary"
                        >
                          <option value="BCA">BCA</option>
                          <option value="BBA">BBA</option>
                          <option value="B.Tech">B.Tech</option>
                          <option value="B.Sc">B.Sc</option>
                          <option value="B.Com">B.Com</option>
                          <option value="BA">BA</option>
                          <option value="B.Ed">B.Ed</option>
                          <option value="B.Arch">B.Arch</option>
                          <option value="BFA">BFA</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="semester" className="block text-[9px] font-mono uppercase tracking-wider text-primary/50 font-bold">
                          Semester
                        </label>
                        <select
                          id="semester"
                          disabled={isSubmitting}
                          {...register('semester')}
                          className="block w-full rounded-md border border-border/60 px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent focus:ring-accent/20 transition-all cursor-pointer text-primary"
                        >
                          {[...Array(8)].map((_, i) => (
                            <option key={i + 1} value={String(i + 1)}>
                              {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <motion.button
                      whileHover="hover"
                      whileTap="tap"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg shadow-md shadow-accent/15 hover:shadow-lg hover:shadow-accent/35 text-xs font-semibold text-white bg-linear-to-r from-accent via-blue-500 to-accent bg-[length:200%_auto] hover:bg-[right_center] focus:outline-none transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer font-sans"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={13} className="animate-spin mr-2" />
                          <span>Uploading File...</span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1.5 justify-center">
                          <motion.span
                            variants={{
                              hover: { y: -2, transition: { repeat: Infinity, repeatType: "reverse", duration: 0.4 } }
                            }}
                          >
                            <Upload size={12} />
                          </motion.span>
                          Publish Note
                        </span>
                      )}
                    </motion.button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UploadModal;

import React, { useState } from 'react';
import { sandboxService } from '@/services/sandbox';
import { useDocumentMetadata } from '@/hooks/useDocumentMetadata';
import { Settings as SettingsIcon, ToggleLeft, ToggleRight, Trash2, AlertCircle, AlertTriangle, User, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserAvatarUrl } from '@/utils/avatar';
import { storageService } from '@/services/storage';

export const Settings: React.FC = () => {
  useDocumentMetadata('Preferences Settings', 'Configure application controls, toggle forced sandbox simulation mode, and manage local storage cache.');
  const isSandbox = sandboxService.isSandboxActive();

  const { user, updateProfile } = useAuthStore();
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [course, setCourse] = useState(user?.course || 'BCA');
  const [semester, setSemester] = useState(user?.semester || '1');

  // Synchronise state with user updates
  React.useEffect(() => {
    if (user) {
      setNewDisplayName(user.displayName || '');
      setCourse(user.course || 'BCA');
      setSemester(user.semester || '1');
    }
  }, [user]);

  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);

    // Validate type: JPG, PNG, WEBP
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      const err = 'Invalid file type. Please upload a JPG, PNG or WEBP image.';
      setPhotoError(err);
      setToastMessage({ type: 'error', text: err });
      return;
    }

    // Validate size: max 5 MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const err = 'File is too large. Maximum size allowed is 5MB.';
      setPhotoError(err);
      setToastMessage({ type: 'error', text: err });
      return;
    }

    if (!user) return;

    setIsPhotoUploading(true);
    setUploadProgress(0);

    try {
      // Upload using storageService (which handles Cloudinary or Sandbox storage automatically)
      const secureUrl = await storageService.uploadFile(
        file, 
        `profiles/${user.uid}`, 
        (percent) => setUploadProgress(percent)
      );

      // Save secure_url to Firestore/Zustand store under photoURL
      await updateProfile({ 
        photoURL: secureUrl, 
        updatedAt: new Date().toISOString() 
      });

      setToastMessage({ type: 'success', text: 'Profile picture updated successfully!' });
    } catch (err: any) {
      const msg = err?.message || 'Failed to upload profile picture.';
      setPhotoError(msg);
      setToastMessage({ type: 'error', text: msg });
    } finally {
      setIsPhotoUploading(false);
      setUploadProgress(null);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    if (window.confirm('Are you sure you want to remove your profile picture?')) {
      try {
        await updateProfile({ 
          photoURL: '', 
          updatedAt: new Date().toISOString() 
        });
        setToastMessage({ type: 'success', text: 'Profile picture removed successfully!' });
      } catch (err: any) {
        setToastMessage({ type: 'error', text: err.message || 'Failed to remove profile picture.' });
      }
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleToggleSandbox = () => {
    sandboxService.setSandboxOverride(!isSandbox);
  };

  const triggerPurgeCache = () => {
    localStorage.clear();
    setToastMessage({ type: 'success', text: 'Local databases purged successfully. Resetting application...' });
    setShowPurgeConfirm(false);
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const cleanedName = newDisplayName.trim();
    if (cleanedName.length < 2) {
      setToastMessage({ type: 'error', text: 'Display name must be at least 2 characters.' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    if (cleanedName.length > 50) {
      setToastMessage({ type: 'error', text: 'Display name must be under 50 characters.' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    // Validate course/semester dropdown options against allowed catalog
    if (user.role === 'student') {
      const validCourses = ['BCA', 'BBA', 'B.Tech', 'B.Sc', 'MCA', 'MBA'];
      const validSemesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
      if (!validCourses.includes(course)) {
        setToastMessage({ type: 'error', text: 'Invalid course selection.' });
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
      if (!validSemesters.includes(semester)) {
        setToastMessage({ type: 'error', text: 'Invalid semester selection.' });
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
    }
    
    try {
      const updatedFields: any = { displayName: cleanedName };
      if (user.role === 'student') {
        updatedFields.course = course;
        updatedFields.semester = semester;
      }
      await updateProfile(updatedFields);
      setToastMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 relative">
      {/* Toast popup */}
      <div className="fixed top-20 right-6 z-50 pointer-events-none select-none max-w-sm w-full">
        {toastMessage && (
          <div className={`p-4 rounded-md shadow-lg border flex items-start gap-2.5 bg-surface text-xs font-medium animate-slide-in pointer-events-auto ${
            toastMessage.type === 'error' 
              ? 'border-danger/30 text-danger' 
              : 'border-success/30 text-success'
          }`}>
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{toastMessage.text}</span>
          </div>
        )}
      </div>

      <div className="border-b border-border pb-6">
        <span className="text-xs font-mono uppercase tracking-wider text-accent">Preferences</span>
        <h1 className="text-3xl font-bold mt-1 tracking-tight">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Profile Settings Card */}
        <div className="luxury-card p-6 bg-surface">
          <h2 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
            <User size={18} />
            Profile Settings
          </h2>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
            {/* Profile Picture Uploader */}
            <div className="flex items-center gap-6 pb-4 border-b border-border/40 mb-4 select-none">
              <div className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-border/60 shadow-md shrink-0">
                {isPhotoUploading ? (
                  <div className="absolute inset-0 bg-primary/20 backdrop-blur-xs flex flex-col items-center justify-center text-primary text-[10px] font-bold font-mono">
                    <Loader2 className="w-5 h-5 animate-spin text-accent mb-0.5" />
                    <span>{uploadProgress}%</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[8px] font-bold font-mono transition-opacity cursor-pointer uppercase tracking-wider select-none text-center px-1">
                    Upload Photo
                  </div>
                )}
                
                {getUserAvatarUrl(user) ? (
                  <img 
                    src={getUserAvatarUrl(user)!} 
                    alt={user?.displayName || 'User avatar'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary/50 shadow-inner">
                    <User size={24} />
                  </div>
                )}

                {!isPhotoUploading && (
                  <input 
                    type="file" 
                    accept="image/jpeg, image/jpg, image/png, image/webp" 
                    onChange={handlePhotoUpload} 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    title="Upload profile picture"
                  />
                )}
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-xs text-primary">Profile Image</h4>
                <p className="text-[10px] text-primary/50">Supports JPG, PNG, WEBP up to 5MB.</p>
                {getUserAvatarUrl(user) && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="mt-1.5 px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-danger border border-danger/25 bg-danger/[0.02] hover:bg-danger hover:text-surface rounded transition-all cursor-pointer block select-none"
                  >
                    Remove Photo
                  </button>
                )}
                {photoError && (
                  <p className="text-[10px] text-danger font-medium flex items-center gap-1 leading-normal">
                    <AlertCircle size={11} className="shrink-0" />
                    {photoError}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="displayName" className="block text-xs font-bold text-primary">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="w-full border border-border bg-background/50 rounded px-3 py-2 text-xs focus:outline-none focus:border-accent"
                placeholder="Enter your name"
                required
              />
            </div>

            {user?.role !== 'guest' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="course" className="block text-xs font-bold text-primary">
                    Course / Major
                  </label>
                  <select
                    id="course"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full border border-border bg-background/50 rounded px-3 py-2 text-xs focus:outline-none focus:border-accent text-primary cursor-pointer"
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
                  <label htmlFor="semester" className="block text-xs font-bold text-primary">
                    Semester
                  </label>
                  <select
                    id="semester"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full border border-border bg-background/50 rounded px-3 py-2 text-xs focus:outline-none focus:border-accent text-primary cursor-pointer"
                  >
                    {[...Array(8)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        Semester {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            <button
              type="submit"
              className="px-4 py-2 bg-accent text-white text-xs font-semibold rounded hover:bg-accent/90 transition-all cursor-pointer font-sans"
            >
              Update Profile
            </button>
          </form>
        </div>

        {/* Profile Card Mock */}
        <div className="luxury-card p-6 bg-surface">
          <h2 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
            <SettingsIcon size={18} />
            Application Controls
          </h2>
          
          <div className="divide-y divide-border text-sm">
            {/* Sandbox Toggle */}
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-primary">Force Sandbox Mode</p>
                <p className="text-xs text-primary/50">
                  Override Firebase authentication/database and utilize local storage cache instead.
                </p>
              </div>
              <button 
                onClick={handleToggleSandbox} 
                className="text-primary hover:text-accent transition-colors focus-visible:ring-2 focus-visible:ring-accent focus:outline-none rounded"
                title="Toggle Sandbox override"
                aria-label="Toggle Force Sandbox Mode"
              >
                {isSandbox ? (
                  <ToggleRight size={38} className="text-accent cursor-pointer" />
                ) : (
                  <ToggleLeft size={38} className="text-primary/45 cursor-pointer" />
                )}
              </button>
            </div>

            {/* Clear Database */}
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-primary">Purge Sandbox Databases</p>
                <p className="text-xs text-primary/50">
                  Delete all local study files, bookmarks, calendars, and users.
                </p>
              </div>
              <button 
                onClick={() => setShowPurgeConfirm(true)}
                className="flex items-center gap-2 text-xs border border-danger/20 bg-danger/[0.02] text-danger hover:bg-danger hover:text-surface transition-all px-3 py-1.5 rounded-md font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-danger focus:outline-none"
                aria-label="Purge Sandbox databases"
              >
                <Trash2 size={13} />
                Reset Cache
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showPurgeConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPurgeConfirm(false)}
              className="fixed inset-0 bg-primary/45 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 15 }}
              className="bg-surface border border-border w-full max-w-md rounded-lg shadow-luxury p-6 relative z-10 flex flex-col gap-4 text-left"
              role="dialog"
              aria-modal="true"
              aria-labelledby="purge-dialog-title"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-danger/10 text-danger border border-danger/25 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 id="purge-dialog-title" className="font-bold text-base text-primary">Purge local database cache?</h3>
                  <p className="text-xs text-primary/60 mt-1 leading-relaxed">
                    This will delete all custom files, notices, calendars, achievements, and session logins. The sandbox databases will be reset to seed data settings.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowPurgeConfirm(false)}
                  className="px-4 py-2 border border-border text-primary/70 hover:text-primary rounded-md text-xs font-semibold hover:bg-primary/5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={triggerPurgeCache}
                  className="px-4 py-2 bg-danger text-surface hover:bg-danger/95 rounded-md text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-danger focus:outline-none"
                >
                  Purge Databases
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;

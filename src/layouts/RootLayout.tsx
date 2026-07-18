import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, BookOpen, Calendar, Megaphone, Award, Settings, Shield, 
  Menu, X, ChevronLeft, ChevronRight, User, LogOut, Bell, Upload, Loader2,
  Inbox, CalendarCheck
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useNotificationStore } from '@/features/notifications/useNotificationStore';
import UploadModal from '@/components/UploadModal';
import RequestNotesModal from '@/components/RequestNotesModal';
import LoadingPage from '@/components/LoadingPage';
import { getUserAvatarUrl } from '@/utils/avatar';
import { storageService } from '@/services/storage';

export const RootLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isGlobalUploadOpen, setIsGlobalUploadOpen] = useState(false);
  const [isGlobalRequestOpen, setIsGlobalRequestOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();

  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseOffset({
        x: (e.clientX - window.innerWidth / 2) / 45,
        y: (e.clientY - window.innerHeight / 2) / 45,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  
  const { notifications, unreadCount, initialize, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileCourse, setProfileCourse] = useState('');
  const [profileSemester, setProfileSemester] = useState('');

  useEffect(() => {
    initialize(user?.uid);
  }, [initialize, user?.uid]);

  useEffect(() => {
    if (user) {
      setProfileName(user.displayName || '');
      setProfileCourse(user.course || '');
      setProfileSemester(user.semester || '');
    }
  }, [user]);

  const { updateProfile } = useAuthStore();
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: JPG, PNG, WEBP
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload a JPG, PNG or WEBP image.');
      return;
    }

    // Validate size: max 5 MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert('File is too large. Maximum size allowed is 5MB.');
      return;
    }

    if (!user) return;

    setIsPhotoUploading(true);
    setUploadProgress(0);

    try {
      const secureUrl = await storageService.uploadFile(
        file, 
        `profiles/${user.uid}`, 
        (percent) => setUploadProgress(percent)
      );

      await updateProfile({ 
        photoURL: secureUrl, 
        updatedAt: new Date().toISOString() 
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to upload profile picture.');
    } finally {
      setIsPhotoUploading(false);
      setUploadProgress(null);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    if (window.confirm('Are you sure you want to remove your profile picture?')) {
      try {
        await updateProfile({ 
          photoURL: '', 
          updatedAt: new Date().toISOString() 
        });
      } catch (err: any) {
        alert(err?.message || 'Failed to remove profile picture.');
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await updateProfile({ 
        displayName: profileName,
        course: profileCourse,
        semester: profileSemester
      });
      setIsProfileOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile.');
    }
  };

  const allNavItems = [
    { label: 'Dashboard', path: '/', icon: LayoutGrid },
    { label: 'Notes', path: '/notes', icon: BookOpen },
    { label: 'Attendance', path: '/attendance', icon: CalendarCheck },
    { label: 'Note Requests', path: '/requests', icon: Inbox },
    { label: 'Calendar', path: '/calendar', icon: Calendar },
    { label: 'Announcements', path: '/announcements', icon: Megaphone },
    { label: 'Rewards', path: '/rewards', icon: Award },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Admin Panel', path: '/admin', icon: Shield, adminOnly: true },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || user?.role === 'admin');

  const currentYear = new Date().getFullYear();

  const pageTransition = {
    initial: { opacity: 0, y: 2 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.15, ease: 'easeOut' }
  };

  return (
    <div className="min-h-screen bg-background text-primary flex flex-col font-sans relative overflow-hidden">
      {/* Alive Ambient Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {/* Grid Texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] transition-transform duration-300 ease-out"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            transform: `translate(${mouseOffset.x * 0.2}px, ${mouseOffset.y * 0.2}px)`
          }}
        />

        {/* Floating Blurred Circles with Parallax */}
        <motion.div
          animate={{
            x: [0, 20, -10, 0],
            y: [0, -30, 15, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-96 h-96 rounded-full bg-accent/5 blur-[100px]"
          style={{
            top: '15%',
            left: '20%',
            translateX: mouseOffset.x * 0.6,
            translateY: mouseOffset.y * 0.6,
          }}
        />

        <motion.div
          animate={{
            x: [0, -25, 15, 0],
            y: [0, 25, -20, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-[450px] h-[450px] rounded-full bg-warning/4 blur-[110px]"
          style={{
            bottom: '20%',
            right: '15%',
            translateX: mouseOffset.x * -0.7,
            translateY: mouseOffset.y * -0.7,
          }}
        />

        <motion.div
          animate={{
            x: [0, 15, -20, 0],
            y: [0, 20, -25, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-80 h-80 rounded-full bg-danger/3 blur-[90px]"
          style={{
            top: '50%',
            left: '60%',
            translateX: mouseOffset.x * 0.4,
            translateY: mouseOffset.y * 0.4,
          }}
        />

        {/* Light floating particles */}
        <div className="absolute inset-0 overflow-hidden opacity-40">
          {[...Array(12)].map((_, i) => {
            const delay = i * 2;
            const left = (i * 9) + 5;
            const size = (i % 3 === 0) ? 6 : (i % 2 === 0) ? 4 : 2;
            return (
              <motion.div
                key={i}
                initial={{ y: '110vh', x: `${left}vw`, opacity: 0.1 }}
                animate={{ y: '-10vh', opacity: [0.1, 0.4, 0.4, 0] }}
                transition={{
                  duration: 35 + (i * 2),
                  repeat: Infinity,
                  ease: 'linear',
                  delay: delay,
                }}
                className="absolute bg-accent/20 rounded-full"
                style={{
                  width: size,
                  height: size,
                  filter: 'blur(1px)',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-background/50 backdrop-blur-lg border-b border-border/40 h-16 flex items-center justify-between px-6 select-none">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 -ml-2 text-primary hover:bg-primary/5 rounded-md transition-colors"
            title="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="ClassNotes Logo" 
              className="w-10 h-10 object-contain rounded-md"
            />
            <span className="font-black text-2xl hidden sm:inline-block tracking-tight font-mono uppercase bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              ClassNotes
            </span>
          </Link>

        </div>

        {/* Header Right */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover="hover"
            whileTap="tap"
            onClick={() => setIsGlobalRequestOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-linear-to-r from-blue-600 via-blue-500 to-blue-600 bg-[length:200%_auto] hover:bg-[right_center] text-white text-xs font-semibold rounded-md shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/35 transition-all duration-300 cursor-pointer font-sans"
          >
            <motion.span
              variants={{
                hover: { y: -2, transition: { repeat: Infinity, repeatType: "reverse", duration: 0.4 } }
              }}
            >
              <Inbox size={12} />
            </motion.span>
            Request Note
          </motion.button>

          <motion.button
            whileHover="hover"
            whileTap="tap"
            onClick={() => setIsGlobalUploadOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-linear-to-r from-accent via-blue-500 to-accent bg-[length:200%_auto] hover:bg-[right_center] text-white text-xs font-semibold rounded-md shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/35 transition-all duration-300 cursor-pointer font-sans"
          >
            <motion.span
              variants={{
                hover: { y: -2, transition: { repeat: Infinity, repeatType: "reverse", duration: 0.4 } }
              }}
            >
              <Upload size={12} />
            </motion.span>
            Upload Note
          </motion.button>


          {/* Notifications Bell Dropdown */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-1.5 border border-border hover:bg-background text-primary/70 hover:text-primary rounded-md transition-colors relative cursor-pointer active-scale"
              title="Toggle Notifications"
            >
              <Bell size={14} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-danger text-surface text-[8px] font-mono font-bold flex items-center justify-center rounded-full leading-none">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-md shadow-luxury z-50 overflow-hidden text-xs flex flex-col max-h-96"
                >
                    <div className="p-3 border-b border-border flex justify-between items-center bg-surface shrink-0">
                      <span className="font-bold text-primary text-[11px] font-mono uppercase tracking-wider">Notifications</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            markAllAsRead();
                            setIsNotificationOpen(false);
                          }}
                          className="text-[9px] text-accent hover:underline font-mono cursor-pointer"
                        >
                          Mark read
                        </button>
                        <button
                          onClick={() => {
                            clearAll();
                            setIsNotificationOpen(false);
                          }}
                          className="text-[9px] text-danger hover:underline font-mono cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-border bg-background/30 custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-primary/40 font-mono text-[9px] uppercase tracking-wider">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              markAsRead(notif.id);
                              setIsNotificationOpen(false);
                              if (notif.type === 'announcement') {
                                navigate('/announcements');
                              } else if (notif.type === 'reward') {
                                navigate('/rewards');
                              } else if (notif.type === 'upload' || notif.type === 'download') {
                                navigate('/notes');
                              }
                            }}
                            className={`p-3 transition-colors hover:bg-primary/5 cursor-pointer ${
                              notif.isRead ? 'opacity-65' : 'bg-surface/80 border-l-2 border-accent'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className={`font-bold leading-tight ${notif.isRead ? 'text-primary' : 'text-primary'}`}>
                                {notif.title}
                              </span>
                              <span className="text-[8px] font-mono text-primary/30 shrink-0">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[10px] text-primary/60 mt-1 leading-normal">
                              {notif.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold leading-none">{user?.displayName || 'Active User'}</p>
            <span className="text-[10px] font-mono text-primary/50 uppercase leading-none">{user?.role || 'student'}</span>
          </div>
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-8 h-8 rounded-full border border-border bg-primary/5 flex items-center justify-center text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer active-scale overflow-hidden"
              title="Profile settings"
            >
              {getUserAvatarUrl(user) ? (
                <img 
                  src={getUserAvatarUrl(user)!} 
                  alt={user?.displayName || 'User avatar'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={16} />
              )}
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-md shadow-luxury z-50 overflow-hidden text-xs flex flex-col p-4 space-y-4"
                  >
                    <div className="flex items-center gap-4 border-b border-border pb-3">
                      <div className="relative group w-12 h-12 rounded-full overflow-hidden border border-border shadow-xs shrink-0 select-none">
                        {isPhotoUploading ? (
                          <div className="absolute inset-0 bg-primary/20 backdrop-blur-xs flex flex-col items-center justify-center text-primary text-[8px] font-bold font-mono">
                            <Loader2 className="w-4 h-4 animate-spin text-accent mb-0.5" />
                            <span>{uploadProgress}%</span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[7px] font-bold font-mono transition-opacity cursor-pointer uppercase tracking-wider select-none text-center leading-tight">
                            Change
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
                            <User size={18} />
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

                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="font-bold text-primary text-xs truncate block leading-none">{user?.displayName || 'Active User'}</span>
                        <span className="text-[9px] text-primary/45 font-mono truncate block leading-none">{user?.email}</span>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => document.getElementById('dropdown-avatar-input')?.click()}
                            className="text-[9px] text-accent hover:underline font-mono cursor-pointer font-bold uppercase tracking-wider bg-transparent border-0 p-0"
                          >
                            Upload
                          </button>
                          {getUserAvatarUrl(user) && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="text-[9px] text-danger hover:underline font-mono cursor-pointer font-bold uppercase tracking-wider bg-transparent border-0 p-0"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <input 
                          id="dropdown-avatar-input"
                          type="file" 
                          accept="image/jpeg, image/jpg, image/png, image/webp" 
                          onChange={handlePhotoUpload} 
                          className="hidden"
                        />
                      </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase text-primary/50 block font-semibold">Display Name</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full border border-border bg-background/50 rounded px-2.5 py-1.5 focus:outline-none focus:border-accent text-xs"
                          placeholder="e.g. Rajnish Kumar"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase text-primary/50 block font-semibold">Course</label>
                        <select
                          value={profileCourse || 'BCA'}
                          onChange={(e) => setProfileCourse(e.target.value)}
                          className="w-full border border-border bg-background/50 text-primary rounded px-2.5 py-1.5 focus:outline-none focus:border-accent text-xs cursor-pointer"
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
                        <label className="text-[9px] font-mono uppercase text-primary/50 block font-semibold">Semester</label>
                        <select
                          value={profileSemester || '1'}
                          onChange={(e) => setProfileSemester(e.target.value)}
                          className="w-full border border-border bg-background/50 text-primary rounded px-2.5 py-1.5 focus:outline-none focus:border-accent text-xs cursor-pointer"
                        >
                          {[...Array(8)].map((_, i) => (
                            <option key={i + 1} value={String(i + 1)}>
                              Semester {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-1.5 bg-accent text-white font-semibold rounded text-xs hover:bg-accent/90 transition-all active-scale font-sans cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </form>

                    <div className="border-t border-border pt-3">
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-1.5 border border-danger/25 bg-danger/[0.03] text-danger hover:bg-danger hover:text-surface font-semibold rounded text-[10px] transition-all active-scale font-mono uppercase tracking-wider cursor-pointer"
                      >
                        <LogOut size={11} />
                        Log Out
                      </button>
                    </div>
                  </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex relative">
        {/* Desktop Sidebar */}
        <motion.aside 
          animate={{ width: isSidebarCollapsed ? 64 : 256 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          className="hidden md:flex flex-col border-r border-border/40 bg-surface/60 backdrop-blur-lg relative select-none overflow-hidden"
        >
          {/* Collapse Trigger Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-4 w-6 h-6 border border-border/40 bg-surface hover:bg-background text-primary/70 hover:text-primary rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer hover:scale-110 z-10"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
          </button>

          <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center rounded-lg text-xs font-semibold uppercase tracking-wider font-sans transition-all group relative active-scale select-none ${
                    isSidebarCollapsed 
                      ? 'justify-center p-2.5' 
                      : 'gap-3 px-3.5 py-2.5'
                  } ${
                    isActive 
                      ? 'text-white font-bold' 
                      : 'text-primary/70 hover:bg-primary/[0.03] hover:text-primary'
                  }`}
                  style={{ minHeight: '40px' }}
                >
                  {/* Glowing active indicator pill */}
                  {isActive && (
                    <motion.div
                      layoutId="activeSidebarIndicator"
                      className="absolute inset-0 bg-linear-to-r from-accent to-blue-500 rounded-lg shadow-md shadow-accent/20 border border-accent/20 z-0"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}

                  {/* Icon */}
                  <Icon 
                    size={16} 
                    className={`shrink-0 z-10 transition-transform duration-[250ms] ease-out group-hover:scale-110 ${
                      isActive 
                        ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' 
                        : 'text-primary/65 group-hover:text-primary'
                    }`} 
                  />

                  {/* Label */}
                  {!isSidebarCollapsed && (
                    <motion.span 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="truncate z-10 transition-transform duration-[250ms] ease-out group-hover:translate-x-[3px]"
                    >
                      {item.label}
                    </motion.span>
                  )}

                  {/* Collapsed Tooltip */}
                  {isSidebarCollapsed && (
                    <div className="absolute left-14 bg-primary text-white text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Progress inside Sidebar */}
          {!isSidebarCollapsed && user && (
            <div className="p-4 border-t border-border/40 space-y-3 bg-surface/30 select-none">
              <div className="flex items-center gap-3">
                {getUserAvatarUrl(user) ? (
                  <img 
                    src={getUserAvatarUrl(user)!} 
                    alt={user.displayName} 
                    className="w-8 h-8 rounded-full object-cover border border-accent/25 shadow-inner"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/5 border border-border flex items-center justify-center text-primary/70 shadow-inner">
                    <User size={14} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-xs truncate leading-none text-primary">{user.displayName || 'Active User'}</p>
                  <span className="text-[9px] font-mono text-primary/45 uppercase tracking-wider block mt-1">{user.role || 'student'}</span>
                </div>
              </div>

              {/* Progress Level */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[9px] font-mono text-primary/50">
                  <span>Lvl {Math.floor((user.points || 0) / 100) + 1}</span>
                  <span>{(user.points || 0) % 100}/100 XP</span>
                </div>
                <div className="w-full h-1 bg-primary/5 border border-border/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-linear-to-r from-accent to-blue-400 rounded-full transition-all duration-500" 
                    style={{ width: `${(user.points || 0) % 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          <div className="p-3 border-t border-border/40 mt-auto">
            <button
              onClick={() => signOut()}
              className={`w-full flex items-center rounded-md text-sm font-medium text-danger hover:bg-danger/5 transition-all group relative active-scale cursor-pointer ${
                isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
              }`}
              title="Sign Out"
            >
              <LogOut size={18} className="shrink-0" />
              {!isSidebarCollapsed && (
                <span className="truncate">Sign Out</span>
              )}
              {isSidebarCollapsed && (
                <div className="absolute left-14 bg-danger text-surface text-xs font-medium px-2.5 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Sign Out
                </div>
              )}
            </button>
          </div>

          {/* Sidebar Footer */}
          {!isSidebarCollapsed && (
            <div className="p-4 border-t border-border text-[10px] text-primary/40 font-mono">
              © {currentYear} ClassNotes
            </div>
          )}
        </motion.aside>

        {/* Mobile Slide-out Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-primary/20 backdrop-blur-xs z-30 md:hidden"
              />
              
              {/* Menu Container */}
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.25 }}
                className="fixed left-0 top-0 bottom-0 w-64 bg-surface border-r border-border z-40 p-6 flex flex-col justify-between md:hidden shadow-lg select-none"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold tracking-tight text-lg">ClassNotes</span>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1 hover:bg-primary/5 rounded"
                      title="Close menu"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <nav className="space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all active-scale ${
                            isActive 
                              ? 'bg-primary text-surface' 
                              : 'text-primary/70 hover:bg-primary/5'
                          }`}
                        >
                          <Icon size={18} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-danger hover:bg-danger/5 transition-all active-scale cursor-pointer"
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>

                  <div className="text-[10px] text-primary/40 font-mono">
                    © {currentYear} ClassNotes
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Content Shell */}
        <main className="flex-1 bg-background overflow-y-auto custom-scrollbar p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Suspense fallback={<LoadingPage />}>
              <AnimatePresence>
                <motion.div
                  key={location.pathname}
                  initial="initial"
                  animate="animate"
                  variants={pageTransition}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </div>
        </main>
      </div>
      <UploadModal isOpen={isGlobalUploadOpen} onClose={() => setIsGlobalUploadOpen(false)} />
      <RequestNotesModal isOpen={isGlobalRequestOpen} onClose={() => setIsGlobalRequestOpen(false)} />
    </div>
  );
};

export default RootLayout;

import React, { useEffect, useState } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { LayoutDashboard, History, BarChart2, Settings as SettingsIcon } from 'lucide-react';
import { initializeAttendanceFirebase } from './services/firebase/firebaseConfig';
import { useAttendanceStore } from './stores/useAttendanceStore';
import { AttendanceHomePage } from './pages/AttendanceHomePage';
import { AttendanceHistoryPage } from './pages/AttendanceHistoryPage';
import { AttendanceStatsPage } from './pages/AttendanceStatsPage';
import { AttendanceSettingsPage } from './pages/AttendanceSettingsPage';
import { useAuthStore } from '@/features/auth/useAuthStore';

export interface AttendanceModuleProps {
  userId?: string;
  firebaseInstances?: {
    app?: FirebaseApp;
    auth?: Auth;
    db?: Firestore;
  };
  defaultTab?: 'dashboard' | 'history' | 'stats' | 'settings';
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({
  userId: propUserId,
  firebaseInstances,
  defaultTab = 'dashboard',
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'stats' | 'settings'>(
    defaultTab
  );

  const authUser = useAuthStore((s) => s.user);
  const activeUserId = propUserId || authUser?.uid || 'guest_user';

  const initModule = useAttendanceStore((s) => s.initModule);
  const setUserId = useAttendanceStore((s) => s.setUserId);

  useEffect(() => {
    if (firebaseInstances) {
      initializeAttendanceFirebase(firebaseInstances);
    }

    setUserId(activeUserId);
    initModule(activeUserId);
  }, [activeUserId, firebaseInstances, setUserId, initModule]);

  return (
    <div className="w-full max-w-7xl mx-auto px-2 pt-0 pb-8 md:px-6 space-y-4 animate-fade-in">
      <div className="bg-surface/80 backdrop-blur-md sticky top-12 z-30 p-1.5 rounded-2xl border border-border/40 shadow-luxury flex items-center justify-between gap-1 max-w-md mx-auto font-mono -mt-3 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-accent text-white shadow-md shadow-accent/20'
              : 'text-primary/70 hover:text-primary hover:bg-primary/5'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-accent text-white shadow-md shadow-accent/20'
              : 'text-primary/70 hover:text-primary hover:bg-primary/5'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" /> Stats
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-accent text-white shadow-md shadow-accent/20'
              : 'text-primary/70 hover:text-primary hover:bg-primary/5'
          }`}
        >
          <History className="w-3.5 h-3.5" /> History
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-accent text-white shadow-md shadow-accent/20'
              : 'text-primary/70 hover:text-primary hover:bg-primary/5'
          }`}
        >
          <SettingsIcon className="w-3.5 h-3.5" /> Settings
        </button>
      </div>

      <main className="transition-all duration-300">
        {activeTab === 'dashboard' && <AttendanceHomePage />}
        {activeTab === 'history' && <AttendanceHistoryPage />}
        {activeTab === 'stats' && <AttendanceStatsPage />}
        {activeTab === 'settings' && <AttendanceSettingsPage />}
      </main>
    </div>
  );
};

export default AttendanceModule;

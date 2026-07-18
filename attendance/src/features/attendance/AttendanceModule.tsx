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
  userId = 'guest_user',
  firebaseInstances,
  defaultTab = 'dashboard',
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'stats' | 'settings'>(
    defaultTab
  );

  const initModule = useAttendanceStore((s) => s.initModule);
  const setUserId = useAttendanceStore((s) => s.setUserId);

  useEffect(() => {
    if (firebaseInstances) {
      initializeAttendanceFirebase(firebaseInstances);
    }

    setUserId(userId);
    initModule(userId);
  }, [userId, firebaseInstances, setUserId, initModule]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 space-y-6">
      <div className="bg-white/80 backdrop-blur-md sticky top-4 z-40 p-1.5 rounded-2xl border border-slate-200/80 apple-shadow flex items-center justify-between gap-1 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <History className="w-3.5 h-3.5" /> History
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" /> Stats
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
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

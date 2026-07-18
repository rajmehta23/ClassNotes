import React from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, WifiOff } from 'lucide-react';
import { useAttendanceStore } from '../../stores/useAttendanceStore';

interface SyncStatusBadgeProps {
  compact?: boolean;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ compact = false }) => {
  const syncStatus = useAttendanceStore((s) => s.syncStatus);
  const refreshData = useAttendanceStore((s) => s.refreshData);

  const handleRefresh = async () => {
    if (syncStatus === 'syncing') return;
    await refreshData();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 font-mono text-[10px]">
        {syncStatus === 'synced' && (
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Synced</span>
          </span>
        )}

        {syncStatus === 'syncing' && (
          <span className="flex items-center gap-1 text-amber-600 font-semibold">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Syncing...</span>
          </span>
        )}

        {syncStatus === 'error' && (
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1 text-rose-600 hover:underline cursor-pointer font-semibold"
            title="Click to retry sync"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Sync Failed</span>
          </button>
        )}

        {syncStatus === 'offline' && (
          <span className="flex items-center gap-1 text-primary/50 font-semibold">
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-background/50 border border-border/40 px-3 py-1.5 rounded-xl font-mono text-xs shadow-xs">
      <div className="flex items-center gap-2">
        {syncStatus === 'synced' && (
          <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Synced</span>
          </span>
        )}

        {syncStatus === 'syncing' && (
          <span className="flex items-center gap-1.5 text-amber-600 font-bold">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
            <span>Syncing...</span>
          </span>
        )}

        {syncStatus === 'error' && (
          <span className="flex items-center gap-1.5 text-rose-600 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Sync Failed</span>
          </span>
        )}

        {syncStatus === 'offline' && (
          <span className="flex items-center gap-1.5 text-primary/50 font-bold">
            <WifiOff className="w-4 h-4" />
            <span>Offline</span>
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleRefresh}
        disabled={syncStatus === 'syncing'}
        className="p-1 rounded-lg hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors disabled:opacity-40 cursor-pointer ml-1"
        title="Fetch latest attendance from Cloud Firestore"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

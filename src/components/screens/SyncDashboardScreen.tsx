import React, { useState, useEffect } from 'react';
import { 
  Wifi, WifiOff, RefreshCw, Server, HardDrive, AlertCircle, 
  CheckCircle2, Clock, Trash2, Download
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { UserSession, CompanyTenant } from '../../types';
import { OfflineSyncService, OfflineOperation } from '../../services/offlineSyncService';

interface SyncDashboardScreenProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
}

export const SyncDashboardScreen: React.FC<SyncDashboardScreenProps> = ({ userSession, activeCompany }) => {
  const { isDark } = useTheme();
  const [isOnline, setIsOnline] = useState(OfflineSyncService.isOnline());
  const [queue, setQueue] = useState<OfflineOperation[]>(OfflineSyncService.getQueue());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = OfflineSyncService.subscribe((online) => {
      setIsOnline(online);
      setQueue([...OfflineSyncService.getQueue()]);
    });
    
    // Polling to keep queue updated
    const interval = setInterval(() => {
      setQueue([...OfflineSyncService.getQueue()]);
    }, 2000);
    
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const handleForceSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    await OfflineSyncService.syncPendingQueue();
    setQueue([...OfflineSyncService.getQueue()]);
    setIsSyncing(false);
  };

  const handleClearQueue = () => {
    if (window.confirm('Are you sure you want to clear the offline queue? Pending data will be lost.')) {
      OfflineSyncService.clearQueue();
      setQueue([]);
    }
  };

  return (
    <div className={`flex-1 h-full flex flex-col \${isDark ? 'text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-50'}`}>
      {/* Header */}
      <div className={`p-4 sm:p-6 border-b \${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl \${isOnline ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                Offline & Sync Center
                {!isOnline && <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Offline Mode</span>}
              </h1>
              <p className="text-sm text-slate-500">Manage local data queue and background synchronization</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleClearQueue}
              disabled={queue.length === 0}
              className="px-4 py-2 border rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Clear Queue
            </button>
            <button 
              onClick={handleForceSync}
              disabled={!isOnline || isSyncing || queue.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition"
            >
              <RefreshCw className={`w-4 h-4 \${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Force Sync'}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-5 rounded-3xl border \${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <HardDrive className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Pending Operations</h3>
              </div>
              <div className="text-3xl font-black">{queue.filter(q => q.status === 'PENDING').length}</div>
            </div>
            <div className={`p-5 rounded-3xl border \${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Failed / Retrying</h3>
              </div>
              <div className="text-3xl font-black text-rose-600">{queue.filter(q => q.status === 'FAILED').length}</div>
            </div>
            <div className={`p-5 rounded-3xl border \${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-3 mb-2 text-slate-500">
                <Server className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Network Status</h3>
              </div>
              <div className={`text-3xl font-black \${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isOnline ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border \${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Local Operations Queue
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b dark:border-slate-800 text-slate-500">
                    <th className="p-3 font-bold uppercase tracking-wider">ID</th>
                    <th className="p-3 font-bold uppercase tracking-wider">Action</th>
                    <th className="p-3 font-bold uppercase tracking-wider">Collection</th>
                    <th className="p-3 font-bold uppercase tracking-wider">Time</th>
                    <th className="p-3 font-bold uppercase tracking-wider">Status</th>
                    <th className="p-3 font-bold uppercase tracking-wider">Retries</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-50" />
                        All caught up. No pending offline operations.
                      </td>
                    </tr>
                  ) : (
                    queue.map(op => (
                      <tr key={op.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 text-xs text-slate-500 font-mono">{op.id.substring(0, 8)}</td>
                        <td className="p-3 font-medium">{op.action}</td>
                        <td className="p-3">{op.collection}</td>
                        <td className="p-3 text-slate-500">{new Date(op.timestamp).toLocaleTimeString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase \${
                            op.status === 'PENDING' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                            op.status === 'SYNCING' ? 'bg-indigo-100 text-indigo-700' :
                            op.status === 'FAILED' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {op.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">
                          {op.retryCount}
                          {op.error && <p className="text-[10px] text-rose-500 mt-1 max-w-xs truncate" title={op.error}>{op.error}</p>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 text-sm">
              <h4 className="font-bold text-indigo-700 dark:text-indigo-400 mb-1 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Data Consistency Guarantee
              </h4>
              <p className="text-indigo-600/80 dark:text-indigo-300/80">
                Firestore native offline persistence is also enabled globally across the application. 
                Data reads and writes for real-time collections will automatically resolve conflicts 
                using server timestamps when connectivity is restored.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

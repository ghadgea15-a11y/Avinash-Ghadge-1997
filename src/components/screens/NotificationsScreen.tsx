import React, { useState, useEffect } from 'react';
import { Pagination } from '../common/Pagination';
import {
  Bell,
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Filter, 
  CheckCheck, 
  Trash2, 
  ChevronRight, 
  Clock, 
  MapPin,
  ShieldAlert
} from 'lucide-react';
import { AppNotification, PhaseAScreen, UserSession } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { FirestoreService } from '../../services/firestoreService';


interface NotificationsScreenProps {
  userSession: UserSession | null;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  userSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ALERT' | 'INFO' | 'UNREAD'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  useEffect(() => { setCurrentPage(1); }, [activeFilter]);


  useEffect(() => {
    if (!userSession) return;
    const unsub = FirestoreService.subscribeToNotifications(userSession.role, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsub();
  }, [userSession]);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n));
  };

  const handleDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filteredNotifs = notifications.filter(n => {
    if (activeFilter === 'ALERT') return n.type === 'ALERT' || n.type === 'WARNING';
    if (activeFilter === 'INFO') return n.type === 'INFO' || n.type === 'SUCCESS';
    if (activeFilter === 'UNREAD') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const paginatedNotifs = filteredNotifs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className={`p-4 space-y-4 overflow-y-auto max-h-full ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Header */}
      <div className={`p-4 rounded-3xl border flex items-center justify-between ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 relative">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold">Security Alerts & Broadcasts</h2>
            <p className="text-xs text-slate-400">{unreadCount} Unread Notifications</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-3 py-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark Read</span>
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'ALL', label: 'All Alerts' },
          { id: 'UNREAD', label: `Unread (${unreadCount})` },
          { id: 'ALERT', label: 'Security Breaches' },
          { id: 'INFO', label: 'Shift Updates' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id as any)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${
              activeFilter === f.id
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filteredNotifs.length === 0 ? (
          <div className={`p-8 text-center rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <ShieldAlert className="w-10 h-10 text-slate-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-400">No notifications found in this category.</p>
          </div>
        ) : (
          <>
          {paginatedNotifs.map(item => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition relative group ${
                !item.isRead
                  ? isDark
                    ? 'bg-slate-900 border-indigo-500/50 shadow-md shadow-indigo-950/20'
                    : 'bg-indigo-50/70 border-indigo-300 shadow-sm'
                  : isDark
                    ? 'bg-slate-900/60 border-slate-800 opacity-80'
                    : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${
                  item.type === 'ALERT' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                  item.type === 'WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  item.type === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  'bg-indigo-950 text-indigo-400 border border-indigo-800'
                }`}>
                  {item.type === 'ALERT' && <ShieldAlert className="w-4 h-4" />}
                  {item.type === 'WARNING' && <AlertTriangle className="w-4 h-4" />}
                  {item.type === 'SUCCESS' && <CheckCircle2 className="w-4 h-4" />}
                  {item.type === 'INFO' && <Info className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs font-bold truncate">{item.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>

                  {item.siteId && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-400 mt-2 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
                      <MapPin className="w-3 h-3" />
                      {item.siteId}
                    </span>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => handleToggleRead(item.id)}
                      className="text-[10px] font-bold text-slate-400 hover:text-indigo-400 transition"
                    >
                      {item.isRead ? 'Mark Unread' : 'Mark Read'}
                    </button>

                    <div className="flex items-center gap-2">
                      {item.actionRoute && (
                        <button
                          onClick={() => onNavigate(item.actionRoute!)}
                          className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                        >
                          <span>Open Module</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredNotifs.length > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredNotifs.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen, AnnouncementRecord, SiteRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { RbacService } from '../../services/rbacService';
import { useTheme } from '../../context/ThemeContext';
import { 
  Bell, 
  Megaphone, 
  Plus, 
  Pin, 
  AlertTriangle, 
  Search, 
  Building2, 
  Calendar, 
  Users, 
  ShieldAlert, 
  X, 
  Check, 
  Sparkles,
  Info,
  Clock,
  Trash2
} from 'lucide-react';

interface Props {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const AnnouncementsScreen: React.FC<Props> = ({ userSession, company, onNavigate }) => {
  const { isDark } = useTheme();
  const companyId = company.companyId || userSession.companyId;

  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);

  // Form State
  const [formState, setFormState] = useState<{
    title: string;
    message: string;
    targetAudience: string;
    category: string;
    priority: 'NORMAL' | 'URGENT';
    isPinned: boolean;
    durationDays: number;
  }>({
    title: '',
    message: '',
    targetAudience: 'ALL',
    category: 'Operational Notice',
    priority: 'NORMAL',
    isPinned: false,
    durationDays: 7
  });

  const canCreate = 
    userSession.role === 'SUPER_ADMIN' ||
    userSession.role === 'COMPANY_ADMIN' ||
    userSession.role === 'ADMIN' ||
    userSession.role === 'HR' ||
    userSession.role === 'OPS_MANAGER' ||
    userSession.role === 'SUPERVISOR' ||
    userSession.role === 'SITE_IN_CHARGE' ||
    RbacService.hasModuleAccess(userSession, 'COMPANY_MANAGEMENT');

  useEffect(() => {
    const unsubAnn = FirestoreService.subscribeToAnnouncements(userSession, companyId, setAnnouncements);
    const unsubSites = FirestoreService.subscribeToSites(companyId, setSites);

    const timer = setTimeout(() => setLoading(false), 700);
    return () => {
      unsubAnn();
      unsubSites();
      clearTimeout(timer);
    };
  }, [userSession, companyId]);

  // Create Handler
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title.trim() || !formState.message.trim()) {
      alert('Please fill in both title and message.');
      return;
    }

    try {
      setActionProcessing(true);
      const annId = `ANN-${Date.now()}`;
      const expiresAt = Date.now() + (formState.durationDays * 24 * 60 * 60 * 1000);

      const record: AnnouncementRecord = {
        id: annId,
        companyId,
        assignedRegionId: userSession.assignedRegionId,
        assignedBranchId: userSession.assignedBranchId,
        title: formState.title.trim(),
        message: formState.message.trim(),
        category: formState.category,
        targetAudience: formState.targetAudience,
        priority: formState.priority,
        isPinned: formState.isPinned,
        createdBy: userSession.employeeId || userSession.userId || 'admin',
        createdByName: userSession.fullName || userSession.email || 'Admin',
        createdAt: Date.now(),
        expiresAt
      };

      await FirestoreService.saveAnnouncement(companyId, record);

      // Reset form
      setFormState({
        title: '',
        message: '',
        targetAudience: 'ALL',
        category: 'Operational Notice',
        priority: 'NORMAL',
        isPinned: false,
        durationDays: 7
      });
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating announcement:', err);
      alert('Failed to publish announcement.');
    } finally {
      setActionProcessing(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (ann: AnnouncementRecord) => {
    try {
      const updated: AnnouncementRecord = {
        ...ann,
        isPinned: !ann.isPinned
      };
      await FirestoreService.saveAnnouncement(companyId, updated);
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  // Delete Handler
  const handleDeleteAnnouncement = async (annId: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement? This action is permanent.')) return;

    try {
      setActionProcessing(true);
      await FirestoreService.deleteAnnouncement(companyId, annId);
    } catch (err) {
      console.error('Error deleting announcement:', err);
      alert('Failed to delete announcement.');
    } finally {
      setActionProcessing(false);
    }
  };

  // Filtered & Sorted Announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(ann => {
      if (categoryFilter !== 'ALL' && ann.category !== categoryFilter) return false;
      if (priorityFilter !== 'ALL' && ann.priority !== priorityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (ann.title || '').toLowerCase().includes(q);
        const msgMatch = (ann.message || '').toLowerCase().includes(q);
        const authorMatch = (ann.createdByName || '').toLowerCase().includes(q);
        if (!titleMatch && !msgMatch && !authorMatch) return false;
      }
      return true;
    }).sort((a, b) => {
      // Pinned items first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [announcements, categoryFilter, priorityFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading Announcements Broadcast...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 max-w-5xl mx-auto space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Company Announcements</h1>
            <p className="text-xs text-slate-500">Corporate & site-specific notices, policy bulletins, and safety alerts</p>
          </div>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4" /> Broadcast Announcement
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row gap-3 items-center justify-between ${
        isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bulletins or topics..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border outline-none ${
              isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className={`px-3 py-2 text-xs rounded-lg border outline-none ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">All Categories</option>
            <option value="Operational Notice">Operational Notice</option>
            <option value="Safety & Security">Safety & Security</option>
            <option value="Policy Update">Policy Update</option>
            <option value="General">General</option>
            <option value="Emergency Broadcast">Emergency Broadcast</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className={`px-3 py-2 text-xs rounded-lg border outline-none ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">All Priorities</option>
            <option value="NORMAL">Normal Priority</option>
            <option value="URGENT">Urgent Alert</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.map(ann => {
          const isUrgent = ann.priority === 'URGENT';

          return (
            <div
              key={ann.id}
              className={`p-6 rounded-2xl border transition-all relative ${
                ann.isPinned
                  ? isDark ? 'border-indigo-500/50 bg-indigo-950/20' : 'border-indigo-300 bg-indigo-50/30'
                  : isUrgent
                  ? isDark ? 'border-rose-500/50 bg-rose-950/20' : 'border-rose-300 bg-rose-50/30'
                  : isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                  isUrgent 
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400' 
                    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                }`}>
                  {isUrgent ? <ShieldAlert className="w-6 h-6 animate-pulse" /> : <Bell className="w-6 h-6" />}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {ann.isPinned && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 flex items-center gap-1">
                          <Pin className="w-3 h-3 fill-indigo-600 dark:fill-indigo-300" /> PINNED
                        </span>
                      )}

                      {isUrgent && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 animate-pulse">
                          URGENT ALERT
                        </span>
                      )}

                      {ann.category && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {ann.category}
                        </span>
                      )}

                      <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Audience: {ann.targetAudience === 'ALL' ? 'Company-wide' : ann.targetAudience}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>

                      {canCreate && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTogglePin(ann)}
                            title={ann.isPinned ? 'Unpin' : 'Pin to top'}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600"
                          >
                            <Pin className={`w-4 h-4 ${ann.isPinned ? 'fill-indigo-600 text-indigo-600' : ''}`} />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            title="Delete Announcement"
                            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold tracking-tight">
                    {ann.title || 'Official Notice'}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {ann.message}
                  </p>

                  <div className="pt-2 border-t flex items-center justify-between text-[11px] text-slate-400">
                    <div>
                      Posted by: <span className="font-semibold text-slate-600 dark:text-slate-300">{ann.createdByName || 'Management'}</span>
                    </div>
                    {ann.expiresAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Active until {new Date(ann.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAnnouncements.length === 0 && (
          <div className={`text-center py-16 px-4 rounded-2xl border border-dashed ${
            isDark ? 'bg-slate-800/40 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-300 text-slate-500'
          }`}>
            <Megaphone className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
            <h3 className="text-base font-bold">No Bulletins Active</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              There are no announcements matching your filters. Management bulletins and updates will be displayed here.
            </p>
          </div>
        )}
      </div>

      {/* CREATE ANNOUNCEMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Broadcast Announcement</h3>
                  <p className="text-xs text-slate-500">Publish corporate bulletin or site-wide alert</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Announcement Headline / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mandatory Safety Drill & Shift Protocol Update"
                  value={formState.title}
                  onChange={e => setFormState({ ...formState, title: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Message Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write clear instructions, policy details, or urgent notice for personnel..."
                  value={formState.message}
                  onChange={e => setFormState({ ...formState, message: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={formState.category}
                    onChange={e => setFormState({ ...formState, category: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="Operational Notice">Operational Notice</option>
                    <option value="Safety & Security">Safety & Security</option>
                    <option value="Policy Update">Policy Update</option>
                    <option value="General">General</option>
                    <option value="Emergency Broadcast">Emergency Broadcast</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Target Audience</label>
                  <select
                    value={formState.targetAudience}
                    onChange={e => setFormState({ ...formState, targetAudience: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="ALL">All Company Employees</option>
                    <option value="SECURITY_GUARDS">Security Guards Only</option>
                    <option value="SUPERVISORS">Supervisors & Ops Managers</option>
                    <option value="OFFICE_STAFF">HR & Corporate Staff</option>
                    {sites.map(s => (
                      <option key={s.id} value={`Site: ${s.name || s.siteName || s.id}`}>Site: {s.name || s.siteName || s.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Priority</label>
                  <select
                    value={formState.priority}
                    onChange={e => setFormState({ ...formState, priority: e.target.value as any })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="NORMAL">Normal Priority</option>
                    <option value="URGENT">Urgent Broadcast</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Broadcast Duration</label>
                  <select
                    value={formState.durationDays}
                    onChange={e => setFormState({ ...formState, durationDays: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value={1}>1 Day (24 Hours)</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days (1 Week)</option>
                    <option value={14}>14 Days (2 Weeks)</option>
                    <option value={30}>30 Days (1 Month)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.isPinned}
                    onChange={e => setFormState({ ...formState, isPinned: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Pin this announcement to top of the bulletin feed
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionProcessing ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

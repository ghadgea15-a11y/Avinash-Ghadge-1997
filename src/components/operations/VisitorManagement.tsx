import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FirestoreService } from '../../services/firestoreService';
import { VisitorWatchlistService } from '../../services/visitorWatchlistService';
import { 
  UserSession, 
  SiteRecord, 
  EmployeeRecord, 
  VisitorLogRecord, 
  VisitorWatchlistRecord, 
  IncidentReportRecord,
  BlacklistCheckResult
} from '../../types';
import { 
  ShieldAlert, 
  AlertTriangle, 
  UserCheck, 
  UserX, 
  Search, 
  Plus, 
  Shield, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Phone, 
  Car, 
  BadgeCheck, 
  Eye, 
  X, 
  Lock, 
  Unlock, 
  Filter,
  FileWarning,
  AlertOctagon,
  RefreshCw,
  Trash2,
  Calendar
} from 'lucide-react';

interface VisitorManagementProps {
  session: UserSession;
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  selectedSiteId: string;
}

export const VisitorManagement: React.FC<VisitorManagementProps> = ({
  session,
  sites,
  employees,
  selectedSiteId
}) => {
  const { isDark } = useTheme();
  const companyId = session.companyId;

  // View Sub-tabs
  const [subTab, setSubTab] = useState<'ACTIVE_PASSES' | 'WATCHLIST' | 'ANALYTICS'>('ACTIVE_PASSES');

  // Core Data
  const [visitorLogs, setVisitorLogs] = useState<VisitorLogRecord[]>([]);
  const [watchlist, setWatchlist] = useState<VisitorWatchlistRecord[]>([]);
  const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING'; text: string } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_SITE' | 'CHECKED_OUT' | 'FLAGGED'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // ----------------------------------------------------
  // MODAL STATES
  // ----------------------------------------------------
  // 1. Check-In Modal
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState<boolean>(false);
  const [checkInForm, setCheckInForm] = useState({
    siteId: selectedSiteId !== 'ALL' ? selectedSiteId : (sites[0]?.id || ''),
    visitorName: '',
    visitorPhone: '',
    visitorCompany: '',
    idNumber: '',
    hostEmployeeName: '',
    purpose: 'Official Meeting',
    badgeNumber: '',
    vehicleNumber: '',
    overrideAuthorizedBy: '',
    overrideReason: ''
  });

  // Real-time Blacklist Lookup state for the form
  const [blacklistResult, setBlacklistResult] = useState<BlacklistCheckResult>({ isBlacklisted: false, matchedSource: 'NONE' });
  const [overrideUnlocked, setOverrideUnlocked] = useState<boolean>(false);

  // 2. Add to Watchlist Modal
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState<boolean>(false);
  const [watchlistForm, setWatchlistForm] = useState({
    visitorName: '',
    visitorPhone: '',
    idNumber: '',
    vehicleNumber: '',
    severity: 'HIGH' as 'MEDIUM' | 'HIGH' | 'CRITICAL',
    reason: '',
    incidentReportId: '',
    notes: '',
    siteId: selectedSiteId !== 'ALL' ? selectedSiteId : (sites[0]?.id || '')
  });

  // 3. Checkout Modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [selectedVisitorForCheckout, setSelectedVisitorForCheckout] = useState<VisitorLogRecord | null>(null);
  const [checkoutForm, setCheckoutForm] = useState({
    badgeReturned: true,
    checkoutNotes: ''
  });

  // 4. Revoke Watchlist Modal
  const [revokingEntry, setRevokingEntry] = useState<VisitorWatchlistRecord | null>(null);
  const [revocationReason, setRevocationReason] = useState<string>('');

  // ----------------------------------------------------
  // SUBSCRIPTIONS
  // ----------------------------------------------------
  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);

    const unsubVis = FirestoreService.subscribeToVisitorLogs(session, companyId, (data) => {
      setVisitorLogs(data);
      setIsLoading(false);
    });

    const unsubWatch = VisitorWatchlistService.subscribeToWatchlist(session, companyId, (data) => {
      setWatchlist(data);
    });

    const unsubInc = FirestoreService.subscribeToIncidentReports(session, companyId, (data) => {
      setIncidents(data);
    });

    return () => {
      unsubVis();
      unsubWatch();
      unsubInc();
    };
  }, [session, companyId]);

  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  // ----------------------------------------------------
  // REAL-TIME PRE-CHECK-IN BLACKLIST LOOKUP
  // ----------------------------------------------------
  useEffect(() => {
    if (!isCheckInModalOpen) {
      setBlacklistResult({ isBlacklisted: false, matchedSource: 'NONE' });
      setOverrideUnlocked(false);
      return;
    }

    const res = VisitorWatchlistService.checkVisitorBlacklist({
      visitorPhone: checkInForm.visitorPhone,
      visitorName: checkInForm.visitorName,
      vehicleNumber: checkInForm.vehicleNumber,
      idNumber: checkInForm.idNumber,
      watchlist,
      incidents,
      visitorLogs
    });

    setBlacklistResult(res);
    if (!res.isBlacklisted) {
      setOverrideUnlocked(false);
    }
  }, [checkInForm.visitorPhone, checkInForm.visitorName, checkInForm.vehicleNumber, checkInForm.idNumber, watchlist, incidents, visitorLogs, isCheckInModalOpen]);

  // ----------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------
  const handleOpenCheckIn = (prefill?: Partial<typeof checkInForm>) => {
    setCheckInForm({
      siteId: selectedSiteId !== 'ALL' ? selectedSiteId : (sites[0]?.id || ''),
      visitorName: '',
      visitorPhone: '',
      visitorCompany: '',
      idNumber: '',
      hostEmployeeName: '',
      purpose: 'Official Meeting',
      badgeNumber: `VIS-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleNumber: '',
      overrideAuthorizedBy: '',
      overrideReason: '',
      ...prefill
    });
    setBlacklistResult({ isBlacklisted: false, matchedSource: 'NONE' });
    setOverrideUnlocked(false);
    setIsCheckInModalOpen(true);
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !checkInForm.visitorName || !checkInForm.visitorPhone) {
      setStatusMsg({ type: 'ERROR', text: 'Visitor Name and Phone Number are required.' });
      return;
    }

    // Hard Security Gate: If blacklisted and no override provided, block check-in
    if (blacklistResult.isBlacklisted) {
      if (!overrideUnlocked || !checkInForm.overrideAuthorizedBy || !checkInForm.overrideReason) {
        setStatusMsg({
          type: 'ERROR',
          text: `🚨 ACCESS BLOCKED: Visitor is on Security Watchlist (${blacklistResult.severity || 'HIGH'}). Supervisor authorization with reason is mandatory.`
        });
        return;
      }
    }

    const siteObj = sites.find(s => s.id === checkInForm.siteId);
    const newRecord: VisitorLogRecord = {
      id: `VIS-${Date.now()}`,
      companyId,
      assignedRegionId: session.assignedRegionId,
      assignedBranchId: session.assignedBranchId,
      siteId: checkInForm.siteId,
      siteName: siteObj?.name || 'Site',
      visitorName: checkInForm.visitorName.trim(),
      visitorPhone: checkInForm.visitorPhone.trim(),
      visitorCompany: checkInForm.visitorCompany.trim() || 'Guest',
      idNumber: checkInForm.idNumber.trim(),
      hostEmployeeName: checkInForm.hostEmployeeName.trim() || 'Duty Officer',
      purpose: checkInForm.purpose,
      badgeNumber: checkInForm.badgeNumber || `VIS-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleNumber: checkInForm.vehicleNumber.trim(),
      checkInTime: new Date().toISOString(),
      status: 'IN_SITE',
      entryGateGuardId: session.employeeId,
      entryGateGuardName: session.fullName || session.email,
      // Security flags if checked in under override
      isWatchlisted: blacklistResult.isBlacklisted,
      securityAlertTriggered: blacklistResult.isBlacklisted,
      securityAlertDetails: blacklistResult.isBlacklisted ? {
        matchedSource: blacklistResult.matchedSource,
        matchedField: blacklistResult.matchedField,
        severity: blacklistResult.severity,
        reason: blacklistResult.reason,
        incidentReportId: blacklistResult.incidentReportId,
        overrideAuthorizedBy: checkInForm.overrideAuthorizedBy,
        overrideReason: checkInForm.overrideReason
      } : null,
      createdAt: new Date().toISOString()
    };

    setIsLoading(true);
    const ok = await FirestoreService.checkInVisitor(companyId, newRecord);
    setIsLoading(false);

    if (ok) {
      if (blacklistResult.isBlacklisted) {
        setStatusMsg({
          type: 'WARNING',
          text: `⚠️ Security Flagged Visitor ${newRecord.visitorName} checked in under Supervisor Override (${checkInForm.overrideAuthorizedBy}). Audit event logged.`
        });
      } else {
        setStatusMsg({
          type: 'SUCCESS',
          text: `✅ Visitor ${newRecord.visitorName} checked in. Badge #${newRecord.badgeNumber} issued.`
        });
      }
      setIsCheckInModalOpen(false);
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to record visitor check-in.' });
    }
  };

  const handleOpenCheckout = (visitor: VisitorLogRecord) => {
    setSelectedVisitorForCheckout(visitor);
    setCheckoutForm({ badgeReturned: true, checkoutNotes: '' });
    setIsCheckoutModalOpen(true);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !selectedVisitorForCheckout) return;

    setIsLoading(true);
    const ok = await FirestoreService.checkOutVisitor(
      companyId,
      selectedVisitorForCheckout.id,
      new Date().toISOString(),
      checkoutForm.badgeReturned,
      checkoutForm.checkoutNotes
    );
    setIsLoading(false);

    if (ok) {
      setStatusMsg({
        type: 'SUCCESS',
        text: `Visitor ${selectedVisitorForCheckout.visitorName} checked out. Badge returned: ${checkoutForm.badgeReturned ? 'Yes' : 'No'}.`
      });
      setIsCheckoutModalOpen(false);
      setSelectedVisitorForCheckout(null);
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to process checkout.' });
    }
  };

  const handleSaveWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !watchlistForm.visitorName || !watchlistForm.reason) {
      setStatusMsg({ type: 'ERROR', text: 'Visitor Name and Blacklist Reason are required.' });
      return;
    }

    const selectedInc = incidents.find(i => i.id === watchlistForm.incidentReportId);
    const siteObj = sites.find(s => s.id === watchlistForm.siteId);

    const newEntry: VisitorWatchlistRecord = {
      id: `WATCH-${Date.now()}`,
      companyId,
      assignedRegionId: session.assignedRegionId,
      assignedBranchId: session.assignedBranchId,
      siteId: watchlistForm.siteId,
      siteName: siteObj?.name || 'All Sites',
      visitorName: watchlistForm.visitorName.trim(),
      visitorPhone: watchlistForm.visitorPhone.trim(),
      idNumber: watchlistForm.idNumber.trim(),
      vehicleNumber: watchlistForm.vehicleNumber.trim(),
      severity: watchlistForm.severity,
      reason: watchlistForm.reason.trim(),
      incidentReportId: watchlistForm.incidentReportId || undefined,
      incidentCategory: selectedInc?.category || undefined,
      incidentDate: selectedInc?.date || selectedInc?.createdAt || undefined,
      blacklistedBy: session.employeeId,
      blacklistedByName: session.fullName || session.email,
      blacklistedAt: new Date().toISOString(),
      status: 'ACTIVE',
      notes: watchlistForm.notes.trim(),
      createdAt: new Date().toISOString()
    };

    setIsLoading(true);
    const ok = await VisitorWatchlistService.addToWatchlist(companyId, newEntry, session);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({
        type: 'SUCCESS',
        text: `🚨 ${newEntry.visitorName} added to Security Blacklist (Severity: ${newEntry.severity}). Future check-ins will trigger automated guard alerts.`
      });
      setIsWatchlistModalOpen(false);
      setWatchlistForm({
        visitorName: '',
        visitorPhone: '',
        idNumber: '',
        vehicleNumber: '',
        severity: 'HIGH',
        reason: '',
        incidentReportId: '',
        notes: '',
        siteId: selectedSiteId !== 'ALL' ? selectedSiteId : (sites[0]?.id || '')
      });
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to add visitor to blacklist.' });
    }
  };

  const handleRevokeWatchlist = async () => {
    if (!companyId || !revokingEntry || !revocationReason) {
      setStatusMsg({ type: 'ERROR', text: 'Revocation justification is mandatory.' });
      return;
    }

    setIsLoading(true);
    const ok = await VisitorWatchlistService.revokeWatchlistEntry(
      companyId,
      revokingEntry.id,
      session,
      revocationReason
    );
    setIsLoading(false);

    if (ok) {
      setStatusMsg({
        type: 'SUCCESS',
        text: `Security blacklist revoked for ${revokingEntry.visitorName}.`
      });
      setRevokingEntry(null);
      setRevocationReason('');
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to revoke blacklist entry.' });
    }
  };

  // Quick Blacklist from an existing Visitor Log
  const handleQuickBlacklistFromLog = (v: VisitorLogRecord) => {
    setWatchlistForm({
      visitorName: v.visitorName || '',
      visitorPhone: v.visitorPhone || '',
      idNumber: v.idNumber || '',
      vehicleNumber: v.vehicleNumber || '',
      severity: 'HIGH',
      reason: `Security violation observed during visit with Badge #${v.badgeNumber || 'N/A'}.`,
      incidentReportId: '',
      notes: `Flagged from visitor log #${v.id} on ${new Date(v.checkInTime || v.createdAt).toLocaleDateString()}.`,
      siteId: v.siteId || (selectedSiteId !== 'ALL' ? selectedSiteId : (sites[0]?.id || ''))
    });
    setIsWatchlistModalOpen(true);
  };

  // ----------------------------------------------------
  // FILTERED DATA & METRICS
  // ----------------------------------------------------
  const filteredVisitors = useMemo(() => {
    return visitorLogs.filter(v => {
      const matchSite = selectedSiteId === 'ALL' || v.siteId === selectedSiteId;
      const matchStatus = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'IN_SITE' ? (v.status === 'IN_SITE' || v.status === 'CHECKED_IN') :
        statusFilter === 'CHECKED_OUT' ? v.status === 'CHECKED_OUT' :
        statusFilter === 'FLAGGED' ? (v.isWatchlisted || v.securityAlertTriggered) : true;

      const q = searchQuery.toLowerCase();
      const matchQuery = !q || 
        (v.visitorName || '').toLowerCase().includes(q) ||
        (v.visitorPhone || '').includes(q) ||
        (v.badgeNumber || '').toLowerCase().includes(q) ||
        (v.visitorCompany || '').toLowerCase().includes(q) ||
        (v.hostEmployeeName || '').toLowerCase().includes(q) ||
        (v.vehicleNumber || '').toLowerCase().includes(q);

      return matchSite && matchStatus && matchQuery;
    });
  }, [visitorLogs, selectedSiteId, statusFilter, searchQuery]);

  const activeWatchlist = useMemo(() => {
    return watchlist.filter(w => {
      const matchSite = selectedSiteId === 'ALL' || !w.siteId || w.siteId === selectedSiteId;
      const q = searchQuery.toLowerCase();
      const matchQuery = !q ||
        (w.visitorName || '').toLowerCase().includes(q) ||
        (w.visitorPhone || '').includes(q) ||
        (w.vehicleNumber || '').toLowerCase().includes(q) ||
        (w.reason || '').toLowerCase().includes(q);
      return matchSite && matchQuery;
    });
  }, [watchlist, selectedSiteId, searchQuery]);

  // Metrics
  const activeInSiteCount = visitorLogs.filter(v => (v.status === 'IN_SITE' || v.status === 'CHECKED_IN')).length;
  const flaggedVisitsCount = visitorLogs.filter(v => v.isWatchlisted || v.securityAlertTriggered).length;
  const activeBlacklistCount = watchlist.filter(w => w.status === 'ACTIVE').length;

  const paginatedVisitors = filteredVisitors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* STATUS NOTIFICATION TOAST */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
          statusMsg.type === 'SUCCESS' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' :
          statusMsg.type === 'ERROR' ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200' :
          statusMsg.type === 'WARNING' ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/30' :
          'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusMsg.type === 'ERROR' && <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />}
            {statusMsg.type === 'WARNING' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
            {statusMsg.type === 'SUCCESS' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="opacity-70 hover:opacity-100 p-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* TOP HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Visitor Gate Pass & Security Watchlist Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Digital gate passes, automated blacklist lookup & incident suspect screening.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenCheckIn()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Visitor Entry</span>
          </button>

          <button
            onClick={() => setIsWatchlistModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Blacklist / Watchlist Person</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Currently On-Site</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeInSiteCount}</span>
            <span className="text-[11px] text-slate-400">Active Passes</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Logged Today</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{visitorLogs.length}</span>
            <span className="text-[11px] text-slate-400">Gate Passes</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Security Watchlist</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{activeBlacklistCount}</span>
            <span className="text-[11px] text-slate-400">Blacklisted Individuals</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Flagged Alerts Intercepted</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{flaggedVisitsCount}</span>
            <span className="text-[11px] text-slate-400">Audited Overrides</span>
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => { setSubTab('ACTIVE_PASSES'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            subTab === 'ACTIVE_PASSES'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BadgeCheck className="w-4 h-4" />
          <span>Visitor Gate Passes ({visitorLogs.length})</span>
        </button>

        <button
          onClick={() => { setSubTab('WATCHLIST'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            subTab === 'WATCHLIST'
              ? 'bg-rose-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Security Watchlist & Blacklist ({watchlist.filter(w => w.status === 'ACTIVE').length})</span>
        </button>
      </div>

      {/* FILTERS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder={subTab === 'WATCHLIST' ? 'Search blacklisted name, phone, vehicle, reason...' : 'Search visitor name, badge #, phone, company...'}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        {subTab === 'ACTIVE_PASSES' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs border ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <option value="ALL">All Passes</option>
              <option value="IN_SITE">Active On-Site</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="FLAGGED">Security Flagged</option>
            </select>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SUB-TAB 1: VISITOR GATE PASSES TABLE */}
      {/* ============================================================ */}
      {subTab === 'ACTIVE_PASSES' && (
        <div className={`rounded-3xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                  isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}>
                  <th className="py-3 px-4">Badge & Visitor</th>
                  <th className="py-3 px-4">Phone & Vehicle</th>
                  <th className="py-3 px-4">Host & Purpose</th>
                  <th className="py-3 px-4">Site Location</th>
                  <th className="py-3 px-4">In / Out Time</th>
                  <th className="py-3 px-4">Security Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedVisitors.length > 0 ? (
                  paginatedVisitors.map((v) => {
                    const isInSite = v.status === 'IN_SITE' || v.status === 'CHECKED_IN';
                    const isFlagged = v.isWatchlisted || v.securityAlertTriggered;

                    return (
                      <tr key={v.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                        isFlagged ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                      }`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                              {v.badgeNumber || 'VIS-N/A'}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{v.visitorName}</span>
                                {isFlagged && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white flex items-center gap-0.5 animate-pulse">
                                    <ShieldAlert className="w-2.5 h-2.5" />
                                    WATCHLIST FLAGGED
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">{v.visitorCompany || 'Independent Guest'}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-slate-900 dark:text-slate-200 font-mono text-[11px] flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{v.visitorPhone || 'N/A'}</span>
                          </div>
                          {v.vehicleNumber && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Car className="w-3 h-3 text-slate-400" />
                              <span>{v.vehicleNumber}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{v.hostEmployeeName}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{v.purpose}</div>
                        </td>

                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {v.siteName || v.siteId}
                        </td>

                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                          <div>In: {new Date(v.checkInTime || v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          {v.checkOutTime ? (
                            <div className="text-emerald-600 dark:text-emerald-400 text-[10px]">
                              Out: {new Date(v.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          ) : (
                            <div className="text-amber-600 dark:text-amber-400 text-[10px] font-bold animate-pulse">
                              On Premise
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block text-center ${
                              isInSite
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {isInSite ? 'ON-SITE' : 'CHECKED-OUT'}
                            </span>

                            {v.securityAlertDetails && (
                              <span className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold truncate max-w-[120px]" title={v.securityAlertDetails.reason}>
                                Auth by: {v.securityAlertDetails.overrideAuthorizedBy}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isInSite && (
                              <button
                                onClick={() => handleOpenCheckout(v)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow transition"
                              >
                                Check Out
                              </button>
                            )}

                            <button
                              onClick={() => handleQuickBlacklistFromLog(v)}
                              title="Blacklist / Watchlist this Person"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                      {isLoading ? 'Loading visitor gate logs...' : 'No visitor records found matching criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUB-TAB 2: SECURITY WATCHLIST & BLACKLIST DIRECTORY */}
      {/* ============================================================ */}
      {subTab === 'WATCHLIST' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
              <p className="font-bold">Automated Guard Screening & Blacklist Shield Active</p>
              <p className="text-rose-700 dark:text-rose-300">
                Any individual listed below will immediately trigger high-priority alerts on the security guard's gate terminal when their Phone Number, Full Name, ID, or Vehicle Number is entered.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeWatchlist.length > 0 ? (
              activeWatchlist.map((w) => {
                const isActive = w.status === 'ACTIVE';

                return (
                  <div
                    key={w.id}
                    className={`p-4 rounded-3xl border transition shadow-sm space-y-3 ${
                      !isActive 
                        ? 'opacity-60 bg-slate-100 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800' 
                        : w.severity === 'CRITICAL'
                        ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/80 ring-1 ring-rose-500/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${
                            w.severity === 'CRITICAL' ? 'bg-rose-600 text-white shadow-sm' :
                            w.severity === 'HIGH' ? 'bg-amber-500 text-white' :
                            'bg-slate-600 text-white'
                          }`}>
                            {w.severity} RISK
                          </span>

                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {isActive ? 'ACTIVE BLACKLIST' : 'REVOKED'}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                          {w.visitorName}
                        </h4>
                      </div>

                      {isActive && (
                        <button
                          onClick={() => setRevokingEntry(w)}
                          title="Revoke Blacklist Status"
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-300 transition"
                        >
                          Revoke
                        </button>
                      )}
                    </div>

                    <div className="space-y-1 text-xs">
                      {w.visitorPhone && (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{w.visitorPhone}</span>
                        </div>
                      )}

                      {w.vehicleNumber && (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          <Car className="w-3.5 h-3.5 text-slate-400" />
                          <span>{w.vehicleNumber}</span>
                        </div>
                      )}

                      {w.idNumber && (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          <BadgeCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>ID: {w.idNumber}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Reason: </span>
                      <span className="text-slate-600 dark:text-slate-300">{w.reason}</span>

                      {w.incidentReportId && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold">
                          <FileWarning className="w-3 h-3" />
                          <span>Linked to Incident #{w.incidentReportId} ({w.incidentCategory || 'Breach'})</span>
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 space-y-0.5 pt-1">
                      <p>Flagged by: {w.blacklistedByName || 'Security In-Charge'} • {new Date(w.blacklistedAt || w.createdAt).toLocaleDateString()}</p>
                      {w.siteName && <p>Site Scope: {w.siteName}</p>}
                      {!isActive && w.revocationReason && (
                        <p className="text-amber-600 dark:text-amber-400 font-semibold">Revocation Reason: {w.revocationReason}</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 italic">
                No active security watchlist entries recorded.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: VISITOR CHECK-IN WITH REAL-TIME BLACKLIST DETECTION */}
      {/* ============================================================ */}
      {isCheckInModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4 my-8`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Visitor Gate Pass Entry</h3>
                  <p className="text-[11px] text-slate-500">Live blacklist & incident screening on data entry.</p>
                </div>
              </div>
              <button onClick={() => setIsCheckInModalOpen(false)} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="space-y-3.5">
              {/* SITE SELECTION */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Entry Gate / Site *</label>
                <select
                  value={checkInForm.siteId}
                  onChange={(e) => setCheckInForm({ ...checkInForm, siteId: e.target.value })}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  required
                >
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.address || 'Main'})</option>)}
                </select>
              </div>

              {/* PHONE NUMBER & VISITOR NAME */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Visitor Phone Number *</label>
                  <div className="relative mt-1">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={checkInForm.visitorPhone}
                      onChange={(e) => setCheckInForm({ ...checkInForm, visitorPhone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border ${
                        blacklistResult.isBlacklisted
                          ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-rose-900 dark:text-rose-100'
                          : isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Visitor Full Name *</label>
                  <input
                    type="text"
                    value={checkInForm.visitorName}
                    onChange={(e) => setCheckInForm({ ...checkInForm, visitorName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${
                      blacklistResult.isBlacklisted && blacklistResult.matchedField === 'NAME'
                        ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 text-rose-900 dark:text-rose-100'
                        : isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* VEHICLE & ID NUMBER */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Vehicle Registration No.</label>
                  <div className="relative mt-1">
                    <Car className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={checkInForm.vehicleNumber}
                      onChange={(e) => setCheckInForm({ ...checkInForm, vehicleNumber: e.target.value })}
                      placeholder="e.g. MH-12-AB-1234"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border ${
                        blacklistResult.isBlacklisted && blacklistResult.matchedField === 'VEHICLE'
                          ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-900'
                          : isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Govt ID / Aadhaar / PAN (Optional)</label>
                  <input
                    type="text"
                    value={checkInForm.idNumber}
                    onChange={(e) => setCheckInForm({ ...checkInForm, idNumber: e.target.value })}
                    placeholder="e.g. XXXX-XXXX-1234"
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              {/* 🚨 DYNAMIC REAL-TIME BLACKLIST ALERT BANNER */}
              {blacklistResult.isBlacklisted && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 dark:border-rose-600 shadow-lg space-y-3 animate-in zoom-in-95">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-rose-600 text-white animate-pulse shrink-0">
                      <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-rose-900 dark:text-rose-100 tracking-wide uppercase">
                          🚨 SECURITY WATCHLIST / BLACKLIST WARNING!
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white">
                          {blacklistResult.severity || 'HIGH'} SEVERITY
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-800 dark:text-rose-200 mt-1 font-semibold">
                        Matched Source: {blacklistResult.matchedSource === 'WATCHLIST' ? 'Security Watchlist Directory' : blacklistResult.matchedSource === 'INCIDENT_REPORT' ? 'Past Security Incident Record' : 'Previous Security Violation'} ({blacklistResult.matchedField} Match)
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                    <p><span className="font-bold">Flagged Reason:</span> {blacklistResult.reason}</p>
                    {blacklistResult.incidentReportId && (
                      <p className="text-[11px] text-rose-700 dark:text-rose-300">
                        <span className="font-semibold">Linked Incident:</span> #{blacklistResult.incidentReportId} ({blacklistResult.incidentCategory || 'Breach'}) on {blacklistResult.incidentDate?.substring(0, 10) || 'Past'}
                      </p>
                    )}
                    {blacklistResult.notes && (
                      <p className="text-[10px] text-slate-500 italic">{blacklistResult.notes}</p>
                    )}
                  </div>

                  {/* SUPERVISOR OVERRIDE CONTROL */}
                  <div className="pt-2 border-t border-rose-200 dark:border-rose-900/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-rose-600" />
                        Gate Entry Locked
                      </span>
                      <button
                        type="button"
                        onClick={() => setOverrideUnlocked(!overrideUnlocked)}
                        className="text-xs font-bold text-rose-700 dark:text-rose-300 underline hover:text-rose-900"
                      >
                        {overrideUnlocked ? 'Hide Supervisor Override' : 'Unlock with Supervisor Override'}
                      </button>
                    </div>

                    {overrideUnlocked && (
                      <div className="mt-3 space-y-2 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 animate-in fade-in">
                        <p className="text-[10px] font-bold text-amber-900 dark:text-amber-200 uppercase">
                          Supervisor Authorization Required for Flagged Visitor
                        </p>
                        <input
                          type="text"
                          value={checkInForm.overrideAuthorizedBy}
                          onChange={(e) => setCheckInForm({ ...checkInForm, overrideAuthorizedBy: e.target.value })}
                          placeholder="Supervisor Name / Badge ID (e.g. Captain Rao)"
                          className={`w-full p-2 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                          required={blacklistResult.isBlacklisted}
                        />
                        <textarea
                          value={checkInForm.overrideReason}
                          onChange={(e) => setCheckInForm({ ...checkInForm, overrideReason: e.target.value })}
                          rows={2}
                          placeholder="Mandatory Override Justification (e.g. Police escort / Executive clearance provided)..."
                          className={`w-full p-2 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                          required={blacklistResult.isBlacklisted}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COMPANY, HOST & PURPOSE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Visitor Company / Organization</label>
                  <input
                    type="text"
                    value={checkInForm.visitorCompany}
                    onChange={(e) => setCheckInForm({ ...checkInForm, visitorCompany: e.target.value })}
                    placeholder="e.g. Tata Consultancy Services"
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Host Employee / Officer</label>
                  <input
                    type="text"
                    value={checkInForm.hostEmployeeName}
                    onChange={(e) => setCheckInForm({ ...checkInForm, hostEmployeeName: e.target.value })}
                    placeholder="e.g. Mr. Anil Patil (HR)"
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Purpose of Visit</label>
                  <select
                    value={checkInForm.purpose}
                    onChange={(e) => setCheckInForm({ ...checkInForm, purpose: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    <option value="Official Meeting">Official Meeting</option>
                    <option value="Interview / Recruitment">Interview / Recruitment</option>
                    <option value="Equipment Delivery / Service">Equipment Delivery / Service</option>
                    <option value="Vendor Inspection">Vendor Inspection</option>
                    <option value="Personal Visit">Personal Visit</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Allocated Badge #</label>
                  <input
                    type="text"
                    value={checkInForm.badgeNumber}
                    onChange={(e) => setCheckInForm({ ...checkInForm, badgeNumber: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs font-mono font-bold border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckInModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading || (blacklistResult.isBlacklisted && !overrideUnlocked)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition flex items-center gap-2 ${
                    blacklistResult.isBlacklisted
                      ? overrideUnlocked ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-400 cursor-not-allowed opacity-60'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isLoading ? 'Processing...' : blacklistResult.isBlacklisted ? (overrideUnlocked ? '⚠️ Check In with Override Audit' : '🛑 Entry Blocked by Security') : 'Check In Visitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: ADD VISITOR TO SECURITY BLACKLIST / WATCHLIST */}
      {/* ============================================================ */}
      {isWatchlistModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4 my-8`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add to Security Blacklist</h3>
                  <p className="text-[11px] text-slate-500">Prevents unauthorized premise entry across company sites.</p>
                </div>
              </div>
              <button onClick={() => setIsWatchlistModalOpen(false)} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveWatchlist} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Visitor Full Name *</label>
                <input
                  type="text"
                  value={watchlistForm.visitorName}
                  onChange={(e) => setWatchlistForm({ ...watchlistForm, visitorName: e.target.value })}
                  placeholder="e.g. Ramesh Kulkarni"
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Phone Number</label>
                  <input
                    type="text"
                    value={watchlistForm.visitorPhone}
                    onChange={(e) => setWatchlistForm({ ...watchlistForm, visitorPhone: e.target.value })}
                    placeholder="e.g. 9822012345"
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Vehicle No.</label>
                  <input
                    type="text"
                    value={watchlistForm.vehicleNumber}
                    onChange={(e) => setWatchlistForm({ ...watchlistForm, vehicleNumber: e.target.value })}
                    placeholder="e.g. MH-14-GH-9999"
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Threat Severity *</label>
                  <select
                    value={watchlistForm.severity}
                    onChange={(e) => setWatchlistForm({ ...watchlistForm, severity: e.target.value as any })}
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border font-bold ${
                      watchlistForm.severity === 'CRITICAL' ? 'text-rose-600' : watchlistForm.severity === 'HIGH' ? 'text-amber-600' : 'text-slate-700'
                    } ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                  >
                    <option value="CRITICAL">CRITICAL (Immediate Lock)</option>
                    <option value="HIGH">HIGH (Escort Required)</option>
                    <option value="MEDIUM">MEDIUM (Screening Alert)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Site Scope</label>
                  <select
                    value={watchlistForm.siteId}
                    onChange={(e) => setWatchlistForm({ ...watchlistForm, siteId: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    <option value="">All Company Sites (Global)</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* LINK TO INCIDENT */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Link to Past Incident Report (Optional)</label>
                <select
                  value={watchlistForm.incidentReportId}
                  onChange={(e) => setWatchlistForm({ ...watchlistForm, incidentReportId: e.target.value })}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                >
                  <option value="">-- Select Incident (Optional) --</option>
                  {incidents.map(i => (
                    <option key={i.id} value={i.id}>
                      #{i.id} - {i.title} ({i.category || 'Breach'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Security Blacklist Reason *</label>
                <textarea
                  value={watchlistForm.reason}
                  onChange={(e) => setWatchlistForm({ ...watchlistForm, reason: e.target.value })}
                  rows={2}
                  placeholder="e.g. Misconduct, physical altercation with security staff, caught attempting tool theft..."
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWatchlistModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg transition"
                >
                  {isLoading ? 'Saving...' : 'Add to Blacklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: VISITOR CHECK-OUT & BADGE RETURN VALIDATION */}
      {/* ============================================================ */}
      {isCheckoutModalOpen && selectedVisitorForCheckout && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Visitor Departure & Badge Return</h3>
                <p className="text-[11px] text-slate-500">Confirm physical visitor badge return before gate exit.</p>
              </div>
              <button onClick={() => { setIsCheckoutModalOpen(false); setSelectedVisitorForCheckout(null); }} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>

            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'} space-y-1.5 text-xs`}>
              <p><span className="font-semibold text-slate-500">Visitor:</span> <span className="font-bold text-slate-900 dark:text-slate-100">{selectedVisitorForCheckout.visitorName}</span></p>
              <p><span className="font-semibold text-slate-500">Badge Assigned:</span> <span className="font-mono font-bold text-indigo-600">{selectedVisitorForCheckout.badgeNumber}</span></p>
              <p><span className="font-semibold text-slate-500">Check-In Time:</span> {new Date(selectedVisitorForCheckout.checkInTime || selectedVisitorForCheckout.createdAt).toLocaleTimeString()}</p>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkoutForm.badgeReturned}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, badgeReturned: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Physical Visitor Badge Returned & Verified
                </span>
              </label>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Departure Remarks (Optional)</label>
                <input
                  type="text"
                  value={checkoutForm.checkoutNotes}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, checkoutNotes: e.target.value })}
                  placeholder="e.g. Left via Gate 2, meeting concluded successfully."
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsCheckoutModalOpen(false); setSelectedVisitorForCheckout(null); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg transition"
                >
                  {isLoading ? 'Processing...' : 'Complete Check-Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: REVOKE WATCHLIST ENTRY MODAL */}
      {/* ============================================================ */}
      {revokingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Revoke Security Blacklist</h3>
              <button onClick={() => setRevokingEntry(null)} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p><span className="font-bold">Individual:</span> {revokingEntry.visitorName} ({revokingEntry.visitorPhone || 'No Phone'})</p>
              <p><span className="font-bold">Original Flag:</span> {revokingEntry.reason}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-500">Revocation Justification *</label>
              <textarea
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                rows={3}
                placeholder="Reason for revoking blacklist (e.g. Investigation completed, dispute resolved, false alarm)..."
                className={`w-full p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setRevokingEntry(null)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
              <button
                type="button"
                onClick={handleRevokeWatchlist}
                disabled={isLoading || !revocationReason}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow disabled:opacity-50"
              >
                {isLoading ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

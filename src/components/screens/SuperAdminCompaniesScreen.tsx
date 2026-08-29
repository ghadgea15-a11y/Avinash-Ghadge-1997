import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Pagination } from '../common/Pagination';
import {
  Building2,
  Search, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  Sliders, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck, 
  SlidersHorizontal,
  Mail,
  Phone,
  MapPin,
  Edit,
  Save,
  AlertCircle,
  Calendar,
  Clock,
  Hash,
  Sparkles,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, MASTER_APP_MODULES } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminCompaniesScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SuperAdminCompaniesScreen: React.FC<SuperAdminCompaniesScreenProps> = ({
  currentSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError, showLoading, showCancelled, handleError } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyTenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [editingCompany, setEditingCompany] = useState<CompanyTenant | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<CompanyTenant | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Real-time Firestore Listener with fallback to getAllCompanies
  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);

    try {
      const colRef = collection(db, 'companies');
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        if (!isSubscribed) return;
        const list = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            companyId: docSnap.id,
            companyCode: data.companyCode || data.companyId || docSnap.id,
            companyLegalName: data.companyLegalName || data.brandName || docSnap.id,
            brandName: data.brandName || data.companyLegalName || docSnap.id,
            licenseTier: data.licenseTier || 'ENTERPRISE',
            status: data.status || 'ACTIVE',
            primaryColorHex: data.primaryColorHex || '#4f46e5',
            secondaryColorHex: data.secondaryColorHex || '#06b6d4',
            allowedBranches: data.allowedBranches || ['MAIN'],
            maxEmployeesAllowed: Number(data.maxEmployeesAllowed) || 1000,
            maxSitesAllowed: Number(data.maxSitesAllowed) || 50,
            enabledModules: data.enabledModules || MASTER_APP_MODULES.map(m => m.key),
            logoUrl: data.logoUrl || '',
            websiteUrl: data.websiteUrl || '',
            portalSubdomain: data.portalSubdomain || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            country: data.country || 'India',
            adminName: data.adminName || '',
            adminEmail: data.adminEmail || '',
            adminUid: data.adminUid || '',
            emailDeliveryStatus: data.emailDeliveryStatus || null,
            emailDeliveryError: data.emailDeliveryError || null,
            activationSentAt: data.activationSentAt || null,
            createdAt: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
            updatedAt: data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000).toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString())
          } as CompanyTenant;
        });

        list.sort((a, b) => {
          const dateA = typeof a.createdAt === 'string' ? a.createdAt : '';
          const dateB = typeof b.createdAt === 'string' ? b.createdAt : '';
          return dateB.localeCompare(dateA);
        });

        setCompanies(list);
        setLoading(false);
        setFetchError(null);
      }, (snapshotErr) => {
        console.warn('[SuperAdminCompaniesScreen] Real-time listener fallback:', snapshotErr);
        loadCompanies();
      });

      return () => {
        isSubscribed = false;
        unsubscribe();
      };
    } catch (e) {
      console.warn('[SuperAdminCompaniesScreen] onSnapshot exception, falling back to manual fetch:', e);
      loadCompanies();
    }
  }, []);

  const loadCompanies = async () => {
    setRefreshing(true);
    setFetchError(null);
    try {
      const list = await FirestoreService.getAllCompanies();
      setCompanies(list);
    } catch (err: any) {
      console.error('[SuperAdminCompaniesScreen] Error loading companies:', err);
      setFetchError(err?.message || 'Failed to load company records from Firestore.');
      handleError(err, 'Failed to load companies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleStatus = async (company: CompanyTenant) => {
    if (actionInProgress) return;
    const newStatus = company.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const isActivating = newStatus === 'ACTIVE';
    setActionInProgress(company.companyId);
    const dismiss = showLoading(isActivating ? 'Activating...' : 'Deactivating...');

    try {
      const ok = await FirestoreService.updateCompanyDetails(company.companyId, { status: newStatus });
      dismiss();
      if (ok) {
        setCompanies((prev) => prev.map(c => c.companyId === company.companyId ? { ...c, status: newStatus } : c));
        if (isActivating) {
          showSuccess(`✓ Successfully Activated (${company.brandName})`);
        } else {
          showSuccess(`✓ Successfully Deactivated (${company.brandName})`);
        }
      } else {
        showError(`✕ Failed to update status for ${company.brandName}`);
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Operation Failed');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResendActivation = async (company: CompanyTenant) => {
    if (actionInProgress) return;
    const targetEmail = company.adminEmail || company.email;
    if (!targetEmail) {
      showError('No administrator email registered for this company.');
      return;
    }

    setActionInProgress(`email-${company.companyId}`);
    const dismiss = showLoading(`Sending real activation email to ${targetEmail}...`);

    try {
      const result = await FirestoreService.resendAdminActivationEmail(company.companyId, targetEmail);
      dismiss();
      if (result.success) {
        showSuccess(`✓ Real activation email sent to ${targetEmail}`);
        setCompanies(prev => prev.map(c => c.companyId === company.companyId ? { ...c, emailDeliveryStatus: 'SENT', activationSentAt: new Date().toISOString() } : c));
      } else {
        showError(`✕ ${result.message}`);
      }
    } catch (err: any) {
      dismiss();
      handleError(err, 'Failed to send activation email');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCompany || saving) return;
    setSaving(true);
    const dismiss = showLoading('Updating...');
    try {
      const ok = await FirestoreService.updateCompanyDetails(editingCompany.companyId, {
        brandName: editingCompany.brandName,
        companyLegalName: editingCompany.companyLegalName,
        licenseTier: editingCompany.licenseTier,
        maxEmployeesAllowed: editingCompany.maxEmployeesAllowed,
        maxSitesAllowed: editingCompany.maxSitesAllowed,
        email: editingCompany.email,
        phone: editingCompany.phone,
        status: editingCompany.status
      });

      dismiss();
      if (ok) {
        setCompanies((prev) => prev.map(c => c.companyId === editingCompany.companyId ? editingCompany : c));
        setEditingCompany(null);
        showSuccess('✓ Successfully Updated');
      } else {
        showError('✕ Update Failed');
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Update Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCompany(null);
    showCancelled('🚫 Cancelled');
  };

  const handleConfirmDelete = async () => {
    if (!deletingCompany || isDeleting) return;
    const expectedCode = deletingCompany.companyCode || deletingCompany.companyId;
    if (deleteConfirmInput.trim().toUpperCase() !== expectedCode.toUpperCase()) {
      showError(`Please type "${expectedCode}" exactly to confirm deletion.`);
      return;
    }

    setIsDeleting(true);
    const dismiss = showLoading(`Deleting company ${expectedCode} and associated data...`);

    try {
      const result = await FirestoreService.deleteCompany(deletingCompany.companyId);
      dismiss();
      if (result.success) {
        showSuccess(`✓ Company ${expectedCode} successfully deleted.`);
        setCompanies(prev => prev.filter(c => c.companyId !== deletingCompany.companyId));
        setDeletingCompany(null);
        setDeleteConfirmInput('');
      } else {
        showError(`✕ ${result.error || 'Failed to delete company.'}`);
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  const filteredCompanies = companies.filter(c => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesSearch = (c.brandName && c.brandName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (c.companyId && c.companyId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (c.companyCode && c.companyCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (c.adminEmail && c.adminEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (c.companyLegalName && c.companyLegalName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-black'} p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('SUPER_ADMIN_DASHBOARD')}
            className={`p-2 rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'
            }`}
            title="Back to Super Admin Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              <span>Registered Companies & Organizations ({companies.length})</span>
            </h1>
            <p className="text-xs text-slate-400">View and manage tenant organizations, administrator access, license limits, and real-time operational status.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCompanies}
            disabled={refreshing || loading}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-100'
            }`}
            title="Refresh company records from Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => onNavigate('SUPER_ADMIN_CREATE_COMPANY')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-600/30 flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register New Company</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className={`p-4 rounded-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company code, ID, brand name, admin email, legal entity..."
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border ${
              isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-black'
            } focus:outline-none focus:border-amber-500`}
          />
          <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-2">
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-amber-600 text-white'
                  : isDark
                    ? 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:text-black'
              }`}
            >
              {st === 'ALL' ? 'All Statuses' : st === 'ACTIVE' ? 'Active' : 'Suspended'}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="p-4 rounded-xl border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={loadCompanies}
            className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800 rounded-lg text-rose-200 font-semibold transition shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Companies List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-xs font-medium">Loading registered tenant companies from Firestore...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-3 bg-slate-900/20 rounded-2xl border border-slate-800/40 p-6">
          <Building2 className="w-10 h-10 text-slate-600 dark:text-slate-400 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-300">
              {companies.length === 0 ? 'No companies registered yet' : 'No matching companies found'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {companies.length === 0 
                ? 'Provision your first tenant organization using the Register New Company button.'
                : 'Try adjusting your search query or status filter.'}
            </p>
          </div>
          {companies.length === 0 && (
            <button
              onClick={() => onNavigate('SUPER_ADMIN_CREATE_COMPANY')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register First Company</span>
            </button>
          )}
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedCompanies.map((company) => {
            const enabledCount = company.enabledModules?.length || 0;
            const companyCodeDisplay = company.companyCode || company.companyId;
            return (
              <div
                key={company.companyId}
                className={`p-5 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:shadow'
                } space-y-4 flex flex-col justify-between`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Company ID / Code & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-800/80" title="Company ID / Code">
                          {companyCodeDisplay}
                        </span>
                        {company.companyCode && company.companyId !== company.companyCode && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-800 border border-slate-700" title="Internal ID">
                            {company.companyId}
                          </span>
                        )}
                      </div>
                      <h2 className="text-sm font-bold text-slate-100">{company.brandName}</h2>
                      {company.companyLegalName && company.companyLegalName !== company.brandName && (
                        <p className="text-[11px] text-slate-400 truncate max-w-[220px]" title={company.companyLegalName}>
                          {company.companyLegalName}
                        </p>
                      )}
                    </div>

                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      company.status === 'ACTIVE' 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {company.status}
                    </span>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>Registered: <strong className="text-slate-300 font-medium">{formatDate(company.createdAt)}</strong></span>
                  </div>

                  {/* Operational Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-800/60 py-2.5">
                    <div>
                      <p className="text-[10px] text-slate-400">License Tier</p>
                      <p className="font-semibold text-slate-200">{company.licenseTier || 'ENTERPRISE'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Enabled Modules</p>
                      <p className="font-semibold text-cyan-400 font-mono">{enabledCount} / {MASTER_APP_MODULES.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Max Employees</p>
                      <p className="font-semibold text-slate-200 font-mono">{company.maxEmployeesAllowed || 1000}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Max Sites</p>
                      <p className="font-semibold text-slate-200 font-mono">{company.maxSitesAllowed || 50}</p>
                    </div>
                  </div>

                  {/* Admin Information & Real Email Delivery Status */}
                  <div className="text-xs space-y-1.5 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 font-medium">Company Administrator</p>
                      {company.emailDeliveryStatus === 'SENT' ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Email Sent</span>
                        </span>
                      ) : company.emailDeliveryStatus === 'FAILED' ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60 flex items-center gap-1" title={company.emailDeliveryError || 'Delivery error'}>
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>Delivery Issue</span>
                        </span>
                      ) : null}
                    </div>

                    <p className="font-medium text-slate-200">{company.adminName || 'Admin'}</p>
                    
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]" title={company.adminEmail || company.email || ''}>
                        {company.adminEmail || company.email || 'No email registered'}
                      </p>
                      {(company.adminEmail || company.email) && (
                        <button
                          onClick={() => handleResendActivation(company)}
                          disabled={actionInProgress === `email-${company.companyId}`}
                          title="Resend real password activation email to Company Admin"
                          className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/70 flex items-center gap-1 transition disabled:opacity-50"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Resend</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/60 mt-2">
                  <button
                    onClick={() => onNavigate('SUPER_ADMIN_MODULES')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 flex items-center gap-1 transition"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Modules</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(company)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      company.status === 'ACTIVE'
                        ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-800'
                        : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    {company.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                  </button>

                  <button
                    onClick={() => setEditingCompany(company)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      setDeletingCompany(company);
                      setDeleteConfirmInput('');
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 flex items-center gap-1 transition"
                    title="Permanently delete company"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredCompanies.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
        </>
      )}

      {/* Edit Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'} space-y-4 shadow-2xl`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-500" />
                <span>Edit Tenant: {editingCompany.companyId}</span>
              </h2>
              <button onClick={handleCancelEdit} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Brand Name</label>
                <input
                  type="text"
                  value={editingCompany.brandName || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, brandName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Legal Registered Entity Name</label>
                <input
                  type="text"
                  value={editingCompany.companyLegalName || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, companyLegalName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Max Employees</label>
                  <input
                    type="number"
                    value={editingCompany.maxEmployeesAllowed ?? 0}
                    onChange={(e) => setEditingCompany({ ...editingCompany, maxEmployeesAllowed: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-slate-950 border-slate-800 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Max Sites</label>
                  <input
                    type="number"
                    value={editingCompany.maxSitesAllowed ?? 0}
                    onChange={(e) => setEditingCompany({ ...editingCompany, maxSitesAllowed: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-slate-950 border-slate-800 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-rose-800/80 text-white' : 'bg-white border-rose-300 text-black'} space-y-4 shadow-2xl`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2 text-rose-400">
                <AlertCircle className="w-5 h-5" />
                <span>Confirm Company Deletion</span>
              </h2>
              <button onClick={() => setDeletingCompany(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="font-medium text-slate-200">
                You are about to permanently delete tenant organization <strong className="text-white">{deletingCompany.brandName}</strong> ({deletingCompany.companyCode || deletingCompany.companyId}).
              </p>
              <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl space-y-1 text-rose-300">
                <p className="font-bold">Warning:</p>
                <p>This action cannot be undone. All company records, tenant data, and linked admin/employee accounts will be permanently removed.</p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Type <strong className="text-amber-400 font-mono">{deletingCompany.companyCode || deletingCompany.companyId}</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder={`Type ${deletingCompany.companyCode || deletingCompany.companyId}`}
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-slate-950 border-slate-800 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingCompany(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting || deleteConfirmInput.trim().toUpperCase() !== (deletingCompany.companyCode || deletingCompany.companyId).toUpperCase()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Permanently Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

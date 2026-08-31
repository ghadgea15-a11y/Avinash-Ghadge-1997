import React, { useState, useEffect } from 'react';
import { UserSession, EmployeeRecord } from '../../types';
import { ProxyDelegation, ProxyDelegationScope, ProxyScopeModule } from '../../types/bpm';
import { BpmDelegationService } from '../../services/bpmDelegationService';
import { RbacService } from '../../services/rbacService';
import { FirestoreService } from '../../services/firestoreService';
import { 
  Share2, 
  Plus, 
  Calendar, 
  Clock, 
  Shield, 
  User, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Search, 
  Layers, 
  ChevronRight, 
  RefreshCw,
  Info,
  Filter,
  UserCheck,
  Building2,
  FileCheck
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface DelegationManagerProps {
  session: UserSession;
  onDelegationChanged?: () => void;
}

const AVAILABLE_MODULES: { key: ProxyScopeModule; label: string }[] = [
  { key: 'ALL', label: 'All Business Modules' },
  { key: 'LEAVE', label: 'Leave Management (HCM)' },
  { key: 'OVERTIME', label: 'Overtime Requests (WFM)' },
  { key: 'SCM', label: 'Supply Chain & Purchase Orders' },
  { key: 'CRM', label: 'Client CRM & Commercial' },
  { key: 'PAYROLL', label: 'Payroll & Salary Advances' },
  { key: 'WORK_ORDER', label: 'Work Orders & Field Tasks' },
  { key: 'BILLING_RATE', label: 'Billing Rates & Contracts' },
  { key: 'ASSET_MANAGEMENT', label: 'Asset Management' },
  { key: 'SAFETY', label: 'Safety & EHS Workflows' },
  { key: 'INCIDENTS', label: 'Security Incidents' },
];

const AVAILABLE_TRANSACTION_TYPES: { key: string; label: string }[] = [
  { key: 'ALL', label: 'All Transaction Types' },
  { key: 'ANNUAL_LEAVE', label: 'Annual Leave' },
  { key: 'SICK_LEAVE', label: 'Sick Leave' },
  { key: 'CASUAL_LEAVE', label: 'Casual Leave' },
  { key: 'OVERTIME_REQUEST', label: 'Overtime Request' },
  { key: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { key: 'SALARY_ADVANCE', label: 'Salary Advance' },
  { key: 'EQUIPMENT_REPAIR', label: 'Equipment Repair' },
  { key: 'CONTRACT_AMENDMENT', label: 'Contract Amendment' }
];

export const DelegationManager: React.FC<DelegationManagerProps> = ({ session, onDelegationChanged }) => {
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError } = useFeedback();
  const [activeSubTab, setActiveSubTab] = useState<'MY_DELEGATIONS' | 'ASSIGNED_TO_ME' | 'ORGANIZATION_AUDIT'>('MY_DELEGATIONS');
  const [delegations, setDelegations] = useState<ProxyDelegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState<ProxyDelegation | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Form State
  const [selectedDelegateId, setSelectedDelegateId] = useState('');
  const [selectedDelegatorId, setSelectedDelegatorId] = useState('');
  const [startAtDate, setStartAtDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startAtTime, setStartAtTime] = useState(format(new Date(), 'HH:mm'));
  const [endAtDate, setEndAtDate] = useState(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endAtTime, setEndAtTime] = useState('18:00');
  const [selectedModules, setSelectedModules] = useState<string[]>(['ALL']);
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState<string[]>(['ALL']);
  const [maxTier, setMaxTier] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [delegateSearch, setDelegateSearch] = useState('');

  // Selected Detail Modal
  const [selectedDetail, setSelectedDetail] = useState<ProxyDelegation | null>(null);

  const canViewOrgAudit = RbacService.canViewAllCompanyDelegations(session);

  useEffect(() => {
    // Subscribe to company employees for delegate selection
    const unsub = FirestoreService.subscribeToEmployees(session, session.companyId, (emps) => {
      setEmployees(emps);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [session.companyId]);

  useEffect(() => {
    loadDelegations();
  }, [activeSubTab, session.companyId, session.userId]);

  const loadDelegations = async () => {
    setLoading(true);
    try {
      await BpmDelegationService.refreshCompanyDelegationStatuses(session.companyId);
      if (activeSubTab === 'MY_DELEGATIONS') {
        const list = await BpmDelegationService.getMyCreatedDelegations(session);
        setDelegations(list);
      } else if (activeSubTab === 'ASSIGNED_TO_ME') {
        const list = await BpmDelegationService.getMyActiveProxyAssignments(session);
        setDelegations(list);
      } else if (activeSubTab === 'ORGANIZATION_AUDIT') {
        const list = await BpmDelegationService.getAllCompanyDelegations(session);
        setDelegations(list);
      }
    } catch (err) {
      console.error('Failed to load delegations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = (modKey: string) => {
    if (modKey === 'ALL') {
      setSelectedModules(['ALL']);
      return;
    }
    let updated = selectedModules.filter(m => m !== 'ALL');
    if (updated.includes(modKey)) {
      updated = updated.filter(m => m !== modKey);
    } else {
      updated.push(modKey);
    }
    if (updated.length === 0) {
      updated = ['ALL'];
    }
    setSelectedModules(updated);
  };

  const handleToggleTxType = (txKey: string) => {
    if (txKey === 'ALL') {
      setSelectedTransactionTypes(['ALL']);
      return;
    }
    let updated = selectedTransactionTypes.filter(t => t !== 'ALL');
    if (updated.includes(txKey)) {
      updated = updated.filter(t => t !== txKey);
    } else {
      updated.push(txKey);
    }
    if (updated.length === 0) {
      updated = ['ALL'];
    }
    setSelectedTransactionTypes(updated);
  };

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const actualDelegatorId = selectedDelegatorId || session.userId;

    if (!selectedDelegateId) {
      setFormError('Please select a colleague to assign as your approval proxy.');
      return;
    }

    if (selectedDelegateId === actualDelegatorId) {
      setFormError('Self-delegation is not allowed.');
      return;
    }

    const startIso = new Date(`${startAtDate}T${startAtTime}`).toISOString();
    const endIso = new Date(`${endAtDate}T${endAtTime}`).toISOString();

    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
      setFormError('Start time must be strictly earlier than end time.');
      return;
    }

    if (new Date(endIso).getTime() <= Date.now()) {
      setFormError('End time must be set in the future.');
      return;
    }

    if (!reason.trim()) {
      setFormError('Please provide a business reason or justification for this delegation.');
      return;
    }

    // Lookup delegate and delegator details
    const delegateEmp = employees.find(e => e.id === selectedDelegateId);
    const delegatorEmp = employees.find(e => e.id === actualDelegatorId);

    setCreating(true);
    const dismiss = showLoading('Creating proxy delegation...');
    try {
      await BpmDelegationService.createDelegation(session, {
        delegatorUserId: actualDelegatorId,
        delegatorName: delegatorEmp ? `${delegatorEmp.firstName || ''} ${delegatorEmp.lastName || ''}`.trim() || delegatorEmp.employeeCode : session.fullName,
        delegatorEmail: delegatorEmp?.email || session.email,
        delegatorRole: delegatorEmp?.designation || delegatorEmp?.role || session.role,
        delegatorDepartment: delegatorEmp?.departmentId || session.departmentName || session.departmentId,
        
        delegateUserId: selectedDelegateId,
        delegateName: delegateEmp ? `${delegateEmp.firstName || ''} ${delegateEmp.lastName || ''}`.trim() || delegateEmp.employeeCode : 'Colleague',
        delegateEmail: delegateEmp?.email,
        delegateRole: delegateEmp?.designation || delegateEmp?.role,
        delegateDepartment: delegateEmp?.departmentId,
        
        scope: {
          modules: selectedModules as ProxyScopeModule[],
          transactionTypes: selectedTransactionTypes,
          maxTier: maxTier > 0 ? maxTier : undefined
        },
        startAt: startIso,
        endAt: endIso,
        reason: reason.trim()
      });

      dismiss();
      setShowCreateModal(false);
      resetForm();
      showSuccess('✓ Proxy delegation authority created successfully.');
      await loadDelegations();
      if (onDelegationChanged) onDelegationChanged();
    } catch (err: any) {
      dismiss();
      setFormError(err.message || 'Failed to create proxy delegation.');
      handleError(err, '✕ Failed to create proxy delegation');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!showRevokeModal || !showRevokeModal.delegationId) return;
    setRevoking(true);
    const dismiss = showLoading('Revoking proxy delegation...');
    try {
      await BpmDelegationService.revokeDelegation(session, showRevokeModal.delegationId, revokeReason);
      dismiss();
      setShowRevokeModal(null);
      setRevokeReason('');
      showSuccess('✓ Proxy delegation revoked successfully.');
      await loadDelegations();
      if (onDelegationChanged) onDelegationChanged();
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Revocation failed');
    } finally {
      setRevoking(false);
    }
  };

  const resetForm = () => {
    setSelectedDelegateId('');
    setSelectedModules(['ALL']);
    setSelectedTransactionTypes(['ALL']);
    setMaxTier(0);
    setReason('');
    setFormError(null);
    setDelegateSearch('');
  };

  const renderStatusBadge = (status: string, startAt: string, endAt: string) => {
    const now = Date.now();
    const startMs = new Date(startAt).getTime();
    const endMs = new Date(endAt).getTime();

    if (status === 'REVOKED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Revoked</span>
        </span>
      );
    }

    if (status === 'EXPIRED' || now > endMs) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-900 dark:text-slate-300 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
          <span>Expired</span>
        </span>
      );
    }

    if (now < startMs) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-300 dark:border-sky-800 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-sky-600" />
          <span>Scheduled</span>
        </span>
      );
    }

    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
        <CheckCircle className="w-3 h-3 text-emerald-600" />
        <span>Active Proxy</span>
      </span>
    );
  };

  const filteredEmployees = employees.filter(e => {
    if (e.id === session.userId) return false; // Prevent selecting self
    if (!delegateSearch) return true;
    const name = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
    const code = (e.employeeCode || '').toLowerCase();
    const dept = (e.departmentId || '').toLowerCase();
    const des = (e.designation || '').toLowerCase();
    const s = delegateSearch.toLowerCase();
    return name.includes(s) || code.includes(s) || dept.includes(s) || des.includes(s);
  });

  return (
    <div className="space-y-6">

      {/* Action Bar & Sub Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Sub-tabs */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveSubTab('MY_DELEGATIONS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'MY_DELEGATIONS'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>My Delegations</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ASSIGNED_TO_ME')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'ASSIGNED_TO_ME'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Delegated to Me</span>
          </button>

          {canViewOrgAudit && (
            <button
              onClick={() => setActiveSubTab('ORGANIZATION_AUDIT')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'ORGANIZATION_AUDIT'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Org Governance</span>
            </button>
          )}
        </div>

        {/* Create Delegation Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadDelegations}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-800"
            title="Refresh Delegations"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Proxy Delegation</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : delegations.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-3">
          <Share2 className="w-12 h-12 text-slate-300 dark:text-slate-900 dark:text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-black dark:text-white">
            {activeSubTab === 'MY_DELEGATIONS' 
              ? 'No Delegations Configured' 
              : activeSubTab === 'ASSIGNED_TO_ME' 
                ? 'No Proxy Authorities Assigned to You' 
                : 'No Organization Delegations Found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {activeSubTab === 'MY_DELEGATIONS' 
              ? 'When going on leave or out of office, you can designate a qualified colleague to act as your approval proxy within strict scope boundaries.'
              : activeSubTab === 'ASSIGNED_TO_ME' 
                ? 'When a colleague designates you as their approval proxy, their pending approvals within authorized scopes will appear in your queue.'
                : 'All enterprise proxy delegations, active periods, and scopes across the company are recorded here with immutable audit trails.'}
          </p>
          {activeSubTab === 'MY_DELEGATIONS' && (
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="mt-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold hover:bg-indigo-100 transition"
            >
              Configure Proxy Delegation
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {delegations.map((del) => {
            const isDelegator = del.delegatorUserId === session.userId;
            const canRevoke = (isDelegator || canViewOrgAudit) && del.status !== 'REVOKED' && del.status !== 'EXPIRED';

            return (
              <div
                key={del.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-900/60 transition duration-200 space-y-4"
              >
                {/* Header: Parties & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-black dark:text-white">
                        {del.delegatorName}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                        {del.delegateName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Delegator Role: <span className="font-medium text-slate-600 dark:text-slate-400 dark:text-slate-300">{del.delegatorRole || 'Approver'}</span>
                    </p>
                  </div>

                  {renderStatusBadge(del.status, del.startAt, del.endAt)}
                </div>

                {/* Scope Badges */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                    Authorized Scope
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {del.scope.modules.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-300 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-700"
                      >
                        {m === 'ALL' ? 'All Modules' : m}
                      </span>
                    ))}
                    {del.scope.maxTier && (
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-md text-[11px] font-bold border border-amber-200 dark:border-amber-800">
                        Max Tier {del.scope.maxTier}
                      </span>
                    )}
                  </div>
                </div>

                {/* Timeframe & Reason */}
                <div className="bg-white dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{format(new Date(del.startAt), 'PP p')}</span>
                    </div>
                    <span>to</span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      <span>{format(new Date(del.endAt), 'PP p')}</span>
                    </div>
                  </div>

                  {del.reason && (
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] italic border-t border-slate-200/60 dark:border-slate-800/60 pt-1.5">
                      &ldquo;{del.reason}&rdquo;
                    </p>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => setSelectedDetail(del)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 py-1"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>View Policy Details</span>
                  </button>

                  {canRevoke && (
                    <button
                      onClick={() => {
                        setShowRevokeModal(del);
                        setRevokeReason('');
                      }}
                      className="text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE DELEGATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateDelegation}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl"
          >
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-black dark:text-white text-base flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-indigo-600" />
                  <span>Configure Proxy Delegation</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Temporarily assign an authorized colleague to act on approvals on your behalf.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>

            {/* EMERGENCY DELEGATION: SELECT DELEGATOR */}
            {canViewOrgAudit && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-300 block">
                  Assign On Behalf Of (Original Approver)
                </label>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 mb-2 font-medium">
                  Administrator bypass enabled. You may configure a proxy for a missing or unavailable employee.
                </p>
                <select
                  value={selectedDelegatorId}
                  onChange={(e) => setSelectedDelegatorId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white"
                >
                  <option value="">{session.fullName} (Myself)</option>
                  {employees
                    .filter(e => e.id !== session.userId)
                    .map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode} - {emp.designation})
                    </option>
                  ))}
                </select>
              </div>
            )}


            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Delegate Colleague Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-300 block">
                Select Designated Proxy Approver *
              </label>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, employee ID, designation, or department..."
                  value={delegateSearch}
                  onChange={(e) => setDelegateSearch(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-black dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 bg-white dark:bg-slate-950/50 dark:bg-slate-950/50">
                {filteredEmployees.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No matching employees found.</p>
                ) : (
                  filteredEmployees.map(emp => (
                    <div
                      key={emp.id}
                      onClick={() => setSelectedDelegateId(emp.id)}
                      className={`p-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition ${
                        selectedDelegateId === emp.id
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-slate-200'
                      }`}
                    >
                      <div>
                        <span>{emp.firstName} {emp.lastName}</span>
                        <span className={`text-[10px] ml-2 ${selectedDelegateId === emp.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                          ({emp.employeeCode} &bull; {emp.designation || emp.role || 'Staff'})
                        </span>
                      </div>
                      {selectedDelegateId === emp.id && <CheckCircle className="w-3.5 h-3.5" />}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Timeframe Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-300 block">
                  Effective Start Time *
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    required
                    value={startAtDate}
                    onChange={(e) => setStartAtDate(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white"
                  />
                  <input
                    type="time"
                    required
                    value={startAtTime}
                    onChange={(e) => setStartAtTime(e.target.value)}
                    className="w-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-black dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-300 block">
                  Effective End Time *
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    required
                    value={endAtDate}
                    onChange={(e) => setEndAtDate(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white"
                  />
                  <input
                    type="time"
                    required
                    value={endAtTime}
                    onChange={(e) => setEndAtTime(e.target.value)}
                    className="w-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-black dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Scope Matrix */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-300 block">
                Delegated Business Modules
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_MODULES.map(m => {
                  const isSelected = selectedModules.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => handleToggleModule(m.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Max Approval Tier */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-300 block">
                Maximum Allowed Approval Tier (Optional)
              </label>
              <select
                value={maxTier}
                onChange={(e) => setMaxTier(parseInt(e.target.value, 10))}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white"
              >
                <option value={0}>Any Tier (Full Authority within Scope)</option>
                <option value={1}>Tier 1 Approvals Only</option>
                <option value={2}>Up to Tier 2 Approvals</option>
                <option value={3}>Up to Tier 3 Approvals</option>
              </select>
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-300 block">
                Business Reason & Justification *
              </label>
              <textarea
                required
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Annual leave coverage, business travel, medical leave..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {creating ? 'Validating & Creating...' : 'Save & Activate Delegation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REVOCATION MODAL */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-black dark:text-white text-base flex items-center gap-2 text-rose-600">
                <Trash2 className="w-4 h-4" />
                <span>Revoke Proxy Delegation</span>
              </h4>
              <button
                onClick={() => setShowRevokeModal(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to revoke proxy authority assigned to <strong>{showRevokeModal.delegateName}</strong>? This action takes effect immediately.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-300 block">
                Revocation Reason (Optional)
              </label>
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Returned to office early, role reassignment"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={revoking}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {revoking ? 'Revoking...' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-black dark:text-white text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>Delegation Policy Detail</span>
              </h4>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Delegation ID:</span>
                <span className="font-mono font-bold text-black dark:text-slate-200">{selectedDetail.delegationId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Delegator:</span>
                <span className="font-semibold text-black dark:text-slate-200">{selectedDetail.delegatorName} ({selectedDetail.delegatorRole || 'Approver'})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Designated Proxy:</span>
                <span className="font-semibold text-black dark:text-slate-200">{selectedDetail.delegateName} ({selectedDetail.delegateRole || 'Staff'})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Effective Window:</span>
                <span className="font-medium text-black dark:text-slate-200">
                  {format(new Date(selectedDetail.startAt), 'PP p')} &rarr; {format(new Date(selectedDetail.endAt), 'PP p')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Status:</span>
                <div>{renderStatusBadge(selectedDetail.status, selectedDetail.startAt, selectedDetail.endAt)}</div>
              </div>
              {selectedDetail.reason && (
                <div className="py-1">
                  <span className="text-slate-400 block mb-1">Business Reason:</span>
                  <p className="p-2.5 bg-white dark:bg-slate-950 rounded-xl text-slate-900 dark:text-slate-300 italic">
                    {selectedDetail.reason}
                  </p>
                </div>
              )}
              {selectedDetail.revokedAt && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 rounded-xl text-rose-800 dark:text-rose-300 text-[11px]">
                  Revoked on {format(new Date(selectedDetail.revokedAt), 'PP p')}. Reason: {selectedDetail.revocationReason || 'N/A'}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

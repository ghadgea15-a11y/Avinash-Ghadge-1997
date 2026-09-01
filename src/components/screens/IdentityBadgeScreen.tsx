import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  IdCard, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  History, 
  User, 
  Calendar, 
  QrCode, 
  ShieldCheck,
  MoreVertical,
  Filter,
  ArrowRight,
  Printer,
  FileText,
  Clock,
  Camera
} from 'lucide-react';
import { 
  UserSession, 
  CompanyTenant, 
  EmployeeRecord, 
  IdentityBadgeRecord, 
  BadgeStatus, 
  BadgeType,
  BadgeLifecycleEvent
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { RbacService } from '../../services/rbacService';
import { useFeedback } from '../../context/ActionFeedbackContext';
import { QRCodeDisplay } from '../common/QRCodeDisplay';
import { QRScannerModal } from '../common/QRScannerModal';

interface IdentityBadgeScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  isOnline: boolean;
  onNavigate: (screen: any) => void;
}

export const IdentityBadgeScreen: React.FC<IdentityBadgeScreenProps> = ({
  userSession,
  activeCompany,
  isOnline,
  onNavigate
}) => {
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError, confirm } = useFeedback();
  const [badges, setBadges] = useState<IdentityBadgeRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<IdentityBadgeRecord | null>(null);
  useBackNavigation(!!selectedBadge, () => setSelectedBadge(null as any), 'selectedBadge');
  const [showIssueModal, setShowIssueModal] = useState(false);
  useBackNavigation(!!showIssueModal, () => setShowIssueModal(null as any), 'showIssueModal');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  useBackNavigation(!!showVerifyModal, () => setShowVerifyModal(null as any), 'showVerifyModal');
  const [showScannerModal, setShowScannerModal] = useState(false);
  useBackNavigation(!!showScannerModal, () => setShowScannerModal(null as any), 'showScannerModal');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  useBackNavigation(!!showHistoryModal, () => setShowHistoryModal(null as any), 'showHistoryModal');
  const [badgeHistory, setBadgeHistory] = useState<BadgeLifecycleEvent[]>([]);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verifyInput, setVerifyInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<BadgeStatus | 'ALL'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubBadges = FirestoreService.subscribeToBadges(activeCompany.companyId, (data) => {
      setBadges(data);
      setLoading(false);
    });

    FirestoreService.getEmployees(userSession, activeCompany.companyId).then(setEmployees);

    return () => {
      unsubBadges();
    };
  }, [activeCompany.companyId]);

  const handleIssueBadge = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    const formData = new FormData(e.currentTarget);
    
    const employeeId = formData.get('employeeId') as string;
    const badgeNumber = formData.get('badgeNumber') as string;

    if (!employeeId || !badgeNumber) {
      showValidationFailed('Please select an employee and enter a badge number.');
      return;
    }

    const badgeData: any = {
      employeeId,
      badgeNumber,
      badgeType: formData.get('badgeType') as BadgeType,
      status: 'ISSUED',
      issueDate: new Date().toISOString(),
      effectiveFrom: formData.get('effectiveFrom') as string,
      expiryDate: formData.get('expiryDate') as string,
      companyId: activeCompany.companyId,
      issuedBy: userSession.userId
    };

    setIsSubmitting(true);
    const dismiss = showLoading('Issuing digital identity badge...');
    try {
      const success = await FirestoreService.issueBadge(activeCompany.companyId, badgeData, {
        id: userSession.userId,
        name: userSession.fullName || userSession.email
      });
      dismiss();
      if (success) {
        setShowIssueModal(false);
        showSuccess(`✓ Identity badge "${badgeNumber}" issued successfully!`);
      } else {
        showError('✕ Failed to issue badge. Ensure badge number is unique and employee doesn\'t have an active badge.');
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to issue badge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (badgeId: string, newStatus: BadgeStatus, reason: string) => {
    if (newStatus === 'DEACTIVATED' || newStatus === 'SUSPENDED') {
      const ok = await confirm({
        title: `${newStatus === 'DEACTIVATED' ? 'Deactivate' : 'Suspend'} Badge`,
        message: `Are you sure you want to change badge status to ${newStatus}?`,
        confirmLabel: `${newStatus === 'DEACTIVATED' ? 'Deactivate' : 'Suspend'} Badge`,
        cancelLabel: 'Cancel',
        isDestructive: true
      });
      if (!ok) {
        showCancelled('🚫 Badge status change cancelled');
        return;
      }
    }

    const dismiss = showLoading(`Updating badge status to ${newStatus}...`);
    try {
      const success = await FirestoreService.updateBadgeStatus(
        activeCompany.companyId,
        badgeId,
        newStatus,
        reason,
        { id: userSession.userId, name: userSession.fullName || userSession.email }
      );
      dismiss();
      if (success) {
        setSelectedBadge(prev => prev ? { ...prev, status: newStatus } : null);
        showSuccess(`✓ Badge status updated to ${newStatus}`);
      } else {
        showError('✕ Failed to update badge status');
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to update badge status');
    }
  };

  const handleVerify = async () => {
    if (!verifyInput.trim()) {
      showValidationFailed('Please enter a badge number or scan a QR code.');
      return;
    }
    const dismiss = showLoading('Verifying badge authentication...');
    try {
      const result = await FirestoreService.verifyBadge(activeCompany.companyId, verifyInput, verifyInput.startsWith('IDB-') ? 'QR' : 'NUMBER');
      dismiss();
      setVerificationResult(result);
      if (result?.status === 'VALID') {
        showSuccess(`✓ Badge Verified: ${result.badge?.badgeNumber || 'Valid'}`);
      } else {
        showError(`✕ Verification: Badge status is ${result?.status || 'INVALID'}`);
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Verification failed');
    }
  };

  const fetchHistory = async (badgeId: string) => {
    const history = await FirestoreService.getBadgeHistory(activeCompany.companyId, badgeId);
    setBadgeHistory(history);
    setShowHistoryModal(true);
  };

  const filteredBadges = badges.filter(b => {
    const emp = employees.find(e => e.id === b.employeeId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : '';
    const matchesSearch = b.badgeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (empName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: BadgeStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'ISSUED': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'LOST': return 'bg-red-100 text-red-700 border-red-200';
      case 'DAMAGED': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'EXPIRED': return 'bg-slate-100 text-slate-900 border-slate-200';
      case 'RETURNED': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-900 border-slate-200';
    }
  };

  return (
    <>
      <div className="print:hidden flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <IdCard size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-black dark:text-white">Identity Badge Master</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Lifecycle management and verification</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowVerifyModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-900 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              <ShieldCheck size={18} />
              Verify Badge
            </button>
            {RbacService.can(userSession, 'CREATE', { module: 'ID_BADGES' }) && (
              <button 
                onClick={() => setShowIssueModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md shadow-indigo-100"
              >
                <Plus size={18} />
                Issue New Badge
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-slate-200 bg-white dark:bg-slate-900/50">
        {[
          { label: 'Active Badges', value: badges.filter(b => b.status === 'ACTIVE').length, color: 'text-emerald-600', icon: CheckCircle2 },
          { label: 'Pending Issue', value: badges.filter(b => b.status === 'APPROVED').length, color: 'text-blue-600', icon: Clock },
          { label: 'Lost/Damaged', value: badges.filter(b => ['LOST', 'DAMAGED'].includes(b.status)).length, color: 'text-red-600', icon: AlertTriangle },
          { label: 'Expiring Soon', value: badges.filter(b => b.status === 'ACTIVE' && new Date(b.expiryDate).getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000).length, color: 'text-orange-600', icon: Clock },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
            <stat.icon size={24} className={stat.color} opacity={0.2} />
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* List View */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-slate-200 bg-white dark:bg-slate-900">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search by Badge No. or Employee Name..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ISSUED">Issued</option>
              <option value="LOST">Lost</option>
              <option value="DAMAGED">Damaged</option>
              <option value="RETURNED">Returned</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-indigo-500" size={32} />
              </div>
            ) : filteredBadges.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                <IdCard size={48} className="mb-4 opacity-20" />
                <p>No badges found matching your criteria</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredBadges.map((badge) => {
                  const employee = employees.find(e => e.id === badge.employeeId);
                  const empName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
                  return (
                    <div 
                      key={badge.id}
                      onClick={() => setSelectedBadge(badge)}
                      className={`p-4 hover:bg-white cursor-pointer transition-colors flex items-center justify-between group ${selectedBadge?.id === badge.id ? 'bg-indigo-50/50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 overflow-hidden">
                          {employee?.profilePictureUrl ? (
                            <img src={employee.profilePictureUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User size={24} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-black dark:text-white">{empName}</h3>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold uppercase tracking-tighter ${getStatusColor(badge.status)}`}>
                              {badge.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <IdCard size={12} /> {badge.badgeNumber}
                            </span>
                            <span className="flex items-center gap-1 uppercase tracking-wider font-medium text-[10px]">
                              {badge.badgeType}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div className="hidden md:block">
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Expiry Date</p>
                          <p className={`text-xs font-medium ${new Date(badge.expiryDate).getTime() < Date.now() ? 'text-red-500' : 'text-slate-900'}`}>
                            {new Date(badge.expiryDate).toLocaleDateString()}
                          </p>
                        </div>
                        <ArrowRight size={18} className={`text-slate-300 transition-transform ${selectedBadge?.id === badge.id ? 'translate-x-1 text-indigo-500' : ''}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detail View */}
        <div className="w-full md:w-96 bg-white dark:bg-slate-950 border-l border-slate-200 flex flex-col overflow-y-auto">
          {selectedBadge ? (
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-lg font-bold text-black dark:text-white">Badge Details</h2>
                <div className="flex gap-2">
                  <button onClick={() => fetchHistory(selectedBadge.id)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 rounded-lg transition-colors" title="View History">
                    <History size={18} />
                  </button>
                  <button 
                    onClick={() => window.print()} 
                    className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors" 
                    title="Print Badge"
                  >
                    <Printer size={18} />
                  </button>
                </div>
              </div>

              {/* Badge Preview Card */}
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 mb-8 relative overflow-hidden group">
                {/* Decoration */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white dark:bg-slate-900/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-indigo-400/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-white dark:bg-slate-900/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <IdCard size={28} />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-bold">Identity Card</p>
                      <p className="text-xs font-mono">{activeCompany.companyId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-900/20 border border-white/30 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                      {employees.find(e => e.id === selectedBadge.employeeId)?.profilePictureUrl ? (
                        <img 
                          src={employees.find(e => e.id === selectedBadge.employeeId)?.profilePictureUrl} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <User size={32} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold truncate leading-tight">
                        {employees.find(e => e.id === selectedBadge.employeeId) ? `${employees.find(e => e.id === selectedBadge.employeeId)?.firstName} ${employees.find(e => e.id === selectedBadge.employeeId)?.lastName}` : ''}
                      </h3>
                      <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">
                        {employees.find(e => e.id === selectedBadge.employeeId)?.designation || 'Staff'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-white/20 pt-4">
                    <div>
                      <p className="text-[10px] text-indigo-200 uppercase tracking-wider mb-0.5">Badge Number</p>
                      <p className="font-mono text-sm">{selectedBadge.badgeNumber}</p>
                    </div>
                    <div className="w-16 h-16 bg-white rounded-lg p-1 flex items-center justify-center shadow">
                      <QRCodeDisplay 
                        value={selectedBadge.qrIdentifier || selectedBadge.badgeNumber}
                        size={56}
                        title={`Badge #${selectedBadge.badgeNumber}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Controls */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Lifecycle Control</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedBadge.status === 'ISSUED' && (
                      <button 
                        onClick={() => handleUpdateStatus(selectedBadge.id, 'ACTIVE', 'Handed over and activated')}
                        className="flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle2 size={14} /> Activate
                      </button>
                    )}
                    {['ACTIVE', 'ISSUED'].includes(selectedBadge.status) && (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(selectedBadge.id, 'SUSPENDED', 'Disciplinary action')}
                          className="flex items-center justify-center gap-2 py-2 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold border border-orange-100 hover:bg-orange-100 transition-colors"
                        >
                          <AlertTriangle size={14} /> Suspend
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(selectedBadge.id, 'LOST', 'Reported lost by employee')}
                          className="flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100 hover:bg-red-100 transition-colors"
                        >
                          <XCircle size={14} /> Mark Lost
                        </button>
                      </>
                    )}
                    {selectedBadge.status === 'SUSPENDED' && (
                      <button 
                        onClick={() => handleUpdateStatus(selectedBadge.id, 'ACTIVE', 'Reinstated')}
                        className="flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle2 size={14} /> Reactive
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">System Metadata</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Issue Date</span>
                      <span className="text-black dark:text-white font-medium">{new Date(selectedBadge.issueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">QR Key</span>
                      <span className="text-black dark:text-white font-mono text-[10px] bg-slate-100 px-1 rounded">{selectedBadge.qrIdentifier.substring(0, 15)}...</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Last Updated</span>
                      <span className="text-black dark:text-white font-medium">{new Date(selectedBadge.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <IdCard size={32} />
              </div>
              <h3 className="font-bold text-slate-600 dark:text-slate-400">No Badge Selected</h3>
              <p className="text-sm mt-2">Select a badge from the list to view its full lifecycle details and controls</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showIssueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIssueModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                <h2 className="text-xl font-bold">Issue Identity Badge</h2>
                <button onClick={() => setShowIssueModal(false)} className="hover:bg-white dark:bg-slate-900/10 rounded-full p-1">
                  <XCircle size={24} />
                </button>
              </div>
              <form onSubmit={handleIssueBadge} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Employee</label>
                    <select name="employeeId" required className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Select Employee</option>
                      {employees.filter(e => e.lifecycleStatus !== 'EXITED').map(e => (
                        <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeId})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Badge Number</label>
                    <input name="badgeNumber" type="text" required placeholder="BN-1001" className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Badge Type</label>
                    <select name="badgeType" required className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="REGULAR">Regular</option>
                      <option value="TEMPORARY">Temporary</option>
                      <option value="CONTRACTOR">Contractor</option>
                      <option value="VISITOR">Visitor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Effective From</label>
                    <input name="effectiveFrom" type="date" required className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Expiry Date</label>
                    <input name="expiryDate" type="date" required className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowIssueModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-white dark:bg-slate-950 transition-colors font-bold">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold shadow-md shadow-indigo-100">
                    Confirm & Issue
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showVerifyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowVerifyModal(false); setVerificationResult(null); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShieldCheck size={24} className="text-emerald-400" />
                  Badge Verification
                </h2>
                <button onClick={() => { setShowVerifyModal(false); setVerificationResult(null); }} className="hover:bg-white dark:bg-slate-900/10 rounded-full p-1">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="p-6">
                {!verificationResult ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <QrCode size={40} />
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">Scan QR Code or enter Badge Number below</p>
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={verifyInput}
                        onChange={(e) => setVerifyInput(e.target.value)}
                        placeholder="Enter Identifier..."
                        className="w-full pl-4 pr-12 py-3 bg-white dark:bg-slate-950 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-lg font-mono"
                      />
                      <button 
                        onClick={handleVerify}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-colors"
                      >
                        <ArrowRight size={20} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => setShowScannerModal(true)}
                        className="flex items-center justify-center gap-2 py-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-bold shadow-sm"
                      >
                        <Camera size={18} /> Open Camera QR Scanner
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-8 ${verificationResult.status === 'VALID' ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-red-50 border-red-100 text-red-500'}`}>
                      {verificationResult.status === 'VALID' ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
                    </div>
                    <h3 className={`text-2xl font-black uppercase tracking-tighter mb-2 ${verificationResult.status === 'VALID' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {verificationResult.status === 'VALID' ? 'Verified Successfully' : `Access Denied: ${verificationResult.status}`}
                    </h3>
                    
                    {verificationResult.badge && (
                      <div className="bg-white dark:bg-slate-950 rounded-2xl p-4 mt-6 text-left border border-slate-200">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                            {verificationResult.employee?.profilePictureUrl ? (
                              <img src={verificationResult.employee.profilePictureUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User size={24} />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-black dark:text-white">{verificationResult.employee?.firstName} {verificationResult.employee?.lastName}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{verificationResult.employee?.designation || 'Staff'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                          <div>
                            <p className="text-slate-400 uppercase tracking-widest font-bold text-[9px]">Badge Number</p>
                            <p className="text-black dark:text-white font-mono">{verificationResult.badge.badgeNumber}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 uppercase tracking-widest font-bold text-[9px]">Expires On</p>
                            <p className="text-black dark:text-white font-medium">{new Date(verificationResult.badge.expiryDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => { setVerificationResult(null); setVerifyInput(''); }}
                      className="mt-8 w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                    >
                      Verify Another
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History size={24} className="text-indigo-500" />
                  Badge Lifecycle History
                </h2>
                <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-8">
                  {badgeHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">No history records found for this badge.</div>
                  ) : (
                    badgeHistory.map((event, idx) => (
                      <div key={idx} className="relative pl-8">
                        {/* Dot */}
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                          event.action.includes('ISSUED') ? 'bg-blue-500' : 
                          event.action.includes('ACTIVE') ? 'bg-emerald-500' : 
                          event.action.includes('LOST') ? 'bg-red-500' : 'bg-slate-400'
                        }`} />
                        
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-black dark:text-white uppercase text-xs tracking-wider">{event.action.replace(/_/g, ' ')}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:text-slate-400">
                                {event.fromStatus || 'INIT'}
                              </span>
                              <ArrowRight size={10} className="text-slate-400" />
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${getStatusColor(event.toStatus)}`}>
                                {event.toStatus}
                              </span>
                            </div>
                            {event.reason && (
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-950 p-2 rounded-lg border-l-2 border-slate-200">
                                "{event.reason}"
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                <User size={12} />
                                {event.actorName}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                <Clock size={12} />
                                {new Date(event.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <QRScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onScan={(scannedCode) => {
            setVerifyInput(scannedCode);
            setShowScannerModal(false);
            // Automatically trigger verification with the scanned code
            setTimeout(() => {
              FirestoreService.verifyBadge(
                activeCompany.companyId, 
                scannedCode, 
                scannedCode.startsWith('IDB-') ? 'QR' : 'NUMBER'
              ).then((result) => {
                setVerificationResult(result);
                if (result?.status === 'VALID') {
                  showSuccess(`✓ Badge Verified: ${result.badge?.badgeNumber || 'Valid'}`);
                } else {
                  showError(`✕ Verification: Badge status is ${result?.status || 'INVALID'}`);
                }
              }).catch((err) => {
                handleError(err, '✕ Verification failed');
              });
            }, 100);
          }}
          title="Scan Employee ID Badge QR Code"
        />
      </AnimatePresence>
    </div>

    {/* Printable Badge - Visible only during print */}
    {selectedBadge && (
      <div className="hidden print:flex fixed inset-0 w-full h-full bg-white text-black items-center justify-center z-[9999]">
        <div className="w-[54mm] h-[86mm] border border-slate-300 rounded-xl bg-white relative overflow-hidden flex flex-col shadow-sm" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div className="h-14 bg-indigo-600 flex items-center justify-center p-2 text-white text-center">
             <h1 className="font-bold text-[10px] leading-tight">{activeCompany.brandName || activeCompany.companyLegalName || 'Company Identity'}</h1>
          </div>
          <div className="flex justify-center -mt-6 z-10 relative">
            <div className="w-16 h-16 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
              {employees.find(e => e.id === selectedBadge.employeeId)?.profilePictureUrl ? (
                <img 
                  src={employees.find(e => e.id === selectedBadge.employeeId)?.profilePictureUrl} 
                  alt="" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={32} className="text-slate-400" />
              )}
            </div>
          </div>
          <div className="text-center px-2 pt-2 pb-1">
             <h2 className="font-bold text-[13px] leading-tight text-slate-900 truncate">{employees.find(e => e.id === selectedBadge.employeeId) ? `${employees.find(e => e.id === selectedBadge.employeeId)?.firstName} ${employees.find(e => e.id === selectedBadge.employeeId)?.lastName}` : 'Unknown Employee'}</h2>
             <p className="text-[9px] text-indigo-700 font-bold uppercase mt-0.5 truncate">{employees.find(e => e.id === selectedBadge.employeeId)?.designation || 'Staff'}</p>
             <p className="text-[9px] text-slate-600 font-mono mt-1 font-semibold">ID: {employees.find(e => e.id === selectedBadge.employeeId)?.employeeId || selectedBadge.employeeId}</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center pb-2">
             <div className="p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm">
               <QRCodeDisplay value={`IDB-${selectedBadge.id}`} size={64} />
             </div>
             <p className="text-[7px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Scan to Verify</p>
          </div>
          <div className="py-1.5 px-2 bg-slate-100 flex flex-col items-center justify-center border-t border-slate-200">
             <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">{selectedBadge.type || 'STANDARD'} BADGE</p>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

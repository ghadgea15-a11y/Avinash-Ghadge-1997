import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  MoreVertical,
  Plus,
  Eye,
  Check,
  X,
  History,
  Download,
  AlertCircle,
  RefreshCw,
  Bell
} from 'lucide-react';
import { 
  UserSession, 
  EmployeeDocumentRecord, 
  DocumentTypeConfig,
  DocumentStatus,
  EmployeeRecord
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { RbacService } from '../../services/rbacService';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentTypeManager } from '../compliance/DocumentTypeManager';

interface ComplianceDashboardProps {
  userSession: UserSession;
}

export function ComplianceDashboardScreen({ userSession }: ComplianceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [expiringDocs, setExpiringDocs] = useState<EmployeeDocumentRecord[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentTypeConfig[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<EmployeeDocumentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [scanning, setScanning] = useState(false);
  const [showTypeManager, setShowTypeManager] = useState(false);

  useEffect(() => {
    loadData();
  }, [userSession.companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const types = await FirestoreService.getDocumentTypes(userSession.companyId);
      setDocTypes(types);

      const expiring = await FirestoreService.getExpiringDocuments(userSession.companyId, 90);
      setExpiringDocs(expiring);

      // Fetch pending verifications (status UPLOADED or UNDER_VERIFICATION)
      // This is a simplified fetch
      const allDocs = await FirestoreService.getExpiringDocuments(userSession.companyId, 365); 
      setPendingVerifications(allDocs.filter(d => d.status === 'UPLOADED' || d.status === 'UNDER_VERIFICATION'));
      
    } catch (error) {
      console.error('Error loading compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const result = await FirestoreService.checkAndTriggerExpirations(userSession.companyId);
      alert(`Scan complete: ${result.alerted} alerts triggered across ${result.total} documents.`);
      loadData();
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case 'VERIFIED': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'EXPIRING_SOON': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'EXPIRED': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'UPLOADED': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'REJECTED': return 'text-slate-600 bg-slate-50 border-slate-100';
      default: return 'text-slate-500 bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-indigo-600" />
              Document Compliance Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Monitor workforce documentation, expirations, and regulatory compliance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleScan}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-medium transition shadow-sm"
            >
              {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Run Compliance Scan
            </button>
            {RbacService.hasPermission(userSession, 'CREATE', { module: 'COMPLIANCE', targetCompanyId: userSession.companyId }) && (
              <button 
                onClick={() => setShowTypeManager(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Manage Types
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="Compliance Rate" 
              value="82.4%" 
              trend="+2.1%" 
              icon={ShieldAlert} 
              color="indigo" 
            />
            <StatCard 
              label="Expiring Soon" 
              value={expiringDocs.length.toString()} 
              subLabel="Next 90 Days"
              icon={AlertTriangle} 
              color="amber" 
            />
            <StatCard 
              label="Pending Verification" 
              value={pendingVerifications.length.toString()} 
              subLabel="Action Required"
              icon={Clock} 
              color="blue" 
            />
            <StatCard 
              label="Critical Missing" 
              value="14" 
              subLabel="Mandatory Docs"
              icon={AlertCircle} 
              color="rose" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Alerts Table */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Expiration Alerts
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search employee..."
                        className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none w-48"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Employee</th>
                        <th className="px-4 py-3 font-semibold">Document</th>
                        <th className="px-4 py-3 font-semibold">Expiry Date</th>
                        <th className="px-4 py-3 font-semibold text-center">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading alerts...</td>
                        </tr>
                      ) : expiringDocs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No active alerts found</td>
                        </tr>
                      ) : (
                        expiringDocs.map(doc => (
                          <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900 dark:text-white">{doc.uploadedByName}</span>
                                <span className="text-[10px] text-slate-500">{doc.employeeId}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                              {doc.documentTypeCode}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className={new Date(doc.expiryDate!) < new Date() ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                                  {doc.expiryDate}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(doc.status)}`}>
                                {doc.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Renew">
                                  <Plus className="w-4 h-4 text-indigo-600" />
                                </button>
                                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Notify">
                                  <Bell className="w-4 h-4 text-slate-500" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Side Panel: Recent Verifications */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white text-sm">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    Pending Verifications
                  </h3>
                </div>
                <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                  {pendingVerifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">No pending verifications</div>
                  ) : (
                    pendingVerifications.map(doc => (
                      <div key={doc.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                              {doc.uploadedByName}
                            </span>
                            <span className="text-[10px] text-slate-500">{doc.documentTypeCode}</span>
                          </div>
                          <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition">
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-3 gap-2">
                          <button className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> Verify
                          </button>
                          <button className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[10px] font-bold transition flex items-center justify-center gap-1">
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Compliance Breakdown */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <h3 className="font-bold text-sm mb-4 text-slate-900 dark:text-white">Document Distribution</h3>
                <div className="space-y-3">
                  {docTypes.map(type => (
                    <div key={type.id} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-600">{type.name}</span>
                        <span className="text-indigo-600">85%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showTypeManager && (
          <DocumentTypeManager 
            userSession={userSession}
            onClose={() => setShowTypeManager(false)}
            onUpdate={loadData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, subLabel, trend, icon: Icon, color }: any) {
  const colors: any = {
    indigo: 'bg-indigo-500 text-indigo-500',
    amber: 'bg-amber-500 text-amber-500',
    rose: 'bg-rose-500 text-rose-500',
    blue: 'bg-blue-500 text-blue-500',
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-start">
        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <Icon className={`w-5 h-5 ${colors[color].split(' ')[1]}`} />
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h4>
        <div className="flex justify-between items-center mt-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          {subLabel && <p className="text-[10px] text-slate-400 italic">{subLabel}</p>}
        </div>
      </div>
    </div>
  );
}

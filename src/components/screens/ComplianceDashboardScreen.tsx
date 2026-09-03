import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  ShieldCheck, AlertTriangle, FileCheck, Target, Activity, CheckCircle2, 
  XCircle, Clock, Plus, Filter, Download, ChevronRight, BookOpen, 
  Search, Edit2, Trash2, FileText, Upload
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { UserSession, CompanyTenant } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { collection, query, getDocs, setDoc, doc, deleteDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';

interface ComplianceDashboardScreenProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
}

type TabType = 'OVERVIEW' | 'POLICIES' | 'RISKS' | 'CAPA' | 'AUDITS';

export const ComplianceDashboardScreen: React.FC<ComplianceDashboardScreenProps> = ({ userSession, activeCompany }) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [isLoading, setIsLoading] = useState(true);

  // States
  const [policies, setPolicies] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [capas, setCapas] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);

  // Modal / Form states
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isCapaModalOpen, setIsCapaModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  useBackNavigation(!!editingItem, () => setEditingItem(null as any), 'editingItem');

  useEffect(() => {
    if (!activeCompany) return;

    setIsLoading(true);
    
    const unsubPolicies = onSnapshot(query(collection(db, 'companies', activeCompany.companyId, 'grc_policies'), orderBy('createdAt', 'desc')), snap => {
      setPolicies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unsubRisks = onSnapshot(query(collection(db, 'companies', activeCompany.companyId, 'grc_risks'), orderBy('createdAt', 'desc')), snap => {
      setRisks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCapas = onSnapshot(query(collection(db, 'companies', activeCompany.companyId, 'grc_capa'), orderBy('createdAt', 'desc')), snap => {
      setCapas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubAudits = onSnapshot(query(collection(db, 'companies', activeCompany.companyId, 'grc_audits'), orderBy('createdAt', 'desc')), snap => {
      setAudits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    });

    return () => {
      unsubPolicies();
      unsubRisks();
      unsubCapas();
      unsubAudits();
    };
  }, [activeCompany]);

  // Handle Save Forms
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !editingItem) return;
    try {
      const ref = doc(collection(db, 'companies', activeCompany.companyId, 'grc_policies'), editingItem.id || Date.now().toString());
      await setDoc(ref, {
        ...editingItem,
        createdAt: editingItem.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: editingItem.status || 'DRAFT'
      }, { merge: true });
      setIsPolicyModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !editingItem) return;
    try {
      const ref = doc(collection(db, 'companies', activeCompany.companyId, 'grc_risks'), editingItem.id || Date.now().toString());
      await setDoc(ref, {
        ...editingItem,
        createdAt: editingItem.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: editingItem.status || 'IDENTIFIED'
      }, { merge: true });
      setIsRiskModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCapa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !editingItem) return;
    try {
      const ref = doc(collection(db, 'companies', activeCompany.companyId, 'grc_capa'), editingItem.id || Date.now().toString());
      await setDoc(ref, {
        ...editingItem,
        createdAt: editingItem.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: editingItem.status || 'OPEN'
      }, { merge: true });
      setIsCapaModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (!activeCompany) return;
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await deleteDoc(doc(db, 'companies', activeCompany.companyId, collectionName, id));
    } catch (err) {
      console.error(err);
    }
  };

  const exportData = async (data: any[], name: string) => {
    if (!activeCompany) return;
    try {
      await BulkExportGovernanceService.evaluateAndRecordExport({
        session: userSession!,
        companyId: activeCompany.companyId,
        module: 'GRC_COMPLIANCE',
        entityType: 'ComplianceRecord',
        exportFormat: 'CSV',
        dataClassification: 'INTERNAL_SENSITIVE',
        recordCount: data.length,
        exportName: `${activeCompany.companyId}_GRC_${name}.csv`,
        reason: 'Compliance Audit Export'
      });
      const headers = data.length > 0 ? Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object') : [];
      const csvContent = 'data:text/csv;charset=utf-8,' + [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${String(row[h] || '')}"`).join(','))
      ].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `GRC_${name}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export Error:', e);
      alert('Failed to export. Permission denied.');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading GRC data...</div>;
  }

  // KPIs Calculation
  const criticalRisks = risks.filter(r => r.severity === 'CRITICAL' && r.status !== 'MITIGATED');
  const openCapas = capas.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS');
  const activePolicies = policies.filter(p => p.status === 'PUBLISHED');

  return (
    <div className={`flex-1 h-full flex flex-col ${isDark ? 'text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-50'}`}>
      {/* Header */}
      <div className={`p-4 sm:p-6 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Governance, Risk & Compliance</h1>
              <p className="text-sm text-slate-500">Manage internal policies, risks, audits, and CAPA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex overflow-x-auto border-b scrollbar-none ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        {[
          { id: 'OVERVIEW', label: 'GRC Overview', icon: Activity },
          { id: 'POLICIES', label: 'Policy Management', icon: BookOpen },
          { id: 'RISKS', label: 'Risk Register', icon: AlertTriangle },
          { id: 'CAPA', label: 'Corrective Actions (CAPA)', icon: Target },
          { id: 'AUDITS', label: 'Audits & Evidence', icon: FileCheck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-3 mb-2 text-slate-500">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Active Policies</h3>
                  </div>
                  <div className="text-3xl font-black">{activePolicies.length}</div>
                </div>
                
                <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-3 mb-2 text-slate-500">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Critical Risks</h3>
                  </div>
                  <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{criticalRisks.length}</div>
                </div>
                
                <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-3 mb-2 text-slate-500">
                    <Target className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Open CAPAs</h3>
                  </div>
                  <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{openCapas.length}</div>
                </div>
                
                <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-3 mb-2 text-slate-500">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Recent Audits</h3>
                  </div>
                  <div className="text-3xl font-black">{audits.filter(a => a.status === 'COMPLETED').length}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    Top Critical Risks
                  </h3>
                  {criticalRisks.length === 0 ? (
                    <div className="text-center p-8 text-slate-500 border border-dashed rounded-2xl dark:border-slate-800">
                      No critical risks identified.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {criticalRisks.map(r => (
                        <div key={r.id} className="p-4 border rounded-xl dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50">
                          <h4 className="font-bold text-sm">{r.title}</h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>
                          <div className="mt-3 flex gap-2">
                            <span className="px-2 py-1 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[11px] font-bold rounded-lg uppercase">
                              {r.category}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-amber-500" />
                    Action Items (CAPA)
                  </h3>
                  {openCapas.length === 0 ? (
                    <div className="text-center p-8 text-slate-500 border border-dashed rounded-2xl dark:border-slate-800">
                      No open corrective actions.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {openCapas.map(c => (
                        <div key={c.id} className="p-4 border rounded-xl dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-sm">{c.title}</h4>
                            <p className="text-xs text-slate-500 mt-1">Assigned to: {c.assignee || 'Unassigned'}</p>
                          </div>
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[11px] font-bold rounded-lg uppercase">
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'POLICIES' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Internal Policies & SOPs</h3>
                <div className="flex gap-2">
                  <button onClick={() => exportData(policies, 'Policies')} className="p-2 border rounded-xl hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800">
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setEditingItem({}); setIsPolicyModalOpen(true); }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Policy
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                {policies.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 border rounded-3xl dark:border-slate-800">No policies found.</div>
                ) : (
                  policies.map(p => (
                    <div key={p.id} className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-start gap-3">
                        <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl mt-1">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold">{p.title}</h4>
                          <p className="text-sm text-slate-500 mt-1">Version: {p.version || '1.0'} | Category: {p.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-[11px] font-bold rounded-lg uppercase ${p.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {p.status}
                        </span>
                        <button onClick={() => { setEditingItem(p); setIsPolicyModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-400">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete('grc_policies', p.id)} className="p-2 text-slate-400 hover:text-rose-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'RISKS' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Risk Register</h3>
                <div className="flex gap-2">
                  <button onClick={() => exportData(risks, 'Risks')} className="p-2 border rounded-xl hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800">
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setEditingItem({}); setIsRiskModalOpen(true); }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Log Risk
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                {risks.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 border rounded-3xl dark:border-slate-800">No risks logged.</div>
                ) : (
                  risks.map(r => (
                    <div key={r.id} className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div>
                        <h4 className="font-bold flex items-center gap-2">
                          {r.severity === 'CRITICAL' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                          {r.title}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1 max-w-2xl truncate">{r.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-[11px] font-bold rounded-lg uppercase ${
                          r.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 
                          r.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {r.severity}
                        </span>
                        <span className="px-2 py-1 text-[11px] font-bold rounded-lg uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                          {r.status}
                        </span>
                        <button onClick={() => { setEditingItem(r); setIsRiskModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-400">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete('grc_risks', r.id)} className="p-2 text-slate-400 hover:text-rose-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'CAPA' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Corrective & Preventive Actions</h3>
                <div className="flex gap-2">
                  <button onClick={() => exportData(capas, 'CAPA')} className="p-2 border rounded-xl hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800">
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setEditingItem({}); setIsCapaModalOpen(true); }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New CAPA
                  </button>
                </div>
              </div>
              
              <div className="grid gap-3">
                {capas.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 border rounded-3xl dark:border-slate-800">No CAPA records found.</div>
                ) : (
                  capas.map(c => (
                    <div key={c.id} className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div>
                        <h4 className="font-bold">{c.title}</h4>
                        <p className="text-sm text-slate-500 mt-1">Due: {c.dueDate || 'N/A'} | Owner: {c.assignee || 'Unassigned'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-[11px] font-bold rounded-lg uppercase ${c.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                          {c.status}
                        </span>
                        <button onClick={() => { setEditingItem(c); setIsCapaModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-400">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete('grc_capa', c.id)} className="p-2 text-slate-400 hover:text-rose-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'AUDITS' && (
            <div className="p-8 text-center border rounded-3xl border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
               <FileCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
               <h3 className="font-bold text-lg mb-2">Audit Logs & Evidence Tracking</h3>
               <p className="text-sm max-w-md mx-auto">
                 This module connects to the centralized Platform Audit Trail and Document Management modules to provide automated evidence collection for compliance standards.
               </p>
               <button className="mt-6 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl">View System Audit Logs</button>
            </div>
          )}
        </div>
      </div>

      {/* Modals for Policy, Risk, CAPA Forms */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-lg p-6 rounded-3xl ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
            <h2 className="text-xl font-bold mb-4">{editingItem?.id ? 'Edit Policy' : 'Add Policy'}</h2>
            <form onSubmit={handleSavePolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Policy Title</label>
                <input required type="text" value={editingItem.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Category</label>
                <select required value={editingItem.category || 'HR'} onChange={e => setEditingItem({...editingItem, category: e.target.value})} className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <option value="HR">Human Resources</option>
                  <option value="HSE">Health, Safety & Environment</option>
                  <option value="IT_SECURITY">IT & Security</option>
                  <option value="OPERATIONS">Operations</option>
                  <option value="LEGAL">Legal & Statutory</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                <select value={editingItem.status || 'DRAFT'} onChange={e => setEditingItem({...editingItem, status: e.target.value})} className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <option value="DRAFT">Draft</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsPolicyModalOpen(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl">Save Policy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRiskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-lg p-6 rounded-3xl ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
            <h2 className="text-xl font-bold mb-4">{editingItem?.id ? 'Edit Risk' : 'Log Risk'}</h2>
            <form onSubmit={handleSaveRisk} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Risk Title</label>
                <input required type="text" value={editingItem.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                <textarea rows={3} required value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Severity</label>
                  <select value={editingItem.severity || 'LOW'} onChange={e => setEditingItem({...editingItem, severity: e.target.value})} className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                  <select value={editingItem.status || 'IDENTIFIED'} onChange={e => setEditingItem({...editingItem, status: e.target.value})} className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <option value="IDENTIFIED">Identified</option>
                    <option value="ASSESSED">Assessed</option>
                    <option value="MITIGATED">Mitigated</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsRiskModalOpen(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl">Save Risk</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCapaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-lg p-6 rounded-3xl ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
            <h2 className="text-xl font-bold mb-4">{editingItem?.id ? 'Edit CAPA' : 'New CAPA'}</h2>
            <form onSubmit={handleSaveCapa} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">CAPA Title / Issue</label>
                <input required type="text" value={editingItem.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Assignee</label>
                  <input type="text" value={editingItem.assignee || ''} onChange={e => setEditingItem({...editingItem, assignee: e.target.value})} className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Due Date</label>
                  <input type="date" value={editingItem.dueDate || ''} onChange={e => setEditingItem({...editingItem, dueDate: e.target.value})} className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                <select value={editingItem.status || 'OPEN'} onChange={e => setEditingItem({...editingItem, status: e.target.value})} className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsCapaModalOpen(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl">Save CAPA</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

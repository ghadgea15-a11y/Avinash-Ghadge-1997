import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant } from '../../types';
import { DocumentLifecycleService } from '../../services/documentLifecycleService';
import { FileText, AlertTriangle, CheckCircle, Clock, Search, Filter, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface Props {
  session?: UserSession;
  userSession?: UserSession;
  activeCompany: CompanyTenant;
  onNavigate?: (screen: any) => void;
}

export const DocumentLifecycleScreen: React.FC<Props> = ({ session, userSession, activeCompany, onNavigate }) => {
  const { showSuccess, showError, showLoading, showCancelled, handleError } = useFeedback();
  const currentSession = userSession || session!;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeCompany.companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const dbData = await DocumentLifecycleService.getDashboardData(currentSession);
      setData(dbData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateExpiries = async () => {
    const dismiss = showLoading('Evaluating document expiries and dispatching reminders...');
    try {
      const updates = await DocumentLifecycleService.evaluateExpiries(activeCompany.companyId);
      dismiss();
      showSuccess(`✓ Evaluation complete: Triggered ${updates} expiry status/reminder update(s).`);
      loadData();
    } catch (err: any) {
      dismiss();
      handleError(err, "✕ Evaluation failed");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VALID': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1"><CheckCircle className="w-3 h-3" /> VALID</span>;
      case 'EXPIRING_SOON': return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-1"><Clock className="w-3 h-3" /> EXPIRING SOON</span>;
      case 'EXPIRED': return <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> EXPIRED</span>;
      case 'RENEWAL_PENDING': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1"><Clock className="w-3 h-3" /> RENEWING</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-900 dark:text-slate-300 text-xs font-bold rounded-lg">{status}</span>;
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading Document Lifecycle...</div>;
  if (!data) return <div className="p-8 text-center text-rose-500">Failed to load data</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-600" />
            Document Lifecycle & Compliance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enterprise document workflow, version control, and expiration tracking.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleEvaluateExpiries}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Evaluate Expiries
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Monitored</p>
              <h3 className="text-2xl font-bold text-black dark:text-white mt-1">{data.documents.length}</h3>
            </div>
            <FileText className="w-8 h-8 text-slate-500 dark:text-slate-400 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-emerald-800">Valid Documents</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {data.documents.filter((d: any) => d.status === 'VALID').length}
              </h3>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-amber-800">Expiring Soon</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {data.documents.filter((d: any) => d.status === 'EXPIRING_SOON' || d.status === 'RENEWAL_PENDING').length}
              </h3>
            </div>
            <Clock className="w-8 h-8 text-amber-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-rose-800">Expired</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                {data.documents.filter((d: any) => d.status === 'EXPIRED').length}
              </h3>
            </div>
            <AlertTriangle className="w-8 h-8 text-rose-500 opacity-20" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-slate-200 bg-white dark:bg-slate-950 flex items-center justify-between">
          <h2 className="font-bold text-black dark:text-white">Document Inventory</h2>
        </div>
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs uppercase border-b border-slate-200">
                <th className="p-4 font-semibold">Document Title</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Issue Date</th>
                <th className="p-4 font-semibold">Expiry Date</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">No documents found. Run the E2E test to generate sample data.</td>
                </tr>
              ) : (
                data.documents.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-white dark:bg-slate-950 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-black dark:text-white">{doc.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ID: {doc.id}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-900 dark:text-slate-300 text-[10px] font-bold rounded-md">
                        {doc.docType}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                      {format(new Date(doc.issueDate), 'PP')}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                      {format(new Date(doc.expiryDate), 'PP')}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(doc.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

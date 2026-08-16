import React, { useEffect, useState } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen, DocumentRecord, TaskRecord } from '../../../../types';
import { FirestoreService } from '../../../../services/firestoreService';
import { FileText, CheckSquare, Clock, AlertCircle } from 'lucide-react';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
  departmentName: string;
}

export const DepartmentGenericDashboard: React.FC<DashboardProps> = ({ userSession, company, departmentName }) => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubTasks: () => void;
    let unsubDocs: () => void;

    const init = async () => {
      unsubTasks = FirestoreService.subscribeToTasks(userSession, company.companyId, (allTasks) => {
        setTasks(allTasks.filter(t => t.departmentTag === departmentName));
      });
      unsubDocs = FirestoreService.subscribeToDocuments(userSession, company.companyId, (allDocs) => {
        setDocuments(allDocs.filter(d => d.departmentTag === departmentName));
      });
      setLoading(false);
    };

    init();

    return () => {
      if (unsubTasks) unsubTasks();
      if (unsubDocs) unsubDocs();
    };
  }, [userSession, company.companyId, departmentName]);

  if (loading) return <div className="p-4 text-center">Loading {departmentName} Dashboard...</div>;

  const pendingTasks = tasks.filter(t => ['TODO', 'IN_PROGRESS', 'PENDING', 'IN_REVIEW'].includes(t.status));
  const activeDocs = documents.filter(d => ['PENDING', 'IN_REVIEW'].includes(d.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">{departmentName} Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-500">Pending Tasks</h3>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">{pendingTasks.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-500">Total Tasks</h3>
            <CheckSquare className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">{tasks.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-500">Docs In Review</h3>
            <AlertCircle className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">{activeDocs.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-500">Total Documents</h3>
            <FileText className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">{documents.length}</p>
        </div>
      </div>
      
      {/* List placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Tasks</h3>
          {tasks.length === 0 ? <p className="text-sm text-slate-500">No tasks found.</p> : (
            <ul className="space-y-3">
              {tasks.slice(0,5).map(t => (
                <li key={t.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm text-slate-900">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Documents</h3>
          {documents.length === 0 ? <p className="text-sm text-slate-500">No documents found.</p> : (
            <ul className="space-y-3">
              {documents.slice(0,5).map(d => (
                <li key={d.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm text-slate-900">{d.title}</p>
                    <p className="text-xs text-slate-500">{d.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

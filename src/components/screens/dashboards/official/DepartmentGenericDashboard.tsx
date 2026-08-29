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
      unsubTasks = FirestoreService.subscribeToTasks(userSession, company.companyId, (allTasks: any[]) => {
        setTasks(allTasks.filter((t: any) => t.departmentTag === departmentName));
      });
      unsubDocs = FirestoreService.subscribeToDocuments(userSession, company.companyId, (allDocs: any[]) => {
        setDocuments(allDocs.filter((d: any) => d.departmentTag === departmentName));
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

  const pendingTasks = tasks.filter((t: any) => ['TODO', 'IN_PROGRESS', 'PENDING', 'IN_REVIEW'].includes(t.status));
  const activeDocs = documents.filter((d: any) => ['PENDING', 'IN_REVIEW'].includes(d.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-black dark:text-white">{departmentName} Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pending Tasks</h3>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{pendingTasks.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Tasks</h3>
            <CheckSquare className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{tasks.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Docs In Review</h3>
            <AlertCircle className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{activeDocs.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Documents</h3>
            <FileText className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{documents.length}</p>
        </div>
      </div>
      
      {/* List placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-black dark:text-white mb-4">Recent Tasks</h3>
          {tasks.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No tasks found.</p> : (
            <ul className="space-y-3">
              {tasks.slice(0,5).map((t: any) => (
                <li key={t.id} className="p-3 bg-white dark:bg-slate-950 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm text-black dark:text-white">{t.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-black dark:text-white mb-4">Recent Documents</h3>
          {documents.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No documents found.</p> : (
            <ul className="space-y-3">
              {documents.slice(0,5).map((d: any) => (
                <li key={d.id} className="p-3 bg-white dark:bg-slate-950 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm text-black dark:text-white">{d.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{d.status}</p>
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

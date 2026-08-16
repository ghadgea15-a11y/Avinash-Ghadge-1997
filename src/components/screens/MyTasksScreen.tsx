import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen, TaskRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { StorageService } from '../../services/storageService';
import { CheckCircle2, Clock, Upload, Camera } from 'lucide-react';

interface Props {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const MyTasksScreen: React.FC<Props> = ({ userSession, company, onNavigate }) => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    const unsub = FirestoreService.subscribeToTasks(userSession, company.companyId, (allTasks) => {
      setTasks(allTasks.filter(t => t.assignedTo === userSession.employeeId));
    });
    setTimeout(() => setLoading(false), 800);
    return () => unsub();
  }, [userSession, company.companyId]);

  const handleStatusUpdate = async (task: TaskRecord, status: TaskRecord['status']) => {
    await FirestoreService.saveTask(company.companyId, { ...task, status });
  };

  const handleFileUpload = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(taskId);
      const url = await StorageService.uploadFile(`companies/${company.companyId}/task-proofs/${file.name}`, file);
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        await FirestoreService.saveTask(company.companyId, { 
          ...task, 
          photoUrl: url,
          status: 'PENDING_VERIFICATION'
        });
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading My Tasks...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">My Tasks</h2>
      
      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">{task.title}</h3>
                <p className="text-sm text-slate-500">{task.description}</p>
              </div>
              <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium">{task.status}</span>
            </div>
            
            {task.photoUrl && (
              <div className="mb-4">
                <img src={task.photoUrl} alt="Task proof" className="h-32 rounded-lg object-cover" />
              </div>
            )}

            <div className="flex items-center gap-3 mt-4 border-t pt-4">
              {task.status === 'TODO' && (
                <button onClick={() => handleStatusUpdate(task, 'IN_PROGRESS')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Start Task
                </button>
              )}
              {task.status === 'IN_PROGRESS' && (
                <div className="flex items-center gap-4">
                  <button onClick={() => handleStatusUpdate(task, 'COMPLETED')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Mark Complete
                  </button>
                  <label className="flex items-center gap-2 text-sm text-indigo-600 cursor-pointer hover:bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100">
                    <Camera className="w-4 h-4" />
                    {uploading === task.id ? 'Uploading...' : 'Upload Proof'}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(task.id, e)} disabled={uploading === task.id} />
                  </label>
                </div>
              )}
              {(task.status === 'PENDING_VERIFICATION' || task.status === 'COMPLETED') && (
                <div className="text-sm text-emerald-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Done
                </div>
              )}
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed">
            No tasks assigned to you right now.
          </div>
        )}
      </div>
    </div>
  );
};

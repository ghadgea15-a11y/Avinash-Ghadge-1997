import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen, TaskRecord, EmployeeRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { Plus, Check, Clock, AlertTriangle, Edit } from 'lucide-react';

interface Props {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const TaskManagementScreen: React.FC<Props> = ({ userSession, company, onNavigate }) => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState<Partial<TaskRecord>>({
    title: '', description: '', status: 'TODO', assignedTo: ''
  });

  useEffect(() => {
    const unsubTasks = FirestoreService.subscribeToTasks(userSession, company.companyId, setTasks);
    const unsubEmp = FirestoreService.subscribeToEmployees(userSession, company.companyId, setEmployees);
    setTimeout(() => setLoading(false), 800);
    return () => { unsubTasks(); unsubEmp(); };
  }, [userSession, company.companyId]);

  const handleCreate = async () => {
    if (!newTask.title || !newTask.assignedTo) return;
    
    const task: any = {
      id: crypto.randomUUID(),
      companyId: company.companyId,
      siteId: userSession.assignedSiteId || '',
      title: newTask.title || '',
      description: newTask.description || '',
      assignedTo: newTask.assignedTo || '',
      createdBy: userSession.employeeId || 'admin',
      status: 'TODO',
      createdAt: Date.now()
    };
    if (newTask.slaDeadline) {
      task.slaDeadline = newTask.slaDeadline;
    }
    
    await FirestoreService.saveTask(company.companyId, task);
    setShowCreate(false);
    setNewTask({ title: '', description: '', status: 'TODO', assignedTo: '' });
  };

  const updateStatus = async (task: TaskRecord, newStatus: TaskRecord['status']) => {
    const updated = { ...task, status: newStatus };
    await FirestoreService.saveTask(company.companyId, updated);
  };

  if (loading) return <div className="p-8 text-center">Loading Tasks...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Task Management (A6 Task Allocation)</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Create Task
        </button>
      </div>

      {showCreate && (
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
          <h3 className="font-bold mb-4">New Task</h3>
          <div className="space-y-4">
            <input type="text" placeholder="Title" className="w-full p-2 border rounded" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
            <textarea placeholder="Description" className="w-full p-2 border rounded" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
            <select className="w-full p-2 border rounded" value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}>
              <option value="">Assign To...</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
            </select>
            <input type="datetime-local" className="w-full p-2 border rounded" value={newTask.slaDeadline || ''} onChange={e => setNewTask({...newTask, slaDeadline: e.target.value})} title="SLA Deadline" />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="bg-indigo-600 text-white px-4 py-2 rounded">Save</button>
              <button onClick={() => setShowCreate(false)} className="bg-slate-200 px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map(task => (
          <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border">
            <h4 className="font-bold">{task.title}</h4>
            <p className="text-sm text-slate-500 mb-2">{task.description}</p>
            <div className="text-xs text-slate-400 mb-2">Assigned to: {employees.find(e => e.id === task.assignedTo)?.firstName || task.assignedTo}</div>
            <div className="text-xs text-slate-400 mb-2">Status: {task.status}</div>
            {task.slaDeadline && <div className="text-xs text-red-500 mb-2">SLA: {new Date(task.slaDeadline).toLocaleString()}</div>}
            
            <div className="flex gap-2 mt-4">
               <button onClick={() => updateStatus(task, 'IN_PROGRESS')} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Start</button>
               <button onClick={() => updateStatus(task, 'COMPLETED')} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Complete</button>
               <button onClick={() => updateStatus(task, 'CANCELLED')} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">Cancel</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

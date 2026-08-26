import React, { useState, useEffect, useMemo } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen, TaskRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { StorageService } from '../../services/storageService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';
import { 
  CheckCircle2, 
  Clock, 
  Camera, 
  ListChecks, 
  AlertTriangle, 
  Send, 
  Image as ImageIcon, 
  Check, 
  X, 
  FileText,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface Props {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const MyTasksScreen: React.FC<Props> = ({ userSession, company, onNavigate }) => {
  const { isDark } = useTheme();
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError } = useFeedback();
  const companyId = company.companyId || userSession.companyId;

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING_REVIEW' | 'COMPLETED'>('ACTIVE');
  
  // Proof & Completion Modal
  const [activeTaskForAction, setActiveTaskForAction] = useState<TaskRecord | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = FirestoreService.subscribeToTasks(userSession, companyId, (allTasks) => {
      const myId = userSession.employeeId || userSession.userId || '';
      const filtered = allTasks.filter(t => 
        t.assignedTo === myId || 
        t.assignedTo === userSession.userId ||
        (userSession.email && t.assignedTo === userSession.email)
      );
      setTasks(filtered);
    });

    const timer = setTimeout(() => setLoading(false), 700);
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [userSession, companyId]);

  // SLA Calculation
  const getSlaBadge = (slaDeadline?: string, status?: TaskRecord['status']) => {
    if (!slaDeadline || status === 'COMPLETED' || status === 'APPROVED' || status === 'RESOLVED') return null;
    const diffHours = (new Date(slaDeadline).getTime() - Date.now()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 animate-pulse flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> SLA BREACHED
        </span>
      );
    }
    if (diffHours <= 4) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Due in {Math.ceil(diffHours)}h
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 flex items-center gap-1">
        <Clock className="w-3 h-3" /> {Math.ceil(diffHours)}h remaining
      </span>
    );
  };

  // Toggle checklist item
  const handleToggleChecklistItem = async (task: TaskRecord, itemIndex: number) => {
    if (!task.checklist || task.checklist.length === 0) return;
    const updatedChecklist = task.checklist.map((item, idx) => 
      idx === itemIndex ? { ...item, done: !item.done } : item
    );

    const updatedTask: TaskRecord = {
      ...task,
      checklist: updatedChecklist,
      updatedAt: Date.now()
    };

    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    await FirestoreService.saveTask(companyId, updatedTask);
  };

  // Start Task
  const handleStartTask = async (task: TaskRecord) => {
    const updatedTask: TaskRecord = {
      ...task,
      status: 'IN_PROGRESS',
      updatedAt: Date.now()
    };
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    await FirestoreService.saveTask(companyId, updatedTask);
  };

  // File selection for proof
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit proof / complete
  const handleSubmitTaskProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskForAction) return;

    try {
      setUploading(true);
      let photoUrl = activeTaskForAction.photoUrl || '';

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop() || 'jpg';
        const storagePath = `companies/${companyId}/task-proofs/${activeTaskForAction.id}_${Date.now()}.${fileExt}`;
        photoUrl = await StorageService.uploadFile(storagePath, selectedFile);
      }

      const updatedNotes = actionNotes.trim() 
        ? (activeTaskForAction.completionNotes ? `${activeTaskForAction.completionNotes}\n[Guard Note]: ${actionNotes}` : actionNotes)
        : activeTaskForAction.completionNotes;

      const updatedTask: TaskRecord = {
        ...activeTaskForAction,
        photoUrl: photoUrl || undefined,
        completionNotes: updatedNotes,
        status: 'PENDING_VERIFICATION',
        updatedAt: Date.now()
      };

      await FirestoreService.saveTask(companyId, updatedTask);
      setTasks(prev => prev.map(t => t.id === activeTaskForAction.id ? updatedTask : t));

      // Reset modal
      setActiveTaskForAction(null);
      setSelectedFile(null);
      setFilePreview(null);
      setActionNotes('');
      showSuccess(`✓ Task completion proof submitted for "${activeTaskForAction.title}"! Status: Pending Verification`);
    } catch (err: any) {
      console.error('Error submitting proof:', err);
      handleError(err, '✕ Failed to submit proof');
    } finally {
      setUploading(false);
    }
  };

  // Filtered tasks by tab
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (activeTab === 'ACTIVE') {
        return t.status === 'TODO' || t.status === 'IN_PROGRESS';
      }
      if (activeTab === 'PENDING_REVIEW') {
        return t.status === 'PENDING_VERIFICATION' || t.status === 'IN_REVIEW';
      }
      if (activeTab === 'COMPLETED') {
        return t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'RESOLVED';
      }
      return true;
    });
  }, [tasks, activeTab]);

  const activeCount = tasks.filter(t => t.status === 'TODO' || t.status === 'IN_PROGRESS').length;
  const reviewCount = tasks.filter(t => t.status === 'PENDING_VERIFICATION' || t.status === 'IN_REVIEW').length;
  const completedCount = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'RESOLVED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading Assigned Tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 max-w-4xl mx-auto space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
            <ListChecks className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Assigned Work Orders</h1>
            <p className="text-xs text-slate-500">Field task execution, checklist verification & photo submission</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative ${
            activeTab === 'ACTIVE'
              ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Active Tasks ({activeCount})
        </button>

        <button
          onClick={() => setActiveTab('PENDING_REVIEW')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative ${
            activeTab === 'PENDING_REVIEW'
              ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Under Verification ({reviewCount})
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative ${
            activeTab === 'COMPLETED'
              ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Completed Archive ({completedCount})
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map(task => {
          const slaBadge = getSlaBadge(task.slaDeadline, task.status);

          return (
            <div
              key={task.id}
              className={`p-5 rounded-xl border transition-all ${
                isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                      task.priority === 'URGENT' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                      task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                      {task.priority || 'MEDIUM'}
                    </span>

                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                      task.status === 'COMPLETED' || task.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      task.status === 'PENDING_VERIFICATION' ? 'bg-amber-100 text-amber-700' :
                      task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {task.status}
                    </span>

                    {slaBadge}
                  </div>

                  <h3 className="font-bold text-base mt-2">{task.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{task.description}</p>
                </div>

                <div className="text-right text-[11px] text-slate-400 font-mono">
                  {new Date(task.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Checklist Interactivity */}
              {task.checklist && task.checklist.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <div className="text-xs font-bold mb-2 flex items-center justify-between">
                    <span>Task Checklist Points:</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {task.checklist.filter(c => c.done).length} / {task.checklist.length} Completed
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {task.checklist.map((item, idx) => (
                      <label 
                        key={idx}
                        className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          item.done 
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-400 line-through' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => handleToggleChecklistItem(task, idx)}
                          disabled={task.status === 'COMPLETED' || task.status === 'APPROVED'}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        />
                        <span>{item.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo Proof Display if Present */}
              {task.photoUrl && (
                <div className="mt-4 pt-3 border-t">
                  <div className="text-xs font-bold mb-2 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <Camera className="w-3.5 h-3.5" /> Attached Field Verification Photo:
                  </div>
                  <img 
                    src={task.photoUrl} 
                    alt="Task Proof" 
                    className="max-h-48 rounded-lg border object-cover bg-black/20" 
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Site: <span className="font-semibold text-slate-700 dark:text-slate-300">{task.siteName || task.siteId || 'Assigned HQ'}</span>
                </div>

                <div className="flex items-center gap-2">
                  {task.status === 'TODO' && (
                    <button
                      onClick={() => handleStartTask(task)}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
                    >
                      <Clock className="w-3.5 h-3.5" /> Start Task
                    </button>
                  )}

                  {task.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => {
                        setActiveTaskForAction(task);
                        setActionNotes(task.completionNotes || '');
                        setSelectedFile(null);
                        setFilePreview(null);
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5" /> Submit Proof & Complete
                    </button>
                  )}

                  {task.status === 'PENDING_VERIFICATION' && (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                      Awaiting Supervisor Approval
                    </span>
                  )}

                  {(task.status === 'COMPLETED' || task.status === 'APPROVED') && (
                    <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified & Closed
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className={`text-center py-16 px-4 rounded-xl border border-dashed ${
            isDark ? 'bg-slate-800/40 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-300 text-slate-500'
          }`}>
            <CheckCircle2 className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
            <h3 className="text-base font-bold">No Tasks in this Tab</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              You are all caught up! When a supervisor or site manager assigns a task to you, it will appear here.
            </p>
          </div>
        )}
      </div>

      {/* PROOF UPLOAD & COMPLETION MODAL */}
      {activeTaskForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Submit Work Order Proof</h3>
                  <p className="text-xs text-slate-500">{activeTaskForAction.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTaskForAction(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTaskProof} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Completion Notes / Field Observations *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the actions taken, meter readings, or verification notes..."
                  value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Attach Photo Proof (Camera / File):</label>
                <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  isDark ? 'border-slate-700 hover:border-indigo-500 bg-slate-800/50' : 'border-slate-300 hover:border-indigo-500 bg-slate-50'
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    id="task-proof-input"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="task-proof-input" className="cursor-pointer block">
                    {filePreview ? (
                      <div className="space-y-2">
                        <img 
                          src={filePreview} 
                          alt="Preview" 
                          className="max-h-40 mx-auto rounded-lg object-contain" 
                        />
                        <p className="text-[11px] text-indigo-600 font-medium">Click to change photo</p>
                      </div>
                    ) : (
                      <div className="space-y-2 py-2">
                        <Camera className="w-8 h-8 mx-auto text-slate-400" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tap to Take Photo or Choose File</p>
                        <p className="text-[10px] text-slate-400">JPEG, PNG up to 10MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setActiveTaskForAction(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploading ? 'Uploading Proof...' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

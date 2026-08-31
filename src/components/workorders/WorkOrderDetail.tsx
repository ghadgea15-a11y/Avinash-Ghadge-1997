import React, { useState } from 'react';
import { UserSession, WorkOrderRecord, WorkOrderStatus } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { X, CheckCircle2, Play, Pause, FileText, Send, ArrowLeft, Clock, AlertCircle } from 'lucide-react';

interface WorkOrderDetailProps {
  workOrder: WorkOrderRecord;
  companyId: string;
  userSession: UserSession;
  onClose: () => void;
}

export function WorkOrderDetail({ workOrder, companyId, userSession, onClose }: WorkOrderDetailProps) {
  const [loading, setLoading] = useState(false);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  const handleUpdateStatus = async (status: WorkOrderStatus) => {
    setLoading(true);
    try {
      await FirestoreService.updateWorkOrderStatus(workOrder.id, companyId, status);
      
      // Integration with Maintenance Module
      if (workOrder.id.startsWith('WO_MNT_')) {
        const { MaintenanceService } = await import('../../services/maintenanceService');
        await (MaintenanceService as any).updateWorkOrder(companyId, { ...workOrder, status }, {
          id: userSession.employeeId || userSession.userId,
          name: userSession.fullName || 'User'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'DRAFT': return 'bg-slate-100 text-slate-900';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-700';
      case 'APPROVED': return 'bg-indigo-100 text-indigo-700';
      case 'DISPATCHED': return 'bg-purple-100 text-purple-700';
      case 'ACCEPTED': return 'bg-cyan-100 text-cyan-700';
      case 'IN_PROGRESS': return 'bg-amber-100 text-amber-700';
      case 'PAUSED': return 'bg-orange-100 text-orange-700';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'VERIFIED': return 'bg-teal-100 text-teal-700';
      case 'CLOSED': return 'bg-gray-100 text-gray-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      case 'REJECTED': return 'bg-rose-100 text-rose-700';
      case 'OVERDUE': return 'bg-red-100 text-red-700 font-bold';
      default: return 'bg-slate-100 text-slate-900';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-black dark:text-white">{workOrder.title}</h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(workOrder.status)}`}>
              {workOrder.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mt-1">
            <span>ID: {workOrder.id}</span>
            <span>Created: {formatDate(workOrder.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-black dark:text-white mb-4">Details</h3>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 dark:text-slate-300">
              <p>{workOrder.description || 'No description provided.'}</p>
            </div>
          </div>

          {workOrder.checklist && workOrder.checklist.length > 0 && (
            <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-bold text-black dark:text-white mb-4">Execution Checklist</h3>
              <div className="space-y-3">
                {workOrder.checklist.map((chk: any) => (
                  <div key={chk.id} className="flex items-start gap-3">
                    <CheckCircle2 className={`w-5 h-5 mt-0.5 ${chk.isCompleted ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
                    <div>
                      <p className={`text-black dark:text-white ${chk.isCompleted ? 'line-through opacity-70' : ''}`}>
                        {chk.text}
                      </p>
                      {chk.isRequired && (
                        <span className="text-xs text-red-500 font-medium">Required</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-black dark:text-white mb-4">Actions</h3>
            <div className="space-y-3">
              {workOrder.status === 'DRAFT' && (
                <button 
                  onClick={() => handleUpdateStatus('DISPATCHED')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Send className="w-4 h-4" /> Dispatch Order
                </button>
              )}
              {workOrder.status === 'DISPATCHED' && (
                <button 
                  onClick={() => handleUpdateStatus('ACCEPTED')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" /> Accept Order
                </button>
              )}
              {workOrder.status === 'ACCEPTED' && (
                <button 
                  onClick={() => handleUpdateStatus('IN_PROGRESS')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Play className="w-4 h-4" /> Start Work
                </button>
              )}
              {workOrder.status === 'IN_PROGRESS' && (
                <>
                  <button 
                    onClick={() => handleUpdateStatus('PAUSED')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors mb-2"
                  >
                    <Pause className="w-4 h-4" /> Pause Work
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus('COMPLETED')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark Completed
                  </button>
                </>
              )}
              {workOrder.status === 'PAUSED' && (
                <button 
                  onClick={() => handleUpdateStatus('IN_PROGRESS')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Play className="w-4 h-4" /> Resume Work
                </button>
              )}
              {workOrder.status === 'COMPLETED' && (
                <button 
                  onClick={() => handleUpdateStatus('VERIFIED')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" /> Verify & Close
                </button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Metadata</h3>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-400 block">Category</span>
                <span className="text-sm font-medium text-black dark:text-white">{workOrder.category}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Priority</span>
                <span className="text-sm font-medium text-black dark:text-white flex items-center gap-1.5 mt-1">
                  {workOrder.priority === 'CRITICAL' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {workOrder.priority}
                </span>
              </div>
              {workOrder.assignedTo && (
                <div>
                  <span className="text-xs text-slate-400 block">Assigned To</span>
                  <span className="text-sm font-medium text-black dark:text-white">{workOrder.assignedTo}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

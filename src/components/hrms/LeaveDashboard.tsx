// @ts-nocheck
import React from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  Plus
} from 'lucide-react';
import { LeaveRequestRecord, LeaveBalanceRecord, LeaveStatus } from '../../types';
import { LeaveService } from '../../services/leaveService';

interface LeaveDashboardProps {
  balance: LeaveBalanceRecord | null;
  myRequests: LeaveRequestRecord[];
  onApplyLeave: () => void;
  onCancelRequest: (req: LeaveRequestRecord) => void;
  isLoading: boolean;
}

export const LeaveDashboard: React.FC<LeaveDashboardProps> = ({
  balance,
  myRequests,
  onApplyLeave,
  onCancelRequest,
  isLoading
}) => {
  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider">Approved</span>;
      case 'PENDING_APPROVAL':
      case 'SUBMITTED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800 uppercase tracking-wider">Pending</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800 uppercase tracking-wider">Rejected</span>;
      case 'CANCELLED':
      case 'WITHDRAWN':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700 uppercase tracking-wider">Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {balance?.balances.map((b) => (
          <div key={b.leaveCode} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{b.leaveName}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {LeaveService.calculateAvailableBalance(b)}
                </span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Days</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>Used: {b.used}</span>
                <span>Pending: {b.pending}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (b.used / (b.openingBalance + b.accrued)) * 100)}%` }} 
                />
              </div>
            </div>
          </div>
        ))}

        {!balance?.balances.length && !isLoading && (
          <div className="col-span-full p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-500">No leave entitlements found for the current year.</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Recent Applications
        </h3>
        <button
          onClick={onApplyLeave}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Apply New Leave
        </button>
      </div>

      {/* Request History */}
      <div className="space-y-3">
        {myRequests.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h4 className="text-base font-black text-slate-800 dark:text-white">No Leave History</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Your leave applications and their status will appear here once you submit them.</p>
          </div>
        ) : (
          myRequests.slice(0, 10).map((req) => (
            <div key={req.id} className="group p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(req.startDate).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{new Date(req.startDate).getDate()}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">{req.leaveTypeName}</h4>
                      {getStatusBadge(req.status)}
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {req.startDate} to {req.endDate} • {req.daysCount} {req.isHalfDay ? 'Half Day' : req.daysCount === 1 ? 'Day' : 'Days'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                      {req.status === 'APPROVED' ? 'Finalized' : req.status === 'REJECTED' ? 'Rejected' : 'In Review'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
              
              {req.reason && (
                <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                  <p className="text-[11px] text-slate-500 italic">"{req.reason}"</p>
                </div>
              )}

              {(req.status === 'SUBMITTED' || req.status === 'PENDING_APPROVAL') && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => onCancelRequest(req)}
                    className="text-[10px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 transition"
                  >
                    Withdraw Application
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

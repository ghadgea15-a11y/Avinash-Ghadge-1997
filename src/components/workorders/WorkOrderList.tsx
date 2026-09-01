import React, { useState, useMemo } from 'react';
import { WorkOrderRecord, WorkOrderStatus, WorkOrderPriority } from '../../types';
import { Search, Filter, AlertCircle, Clock, CheckCircle2, ChevronRight, FileText, Calendar, User, Tag, ShieldAlert } from 'lucide-react';

interface WorkOrderListProps {
  workOrders: WorkOrderRecord[];
  onSelect: (order: WorkOrderRecord) => void;
}

export function WorkOrderList({ workOrders, onSelect }: WorkOrderListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const filteredOrders = useMemo(() => {
    return workOrders.filter(order => {
      const matchesSearch = 
        (order.title && order.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.id && order.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.category && order.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.assignedTo && order.assignedTo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.siteId && order.siteId.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || order.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [workOrders, searchTerm, statusFilter, priorityFilter]);

  const getStatusBadge = (status: WorkOrderStatus) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-300 border-slate-300 dark:border-slate-700';
      case 'SUBMITTED':
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'APPROVED':
        return 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'DISPATCHED':
        return 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'ACCEPTED':
        return 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      case 'IN_PROGRESS':
        return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'PAUSED':
        return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'COMPLETED':
        return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'VERIFIED':
        return 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'OVERDUE':
        return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700 font-semibold';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  const getPriorityBadge = (priority: WorkOrderPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900';
      case 'HIGH':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900';
      case 'MEDIUM':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900';
      case 'LOW':
        return 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, ID, category, or assignee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter work orders by status"
            className="px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-300 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
            <option value="VERIFIED">Verified</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter work orders by priority"
            className="px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-300 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Orders List / Table */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-full text-slate-400 mb-3">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-black dark:text-white">No Work Orders Found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              {searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter filters.'
                : 'Get started by creating your first operational work order.'}
            </p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const completedChecklists = order.checklist ? order.checklist.filter((c: any) => c.isCompleted).length : 0;
            const totalChecklists = order.checklist ? order.checklist.length : 0;

            return (
              <div
                key={order.id}
                onClick={() => onSelect(order)}
                className="p-4 sm:p-5 hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-700/40 cursor-pointer transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                      {order.id}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityBadge(order.priority)}`}>
                      {order.priority}
                    </span>
                    {order.isSafetyHalted && (
                      <span className="px-2 py-0.5 text-xs font-black bg-rose-600 text-white rounded-full flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> SAFETY HOLD
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-semibold text-black dark:text-white truncate">
                    {order.title}
                  </h3>

                  {order.description && (
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                      {order.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    {order.category && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        {order.category}
                      </span>
                    )}

                    {order.assignedTo && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {order.assignedTo}
                      </span>
                    )}

                    {totalChecklists > 0 && (
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {completedChecklists}/{totalChecklists} Tasks
                      </span>
                    )}

                    {order.createdAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(order.createdAt)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

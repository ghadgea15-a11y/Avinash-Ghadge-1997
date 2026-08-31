import React, { useState, useEffect, useMemo } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  CompanyTenant, 
  UserSession, 
  PhaseAScreen, 
  TaskRecord, 
  EmployeeRecord, 
  SiteRecord,
  DepartmentRecord 
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';
import { 
  Plus, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Search, 
  UserCheck, 
  Building2, 
  Check, 
  X, 
  Eye, 
  Camera, 
  ListChecks, 
  Download,
  FileCheck2
} from 'lucide-react';

interface Props {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const TaskManagementScreen: React.FC<Props> = ({ userSession, company, onNavigate }) => {
  const { isDark } = useTheme();
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError, confirm } = useFeedback();
  const companyId = company.companyId || userSession.companyId;

  // RBAC Helper
  const canManageTasks = useMemo(() => {
    const role = userSession.role;
    const authLevel = userSession.authorityLevel;
    
    // Super Admins always can
    if (role === 'SUPER_ADMIN') return true;
    
    // A0 to A6 can manage tasks
    const authorizedLevels = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE', 'A6_SUPERVISOR'];
    if (authLevel && authorizedLevels.includes(authLevel)) return true;
    
    // Legacy Role Check
    const authorizedRoles = ['COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'FIELD_OFFICER', 'SUPERVISOR'];
    if (role && authorizedRoles.includes(role)) return true;
    
    return false;
  }, [userSession]);

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING_REVIEW' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'>('ALL');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  useBackNavigation(!!showCreateModal, () => setShowCreateModal(null as any), 'showCreateModal');
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<TaskRecord | null>(null);
  useBackNavigation(!!selectedTaskForReview, () => setSelectedTaskForReview(null as any), 'selectedTaskForReview');
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

  // New Task Form State
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    assignedTo: string;
    siteId: string;
    departmentTag: string;
    priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
    slaDeadline: string;
    checklistItems: string[];
  }>({
    title: '',
    description: '',
    assignedTo: '',
    siteId: userSession.assignedSiteId || '',
    departmentTag: 'DEPT-OPS',
    priority: 'MEDIUM',
    slaDeadline: '',
    checklistItems: ['']
  });

  useEffect(() => {
    const unsubTasks = FirestoreService.subscribeToTasks(userSession, companyId, setTasks);
    const unsubEmp = FirestoreService.subscribeToEmployees(userSession, companyId, setEmployees);
    const unsubSites = FirestoreService.subscribeToSites(companyId, setSites);
    FirestoreService.getCompanyDepartments(companyId).then(setDepartments);

    const timer = setTimeout(() => setLoading(false), 700);
    return () => {
      unsubTasks();
      unsubEmp();
      unsubSites();
      clearTimeout(timer);
    };
  }, [userSession, companyId]);

  // SLA Evaluation Helper
  const getSlaStatus = (slaDeadline?: string, status?: TaskRecord['status']) => {
    if (!slaDeadline || status === 'COMPLETED' || status === 'RESOLVED' || status === 'CANCELLED') {
      return { label: status === 'COMPLETED' ? 'Completed' : 'No SLA', color: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-300', isBreached: false };
    }
    const deadlineMs = new Date(slaDeadline).getTime();
    const diffHours = (deadlineMs - Date.now()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return { label: 'SLA BREACHED', color: 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse font-bold', isBreached: true };
    }
    if (diffHours <= 4) {
      return { label: `SLA DUE (<${Math.ceil(diffHours)}h)`, color: 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 font-semibold', isBreached: false };
    }
    return { label: `SLA On Track (${Math.ceil(diffHours)}h left)`, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', isBreached: false };
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'TODO').length;
    const pendingReview = tasks.filter(t => t.status === 'PENDING_VERIFICATION' || t.status === 'IN_REVIEW').length;
    const completed = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'RESOLVED').length;
    const overdue = tasks.filter(t => {
      if (t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'CANCELLED') return false;
      return t.slaDeadline && new Date(t.slaDeadline).getTime() < Date.now();
    }).length;
    return { total, inProgress, pendingReview, completed, overdue };
  }, [tasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // Tab filter
      if (activeTab === 'PENDING_REVIEW' && t.status !== 'PENDING_VERIFICATION' && t.status !== 'IN_REVIEW') return false;
      if (activeTab === 'IN_PROGRESS' && t.status !== 'IN_PROGRESS' && t.status !== 'TODO') return false;
      if (activeTab === 'COMPLETED' && t.status !== 'COMPLETED' && t.status !== 'APPROVED' && t.status !== 'RESOLVED') return false;
      if (activeTab === 'OVERDUE') {
        if (t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'CANCELLED') return false;
        if (!t.slaDeadline || new Date(t.slaDeadline).getTime() >= Date.now()) return false;
      }

      // Site filter
      if (siteFilter !== 'ALL' && t.siteId !== siteFilter) return false;
      // Priority filter
      if (priorityFilter !== 'ALL' && (t.priority || 'MEDIUM') !== priorityFilter) return false;
      // Assignee filter
      if (assigneeFilter !== 'ALL' && t.assignedTo !== assigneeFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (t.title || '').toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const assigneeMatch = (t.assignedToName || '').toLowerCase().includes(q) ||
          employees.some(e => e.id === t.assignedTo && (`${e.firstName} ${e.lastName}`).toLowerCase().includes(q));
        const siteMatch = (t || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !assigneeMatch && !siteMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [tasks, activeTab, siteFilter, priorityFilter, assigneeFilter, searchQuery, employees]);

  // Create Task Handler
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !newTask.assignedTo) {
      showValidationFailed('Please provide task title and select an assignee.');
      return;
    }

    const dismiss = showLoading('Dispatching new operational task...');
    try {
      setActionProcessing(true);
      const assignedEmp = employees.find(e => e.id === newTask.assignedTo);
      const selectedSite = sites.find(s => s.id === newTask.siteId);

      const taskId = `TSK-${Date.now()}`;
      const taskRecord: TaskRecord = {
        id: taskId,
        companyId,
        siteId: newTask.siteId || userSession.assignedSiteId || '',
        siteName: selectedSite ? (selectedSite.name || selectedSite.siteName || '') : '',
        departmentTag: newTask.departmentTag,
        assignedTo: newTask.assignedTo,
        assignedToName: assignedEmp ? `${assignedEmp.firstName} ${assignedEmp.lastName}` : newTask.assignedTo,
        createdBy: userSession.employeeId || userSession.userId || 'admin',
        createdByName: userSession.fullName || userSession.email || 'Supervisor',
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        priority: newTask.priority,
        slaDeadline: newTask.slaDeadline ? new Date(newTask.slaDeadline).toISOString() : undefined,
        checklist: newTask.checklistItems.filter((i: any) => i.trim().length > 0).map((item: any, idx: number) => ({
          id: `item-${idx}`,
          text: item.trim(),
          done: false
        })),
        status: 'TODO',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await FirestoreService.saveTask(companyId, taskRecord);
      dismiss();

      // Reset form
      setNewTask({
        title: '',
        description: '',
        assignedTo: '',
        siteId: userSession.assignedSiteId || '',
        departmentTag: 'DEPT-OPS',
        priority: 'MEDIUM',
        slaDeadline: '',
        checklistItems: ['']
      });
      setShowCreateModal(false);
      showSuccess(`✓ Operational task "${taskRecord.title}" dispatched successfully!`);
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to dispatch task');
    } finally {
      setActionProcessing(false);
    }
  };

  // Review & Approve / Reject Task
  const handleApproveTask = async (task: TaskRecord) => {
    const dismiss = showLoading('Approving task completion...');
    try {
      setActionProcessing(true);
      await FirestoreService.updateTaskStatus(companyId, task.id, 'COMPLETED', {
        completionNotes: reviewNotes ? `${task.completionNotes || ''}\n[Reviewer Approval]: ${reviewNotes}`.trim() : task.completionNotes
      });
      dismiss();
      setSelectedTaskForReview(null);
      setReviewNotes('');
      showSuccess(`✓ Task "${task.title}" approved and marked COMPLETED!`);
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to approve task');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleRequestRevision = async (task: TaskRecord) => {
    if (!reviewNotes.trim()) {
      showValidationFailed('Please specify what needs revision in the feedback notes.');
      return;
    }
    const dismiss = showLoading('Submitting revision request...');
    try {
      setActionProcessing(true);
      await FirestoreService.updateTaskStatus(companyId, task.id, 'IN_PROGRESS', {
        completionNotes: `${task.completionNotes || ''}\n[Revision Requested]: ${reviewNotes}`.trim()
      });
      dismiss();
      setSelectedTaskForReview(null);
      setReviewNotes('');
      showSuccess(`✓ Revision requested for task "${task.title}"`);
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to request revision');
    } finally {
      setActionProcessing(false);
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    if (filteredTasks.length === 0) {
      showValidationFailed('No tasks to export.');
      return;
    }

    const dismiss = showLoading('Generating tasks export...');
    try {
      // Module 10.4: Export Governance Evaluation
      await BulkExportGovernanceService.evaluateAndRecordExport({
        session: userSession,
        companyId: company.companyId,
        module: 'OPERATIONS_TASKS',
        entityType: 'TASK',
        exportFormat: 'CSV',
        dataClassification: 'GENERAL_OPERATIONAL',
        recordCount: filteredTasks.length,
        exportName: `tasks_export_${company.companyId}.csv`
      });

      const headers = ['Task ID', 'Title', 'Priority', 'Status', 'Assignee', 'Site', 'Deadline', 'Created At'];
      const rows = filteredTasks.map(t => [
        t.id,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.priority,
        t.status,
        `"${(t.assignedToName || '').replace(/"/g, '""')}"`,
        `"${(t || '').replace(/"/g, '""')}"`,
        t.slaDeadline || '',
        new Date(t.createdAt).toISOString()
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `tasks_export_${company.companyId}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      dismiss();
      showSuccess('✓ Tasks CSV export generated and downloaded.');
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Export Failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading Task Operations Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 ${isDark ? 'text-slate-100' : 'text-black'}`}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <ListChecks className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Task Allocation & Verification</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">A6 Operational Work Orders, SLA Enforcement & Photo Proof Audit</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center gap-2 transition-colors ${
              isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-white'
            }`}
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>

          {canManageTasks && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 shadow-sm shadow-indigo-200"
            >
              <Plus className="w-4 h-4" /> Assign New Task
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div 
          onClick={() => setActiveTab('ALL')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'ALL' ? 'ring-2 ring-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30' : isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Work Orders</div>
          <div className="text-2xl font-black mt-1 text-indigo-600">{kpis.total}</div>
          <div className="text-[11px] text-slate-400 mt-1">Across all sites</div>
        </div>

        <div 
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'IN_PROGRESS' ? 'ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/30' : isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Active / In Progress</div>
          <div className="text-2xl font-black mt-1 text-blue-600">{kpis.inProgress}</div>
          <div className="text-[11px] text-slate-400 mt-1">Ongoing field action</div>
        </div>

        <div 
          onClick={() => setActiveTab('PENDING_REVIEW')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'PENDING_REVIEW' ? 'ring-2 ring-amber-500 bg-amber-50/40 dark:bg-amber-950/30' : isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Proof Review</div>
            {kpis.pendingReview > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />}
          </div>
          <div className="text-2xl font-black mt-1 text-amber-600">{kpis.pendingReview}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">Requires Supervisor Sign-off</div>
        </div>

        <div 
          onClick={() => setActiveTab('COMPLETED')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'COMPLETED' ? 'ring-2 ring-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30' : isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed</div>
          <div className="text-2xl font-black mt-1 text-emerald-600">{kpis.completed}</div>
          <div className="text-[11px] text-slate-400 mt-1">Approved & closed</div>
        </div>

        <div 
          onClick={() => setActiveTab('OVERDUE')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'OVERDUE' ? 'ring-2 ring-rose-500 bg-rose-50/40 dark:bg-rose-950/30' : isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">SLA Breached / Overdue</div>
          <div className="text-2xl font-black mt-1 text-rose-600">{kpis.overdue}</div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">Escalation critical</div>
        </div>
      </div>

      {/* Search & Filter Toolbars */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row gap-3 items-center justify-between ${
        isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search work orders or assignees..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border outline-none ${
              isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Site Filter */}
          <select
            value={siteFilter}
            onChange={e => setSiteFilter(e.target.value)}
            className={`px-3 py-2 text-xs rounded-lg border outline-none ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <option value="ALL">All Sites</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name || s.siteName || s.id}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className={`px-3 py-2 text-xs rounded-lg border outline-none ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className={`px-3 py-2 text-xs rounded-lg border outline-none max-w-[160px] truncate ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <option value="ALL">All Assignees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map(task => {
          const sla = getSlaStatus(task.slaDeadline, task.status);
          const assignee = employees.find(e => e.id === task.assignedTo);
          const assigneeName = task.assignedToName || (assignee ? `${assignee.firstName} ${assignee.lastName}` : task.assignedTo);

          return (
            <div
              key={task.id}
              className={`p-5 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md ${
                task.status === 'PENDING_VERIFICATION'
                  ? 'border-amber-300 bg-amber-50/20 dark:bg-amber-950/20 dark:border-amber-800/60'
                  : isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <div className="space-y-3">
                {/* Header tags */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Priority Badge */}
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                      task.priority === 'URGENT' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                      task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                      task.priority === 'LOW' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                      {task.priority || 'MEDIUM'}
                    </span>

                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                      task.status === 'COMPLETED' || task.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                      task.status === 'PENDING_VERIFICATION' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold' :
                      task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                      'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Title & Desc */}
                <div>
                  <h3 className="font-bold text-base line-clamp-1">{task.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{task.description}</p>
                </div>

                {/* Metadata Row */}
                <div className="space-y-1.5 pt-2 border-t text-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      Assignee:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-300">{assigneeName}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Site:
                    </span>
                    <span className="font-medium truncate max-w-[150px]">{task.siteName || task.siteId || 'HQ'}</span>
                  </div>

                  {/* SLA Badge */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      SLA:
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${sla.color}`}>
                      {sla.label}
                    </span>
                  </div>

                  {/* Checklist summary */}
                  {task.checklist && task.checklist.length > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Checklist:</span>
                      <span>
                        {task.checklist.filter((c: any) => c.done).length} / {task.checklist.length} done
                      </span>
                    </div>
                  )}

                  {/* Photo Proof Preview Thumbnail */}
                  {task.photoUrl && (
                    <div className="pt-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        <Camera className="w-3.5 h-3.5" /> Uploaded Proof Attached
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2">
                {(task.status === 'PENDING_VERIFICATION' || task.status === 'IN_REVIEW') && canManageTasks ? (
                  <button
                    onClick={() => {
                      setSelectedTaskForReview(task);
                      setReviewNotes('');
                    }}
                    className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" /> Audit Proof & Sign Off
                  </button>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    {(task.status === 'TODO' || task.status === 'PENDING') && (task.assignedTo === userSession.employeeId) && (
                      <button
                        onClick={() => FirestoreService.updateTaskStatus(task.id, companyId, 'IN_PROGRESS')}
                        className="flex-1 py-1.5 px-2 text-xs font-semibold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200 text-center"
                      >
                        Start
                      </button>
                    )}

                    {(task.status === 'IN_PROGRESS' || task.status === 'TODO' || task.status === 'PENDING') && (task.assignedTo === userSession.employeeId) && (
                      <button
                        onClick={() => FirestoreService.updateTaskStatus(task.id, companyId, 'PENDING_VERIFICATION')}
                        className="flex-1 py-1.5 px-2 text-xs font-semibold rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 text-center"
                      >
                        Submit Proof
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedTaskForReview(task);
                        setReviewNotes('');
                      }}
                      className="py-1.5 px-2 text-xs font-medium rounded border hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-300"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className={`text-center py-16 px-4 rounded-xl border border-dashed ${
          isDark ? 'bg-slate-800/40 border-slate-700 text-slate-400' : 'bg-white border-slate-300 text-slate-500'
        }`}>
          <ListChecks className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
          <h3 className="text-base font-bold">No Work Orders Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            There are no tasks matching the selected filters. Click "Assign New Task" above to dispatch work to guards or supervisors.
          </p>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-black'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Dispatch Operational Task</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Allocate work order with SLA deadline & inspection checklist</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Task Title / Work Order Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inspect Perimeter Gate 3 Sensor Alignment"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Detailed Instructions / Description</label>
                <textarea
                  rows={3}
                  placeholder="Specific requirements, safety protocols, or notes for the field officer..."
                  value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Assignee (Officer / Guard) *</label>
                  <select
                    required
                    value={newTask.assignedTo}
                    onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="">-- Select Field Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId || emp.designation || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Deployment Site</label>
                  <select
                    value={newTask.siteId}
                    onChange={e => setNewTask({ ...newTask, siteId: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="">-- Select Site --</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name || s.siteName || s.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Priority Level</label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">SLA Target Resolution Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newTask.slaDeadline}
                    onChange={e => setNewTask({ ...newTask, slaDeadline: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Checklist Items */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold">Verification Checklist Points</label>
                  <button
                    type="button"
                    onClick={() => setNewTask({ ...newTask, checklistItems: [...newTask.checklistItems, ''] })}
                    className="text-[11px] text-indigo-600 font-bold hover:underline"
                  >
                    + Add Step
                  </button>
                </div>
                <div className="space-y-2">
                  {newTask.checklistItems.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-xs">{idx + 1}.</span>
                      <input
                        type="text"
                        placeholder="e.g. Check battery backup volt meter"
                        value={item}
                        onChange={e => {
                          const updated = [...newTask.checklistItems];
                          updated[idx] = e.target.value;
                          setNewTask({ ...newTask, checklistItems: updated });
                        }}
                        className={`flex-1 p-2 rounded border outline-none ${
                          isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                        }`}
                      />
                      {newTask.checklistItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = newTask.checklistItems.filter((_, i) => i !== idx);
                            setNewTask({ ...newTask, checklistItems: updated });
                          }}
                          className="text-rose-500 hover:bg-rose-50 p-1 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionProcessing ? 'Dispatching...' : 'Dispatch Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROOF REVIEW & AUDIT MODAL */}
      {selectedTaskForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-black'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Task Audit & Sign-Off</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Review field completion proof and approve work order</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTaskForReview(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              {/* Task Summary Card */}
              <div className={`p-4 rounded-xl border space-y-2 ${
                isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{selectedTaskForReview.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    {selectedTaskForReview.status}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">{selectedTaskForReview.description}</p>
                <div className="grid grid-cols-2 gap-2 text-slate-500 dark:text-slate-400 pt-2 border-t">
                  <div><strong>Assignee:</strong> {selectedTaskForReview.assignedToName || selectedTaskForReview.assignedTo}</div>
                  <div><strong>Site:</strong> {selectedTaskForReview.siteName || selectedTaskForReview.siteId || 'HQ'}</div>
                </div>
              </div>

              {/* Uploaded Photo Proof */}
              <div>
                <label className="block font-bold mb-2 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-600" /> Uploaded Field Photo Evidence:
                </label>
                {selectedTaskForReview.photoUrl ? (
                  <div className="rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
                    <img 
                      src={selectedTaskForReview.photoUrl} 
                      alt="Field Proof" 
                      className="w-full max-h-72 object-contain bg-black/40"
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-center">
                    No photo proof was attached to this task.
                  </div>
                )}
              </div>

              {/* Completion Notes from Guard */}
              {selectedTaskForReview.completionNotes && (
                <div>
                  <label className="block font-bold mb-1">Field Guard Remarks & Log:</label>
                  <div className={`p-3 rounded-lg border whitespace-pre-wrap ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}>
                    {selectedTaskForReview.completionNotes}
                  </div>
                </div>
              )}

              {/* Checklist Completion Status */}
              {selectedTaskForReview.checklist && selectedTaskForReview.checklist.length > 0 && (
                <div>
                  <label className="block font-bold mb-2">Checklist Verification Status:</label>
                  <div className="space-y-1.5">
                    {selectedTaskForReview.checklist.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className={`w-4 h-4 ${item.done ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span className={item.done ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-300'}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviewer Feedback Input */}
              <div>
                <label className="block font-semibold mb-1">Supervisor Review Feedback / Sign-off Remarks:</label>
                <textarea
                  rows={2}
                  placeholder="Enter audit notes or revision requirements..."
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => handleRequestRevision(selectedTaskForReview)}
                  disabled={actionProcessing}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
                >
                  Request Revision / Reject
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTaskForReview(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveTask(selectedTaskForReview)}
                    disabled={actionProcessing}
                    className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Approve & Mark Complete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Users, Building, Shield, Clock, AlertTriangle, Truck, UserCheck, HardDrive, Package, CheckSquare, AlertCircle, ClipboardList } from 'lucide-react';
import { 
  CompanyTenant, UserSession, PhaseAScreen, EmployeeRecord, 
  AttendanceLogRecord, IncidentReportRecord, VisitorLogRecord, 
  MaterialMovementRecord, AssetRecord, InventoryItemRecord, PatrolLogRecord, TaskRecord, DailySiteLogRecord
} from '../../../types';
import { FirestoreService } from '../../../services/firestoreService';
import { RbacService } from '../../../services/rbacService';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SiteInChargeDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLogRecord[]>([]);
  const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);
  const [visitors, setVisitors] = useState<VisitorLogRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialMovementRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItemRecord[]>([]);
  const [patrols, setPatrols] = useState<PatrolLogRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailySiteLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userSession.assignedSiteId) {
      setLoading(false);
      return;
    }

    const siteId = userSession.assignedSiteId;
    
    const unsubs = [
      FirestoreService.subscribeToEmployees(userSession, company.companyId, (data) => setEmployees(data.filter(e => e.assignedSiteId === siteId))),
      FirestoreService.subscribeToAttendanceLogs(userSession, company.companyId, (data) => setAttendance(data.filter(a => a.siteId === siteId))),
      FirestoreService.subscribeToIncidentReports(userSession, company.companyId, (data) => setIncidents(data.filter(i => i.siteId === siteId))),
      FirestoreService.subscribeToVisitorLogs(userSession, company.companyId, (data) => setVisitors(data.filter(v => v.siteId === siteId))),
      FirestoreService.subscribeToMaterialLogs(userSession, company.companyId, (data) => setMaterials(data.filter(m => m.siteId === siteId))),
      FirestoreService.subscribeToAssets(userSession, company.companyId, (data) => setAssets(data.filter(a => a.siteId === siteId))),
      FirestoreService.subscribeToInventoryItems(userSession, company.companyId, (data) => setInventory(data.filter(i => i.siteId === siteId))),
      FirestoreService.subscribeToPatrolLogs(userSession, company.companyId, (data) => setPatrols(data.filter(p => p.siteId === siteId))),
      FirestoreService.subscribeToTasks(userSession, company.companyId, (data) => setTasks(data.filter(t => t.siteId === siteId))),
      FirestoreService.subscribeToDailySiteLogs(userSession, company.companyId, (data) => setDailyLogs(data.filter(d => d.siteId === siteId)))
    ];
    
    setTimeout(() => setLoading(false), 800);
    return () => unsubs.forEach(unsub => unsub());
  }, [company.companyId, userSession.assignedSiteId]);

  if (!userSession.assignedSiteId) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-4" />
        <p>You are not assigned to a specific site.</p>
        <p className="text-xs mt-2">Please contact HR or your manager to configure your assignedSiteId.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Site Manager Dashboard...</div>;
  }

  const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;
  const today = new Date().toISOString().split('T')[0];
  const presentToday = new Set(attendance.filter(a => a.date === today).map(a => a.employeeId)).size;
  const absentToday = Math.max(0, activeEmployees - presentToday);
  
  const openIncidents = incidents.filter(i => i.status === 'OPEN' || i.status === 'UNDER_INVESTIGATION').length;
  const activeVisitors = visitors.filter(v => v.status === 'IN_SITE').length;
  const pendingMaterials = materials.filter(m => m.status === 'PENDING_APPROVAL').length;
  const lowStock = inventory.filter(i => i.currentStock <= i.minStockThreshold).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Core Manpower */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Site Manpower</h3>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{activeEmployees}</p>
          {RbacService.hasModuleAccess(userSession, 'EMPLOYEES') && (
            <button onClick={() => onNavigate('EMPLOYEES')} className="text-xs text-indigo-600 mt-2 font-semibold flex items-center">
              View Directory &rarr;
            </button>
          )}
        </div>

        {/* Live Attendance */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Present Today</h3>
            <Clock className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{presentToday}</p>
          <p className="text-xs text-amber-600 mt-2 font-medium">{absentToday} Absent</p>
        </div>

        {/* Incidents */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Open Incidents</h3>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{openIncidents}</p>
          {RbacService.hasModuleAccess(userSession, 'SITE_OPERATIONS') && (
            <button onClick={() => onNavigate('SITE_OPERATIONS')} className="text-xs text-red-600 mt-2 font-semibold flex items-center">
              Review Incidents &rarr;
            </button>
          )}
        </div>

        {/* Visitors */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Active Visitors</h3>
            <UserCheck className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{activeVisitors}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Logistics */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Pending Gate Pass</h3>
            <Truck className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{pendingMaterials}</p>
        </div>

        {/* Inventory */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Low Stock</h3>
            <Package className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{lowStock}</p>
          {RbacService.hasModuleAccess(userSession, 'INVENTORY') && (
            <button onClick={() => onNavigate('INVENTORY_STOCK')} className="text-xs text-indigo-600 mt-2 font-semibold flex items-center">
              Manage Store &rarr;
            </button>
          )}
        </div>

        {/* Patrols */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Patrol Logs</h3>
            <Shield className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{patrols.length}</p>
          <p className="text-xs text-slate-500 mt-2">Total tours conducted</p>
        </div>
      </div>

      {/* Workflows implemented */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Complaints */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" /> Complaints Engine
          </h3>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {incidents.filter(i => i.type === 'COMPLAINT' && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length}
          </p>
          <p className="text-sm text-slate-500">Open Complaints</p>
        </div>

        {/* Inspections */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" /> Inspections
          </h3>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {dailyLogs.filter(d => d.logType === 'INSPECTION' && d.date === today).length}
          </p>
          <p className="text-sm text-slate-500">Inspections Today</p>
        </div>

        {/* Work Status / Tasks */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-500" /> Tasks Tracker
          </h3>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'PENDING_VERIFICATION').length}
          </p>
          <p className="text-sm text-slate-500">Active Tasks</p>
        </div>

        {/* SLA Monitors */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-500" /> SLA Monitors
          </h3>
          <p className="text-3xl font-black text-red-600 dark:text-red-400">
            {tasks.filter(t => t.slaDeadline && new Date(t.slaDeadline).getTime() < Date.now() && !['COMPLETED', 'RESOLVED', 'CANCELLED'].includes(t.status)).length}
          </p>
          <p className="text-sm text-slate-500">Breached SLAs</p>
        </div>
      </div>
    </div>
  );
};

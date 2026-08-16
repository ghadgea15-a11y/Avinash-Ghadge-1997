import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Save, Search, Filter, UserPlus, Trash2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { UserSession, CompanyTenant, ShiftRecord, EmployeeRecord, RosterRecord, SiteRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { OfflineSyncService } from '../../services/offlineSyncService';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  isOnline: boolean;
}

export const RosterScheduler: React.FC<Props> = ({ userSession, activeCompany, isOnline }) => {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [rosters, setRosters] = useState<RosterRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk assignment state
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    
    const fetchBaseData = async () => {
      unsubs.push(FirestoreService.subscribeToShifts(userSession, activeCompany.companyId, setShifts));
      unsubs.push(FirestoreService.subscribeToEmployees(userSession, activeCompany.companyId, setEmployees));
      unsubs.push(FirestoreService.subscribeToSites(activeCompany.companyId, (data) => {
        setSites(data);
        if (data.length > 0 && !selectedSiteId) setSelectedSiteId(data[0].id);
      }));
      unsubs.push(FirestoreService.subscribeToRosters(userSession, activeCompany.companyId, setRosters));
      setIsLoading(false);
    };

    fetchBaseData();
    return () => unsubs.forEach(u => u());
  }, [activeCompany.companyId, userSession]);

  const handleBulkAssign = async () => {
    if (!selectedSiteId || !selectedShiftId || selectedEmployeeIds.length === 0) return;
    
    const shift = shifts.find(s => s.id === selectedShiftId);
    const site = sites.find(s => s.id === selectedSiteId);
    if (!shift || !site) return;

    const newRosters: RosterRecord[] = selectedEmployeeIds.map(empId => {
      const emp = employees.find(e => e.id === empId);
      const now = new Date().toISOString();
      return {
        id: `ROSTER-${selectedDate}-${empId}`,
        companyId: activeCompany.companyId,
        employeeId: empId,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        shiftId: selectedShiftId,
        shiftName: shift.shiftName,
        siteId: selectedSiteId,
        siteName: site.name,
        date: selectedDate,
        status: 'SCHEDULED',
        createdBy: userSession.userId,
        updatedBy: userSession.userId,
        createdAt: now,
        updatedAt: now
      };
    });

    const actor = {
      id: userSession.userId,
      name: userSession.fullName
    };

    if (isOnline) {
      const ok = await FirestoreService.bulkSaveRosters(activeCompany.companyId, newRosters, actor);
      if (ok) {
        setSelectedEmployeeIds([]);
      }
    } else {
      OfflineSyncService.queueAction('CREATE_ROSTER', {
        companyId: activeCompany.companyId,
        rosters: newRosters,
        actor
      });
      setSelectedEmployeeIds([]);
      // Optimistic UI update could be added here
    }
  };

  const handleDeleteRoster = async (rosterId: string) => {
    if (!window.confirm('Remove this assignment from roster?')) return;
    
    const actor = {
      id: userSession.userId,
      name: userSession.fullName
    };

    if (isOnline) {
      await FirestoreService.deleteRoster(activeCompany.companyId, rosterId, actor);
    } else {
      OfflineSyncService.queueAction('DELETE_ROSTER', {
        companyId: activeCompany.companyId,
        rosterId,
        actor
      });
    }
  };

  const toggleEmployeeSelection = (id: string) => {
    setSelectedEmployeeIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredEmployees = employees.filter(e => 
    (e.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || e.lastName.toLowerCase().includes(searchTerm.toLowerCase())) &&
    !rosters.some(r => (r.date === selectedDate || r.rosterDate === selectedDate) && r.employeeId === e.id)
  );

  const currentRosters = rosters.filter(r => (r.date === selectedDate || r.rosterDate === selectedDate) && r.siteId === selectedSiteId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" /> Roster Scheduler
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Plan and assign shifts to employees per site.</p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <select
            className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none pr-4 border-r border-slate-100 dark:border-slate-800"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
          >
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex items-center gap-2 pl-2">
            <button 
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button 
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Employee Selection */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-500" /> Available Employees
            </h3>
            <div className="mt-3 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {filteredEmployees.map(emp => (
              <button
                key={emp.id}
                onClick={() => toggleEmployeeSelection(emp.id)}
                className={`w-full p-3 flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 transition-all ${
                  selectedEmployeeIds.includes(emp.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  selectedEmployeeIds.includes(emp.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {selectedEmployeeIds.includes(emp.id) ? <Check className="w-4 h-4" /> : emp.firstName[0]}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{emp.firstName} {emp.lastName}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{emp.designation || 'Staff'}</p>
                </div>
              </button>
            ))}
            {filteredEmployees.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">All employees are scheduled for this date.</div>
            )}
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Shift</label>
              <select
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold outline-none"
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
              >
                <option value="">Select a shift...</option>
                {shifts.filter(s => s.status === 'ACTIVE').map(s => (
                  <option key={s.id} value={s.id}>{s.shiftName} ({s.startTime}-{s.endTime})</option>
                ))}
              </select>
            </div>
            <button
              disabled={!selectedShiftId || selectedEmployeeIds.length === 0}
              onClick={handleBulkAssign}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/25"
            >
              <Save className="w-4 h-4" /> Assign {selectedEmployeeIds.length} Members
            </button>
          </div>
        </div>

        {/* Right Panel: Daily View */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Scheduled Rosters</h3>
            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full uppercase">
              {currentRosters.length} Assignments
            </span>
          </div>

          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {currentRosters.map(roster => (
              <div key={roster.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                    {roster.employeeName[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{roster.employeeName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">{roster.shiftName}</span>
                      <span className="text-[10px] text-slate-400">•</span>
                      <span className="text-[10px] text-slate-500">{roster.siteName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    roster.status === 'SCHEDULED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {roster.status}
                  </span>
                  <button 
                    onClick={() => handleDeleteRoster(roster.id)}
                    className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {currentRosters.length === 0 && (
              <div className="p-20 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-300 dark:text-slate-700">
                  <Calendar className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">No schedules found</p>
                  <p className="text-xs text-slate-500 max-w-[200px]">Assign employees from the left panel to begin scheduling for {selectedDate}.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

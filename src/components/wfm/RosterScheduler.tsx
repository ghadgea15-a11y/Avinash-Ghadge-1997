import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Users, MapPin, Copy, Save, AlertCircle, Plus, Edit2, Trash2, Bot
} from 'lucide-react';
import { format, startOfWeek, addDays, subWeeks, addWeeks, parseISO, isSameDay } from 'date-fns';

import { FirestoreService } from '../../services/firestoreService';
import { RosterRecord, ShiftRecord, SiteRecord, EmployeeRecord } from '../../types';

export const RosterScheduler: React.FC<any> = ({ userSession: propUserSession, activeCompany: propActiveCompany, isOnline }) => {
  const userSession = propUserSession; const activeCompany = propActiveCompany;
  
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [rosters, setRosters] = useState<RosterRecord[]>([]);
  
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Assignment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignmentContext, setAssignmentContext] = useState<{
    employeeId: string;
    employeeName: string;
    date: Date;
    existingRosterId?: string;
  } | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [selectedRelieverId, setSelectedRelieverId] = useState<string>('');

  useEffect(() => {
    if (!userSession || !activeCompany) return;
    const cid = activeCompany.companyId;
    const unsubs: (() => void)[] = [];

    unsubs.push(FirestoreService.subscribeToEmployees(userSession, cid, setEmployees));
    unsubs.push(FirestoreService.subscribeToShifts(userSession, cid, setShifts));
    unsubs.push(FirestoreService.subscribeToSites(cid, (data: any[]) => {
      setSites(data);
    }));
    unsubs.push(FirestoreService.subscribeToRosters(userSession, cid, setRosters));

    return () => unsubs.forEach(u => u());
  }, [userSession, activeCompany]);

  const weekDates = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  const filteredEmployees = employees.filter(emp => {
    if (selectedSiteId !== 'ALL' && emp.siteId !== selectedSiteId) return false;
    return true;
  });

  const getRosterForCell = (empId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return rosters.find(r => 
      r.employeeId === empId && 
      (r.date === dateStr || r.rosterDate === dateStr) && 
      r.status !== 'CANCELLED'
    );
  };

  const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));

  const handleAutoSchedule = async () => {
    if (!activeCompany || !userSession) return;
    if (shifts.length === 0) {
      setError('Please create at least one shift in Shift Master first.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const newRosters = [];
      const batchDate = Date.now();
      let rstCounter = 0;

      for (const emp of filteredEmployees) {
        let workedDays = 0;
        const site = sites.find(s => s.id === emp.siteId) || sites[0];
        
        for (let i = 0; i < 7; i++) {
          const d = addDays(currentWeekStart, i);
          const dateStr = format(d, 'yyyy-MM-dd');
          
          const existing = rosters.find(r => r.employeeId === emp.id && (r.date === dateStr || r.rosterDate === dateStr));
          if (existing) {
             workedDays++;
             continue; 
          }
          
          if (workedDays >= 6) {
             // 7th day is Weekly Off
             continue;
          }

          // Cycle through shifts for rotational, or pick first if not mapped
          const defaultShift = shifts[0];
          newRosters.push({
            id: `RST-AI-${batchDate}-${rstCounter++}`,
            companyId: activeCompany.companyId,
            employeeId: emp.id!,
            employeeName: emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee',
            shiftId: defaultShift.id!,
            shiftName: defaultShift.shiftName || defaultShift.name || 'Standard Shift',
            shiftCode: defaultShift.shiftCode || defaultShift.code || 'SH-01',
            siteId: emp.siteId || site?.id || '',
            siteName: site?.name || '',
            date: dateStr,
            rosterDate: dateStr,
            status: 'ACTIVE',
            createdBy: userSession.userId || userSession.uid || 'AI_SCHEDULER',
            createdAt: new Date().toISOString()
          });
          workedDays++;
        }
      }

      if (newRosters.length > 0) {
        await FirestoreService.bulkSaveRosters(activeCompany.companyId, newRosters, { id: userSession.userId || userSession.uid });
      }
    } catch (err: any) {
      console.error('AI Auto-Schedule error:', err);
      setError(err.message || 'Failed to auto-schedule');
    } finally {
      setIsProcessing(false);
    }
  };
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));

  const handleOpenAssignModal = (emp: EmployeeRecord, date: Date, existingRoster?: RosterRecord) => {
    setAssignmentContext({
      employeeId: emp.id!,
      employeeName: emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee',
      date,
      existingRosterId: existingRoster?.id
    });
    setSelectedShiftId(existingRoster?.shiftId || (shifts[0]?.id || ''));
    setSelectedRelieverId(existingRoster?.relieverId || '');
    setIsModalOpen(true);
  };

  const handleSaveAssignment = async () => {
    if (!activeCompany || !userSession || !assignmentContext || !selectedShiftId) return;
    
    setIsProcessing(true);
    setError(null);
    try {
      const shift = shifts.find(s => s.id === selectedShiftId);
      const emp = employees.find(e => e.id === assignmentContext.employeeId);
      const site = sites.find(s => s.id === emp?.siteId) || sites[0];
      const reliever = employees.find(e => e.id === selectedRelieverId);
      
      const rosterRecord: RosterRecord = {
        id: assignmentContext.existingRosterId || `RST-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        companyId: activeCompany.companyId,
        employeeId: assignmentContext.employeeId,
        employeeName: assignmentContext.employeeName,
        shiftId: selectedShiftId,
        shiftName: shift?.shiftName || shift?.name || 'Standard Shift',
        shiftCode: shift?.shiftCode || shift?.code || '',
        siteId: emp?.siteId || site?.id || '',
        siteName: site?.name || '',
        date: format(assignmentContext.date, 'yyyy-MM-dd'),
        rosterDate: format(assignmentContext.date, 'yyyy-MM-dd'),
        relieverId: selectedRelieverId || undefined,
        relieverName: reliever ? (reliever.name || `${reliever.firstName || ''} ${reliever.lastName || ''}`.trim()) : undefined,
        status: 'ACTIVE',
        createdBy: userSession.userId || userSession.uid,
        createdAt: new Date().toISOString()
      };

      await FirestoreService.saveRoster(activeCompany.companyId, rosterRecord);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Save roster assignment error:', err);
      setError(err.message || 'Failed to save roster assignment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAssignment = async (rosterId: string) => {
    if (!activeCompany || !userSession) return;
    if (!window.confirm('Are you sure you want to remove this shift assignment?')) return;
    
    setIsProcessing(true);
    setError(null);
    try {
      await FirestoreService.deleteRoster(activeCompany.companyId, rosterId, {
        id: userSession.uid,
        name: userSession.email || 'User'
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to delete assignment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyPreviousWeek = async () => {
    if (!activeCompany || !userSession) return;
    if (!window.confirm('Copy roster from the previous week? This will override empty slots.')) return;
    
    setIsProcessing(true);
    setError(null);
    try {
      const prevWeekStart = subWeeks(currentWeekStart, 1);
      const prevWeekEnd = addDays(prevWeekStart, 6);
      
      const rostersToCopy = rosters.filter(r => {
        const rDate = parseISO(r.date || r.rosterDate || '');
        return rDate >= prevWeekStart && rDate <= prevWeekEnd && r.status !== 'CANCELLED';
      });

      const newRosters: RosterRecord[] = [];
      rostersToCopy.forEach(oldRoster => {
        const newDate = addWeeks(parseISO(oldRoster.date || oldRoster.rosterDate || ''), 1);
        const newDateStr = format(newDate, 'yyyy-MM-dd');
        
        // Check if a roster already exists for this date
        const existing = rosters.find(r => 
          r.employeeId === oldRoster.employeeId && 
          (r.date === newDateStr || r.rosterDate === newDateStr) &&
          r.status !== 'CANCELLED'
        );
        
        if (!existing) {
          newRosters.push({
            ...oldRoster,
            id: `RST-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            date: newDateStr,
            rosterDate: newDateStr,
            createdAt: new Date().toISOString(),
            createdBy: userSession.uid
          });
        }
      });

      if (newRosters.length > 0) {
        await FirestoreService.bulkSaveRosters(
          activeCompany.companyId, 
          newRosters, 
          { id: userSession.uid, name: userSession.email || 'System' }
        );
        alert(`Successfully copied ${newRosters.length} shifts.`);
      } else {
        alert('No shifts to copy or all slots already filled.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to copy rosters');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roster Scheduler</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage workforce deployment and shifts</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="flex-1 md:flex-none px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Sites</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>

          <button
            onClick={handleAutoSchedule}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-sm disabled:opacity-50"
          >
            <Bot className="w-4 h-4" />
            <span>AI Auto-Schedule</span>
          </button>

          <button
            onClick={handleCopyPreviousWeek}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy Previous</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Scheduler Grid Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {/* Date Navigation */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={handlePrevWeek}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {format(weekDates[0], 'MMM d')} - {format(weekDates[6], 'MMM d, yyyy')}
          </h2>
          
          <button
            onClick={handleNextWeek}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-r border-slate-200 dark:border-slate-800 min-w-[200px] w-64">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                    <Users className="w-4 h-4" />
                    Employee
                  </div>
                </th>
                {weekDates.map((date, i) => (
                  <th key={i} className="p-4 border-b border-slate-200 dark:border-slate-800 min-w-[120px] text-center">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      {format(date, 'EEE')}
                    </div>
                    <div className={`text-lg font-bold ${isSameDay(date, new Date()) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                      {format(date, 'd')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No employees found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 p-4 border-r border-slate-200 dark:border-slate-800 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {emp.name || `${emp.firstName} ${emp.lastName}`}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {sites.find(s => s.id === emp.siteId)?.name || 'Unassigned'}
                      </div>
                    </td>
                    {weekDates.map((date, i) => {
                      const roster = getRosterForCell(emp.id!, date);
                      return (
                        <td key={i} className="p-2 border-r border-slate-100 dark:border-slate-800/50 last:border-r-0">
                          {roster ? (
                            <div 
                              onClick={() => handleOpenAssignModal(emp, date, roster)}
                              className="group relative bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-800 cursor-pointer transition-colors text-center"
                            >
                              <div className="font-semibold text-indigo-700 dark:text-indigo-300 text-sm">
                                {roster.shiftName || roster.shiftCode || 'Assigned Shift'}
                              </div>
                              {roster.relieverName && (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium truncate">
                                  Reliever: {roster.relieverName}
                                </div>
                              )}
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit2 className="w-3 h-3 text-indigo-500" />
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => handleOpenAssignModal(emp, date)}
                              className="group h-full min-h-[44px] flex items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors"
                            >
                              <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {isModalOpen && assignmentContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assign Shift</h3>
                <p className="text-sm text-slate-500">
                  {assignmentContext.employeeName} • {format(assignmentContext.date, 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Shift
                </label>
                <select
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- No Shift --</option>
                  {shifts.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.shiftName || s.name || s.id} ({s.startTime || '09:00'} - {s.endTime || '18:00'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Replacement / Reliever (Optional)
                </label>
                <select
                  value={selectedRelieverId}
                  onChange={(e) => setSelectedRelieverId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- No Reliever --</option>
                  {employees.filter(e => e.id !== assignmentContext?.employeeId).map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Employee'} ({e.employeeCode || e.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              {assignmentContext.existingRosterId ? (
                <button
                  onClick={() => handleDeleteAssignment(assignmentContext.existingRosterId!)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              ) : (
                <div></div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAssignment}
                  disabled={isProcessing || !selectedShiftId}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isProcessing ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

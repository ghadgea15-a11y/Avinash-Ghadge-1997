// @ts-nocheck
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  Check, 
  X, 
  Clock, 
  Calendar,
  Filter,
  Search,
  ArrowRight,
  Info,
  ShieldAlert
} from 'lucide-react';
import { 
  AbsenceRegularizationRecord, 
  RosterRecord, 
  AttendanceRecord, 
  LeaveRequestRecord,
  HolidayRecord,
  UserSession,
  CompanyTenant,
  LeavePolicyRecord
} from '../../types';
import { LeaveService } from '../../services/leaveService';
import { FirestoreService } from '../../services/firestoreService';

interface AbsenceRegularizationProps {
  userSession: UserSession;
  company: CompanyTenant;
  rosters: RosterRecord[];
  attendances: AttendanceRecord[];
  leaves: LeaveRequestRecord[];
  holidays: HolidayRecord[];
  policies: LeavePolicyRecord[];
  onApplyRegularization: (data: Omit<AbsenceRegularizationRecord, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  isLoading: boolean;
}

export const AbsenceRegularization: React.FC<AbsenceRegularizationProps> = ({
  userSession,
  company,
  rosters,
  attendances,
  leaves,
  holidays,
  policies,
  onApplyRegularization,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState<'PENDING_ACTION' | 'MY_REQUESTS'>('PENDING_ACTION');
  const [selectedAbsence, setSelectedAbsence] = useState<{date: string, roster: RosterRecord} | null>(null);
  const [regType, setRegType] = useState<'LEAVE' | 'PRESENT' | 'OTHER'>('LEAVE');
  const [leaveTypeCode, setLeaveTypeCode] = useState('');
  const [reason, setReason] = useState('');

  // Weekly off is typically Sunday (0)
  const weeklyOffDays = [0];

  const detectedAbsences = useMemo(() => {
    // Only detect for the current user in this view
    const myRosters = rosters.filter(r => r.employeeId === (userSession.employeeId || userSession.userId));
    const myAttendances = attendances.filter(a => a.employeeId === (userSession.employeeId || userSession.userId));
    const myLeaves = leaves.filter(l => l.employeeId === (userSession.employeeId || userSession.userId));

    return LeaveService.detectAbsences(
      myRosters,
      myAttendances,
      myLeaves,
      holidays,
      weeklyOffDays
    );
  }, [rosters, attendances, leaves, holidays, userSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAbsence) return;

    await onApplyRegularization({
      companyId: userSession.companyId,
      employeeId: userSession.employeeId || userSession.userId,
      employeeName: userSession.fullName,
      absenceDate: selectedAbsence.date,
      siteId: selectedAbsence.roster.siteId,
      shiftId: selectedAbsence.roster.shiftId,
      requestedAction: regType === 'PRESENT' ? 'MARK_PRESENT' : regType === 'LEAVE' ? 'APPLY_LEAVE' : 'MARK_OFF',
      leaveTypeCode: regType === 'LEAVE' ? leaveTypeCode : undefined,
      reason: reason.trim(),
      requestedBy: userSession.userId,
      requestedByName: userSession.fullName,
      updatedAt: new Date().toISOString()
    });

    setSelectedAbsence(null);
    setReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-black dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            Absence & Regularization
          </h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Correct missing attendance and unexplained absences</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('PENDING_ACTION')}
          className={`px-4 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition ${
            activeTab === 'PENDING_ACTION'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-black'
          }`}
        >
          Detected Absences ({detectedAbsences.length})
        </button>
        <button
          onClick={() => setActiveTab('MY_REQUESTS')}
          className={`px-4 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition ${
            activeTab === 'MY_REQUESTS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-black'
          }`}
        >
          Regularization History
        </button>
      </div>

      {activeTab === 'PENDING_ACTION' && (
        <div className="space-y-4">
          {detectedAbsences.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-full" />
              <h4 className="text-base font-black text-black dark:text-slate-200 dark:text-white">Clean Slate!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No unexplained absences detected for your roster.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {detectedAbsences.map((abs, i) => (
                <div key={i} className="group p-5 rounded-3xl bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-rose-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-black dark:text-white">{new Date(abs.date).toLocaleDateString('default', { dateStyle: 'full' })}</h4>
                          <p className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Absence Detected</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-950 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1.5 mb-4">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400">Shift Name:</span>
                        <span className="text-slate-900 dark:text-slate-300">{abs.roster.shiftName}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400">Roster Slot:</span>
                        <span className="text-slate-900 dark:text-slate-300">{abs.roster.date}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedAbsence(abs)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-slate-900/10 hover:shadow-indigo-600/20"
                  >
                    Regularize Now
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Regularization Dialog */}
      {selectedAbsence && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-black dark:text-white">Regularize Absence</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{selectedAbsence.date}</p>
              </div>
              <button onClick={() => setSelectedAbsence(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Request Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegType('LEAVE')}
                    className={`py-2 px-3 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all ${
                      regType === 'LEAVE' 
                        ? 'border-indigo-600 bg-indigo-600 text-white' 
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'
                    }`}
                  >
                    Convert to Leave
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegType('PRESENT')}
                    className={`py-2 px-3 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all ${
                      regType === 'PRESENT' 
                        ? 'border-indigo-600 bg-indigo-600 text-white' 
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'
                    }`}
                  >
                    Mark as Present
                  </button>
                </div>
              </div>

              {regType === 'LEAVE' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Select Leave Type</label>
                  <select
                    value={leaveTypeCode}
                    onChange={(e) => setLeaveTypeCode(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="">-- Choose Leave Type --</option>
                    {policies.map(p => (
                      <option key={p.id} value={p.leaveCode}>{p.leaveName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Reason / Explanation *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={3}
                  placeholder={regType === 'PRESENT' ? 'e.g. Forgot to punch, Technical error at gate...' : 'State reason for leave...'}
                  className="w-full p-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAbsence(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-white dark:bg-slate-950 transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-2 py-3 px-6 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

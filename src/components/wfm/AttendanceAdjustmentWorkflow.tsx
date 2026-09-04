// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { AttendanceRecord, UserSession } from '../../types';
import { PayrollWorkflowService } from '../../services/payrollWorkflowService';
import { AlertCircle, CheckCircle, Clock, ShieldAlert, X } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface Props {
  userSession: UserSession;
  companyId: string;
}

export const AttendanceAdjustmentWorkflow: React.FC<Props> = ({ userSession, companyId }) => {
  const [exceptions, setExceptions] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Modal states
  const [selectedAtt, setSelectedAtt] = useState<AttendanceRecord | null>(null);
  const [reason, setReason] = useState('');
  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');
  const [approvedOt, setApprovedOt] = useState<number>(0);
  const [newStatus, setNewStatus] = useState<string>('');

  useEffect(() => {
    // Listen for attendances that require review (exceptions: LATE, EARLY, UNAPPROVED OT, MISSING PUNCH)
    const q = query(
      collection(db, 'companies', companyId, 'attendance'),
      where('requiresReview', '==', true)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      let records = snap.docs.map(d => d.data() as AttendanceRecord);
      
      if (userSession.role === 'SUPERVISOR' || (userSession.roles && userSession.roles.includes('SUPERVISOR'))) {
        records = records.filter(r => r.siteId === userSession.branchId || r.siteId === userSession.assignedSiteId);
      }
      // Sort by date desc
      records.sort((a, b) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime());
      setExceptions(records);
      setLoading(false);
    });
    return () => unsub();
  }, [companyId]);

  const getLocalTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    } catch(e) { return ''; }
  };

  const handleOpenModal = (att: AttendanceRecord) => {
    setSelectedAtt(att);
    setNewCheckIn(getLocalTime(att.checkInTime));
    setNewCheckOut(getLocalTime(att.checkOutTime));
    setApprovedOt(att.approvedOvertimeMinutes || 0);
    setNewStatus(att.status);
    setReason('');
  };

  const handleSubmit = async () => {
    if (!selectedAtt) return;
    if (!reason.trim()) {
      handleError(new Error("Reason is required for audit trail."), "Validation Failed");
      return;
    }

    setProcessingId(selectedAtt.id);
    try {
      await PayrollWorkflowService.adjustAttendance(
        companyId,
        {
          attendanceId: selectedAtt.id,
          employeeId: selectedAtt.employeeId,
          requestedStatus: newStatus as any,
          requestedCheckInTime: newCheckIn ? new Date(`${selectedAtt.date || selectedAtt.attendanceDate}T${newCheckIn}:00`).toISOString() : undefined,
          requestedCheckOutTime: newCheckOut ? new Date(`${selectedAtt.date || selectedAtt.attendanceDate}T${newCheckOut}:00`).toISOString() : undefined,
          approvedOvertimeMinutes: approvedOt,
          reason
        },
        { id: userSession.userId, name: userSession.fullName }
      );
      setSelectedAtt(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="p-4 text-slate-500 dark:text-slate-400">Loading exceptions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold">Attendance Exceptions & Review</h3>
      </div>
      
      {exceptions.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
          <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
          <p>No exceptions requiring review.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-white dark:bg-slate-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Issue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {exceptions.map(att => (
                <tr key={att.id} className="hover:bg-white dark:bg-slate-950">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{(att.date || att.attendanceDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{att.employeeName}</td>
                  <td className="px-6 py-4 text-sm text-amber-600">
                    {att.regularizationReason ? `Reason: ${att.regularizationReason}` : (att.exceptions?.join(', ') || 'Requires Review')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-900 dark:text-slate-300">
                      {att.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button 
                      onClick={() => handleOpenModal(att)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {selectedAtt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black dark:text-white">Resolve Attendance</h2>
              <button onClick={() => setSelectedAtt(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Status</label>
                  <select 
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm"
                  >
                    <option value="PRESENT">PRESENT</option>
                    <option value="HALF_DAY">HALF_DAY</option>
                    <option value="ABSENT">ABSENT</option>
                    <option value="LATE">LATE</option>
                    <option value="EARLY_DEPARTURE">EARLY_DEPARTURE</option>
                    <option value="MISSED_PUNCH">MISSED_PUNCH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Approved OT (Mins)</label>
                  <input 
                    type="number"
                    value={approvedOt}
                    onChange={(e) => setApprovedOt(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Check In Time</label>
                  <input 
                    type="time"
                    value={newCheckIn}
                    onChange={(e) => setNewCheckIn(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Check Out Time</label>
                  <input 
                    type="time"
                    value={newCheckOut}
                    onChange={(e) => setNewCheckOut(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Reason for Change (Required)</label>
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Regularized missing punch based on manager approval"
                  className="w-full bg-white dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:bg-slate-900/50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedAtt(null)}
                className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg hover:bg-white dark:bg-slate-950"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={!reason || processingId === selectedAtt.id}
                className="px-4 py-2 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {processingId === selectedAtt.id ? 'Saving...' : 'Authorize & Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

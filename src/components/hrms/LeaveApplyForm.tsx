// @ts-nocheck
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  FileText, 
  AlertCircle, 
  Check, 
  Info,
  Paperclip,
  Clock,
  Home,
  Stethoscope,
  Palmtree,
  ShieldAlert
} from 'lucide-react';
import { 
  LeavePolicyRecord, 
  LeaveBalanceRecord, 
  HolidayRecord, 
  UserSession,
  LeaveRequestRecord
} from '../../types';
import { LeaveService } from '../../services/leaveService';
import { LanguageService, VoiceFeedbackService } from '../../services/voiceFeedbackService';

interface LeaveApplyFormProps {
  userSession: UserSession;
  policies: LeavePolicyRecord[];
  balance: LeaveBalanceRecord | null;
  holidays: HolidayRecord[];
  existingRequests: LeaveRequestRecord[];
  onClose: () => void;
  onSubmit: (data: Omit<LeaveRequestRecord, 'id' | 'createdAt' | 'status' | 'appliedAt'>) => Promise<void>;
  isLoading: boolean;
}

export const LeaveApplyForm: React.FC<LeaveApplyFormProps> = ({
  userSession,
  policies,
  balance,
  holidays,
  existingRequests,
  onClose,
  onSubmit,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    leaveTypeCode: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    isHalfDay: false,
    halfDaySession: 'FIRST' as 'FIRST' | 'SECOND',
    reason: '',
    attachmentUrl: '',
    contactDuringLeave: userSession.mobileNumber || ''
  });

  const [errors, setErrors] = useState<string[]>([]);

  const selectedPolicy = useMemo(() => 
    policies.find(p => p.leaveCode === formData.leaveTypeCode),
  [policies, formData.leaveTypeCode]);

  const currentBalance = useMemo(() => 
    balance?.balances.find(b => b.leaveCode === formData.leaveTypeCode),
  [balance, formData.leaveTypeCode]);

  // Weekly off is typically Sunday (0) for most Indian sites, but can be configured
  const weeklyOffDays = [0]; 

  const calculatedDays = useMemo(() => {
    if (!selectedPolicy) return 0;
    return LeaveService.calculateLeaveDays(
      formData.startDate,
      formData.endDate,
      formData.isHalfDay,
      weeklyOffDays,
      holidays,
      selectedPolicy,
      userSession.assignedRegionId
    );
  }, [formData.startDate, formData.endDate, formData.isHalfDay, holidays, selectedPolicy, userSession.assignedRegionId]);

  const validate = (): boolean => {
    const errs: string[] = [];
    
    if (!selectedPolicy) errs.push('Please select a leave type.');
    if (!formData.reason.trim()) errs.push('Reason is required.');
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (start > end) errs.push('Start date cannot be after end date.');

    if (selectedPolicy) {
      // Balance Check
      if (currentBalance) {
        const available = LeaveService.calculateAvailableBalance(currentBalance);
        if (calculatedDays > available && !selectedPolicy.negativeBalanceAllowed) {
          errs.push(`Insufficient balance. Available: ${available} days, Requested: ${calculatedDays} days.`);
        }
      }

      // Overlap Check
      const overlap = LeaveService.detectOverlaps(formData.startDate, formData.endDate, existingRequests);
      if (overlap) {
        errs.push(`Overlapping leave found: ${overlap.leaveTypeName} from ${overlap.startDate} to ${overlap.endDate}.`);
      }

      // Max Consecutive
      if (selectedPolicy.maxConsecutiveDays > 0 && calculatedDays > selectedPolicy.maxConsecutiveDays) {
        errs.push(`This policy allows maximum ${selectedPolicy.maxConsecutiveDays} consecutive days.`);
      }

      // Min Notice (Optional check)
    }

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate() && selectedPolicy) {
      onSubmit({
        companyId: userSession.companyId,
        employeeId: userSession.employeeId || userSession.userId,
        employeeName: userSession.fullName,
        leaveTypeCode: selectedPolicy.leaveCode,
        leaveTypeName: selectedPolicy.leaveName,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isHalfDay: formData.isHalfDay,
        halfDaySession: formData.isHalfDay ? formData.halfDaySession : undefined,
        daysCount: calculatedDays,
        reason: formData.reason.trim(),
        attachmentUrl: formData.attachmentUrl,
        contactDuringLeave: formData.contactDuringLeave
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-950/50 dark:bg-slate-900/20">
          <div>
            <h3 className="text-xl font-black text-black dark:text-white flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-indigo-600" />
              Apply Leave
            </h3>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Submit new time-off request</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {errors.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 space-y-2">
              {errors.map((err, i) => (
                <div key={i} className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          <form id="leave-apply-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Leave Type</label>
              <div className="grid grid-cols-2 gap-2">
                {policies.map(p => {
                  const bal = balance?.balances.find(b => b.leaveCode === p.leaveCode);
                  const available = bal ? LeaveService.calculateAvailableBalance(bal) : 0;
                  const isSelected = formData.leaveTypeCode === p.leaveCode;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, leaveTypeCode: p.leaveCode })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-600/10' 
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-black ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-slate-300'}`}>
                          {p.leaveName}
                        </span>
                        {isSelected && <Check className="w-3 h-3 text-indigo-600" />}
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">{available} Available</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Half Day */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-950 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-300">Is this a half-day?</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.isHalfDay}
                    onChange={(e) => setFormData({ ...formData, isHalfDay: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {formData.isHalfDay && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, halfDaySession: 'FIRST' })}
                  className={`py-2 px-3 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all ${
                    formData.halfDaySession === 'FIRST' 
                      ? 'border-indigo-600 bg-indigo-600 text-white' 
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'
                  }`}
                >
                  First Session
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, halfDaySession: 'SECOND' })}
                  className={`py-2 px-3 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all ${
                    formData.halfDaySession === 'SECOND' 
                      ? 'border-indigo-600 bg-indigo-600 text-white' 
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'
                  }`}
                >
                  Second Session
                </button>
              </div>
            )}

            {/* Calculated Preview */}
            <div className="p-4 rounded-2xl bg-indigo-600 text-white flex justify-between items-center shadow-xl shadow-indigo-600/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-slate-900/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-indigo-100">Leave Duration</p>
                  <p className="text-xl font-black">{calculatedDays} {calculatedDays === 1 ? 'Day' : 'Days'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-indigo-100 uppercase italic">Excl. non-working days</p>
              </div>
            </div>

            {/* Reason with Pictograms for Ground Workforce */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                {LanguageService.translate('LEAVE_SICK').split('(')[0]} / Reason for Leave *
              </label>

              {/* Icon / Pictogram Quick Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const txt = LanguageService.translate('LEAVE_SICK');
                    setFormData({ ...formData, reason: txt });
                    VoiceFeedbackService.speak(txt);
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                    formData.reason === LanguageService.translate('LEAVE_SICK')
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/30'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <span className="truncate">{LanguageService.translate('LEAVE_SICK')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const txt = LanguageService.translate('LEAVE_CASUAL');
                    setFormData({ ...formData, reason: txt });
                    VoiceFeedbackService.speak(txt);
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                    formData.reason === LanguageService.translate('LEAVE_CASUAL')
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <Home className="w-4 h-4" />
                  </div>
                  <span className="truncate">{LanguageService.translate('LEAVE_CASUAL')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const txt = LanguageService.translate('LEAVE_ANNUAL');
                    setFormData({ ...formData, reason: txt });
                    VoiceFeedbackService.speak(txt);
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                    formData.reason === LanguageService.translate('LEAVE_ANNUAL')
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Palmtree className="w-4 h-4" />
                  </div>
                  <span className="truncate">{LanguageService.translate('LEAVE_ANNUAL')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const txt = LanguageService.translate('LEAVE_EMERGENCY');
                    setFormData({ ...formData, reason: txt });
                    VoiceFeedbackService.speak(txt);
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                    formData.reason === LanguageService.translate('LEAVE_EMERGENCY')
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300 ring-2 ring-purple-500/30'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <span className="truncate">{LanguageService.translate('LEAVE_EMERGENCY')}</span>
                </button>
              </div>

              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={2}
                placeholder="किंवा येथे लिहा / Type reason..."
                className="w-full p-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all resize-none"
              />
            </div>

            {/* Emergency Contact */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Contact During Leave</label>
              <input
                type="text"
                value={formData.contactDuringLeave}
                onChange={(e) => setFormData({ ...formData, contactDuringLeave: e.target.value })}
                placeholder="+91 00000 00000"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-950/50 dark:bg-slate-900/20 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 transition-all active:scale-95"
          >
            Discard
          </button>
          <button
            form="leave-apply-form"
            type="submit"
            disabled={isLoading || !selectedPolicy}
            className="flex-3 py-3 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Confirm & Apply
          </button>
        </div>
      </div>
    </div>
  );
};

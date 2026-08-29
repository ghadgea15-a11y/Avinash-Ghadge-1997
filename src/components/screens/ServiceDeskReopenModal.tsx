import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User, 
  Paperclip, 
  Upload, 
  ShieldAlert, 
  FileText, 
  ArrowRight, 
  History, 
  TrendingUp, 
  Layers,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { 
  ServiceTicketRecord, 
  ServiceTicketPriority, 
  ServiceTicketStatus,
  TicketReopenReasonCategory, 
  ReopenTicketPayload, 
  TicketReopenEligibilityResult,
  UserSession,
  EmployeeRecord
} from '../../types';
import { ServiceDeskService } from '../../services/serviceDeskService';
import { StorageService } from '../../services/storageService';
import { OfflineSyncService } from '../../services/offlineSyncService';
import { useTheme } from '../../context/ThemeContext';

interface ServiceDeskReopenModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: ServiceTicketRecord;
  companyId: string;
  userSession: UserSession;
  employees?: EmployeeRecord[];
  onReopened: (updatedTicket: ServiceTicketRecord) => void;
}

const REOPEN_REASON_CATEGORIES: { id: TicketReopenReasonCategory; label: string; description: string }[] = [
  { id: 'ISSUE_RECURRED', label: 'Issue Recurred / Regression', description: 'The exact fault or symptom returned after being resolved.' },
  { id: 'INCOMPLETE_RESOLUTION', label: 'Incomplete Resolution', description: 'Remediation was partially applied; core issues remain.' },
  { id: 'SECONDARY_SYMPTOM', label: 'Secondary Symptom / Side-effect', description: 'The fix introduced or uncovered a secondary operational defect.' },
  { id: 'CLIENT_REJECTED', label: 'Client Rejected Fix', description: 'Client verification failed or site user reported unsatisfactory outcome.' },
  { id: 'QUALITY_FAILURE', label: 'Quality Gate / Standard Failure', description: 'Work failed supervisor inspection or compliance quality audit.' },
  { id: 'NEW_FINDING', label: 'New Finding Linked to Ticket', description: 'Additional diagnostic evidence emerged requiring reopening.' },
  { id: 'OTHER', label: 'Other Operational Justification', description: 'Authorized operational reason not covered by standard categories.' }
];

export const ServiceDeskReopenModal: React.FC<ServiceDeskReopenModalProps> = ({
  isOpen,
  onClose,
  ticket,
  companyId,
  userSession,
  employees = [],
  onReopened
}) => {
  const { isDark } = useTheme();

  // Form States
  const [reasonCategory, setReasonCategory] = useState<TicketReopenReasonCategory>('ISSUE_RECURRED');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [targetStatus, setTargetStatus] = useState<ServiceTicketStatus>('REOPENED');
  const [assignedToUserId, setAssignedToUserId] = useState<string>(ticket.assignedToUserId || '');
  const [updatedPriority, setUpdatedPriority] = useState<ServiceTicketPriority>(ticket.priority);
  const [slaMode, setSlaMode] = useState<'NEW_CYCLE' | 'RESUME' | 'CUSTOM'>('NEW_CYCLE');
  const [customSlaMinutes, setCustomSlaMinutes] = useState<number>(ticket.resolutionTargetMinutes || 1440);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showPrevResolution, setShowPrevResolution] = useState<boolean>(false);

  // Status & Validation States
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<TicketReopenEligibilityResult | null>(null);

  useEffect(() => {
    if (isOpen && ticket) {
      const res = ServiceDeskService.checkTicketReopenEligibility(userSession, companyId, ticket);
      setEligibility(res);
      setAssignedToUserId(ticket.assignedToUserId || '');
      setUpdatedPriority(ticket.priority);
      setReason('');
      setNotes('');
      setSelectedFiles([]);
      setErrorMessage(null);
    }
  }, [isOpen, ticket, userSession, companyId]);

  if (!isOpen) return null;

  const currentCycleNumber = (ticket.reopenCount || 0) + 1;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArr]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMessage('Please provide a meaningful reopen justification (at least 5 characters).');
      return;
    }

    setLoading(true);

    try {
      // 1. Upload any new evidence attachments
      let uploadedAttachmentIds: string[] = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            const attRes = await ServiceDeskService.uploadTicketAttachment(
              userSession,
              companyId,
              ticket.id,
              file,
              {
                notes: `Reopen Evidence (Cycle #${currentCycleNumber}): ${file.name}`,
                evidenceType: 'DOCUMENT',
                visibility: 'CLIENT_VISIBLE'
              }
            );
            if (attRes.success && attRes.attachment?.id) {
              uploadedAttachmentIds.push(attRes.attachment.id);
            }
          } catch (uploadErr) {
            console.warn('[ServiceDeskReopenModal] File upload note:', uploadErr);
          }
        }
      }

      const assignedEmp = employees.find(emp => emp.id === assignedToUserId || emp.employeeId === assignedToUserId || emp.authUid === assignedToUserId);
      const assignedName = assignedEmp ? `${assignedEmp.firstName} ${assignedEmp.lastName}`.trim() : (assignedToUserId ? ticket.assignedToName : undefined);

      const payload: ReopenTicketPayload = {
        reasonCategory,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        targetStatus,
        assignedToUserId: assignedToUserId || undefined,
        assignedToName: assignedName,
        assignedTeam: ticket.assignedTeam,
        updatedPriority: updatedPriority !== ticket.priority ? updatedPriority : undefined,
        evidenceAttachmentIds: uploadedAttachmentIds.length > 0 ? uploadedAttachmentIds : undefined,
        slaRecalculationMode: slaMode,
        customSlaTargetMinutes: slaMode === 'CUSTOM' ? customSlaMinutes : undefined,
        requireApproval: eligibility?.requiresApproval
      };

      // Offline check
      if (!OfflineSyncService.isOnline()) {
        OfflineSyncService.queueAction('SERVICE_TICKET_STATUS_TRANSITION', {
          session: userSession,
          companyId,
          ticketId: ticket.id,
          reopenPayload: payload
        });
        const offlineTicket: ServiceTicketRecord = {
          ...ticket,
          status: targetStatus,
          previousStatus: ticket.status,
          reopenCount: currentCycleNumber,
          lastReopenedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        onReopened(offlineTicket);
        onClose();
        return;
      }

      const res = await ServiceDeskService.reopenTicket(
        userSession,
        companyId,
        ticket.id,
        payload
      );

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to reopen ticket.');
      } else if (res.updatedTicket) {
        onReopened(res.updatedTicket);
        onClose();
      }
    } catch (err: any) {
      console.error('[ServiceDeskReopenModal] Error reopening ticket:', err);
      setErrorMessage(err?.message || 'An unexpected error occurred while processing reopen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[90vh] ${
        isDark ? 'bg-slate-900 border-slate-750 text-slate-100' : 'bg-white border-slate-200 text-black'
      }`}>
        
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-rose-50/40'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Reopen Service Ticket</h3>
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded-md">
                  {ticket.ticketNumber}
                </span>
                <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-md">
                  Cycle #{currentCycleNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Restarts ticket lifecycle with SLA recalculation, immutable audit trail, and reassignment options.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-400 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Eligibility or Ineligibility Notice */}
          {eligibility && !eligibility.isEligible && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-3 text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block mb-0.5">Ticket Ineligible for Standard Reopen</strong>
                <p>{eligibility.reason}</p>
              </div>
            </div>
          )}

          {eligibility?.requiresApproval && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3 text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <strong className="font-bold block mb-0.5">Manager Approval Workflow Required</strong>
                <p>
                  Because this ticket is {ticket.priority} priority or past the {eligibility.reopenWindowDays}-day window ({eligibility.daysSinceClosure || 0} days elapsed), submitting this reopen will initiate a formal BPM authorization step.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Ticket Summary & Prior Resolution Accordion */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-850/50 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Ticket Summary</span>
                <span className="font-semibold text-black dark:text-slate-200 text-sm">{ticket.title}</span>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Client: <strong>{ticket.clientName}</strong></span>
                  <span>Site: <strong>{ticket.siteName}</strong></span>
                  <span>Current Status: <strong className="text-rose-600">{ticket.status}</strong></span>
                </div>
              </div>
              {ticket.resolutionSummary && (
                <button
                  type="button"
                  onClick={() => setShowPrevResolution(!showPrevResolution)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center gap-1 hover:bg-indigo-100"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{showPrevResolution ? 'Hide Prior Resolution' : 'View Prior Resolution'}</span>
                  {showPrevResolution ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {showPrevResolution && ticket.resolutionSummary && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-750 space-y-2">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Previous Resolution Summary:</span>
                  <p className="text-slate-900 dark:text-slate-300 whitespace-pre-wrap">{ticket.resolutionSummary}</p>
                </div>
                {ticket.rootCause && (
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Root Cause:</span>
                    <p className="text-slate-600 dark:text-slate-400">{ticket.rootCause}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <form id="reopen-ticket-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Reason Category Selection */}
            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-300 mb-1.5">
                Reopen Classification / Category <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REOPEN_REASON_CATEGORIES.map(cat => {
                  const isSelected = reasonCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setReasonCategory(cat.id)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected 
                          ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 ring-1 ring-rose-500' 
                          : isDark 
                            ? 'border-slate-800 bg-slate-850 hover:border-slate-700' 
                            : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold text-xs ${isSelected ? 'text-rose-700 dark:text-rose-300' : 'text-black dark:text-slate-200'}`}>
                          {cat.label}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        {cat.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mandatory Justification */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-900 dark:text-slate-300">
                  Detailed Justification & Operational Finding <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[10px] ${reason.trim().length >= 5 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {reason.trim().length}/5 chars min
                </span>
              </div>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Explain why the ticket must be reopened (e.g. CCTV recording still dropping frames after power supply swap, client reported recurrence during shift change)..."
                className={`w-full p-3 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none ${
                  isDark ? 'bg-slate-850 border-slate-750 text-slate-100' : 'bg-white border-slate-300 text-black'
                }`}
              />
            </div>

            {/* Actionable Next Steps / Notes */}
            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-300 mb-1">
                Rework Instructions & Next Steps (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Specific guidance for the responding technician (e.g. Replace patch cable on port 7, verify switch voltage reading)..."
                className={`w-full p-3 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none ${
                  isDark ? 'bg-slate-850 border-slate-750 text-slate-100' : 'bg-white border-slate-300 text-black'
                }`}
              />
            </div>

            {/* Target Status & Priority Escalation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-300 mb-1">
                  Target Reopen Status
                </label>
                <select
                  value={targetStatus}
                  onChange={e => setTargetStatus(e.target.value as ServiceTicketStatus)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-rose-500 ${
                    isDark ? 'bg-slate-850 border-slate-750 text-slate-100' : 'bg-white border-slate-300 text-black'
                  }`}
                >
                  <option value="REOPENED">↺ REOPENED (Awaiting Triage / Queue)</option>
                  <option value="IN_PROGRESS">▶ IN PROGRESS (Immediate Remediation)</option>
                  {ticket.assignedToUserId && <option value="ASSIGNED">👤 ASSIGNED (Keep Dispatched)</option>}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-300 mb-1">
                  Priority Escalation
                </label>
                <select
                  value={updatedPriority}
                  onChange={e => setUpdatedPriority(e.target.value as ServiceTicketPriority)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-rose-500 ${
                    isDark ? 'bg-slate-850 border-slate-750 text-slate-100' : 'bg-white border-slate-300 text-black'
                  }`}
                >
                  <option value="CRITICAL">🔴 CRITICAL (2h Target - Highest Escalation)</option>
                  <option value="HIGH">🟠 HIGH (6h Target)</option>
                  <option value="MEDIUM">🟡 MEDIUM (24h Target)</option>
                  <option value="LOW">🟢 LOW (48h Target)</option>
                </select>
              </div>
            </div>

            {/* Assignee Routing & SLA Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-300 mb-1">
                  Assigned Technician
                </label>
                <select
                  value={assignedToUserId}
                  onChange={e => setAssignedToUserId(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-rose-500 ${
                    isDark ? 'bg-slate-850 border-slate-750 text-slate-100' : 'bg-white border-slate-300 text-black'
                  }`}
                >
                  <option value="">-- Unassigned (Dispatch Queue) --</option>
                  {ticket.assignedToUserId && (
                    <option value={ticket.assignedToUserId}>
                      ★ Previous Assignee ({ticket.assignedToName})
                    </option>
                  )}
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.authUid || emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.designation || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-300 mb-1">
                  SLA Calculation Mode
                </label>
                <select
                  value={slaMode}
                  onChange={e => setSlaMode(e.target.value as any)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-rose-500 ${
                    isDark ? 'bg-slate-850 border-slate-750 text-slate-100' : 'bg-white border-slate-300 text-black'
                  }`}
                >
                  <option value="NEW_CYCLE">Fresh SLA Resolution Cycle (Default)</option>
                  <option value="RESUME">Resume Remaining Cycle Minutes</option>
                  <option value="CUSTOM">Custom SLA Target Duration</option>
                </select>
              </div>
            </div>

            {/* Custom SLA Minutes input if selected */}
            {slaMode === 'CUSTOM' && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block font-bold text-slate-900 dark:text-slate-300 mb-1">
                  Target Resolution Time in Minutes
                </label>
                <input
                  type="number"
                  min={15}
                  max={43200}
                  value={customSlaMinutes}
                  onChange={e => setCustomSlaMinutes(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  e.g., 120 = 2 hours, 360 = 6 hours, 1440 = 24 hours.
                </span>
              </div>
            )}

            {/* Evidence & Attachments Upload */}
            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-300 mb-1.5">
                Attach Diagnostic Evidence / Photos (Optional)
              </label>
              <div className={`p-4 rounded-xl border-2 border-dashed text-center transition ${
                isDark ? 'border-slate-750 hover:border-slate-600 bg-slate-850/40' : 'border-slate-300 hover:border-slate-400 bg-white/50'
              }`}>
                <input
                  type="file"
                  id="reopen-file-input"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="reopen-file-input" className="cursor-pointer flex flex-col items-center gap-1.5">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    Click to browse or drag & drop files
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Screenshots, incident logs, field photos, or client inspection reports
                  </span>
                </label>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px]">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">({Math.round(file.size / 1024)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className={`p-4 sm:p-5 border-t flex items-center justify-between shrink-0 ${
          isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-white'
        }`}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="reopen-ticket-form"
            disabled={loading || !reason.trim() || reason.trim().length < 5 || (eligibility !== null && !eligibility.isEligible)}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing Reopen...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Ticket Reopen</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

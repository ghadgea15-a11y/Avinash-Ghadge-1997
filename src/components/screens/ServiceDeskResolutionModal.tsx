import React, { useState, useEffect } from 'react';
import { 
  ServiceTicketRecord, 
  UserSession, 
  SubmitResolutionPayload,
  TicketAttachmentRecord
} from '../../types';
import { ServiceDeskService } from '../../services/serviceDeskService';
import { StorageService } from '../../services/storageService';
import { useTheme } from '../../context/ThemeContext';
import { 
  CheckCircle2, 
  X, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Paperclip, 
  HelpCircle,
  Upload,
  Lock,
  Unlock,
  Building2,
  MapPin,
  Tag
} from 'lucide-react';

interface ServiceDeskResolutionModalProps {
  ticket: ServiceTicketRecord;
  companyId: string;
  userSession: UserSession;
  onClose: () => void;
  onResolved: (updatedTicket: ServiceTicketRecord) => void;
}

export const ServiceDeskResolutionModal: React.FC<ServiceDeskResolutionModalProps> = ({
  ticket,
  companyId,
  userSession,
  onClose,
  onResolved
}) => {
  const { isDark } = useTheme();

  const [resolutionSummary, setResolutionSummary] = useState<string>('');
  const [rootCause, setRootCause] = useState<string>('');
  const [correctiveAction, setCorrectiveAction] = useState<string>('');
  const [resolutionCategory, setResolutionCategory] = useState<string>(ticket.category || 'TECHNICAL_FIX');
  const [resolutionComment, setResolutionComment] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [isClientVisible, setIsClientVisible] = useState<boolean>(true);

  // Evidence attachments
  const [existingEvidence, setExistingEvidence] = useState<TicketAttachmentRecord[]>([]);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    loadExistingEvidence();
  }, [ticket.id, companyId]);

  const loadExistingEvidence = async () => {
    try {
      const atts = await ServiceDeskService.getTicketAttachments(companyId, ticket.id, userSession.role);
      setExistingEvidence(atts.filter((a: TicketAttachmentRecord) => a.status === 'ACTIVE'));
    } catch (e) {
      console.warn('Failed to load evidence attachments for resolution modal:', e);
    }
  };

  // SLA status evaluation
  const effectiveDueTime = ticket.resolutionDueTime || ticket.slaDueTime;
  const isPastDue = effectiveDueTime ? new Date().getTime() > new Date(effectiveDueTime).getTime() : false;

  const handleToggleEvidence = (id: string) => {
    setSelectedEvidenceIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!resolutionSummary.trim() || resolutionSummary.trim().length < 10) {
      setErrorMessage('Resolution Summary must be at least 10 characters describing the resolution.');
      return;
    }

    if (!rootCause.trim() || rootCause.trim().length < 5) {
      setErrorMessage('Root Cause Analysis (RCA) must be at least 5 characters detailing why the issue happened.');
      return;
    }

    if (!correctiveAction.trim() || correctiveAction.trim().length < 5) {
      setErrorMessage('Corrective & Preventive Action (CAPA) must be at least 5 characters detailing remediation.');
      return;
    }

    setLoading(true);

    try {
      let finalEvidenceIds = [...selectedEvidenceIds];

      // Upload any newly selected evidence files
      if (newFiles.length > 0) {
        setIsUploading(true);
        for (const file of newFiles) {
          try {
            const uploadRes = await ServiceDeskService.uploadTicketAttachment(
              userSession,
              companyId,
              ticket.id,
              file,
              {
                evidenceType: 'COMPLETION',
                notes: 'Resolution verification evidence uploaded with resolution entry',
                visibility: isClientVisible ? 'CLIENT_VISIBLE' : 'INTERNAL'
              }
            );
            if (uploadRes?.attachment?.id) {
              finalEvidenceIds.push(uploadRes.attachment.id);
            }
          } catch (uploadErr) {
            console.warn('Failed to upload resolution attachment:', uploadErr);
          }
        }
        setIsUploading(false);
      }

      const payload: SubmitResolutionPayload = {
        resolutionSummary: resolutionSummary.trim(),
        rootCause: rootCause.trim(),
        correctiveAction: correctiveAction.trim(),
        resolutionCategory,
        resolutionComment: resolutionComment.trim() || undefined,
        evidenceAttachmentIds: finalEvidenceIds,
        isClientVisible,
        internalNotes: internalNotes.trim() || undefined
      };

      const res = await ServiceDeskService.submitTicketResolution(
        userSession,
        companyId,
        ticket.id,
        payload
      );

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit resolution.');
        setLoading(false);
        return;
      }

      if (res.updatedTicket) {
        onResolved(res.updatedTicket);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during resolution submission.');
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        id="service-desk-resolution-modal"
        className={`w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-black'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:bg-slate-850/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-black dark:text-white dark:text-slate-100">
                  Submit Ticket Resolution
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-800">
                  {ticket.ticketNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Module 11 / Point 9: RCA & CAPA Documentation, Evidence Linking & SLA Measurement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Ticket Context Pill */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-black dark:text-slate-200 line-clamp-1">{ticket.title}</div>
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 flex-wrap">
                {ticket.siteName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {ticket.siteName}
                  </span>
                )}
                {ticket.clientName && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" /> {ticket.clientName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400" /> {ticket.category}
                </span>
              </div>
            </div>

            {/* SLA Status Indicator */}
            <div className="shrink-0 flex items-center gap-2">
              <div className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 border ${
                isPastDue 
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800' 
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{isPastDue ? 'SLA Target Overdue' : 'Within Resolution SLA'}</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Resolution Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
              Resolution Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={resolutionCategory}
              onChange={(e) => setResolutionCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              required
            >
              <option value="TECHNICAL_FIX">Technical Fix / System Remediation</option>
              <option value="HARDWARE_REPLACEMENT">Hardware / Component Replacement</option>
              <option value="CONFIGURATION_CHANGE">Configuration & Settings Update</option>
              <option value="USER_TRAINING">User Guidance & Operational Instruction</option>
              <option value="FALSE_ALARM">False Alarm / Duplicate Resolution</option>
              <option value="VENDOR_ESCALATION_RESOLVED">Resolved via Vendor Escalation</option>
              <option value="OTHER">Other Operational Resolution</option>
            </select>
          </div>

          {/* 2. Root Cause Analysis (RCA) */}
          <div>
            <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Root Cause Analysis (RCA) <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Identify origin/cause of fault</span>
            </label>
            <textarea
              rows={2}
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Detail what triggered this fault (e.g., Damaged fiber patch cord at Rack 4, Firmware crash after power surge)..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
              required
            />
          </div>

          {/* 3. Corrective & Preventive Action (CAPA) */}
          <div>
            <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Corrective & Preventive Action (CAPA) <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Actions to fix & prevent recurrence</span>
            </label>
            <textarea
              rows={2}
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Detail immediate remediation and preventive steps (e.g., Replaced patch cord, tested link attenuation, updated switch firmware)..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
              required
            />
          </div>

          {/* 4. Resolution Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Executive Resolution Summary <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Summary of completed work</span>
            </label>
            <textarea
              rows={3}
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="Describe the final resolution outcome and confirmation that service has returned to normal operations..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
              required
            />
          </div>

          {/* 5. Evidence & Attachments Linking */}
          <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300">
              Evidence Attachments (Photos, Diagnostics, Reports)
            </label>
            
            {/* Existing Vault Evidence selector */}
            {existingEvidence.length > 0 && (
              <div className="space-y-1.5 bg-white dark:bg-slate-950 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Select existing evidence from Ticket Vault:
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {existingEvidence.map((att) => {
                    const isSelected = selectedEvidenceIds.includes(att.id);
                    return (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => handleToggleEvidence(att.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition text-left ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                            : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-900 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-3 h-3 shrink-0" />
                          <span className="truncate">{att.fileName}</span>
                          <span className="text-[10px] text-slate-400">({att.evidenceType})</span>
                        </div>
                        <span className="text-[10px] font-bold">
                          {isSelected ? '✓ Selected' : '+ Link'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload New Files */}
            <div>
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg border-slate-300 dark:border-slate-700 hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-800/60 cursor-pointer text-xs text-slate-600 dark:text-slate-400 transition">
                <Upload className="w-4 h-4 text-indigo-500" />
                <span>Upload new resolution evidence file(s)...</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {newFiles.length > 0 && (
                <div className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                  {newFiles.length} new file(s) selected to upload upon submission.
                </div>
              )}
            </div>
          </div>

          {/* 6. Client Visibility & Internal Notes */}
          <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isClientVisible ? <Unlock className="w-4 h-4 text-emerald-500" /> : <Lock className="w-4 h-4 text-amber-500" />}
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-300">
                  Client Visibility
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isClientVisible}
                  onChange={(e) => setIsClientVisible(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                Internal Staff Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Confidential notes visible only to internal support staff and management..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              disabled={loading || isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isUploading}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2"
            >
              {(loading || isUploading) && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{isUploading ? 'Uploading Evidence...' : 'Confirm Resolution'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

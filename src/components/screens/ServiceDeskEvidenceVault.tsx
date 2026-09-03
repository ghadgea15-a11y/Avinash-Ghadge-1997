import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  UserSession, 
  CompanyTenant, 
  ServiceTicketRecord, 
  TicketAttachmentRecord, 
  TicketEvidenceType 
} from '../../types';
import { ServiceDeskService } from '../../services/serviceDeskService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';
import { 
  Paperclip, 
  Plus, 
  Search, 
  Image as ImageIcon, 
  FileText, 
  FileCheck, 
  FileSpreadsheet, 
  File, 
  Lock, 
  Unlock, 
  Download, 
  ExternalLink, 
  Eye, 
  Trash2, 
  Edit2, 
  X, 
  UploadCloud, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  Grid, 
  List, 
  Camera, 
  ShieldAlert,
  Clock,
  User,
  Tag
} from 'lucide-react';

interface ServiceDeskEvidenceVaultProps {
  ticket: ServiceTicketRecord;
  userSession: UserSession;
  activeCompany: CompanyTenant;
  isStaff: boolean;
  onAttachmentCountChange?: (count: number) => void;
}

export const ServiceDeskEvidenceVault: React.FC<ServiceDeskEvidenceVaultProps> = ({
  ticket,
  userSession,
  activeCompany,
  isStaff,
  onAttachmentCountChange
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError, confirm } = useFeedback();
  const [attachments, setAttachments] = useState<TicketAttachmentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  useBackNavigation(!!showUploadModal, () => setShowUploadModal(null as any), 'showUploadModal');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  useBackNavigation(!!selectedFile, () => setSelectedFile(null as any), 'selectedFile');
  const [evidenceType, setEvidenceType] = useState<TicketEvidenceType>('PHOTO');
  const [visibility, setVisibility] = useState<'CLIENT_VISIBLE' | 'INTERNAL'>('CLIENT_VISIBLE');
  const [notes, setNotes] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Lightbox Image Preview Modal
  const [previewAttachment, setPreviewAttachment] = useState<TicketAttachmentRecord | null>(null);

  // Archive Modal State
  const [archivingAttachment, setArchivingAttachment] = useState<TicketAttachmentRecord | null>(null);
  const [archiveReason, setArchiveReason] = useState<string>('');
  const [isArchiving, setIsArchiving] = useState<boolean>(false);

  // Edit Metadata Modal State
  const [editingAttachment, setEditingAttachment] = useState<TicketAttachmentRecord | null>(null);
  useBackNavigation(!!editingAttachment, () => setEditingAttachment(null as any), 'editingAttachment');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editType, setEditType] = useState<TicketEvidenceType>('PHOTO');
  const [editVisibility, setEditVisibility] = useState<'CLIENT_VISIBLE' | 'INTERNAL'>('CLIENT_VISIBLE');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Real-time Firestore Subscription
  useEffect(() => {
    if (!activeCompany || !ticket) return;

    setLoading(true);
    const unsub = ServiceDeskService.subscribeToTicketAttachments(
      activeCompany.companyId,
      ticket.id,
      userSession.role,
      (list) => {
        setAttachments(list);
        setLoading(false);
        if (onAttachmentCountChange) {
          onAttachmentCountChange(list.length);
        }
      }
    );

    return () => unsub();
  }, [activeCompany?.companyId, ticket?.id, userSession?.role]);

  // Format File Size
  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper to test if file is image
  const isImageFile = (fileName: string, fileType: string): boolean => {
    if (fileType && fileType.startsWith('image/')) return true;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
  };

  // Helper to get matching document icon
  const getFileIcon = (fileName: string, fileType: string) => {
    if (isImageFile(fileName, fileType)) {
      return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    }
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  };

  // Handle File Selection with auto evidence type suggestion
  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validation = ServiceDeskService.validateAttachmentFile(file, visibility, userSession.role);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file.');
      setSelectedFile(null);
      return;
    }

    setUploadError('');
    setSelectedFile(file);

    // Auto-detect sensible evidence type default
    const isImg = isImageFile(file.name, file.type);
    if (isImg) {
      setEvidenceType('PHOTO');
    } else if (file.name.toLowerCase().includes('report') || file.name.toLowerCase().includes('service')) {
      setEvidenceType('SERVICE_REPORT');
    } else if (file.name.toLowerCase().includes('inspect')) {
      setEvidenceType('INSPECTION');
    } else if (file.name.toLowerCase().includes('complete') || file.name.toLowerCase().includes('close')) {
      setEvidenceType('COMPLETION');
    } else {
      setEvidenceType('DOCUMENT');
    }
  };

  // Upload Evidence Action
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !activeCompany || !ticket) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const res = await ServiceDeskService.uploadTicketAttachment(
        userSession,
        activeCompany.companyId,
        ticket.id,
        selectedFile,
        {
          evidenceType,
          notes: notes.trim(),
          visibility
        }
      );

      if (!res.success) {
        setUploadError(res.error || 'Failed to upload evidence attachment.');
      } else {
        setShowUploadModal(false);
        setSelectedFile(null);
        setNotes('');
        setVisibility('CLIENT_VISIBLE');
        setEvidenceType('PHOTO');
      }
    } catch (err: any) {
      setUploadError(err.message || 'An unexpected upload error occurred.');
    } finally {
      setIsUploading(false);
    }
  };

  // Archive Evidence Action
  const handleArchive = async () => {
    if (!archivingAttachment || !activeCompany || !ticket) return;

    setIsArchiving(true);
    const dismiss = showLoading('Archiving evidence attachment...');
    try {
      const res = await ServiceDeskService.archiveTicketAttachment(
        userSession,
        activeCompany.companyId,
        ticket.id,
        archivingAttachment.id,
        archiveReason
      );
      dismiss();

      if (!res.success) {
        showError(res.error || 'Failed to archive evidence.');
      } else {
        setArchivingAttachment(null);
        setArchiveReason('');
        showSuccess('✓ Attachment archived successfully.');
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to archive evidence');
    } finally {
      setIsArchiving(false);
    }
  };

  // Update Metadata Action
  const handleUpdateMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttachment || !activeCompany || !ticket) return;

    setIsUpdating(true);
    const dismiss = showLoading('Updating evidence metadata...');
    try {
      const res = await ServiceDeskService.updateAttachmentMetadata(
        userSession,
        activeCompany.companyId,
        ticket.id,
        editingAttachment.id,
        {
          notes: editNotes.trim(),
          evidenceType: editType,
          visibility: editVisibility
        }
      );
      dismiss();

      if (!res.success) {
        showError(res.error || 'Failed to update metadata.');
      } else {
        setEditingAttachment(null);
        showSuccess('✓ Attachment metadata updated successfully.');
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to update metadata');
    } finally {
      setIsUpdating(false);
    }
  };

  // Stats Calculations
  const photoCount = attachments.filter(a => a.evidenceType === 'PHOTO' || isImageFile(a.fileName, a.fileType)).length;
  const reportCount = attachments.filter(a => a.evidenceType === 'SERVICE_REPORT' || a.evidenceType === 'DOCUMENT').length;
  const completionCount = attachments.filter(a => a.evidenceType === 'COMPLETION').length;
  const clientVisibleCount = attachments.filter(a => a.visibility === 'CLIENT_VISIBLE').length;
  const internalOnlyCount = attachments.filter(a => a.visibility === 'INTERNAL').length;

  // Filtered Attachments
  const filteredAttachments = attachments
    .filter(a => {
      if (filterType === 'PHOTOS') return a.evidenceType === 'PHOTO' || isImageFile(a.fileName, a.fileType);
      if (filterType === 'REPORTS') return a.evidenceType === 'SERVICE_REPORT' || a.evidenceType === 'DOCUMENT';
      if (filterType === 'COMPLETION') return a.evidenceType === 'COMPLETION';
      if (filterType === 'CLIENT') return a.visibility === 'CLIENT_VISIBLE';
      if (filterType === 'INTERNAL') return a.visibility === 'INTERNAL';
      return true;
    })
    .filter(a => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.fileName.toLowerCase().includes(q) ||
        (a.notes && a.notes.toLowerCase().includes(q)) ||
        a.uploadedByName.toLowerCase().includes(q) ||
        a.evidenceType.toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-4">
      {/* Header & Stats Bar */}
      <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-black dark:text-white dark:text-slate-100 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-500" />
              Evidence & Attachments Vault
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Secure proof, inspection records, service reports, and site photos associated with #{ticket.ticketNumber}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setUploadError('');
              setNotes('');
              setShowUploadModal(true);
            }}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Evidence</span>
          </button>
        </div>

        {/* Quick Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <ImageIcon className="w-4 h-4 text-indigo-500" />
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Photos</span>
              <span className="font-bold text-black dark:text-slate-200">{photoCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <FileText className="w-4 h-4 text-blue-500" />
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Reports & Docs</span>
              <span className="font-bold text-black dark:text-slate-200">{reportCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <FileCheck className="w-4 h-4 text-emerald-500" />
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Completion Proof</span>
              <span className="font-bold text-black dark:text-slate-200">{completionCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <Unlock className="w-4 h-4 text-emerald-500" />
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Client Visible</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{clientVisibleCount}</span>
            </div>
          </div>

          {isStaff && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <Lock className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Internal Only</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{internalOnlyCount}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and View Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              filterType === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 hover:text-black dark:hover:text-slate-200'
            }`}
          >
            All ({attachments.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('PHOTOS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              filterType === 'PHOTOS'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 hover:text-black dark:hover:text-slate-200'
            }`}
          >
            Photos ({photoCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('REPORTS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              filterType === 'REPORTS'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-slate-500 hover:text-black dark:hover:text-slate-200'
            }`}
          >
            Reports & Docs ({reportCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('CLIENT')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              filterType === 'CLIENT'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                : 'text-slate-500 hover:text-black dark:hover:text-slate-200'
            }`}
          >
            Client Visible ({clientVisibleCount})
          </button>
          {isStaff && (
            <button
              type="button"
              onClick={() => setFilterType('INTERNAL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                filterType === 'INTERNAL'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-xs'
                  : 'text-slate-500 hover:text-black dark:hover:text-slate-200'
              }`}
            >
              <Lock className="w-3 h-3" />
              Internal ({internalOnlyCount})
            </button>
          )}
        </div>

        {/* Search & Grid/List Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-8.5 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40 sm:w-56 ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
              }`}
            />
          </div>

          <div className="flex items-center border rounded-xl overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              title="Grid View"
              className={`p-1.5 transition ${viewMode === 'GRID' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              title="List View"
              className={`p-1.5 transition ${viewMode === 'LIST' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Evidence Items Display */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
          Loading evidence vault...
        </div>
      ) : filteredAttachments.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-2xl border-slate-200 dark:border-slate-800 p-6">
          <UploadCloud className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 dark:text-slate-400 mb-2" />
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">No Evidence Records Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {searchQuery || filterType !== 'ALL' 
              ? 'No attachments match your current search or filter criteria.' 
              : 'Attach site inspection photos, contractor service reports, and completion sign-offs to this ticket.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setUploadError('');
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition border border-indigo-200/50 dark:border-indigo-800/40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload First Evidence</span>
          </button>
        </div>
      ) : viewMode === 'GRID' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {filteredAttachments.map((att) => {
            const isImg = isImageFile(att.fileName, att.fileType);
            const canManage = userSession && (
              att.uploadedByUserId === userSession.userId || 
              ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN'].includes(userSession.role)
            );

            return (
              <div
                key={att.id}
                className={`group relative rounded-xl border overflow-hidden flex flex-col transition-all hover:shadow-md ${
                  isDark ? 'bg-slate-850/80 border-slate-750 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {/* Media Preview or Icon Header */}
                <div className="relative h-32 bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden border-b border-slate-200/70 dark:border-slate-800">
                  {isImg ? (
                    <img
                      src={att.downloadUrl}
                      alt={att.fileName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      onClick={() => setPreviewAttachment(att)}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 p-4 text-center">
                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700">
                        {getFileIcon(att.fileName, att.fileType)}
                      </div>
                      <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                        {att.fileName.split('.').pop() || 'FILE'}
                      </span>
                    </div>
                  )}

                  {/* Overlay Action Buttons on Hover */}
                  <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-2xs">
                    {isImg && (
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment(att)}
                        title="Preview Image"
                        className="p-2 rounded-xl bg-white dark:bg-slate-900/90 text-black dark:text-slate-200 hover:bg-white shadow-md transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <a
                      href={att.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={att.fileName}
                      title="Download / Open"
                      className="p-2 rounded-xl bg-white dark:bg-slate-900/90 text-black dark:text-slate-200 hover:bg-white shadow-md transition"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Badges on Top */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap max-w-[85%]">
                    <span className="px-2 py-0.5 text-[9px] rounded-md font-bold bg-slate-900/80 text-white backdrop-blur-xs uppercase tracking-wide">
                      {att.evidenceType.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2">
                    {att.visibility === 'INTERNAL' ? (
                      <span className="p-1 rounded-md bg-amber-500/90 text-amber-950 font-bold text-[9px] flex items-center shadow-xs" title="Internal Staff Only">
                        <Lock className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="p-1 rounded-md bg-emerald-500/90 text-emerald-950 font-bold text-[9px] flex items-center shadow-xs" title="Client Visible">
                        <Unlock className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata Body */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h5 className="text-xs font-bold text-black dark:text-white dark:text-slate-100 truncate" title={att.fileName}>
                      {att.fileName}
                    </h5>
                    
                    {att.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 italic leading-relaxed">
                        "{att.notes}"
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{att.uploadedByName}</span>
                      <span>•</span>
                      <span>{formatFileSize(att.fileSize)}</span>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAttachment(att);
                            setEditNotes(att.notes || '');
                            setEditType(att.evidenceType);
                            setEditVisibility(att.visibility);
                          }}
                          title="Edit Details"
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-400 hover:text-indigo-600 rounded transition"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setArchivingAttachment(att);
                            setArchiveReason('');
                          }}
                          title="Archive Evidence"
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-400 hover:text-rose-600 rounded transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-850/80 border-slate-750' : 'bg-white border-slate-200 shadow-2xs'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                isDark ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-white text-slate-500'
              }`}>
                <tr>
                  <th className="py-2.5 px-3">File / Document</th>
                  <th className="py-2.5 px-3">Evidence Type</th>
                  <th className="py-2.5 px-3">Visibility</th>
                  <th className="py-2.5 px-3">Uploaded By</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAttachments.map((att) => {
                  const isImg = isImageFile(att.fileName, att.fileType);
                  const canManage = userSession && (
                    att.uploadedByUserId === userSession.userId || 
                    ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN'].includes(userSession.role)
                  );

                  return (
                    <tr key={att.id} className="hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                            {getFileIcon(att.fileName, att.fileType)}
                          </div>
                          <div className="min-w-0">
                            <span 
                              onClick={() => isImg && setPreviewAttachment(att)}
                              className={`font-semibold text-black dark:text-slate-100 block truncate max-w-xs ${isImg ? 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400' : ''}`}
                            >
                              {att.fileName}
                            </span>
                            {att.notes && (
                              <span className="text-[11px] text-slate-400 block truncate max-w-xs italic">
                                {att.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-300 uppercase">
                          {att.evidenceType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {att.visibility === 'INTERNAL' ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center gap-1 w-fit">
                            <Lock className="w-2.5 h-2.5" /> INTERNAL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 w-fit">
                            <Unlock className="w-2.5 h-2.5" /> CLIENT VISIBLE
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 dark:text-slate-300">
                        {att.uploadedByName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {new Date(att.createdAt || att.uploadedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-xs">
                        {formatFileSize(att.fileSize)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isImg && (
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-400 hover:text-indigo-600 rounded"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <a
                            href={att.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={att.fileName}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-400 hover:text-indigo-600 rounded"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAttachment(att);
                                  setEditNotes(att.notes || '');
                                  setEditType(att.evidenceType);
                                  setEditVisibility(att.visibility);
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-400 hover:text-indigo-600 rounded"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setArchivingAttachment(att);
                                  setArchiveReason('');
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-400 hover:text-rose-600 rounded"
                                title="Archive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UPLOAD EVIDENCE MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-black'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-100 bg-white'}`}>
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-500" />
                <h3 className="font-bold text-sm">Upload Evidence or Report</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-5 space-y-4 text-xs">
              {uploadError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Drag & Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
                  isDragOver 
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30' 
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : isDark 
                    ? 'border-slate-700 hover:border-slate-600 bg-slate-800/40' 
                    : 'border-slate-300 hover:border-slate-400 bg-white/50'
                }`}
              >
                <input
                  type="file"
                  id="evidence-file-input"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-black dark:text-white dark:text-slate-100 block truncate max-w-xs mx-auto">
                        {selectedFile.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Document'}
                      </span>
                    </div>
                    <label
                      htmlFor="evidence-file-input"
                      className="inline-block px-2.5 py-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Choose a different file
                    </label>
                  </div>
                ) : (
                  <label htmlFor="evidence-file-input" className="cursor-pointer block space-y-2">
                    <UploadCloud className="w-8 h-8 mx-auto text-indigo-500" />
                    <div>
                      <span className="font-semibold text-black dark:text-slate-200">
                        Click to browse or drag & drop evidence file
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Supports Photos (JPG, PNG, WebP), PDFs, Office Docs, Inspection Sheets (Max 15MB)
                      </span>
                    </div>
                  </label>
                )}
              </div>

              {/* Evidence Type */}
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
                  Evidence Classification *
                </label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as TicketEvidenceType)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                  }`}
                >
                  <option value="PHOTO">Site / Defect Photo (Visual Proof)</option>
                  <option value="SERVICE_REPORT">Service / Maintenance Report (PDF/Doc)</option>
                  <option value="INSPECTION">Inspection / Audit Checklist</option>
                  <option value="COMPLETION">Resolution / Completion Sign-Off Proof</option>
                  <option value="CLIENT_DOCUMENT">Client Provided Material / Specs</option>
                  <option value="OTHER">Other Operational Document</option>
                </select>
              </div>

              {/* Visibility Setting */}
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
                  Audience & Visibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility('CLIENT_VISIBLE')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                      visibility === 'CLIENT_VISIBLE'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <Unlock className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="font-bold text-xs block">Client Visible</span>
                      <span className="text-[9px] text-slate-400">Accessible in client portal</span>
                    </div>
                  </button>

                  {isStaff ? (
                    <button
                      type="button"
                      onClick={() => setVisibility('INTERNAL')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                        visibility === 'INTERNAL'
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <span className="font-bold text-xs block">Internal Only</span>
                        <span className="text-[9px] text-slate-400">Staff & Ops only</span>
                      </div>
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 opacity-50 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span className="text-[11px] text-slate-400">Internal restricted to staff</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes / Caption */}
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
                  Notes & Captions (Optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. Photo taken after replacing the main intake gasket."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                  className="px-3.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-1.5 disabled:opacity-50 transition shadow-sm"
                >
                  {isUploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading & Securing...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload to Vault</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX PREVIEW MODAL */}
      {previewAttachment && (
        <div 
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          onClick={() => setPreviewAttachment(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close / Actions */}
            <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
              <a
                href={previewAttachment.downloadUrl}
                target="_blank"
                rel="noreferrer"
                download={previewAttachment.fileName}
                className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white transition backdrop-blur-xs"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white transition backdrop-blur-xs"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image display */}
            <img
              src={previewAttachment.downloadUrl}
              alt={previewAttachment.fileName}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl border border-slate-800"
            />

            {/* Caption & Details Footer */}
            <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 text-white border border-slate-800 max-w-xl text-center w-full backdrop-blur-md">
              <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
                <span className="font-bold text-xs">{previewAttachment.fileName}</span>
                <span className="px-2 py-0.5 text-[9px] rounded font-bold bg-indigo-600/80 text-indigo-100 uppercase">
                  {previewAttachment.evidenceType.replace('_', ' ')}
                </span>
                {previewAttachment.visibility === 'INTERNAL' ? (
                  <span className="px-2 py-0.5 text-[9px] rounded font-bold bg-amber-500/30 text-amber-300 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> INTERNAL
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[9px] rounded font-bold bg-emerald-500/30 text-emerald-300 flex items-center gap-1">
                    <Unlock className="w-2.5 h-2.5" /> CLIENT VISIBLE
                  </span>
                )}
              </div>
              {previewAttachment.notes && (
                <p className="text-xs text-slate-300 italic mb-1.5">
                  "{previewAttachment.notes}"
                </p>
              )}
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-3">
                <span>By {previewAttachment.uploadedByName}</span>
                <span>•</span>
                <span>{new Date(previewAttachment.createdAt || previewAttachment.uploadedAt).toLocaleString()}</span>
                <span>•</span>
                <span>{formatFileSize(previewAttachment.fileSize)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT METADATA MODAL */}
      {editingAttachment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-black'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-100 bg-white'}`}>
              <h3 className="font-bold text-sm">Edit Evidence Details</h3>
              <button onClick={() => setEditingAttachment(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateMetadata} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
                  Evidence Classification
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as TicketEvidenceType)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                  }`}
                >
                  <option value="PHOTO">Site / Defect Photo</option>
                  <option value="SERVICE_REPORT">Service / Maintenance Report</option>
                  <option value="INSPECTION">Inspection / Audit Record</option>
                  <option value="COMPLETION">Completion Proof</option>
                  <option value="CLIENT_DOCUMENT">Client Document</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {isStaff && (
                <div>
                  <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
                    Visibility
                  </label>
                  <select
                    value={editVisibility}
                    onChange={(e) => setEditVisibility(e.target.value as 'CLIENT_VISIBLE' | 'INTERNAL')}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                    }`}
                  >
                    <option value="CLIENT_VISIBLE">Client Visible (Accessible in portal)</option>
                    <option value="INTERNAL">Internal Only (Staff & Ops only)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
                  Notes & Captions
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAttachment(null)}
                  disabled={isUpdating}
                  className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold disabled:opacity-50 shadow-sm"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archivingAttachment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-black'
          }`}>
            <div className="p-4 border-b border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-4 h-4" />
                <h3 className="font-bold text-sm">Archive Evidence Record</h3>
              </div>
              <button onClick={() => setArchivingAttachment(null)} className="p-1 hover:bg-rose-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-400 dark:text-slate-300">
                Are you sure you want to archive <strong>"{archivingAttachment.fileName}"</strong>? This will remove it from active views while maintaining the immutable audit trail.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
                  Reason for Archival *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Replaced by higher resolution photo"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setArchivingAttachment(null)}
                  disabled={isArchiving}
                  className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={isArchiving || !archiveReason.trim()}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-sm"
                >
                  {isArchiving ? 'Archiving...' : 'Confirm Archival'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

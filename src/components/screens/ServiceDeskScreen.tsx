import React, { useState, useEffect } from 'react';
import { 
  UserSession, 
  CompanyTenant, 
  ServiceTicketRecord, 
  ServiceTicketStatus, 
  ServiceTicketPriority, 
  ServiceTicketCategory,
  TicketCommentRecord,
  SiteRecord,
  ClientRecord,
  PhaseAScreen,
  EmployeeRecord,
  TicketCategoryRecord,
  TicketSlaPauseReason,
  TicketStatusDefinition
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { ServiceDeskService } from '../../services/serviceDeskService';
import { ServiceSlaEngine } from '../../services/serviceSlaEngine';
import { ServiceDeskCategoryManager } from './ServiceDeskCategoryManager';
import { ServiceDeskSlaPolicyManager } from './ServiceDeskSlaPolicyManager';
import { ServiceDeskSlaAnalytics } from './ServiceDeskSlaAnalytics';
import { ServiceDeskSatisfactionAnalytics } from './ServiceDeskSatisfactionAnalytics';
import { ServiceDeskEvidenceVault } from './ServiceDeskEvidenceVault';
import { ServiceDeskTransitionModal } from './ServiceDeskTransitionModal';
import { ServiceDeskStatusTimeline } from './ServiceDeskStatusTimeline';
import { ServiceDeskResolutionView } from './ServiceDeskResolutionView';
import { ServiceDeskResolutionModal } from './ServiceDeskResolutionModal';
import { ServiceDeskReopenModal } from './ServiceDeskReopenModal';
import { ServiceDeskFeedbackModal } from './ServiceDeskFeedbackModal';
import { ServiceDeskFeedbackView } from './ServiceDeskFeedbackView';
import { StorageService } from '../../services/storageService';
import { OfflineSyncService } from '../../services/offlineSyncService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';
import { 
  LifeBuoy, 
  Plus, 
  Search, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare, 
  Star, 
  User, 
  MapPin, 
  Building2, 
  X, 
  Send, 
  RefreshCw, 
  ShieldAlert,
  ShieldCheck,
  Award,
  PauseCircle,
  PlayCircle,
  BarChart3,
  Sliders,
  History,
  Info,
  Paperclip,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  Filter,
  FileText,
  ExternalLink,
  File,
  Check,
  Tag
} from 'lucide-react';

interface ServiceDeskScreenProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
  onNavigate?: (screen: PhaseAScreen) => void;
}

export const ServiceDeskScreen: React.FC<ServiceDeskScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError, confirm } = useFeedback();
  const [tickets, setTickets] = useState<ServiceTicketRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  
  // Modals & Sub-views
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicketRecord | null>(null);
  const [comments, setComments] = useState<TicketCommentRecord[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [isInternalComment, setIsInternalComment] = useState<boolean>(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  const [commentFilter, setCommentFilter] = useState<'ALL' | 'CLIENT' | 'INTERNAL'>('ALL');
  const [commentSearch, setCommentSearch] = useState<string>('');
  const [editingComment, setEditingComment] = useState<TicketCommentRecord | null>(null);
  const [editCommentText, setEditCommentText] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [archivingComment, setArchivingComment] = useState<TicketCommentRecord | null>(null);
  const [archiveReason, setArchiveReason] = useState<string>('');
  const [isArchiving, setIsArchiving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [declineReason, setDeclineReason] = useState<string>('');
  const [isDeclining, setIsDeclining] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // SLA Management Modals & State
  const [showSlaPolicyManager, setShowSlaPolicyManager] = useState<boolean>(false);
  const [showSlaAnalytics, setShowSlaAnalytics] = useState<boolean>(false);
  const [showSatisfactionAnalytics, setShowSatisfactionAnalytics] = useState<boolean>(false);
  const [isPausingSla, setIsPausingSla] = useState<boolean>(false);
  const [pauseReason, setPauseReason] = useState<TicketSlaPauseReason>('WAITING_ON_CLIENT');
  const [pauseNotes, setPauseNotes] = useState<string>('');

  // Ticket Detail View Tabs (Point 6: Comments vs Point 7: Evidence Vault vs Point 8: Status Lifecycle vs Point 9: Resolution vs Point 11: Client Feedback)
  const [modalTab, setModalTab] = useState<'COMMENTS' | 'EVIDENCE' | 'STATUS_HISTORY' | 'RESOLUTION' | 'FEEDBACK'>('COMMENTS');
  const [evidenceCount, setEvidenceCount] = useState<number>(0);

  // Status Workflow Transition Modal (Point 8)
  const [transitionTargetDef, setTransitionTargetDef] = useState<TicketStatusDefinition | null>(null);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState<boolean>(false);

  // Resolution Modal (Point 9)
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState<boolean>(false);

  // Service Ticket Reopen Modal (Point 10)
  const [isReopenModalOpen, setIsReopenModalOpen] = useState<boolean>(false);

  // Client Feedback Modal (Point 11)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);

  // New ticket form
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: ServiceTicketCategory;
    priority: ServiceTicketPriority;
    attachments: File[];
    siteId: string;
    clientId: string;
  }>({
    title: '',
    description: '',
    category: '',
    priority: 'MEDIUM',
    siteId: '',
    clientId: '',
    attachments: [],
  });

  const [savingTicket, setSavingTicket] = useState<boolean>(false);
  const [closeRating, setCloseRating] = useState<number>(5);
  const [categories, setCategories] = useState<TicketCategoryRecord[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState<boolean>(false);
  const [priorityConfigs, setPriorityConfigs] = useState<import('../../types').ServicePriorityConfigRecord[]>([]);
  const [isChangingPriority, setIsChangingPriority] = useState<boolean>(false);
  const [priorityChangeReason, setPriorityChangeReason] = useState<string>('');
  const [newPriorityValue, setNewPriorityValue] = useState<string>('');
  const [closeFeedback, setCloseFeedback] = useState<string>('');
  const [resolutionSummary, setResolutionSummary] = useState<string>('');

  const fetchTickets = async () => {
    if (!activeCompany || !userSession) return;
    try {
      const data = await ServiceDeskService.getTickets(userSession, activeCompany.companyId);
      setTickets(data);
    } catch (e) {
      console.warn('Failed to load tickets', e);
    }
  };

  useEffect(() => {
    if (!activeCompany) return;

    setLoading(true);

    const fetchConfigs = async () => {
      try {
        const configs = await ServiceDeskService.getPriorityConfigs(userSession!, activeCompany.companyId);
        if (configs.length === 0) {
          await ServiceDeskService.initializeDefaultPriorities(activeCompany.companyId, userSession!.userId);
          const c2 = await ServiceDeskService.getPriorityConfigs(userSession!, activeCompany.companyId);
          setPriorityConfigs(c2);
        } else {
          setPriorityConfigs(configs);
        }
      } catch (e) {}
    };
    if (userSession) fetchConfigs();

    // Fetch master data
    const unsubSites = FirestoreService.subscribeToSites(activeCompany.companyId, (s) => setSites(s));
    const unsubClients = FirestoreService.subscribeToClients(userSession!, activeCompany.companyId, (c: ClientRecord[]) => setClients(c));
    const unsubCategories = ServiceDeskService.subscribeToCategories(activeCompany.companyId, (cats) => {
      setCategories(cats);
      if (cats.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: cats[0].id }));
      }
    });

    const unsubEmployees = FirestoreService.subscribeToEmployees(userSession!, activeCompany.companyId, (emps: EmployeeRecord[]) => {
      setEmployees(emps.filter(e => e.status === 'ACTIVE'));
    });

    // Real-time tickets subscription via FirestoreService
    const unsubTickets = FirestoreService.subscribeToServiceTickets(activeCompany.companyId, (tList) => {
      setTickets(tList);
      setLoading(false);
      // Keep selected ticket in sync
      if (selectedTicket) {
        const refreshed = tList.find(t => t.id === selectedTicket.id);
        if (refreshed) setSelectedTicket(refreshed);
      }
    });

    return () => {
      unsubSites();
      unsubClients();
      unsubTickets();
      unsubCategories();
      unsubEmployees();
    };
  }, [activeCompany?.companyId]);

  // Load comments when a ticket is selected
  useEffect(() => {
    if (!activeCompany || !selectedTicket) {
      setComments([]);
      return;
    }

    const unsubComments = FirestoreService.subscribeToTicketComments(
      activeCompany.companyId,
      selectedTicket.id,
      (cList) => setComments(cList),
      userSession?.role
    );

    const unsubAttachments = FirestoreService.subscribeToTicketAttachments(
      activeCompany.companyId,
      selectedTicket.id,
      (aList) => setEvidenceCount(aList.length),
      userSession?.role
    );

    return () => {
      unsubComments();
      unsubAttachments();
    };
  }, [activeCompany?.companyId, selectedTicket?.id, userSession?.role]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !userSession) return;

    if (!formData.title.trim() || !formData.category || !formData.siteId) {
      showValidationFailed('Please fill all required fields (Title, Category, and Site Location).');
      return;
    }

    setSavingTicket(true);
    const dismiss = showLoading('Creating service ticket...');
    try {
      const selectedSite = sites.find(s => s.id === formData.siteId);
      const siteClient = clients.find(c => c.legalName === selectedSite?.clientName || c.displayName === selectedSite?.clientName);
      const selectedClient = formData.clientId ? clients.find(c => c.id === formData.clientId) : siteClient;

      const res = await ServiceDeskService.createTicket(userSession, activeCompany.companyId, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        siteId: formData.siteId,
        siteName: selectedSite?.name || selectedSite?.siteName || 'Unknown Site',
        clientId: selectedClient?.id || 'UNKNOWN_CLIENT',
        clientName: selectedClient?.legalName || selectedClient?.displayName || selectedSite?.clientName || 'General Client',
        source: 'WEB'
      });

      dismiss();
      if (!res.success) {
        showError(res.error || 'Failed to create ticket.');
      } else {
        // If initial attachments were selected, securely upload them to the ticket evidence vault
        if (res.ticket && formData.attachments && formData.attachments.length > 0) {
          for (const file of formData.attachments) {
            try {
              const ext = file.name.split('.').pop()?.toLowerCase() || '';
              const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
              await ServiceDeskService.uploadTicketAttachment(
                userSession,
                activeCompany.companyId,
                res.ticket.id,
                file,
                {
                  evidenceType: isImg ? 'PHOTO' : 'DOCUMENT',
                  visibility: 'CLIENT_VISIBLE',
                  notes: 'Initial ticket submission attachment'
                }
              );
            } catch (attErr) {
              console.warn('Initial attachment upload warning:', attErr);
            }
          }
        }

        setIsCreateModalOpen(false);
        setFormData({
          title: '',
          description: '',
          category: categories[0]?.id || '',
          priority: 'MEDIUM',
          siteId: '',
          clientId: '',
          attachments: []
        });
        showSuccess(`✓ Ticket "${formData.title}" created successfully!`);
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Error creating ticket');
    } finally {
      setSavingTicket(false);
    }
  };

  const handleUpdateStatus = async (newStatus: ServiceTicketStatus) => {
    if (!activeCompany || !selectedTicket || !userSession) return;
    setActionLoading(true);

    const res = await ServiceDeskService.updateTicketStatus(
      userSession,
      activeCompany.companyId,
      selectedTicket.id,
      newStatus,
      resolutionSummary
    );

    setActionLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update status.');
    } else {
      setResolutionSummary('');
    }
  };

  const handleAssign = async () => {
    if (!userSession || !activeCompany || !selectedTicket || !selectedAssignee) return;
    setActionLoading(true);
    const emp = employees.find(e => e.id === selectedAssignee);
    const empName = emp ? `${emp.firstName} ${emp.lastName}`.trim() : 'Unknown Employee';
    
    const res = await ServiceDeskService.assignTicket(userSession, activeCompany.companyId, selectedTicket.id, selectedAssignee, empName);
    setActionLoading(false);
    if (res.success) {
      setIsDispatching(false);
      setSelectedAssignee('');
    } else {
      setErrorMsg(res.error || 'Failed to assign ticket.');
    }
  };

  const handleAccept = async () => {
    if (!userSession || !activeCompany || !selectedTicket) return;
    setActionLoading(true);
    const res = await ServiceDeskService.acceptTicket(userSession, activeCompany.companyId, selectedTicket.id);
    setActionLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to accept ticket.');
    }
  };

  const handleDecline = async () => {
    if (!userSession || !activeCompany || !selectedTicket) return;
    if (!declineReason.trim()) {
      setErrorMsg('Decline reason is required.');
      return;
    }
    setActionLoading(true);
    const res = await ServiceDeskService.declineTicket(userSession, activeCompany.companyId, selectedTicket.id, declineReason);
    setActionLoading(false);
    if (res.success) {
      setIsDeclining(false);
      setDeclineReason('');
    } else {
      setErrorMsg(res.error || 'Failed to decline ticket.');
    }
  };

  // SLA Pause & Resume
  const handlePauseSla = async () => {
    if (!userSession || !activeCompany || !selectedTicket) return;
    setActionLoading(true);
    const res = await ServiceDeskService.pauseTicketSla(
      userSession,
      activeCompany.companyId,
      selectedTicket.id,
      pauseReason,
      pauseNotes
    );
    setActionLoading(false);
    if (res.success) {
      setIsPausingSla(false);
      setPauseNotes('');
    } else {
      setErrorMsg(res.error || 'Failed to pause SLA timer.');
    }
  };

  const handleResumeSla = async () => {
    if (!userSession || !activeCompany || !selectedTicket) return;
    setActionLoading(true);
    const res = await ServiceDeskService.resumeTicketSla(
      userSession,
      activeCompany.companyId,
      selectedTicket.id,
      'Resumed by staff'
    );
    setActionLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to resume SLA timer.');
    }
  };

  const canDispatch = userSession && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPERATIONS_MANAGER', 'SITE_MANAGER', 'SUPERVISOR', 'SERVICE_DESK'].includes(userSession?.role as string);
  const isAssignee = selectedTicket?.assignedToUserId === userSession?.userId || selectedTicket?.assignedToUserId === userSession?.employeeId;

  const isStaff = ServiceDeskService.isStaffRole(userSession?.role || '');

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !selectedTicket || !userSession || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      let urls: string[] = [];
      if (commentAttachments.length > 0) {
        for (const file of commentAttachments) {
          try {
            const path = `companies/${activeCompany.companyId}/serviceTickets/${selectedTicket.id}/comments/${Date.now()}_${file.name}`;
            const url = await StorageService.uploadFile(path, file, userSession);
            urls.push(url);
          } catch (uploadErr) {
            console.warn('Attachment upload failed or skipped:', uploadErr);
          }
        }
      }

      // Check online status for offline queueing
      if (!navigator.onLine) {
        const commentId = `comm-off-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const localComment: TicketCommentRecord = {
          id: commentId,
          ticketId: selectedTicket.id,
          companyId: activeCompany.companyId,
          clientId: selectedTicket.clientId,
          siteId: selectedTicket.siteId,
          authorUserId: userSession.userId,
          authorName: userSession.fullName || userSession.email || 'User',
          authorRole: userSession.role,
          comment: newComment.trim(),
          isInternalOnly: Boolean(isInternalComment),
          visibility: isInternalComment ? 'INTERNAL' : 'CLIENT_VISIBLE',
          attachmentUrls: urls,
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        };

        OfflineSyncService.queueAction('SERVICE_TICKET_COMMENT', {
          companyId: activeCompany.companyId,
          ticketId: selectedTicket.id,
          comment: localComment
        });

        setComments(prev => [...prev, localComment]);
        setNewComment('');
        setCommentAttachments([]);
        setIsInternalComment(false);
        return;
      }
      
      const res = await ServiceDeskService.addComment(
        userSession, 
        activeCompany.companyId, 
        selectedTicket.id, 
        newComment.trim(), 
        isInternalComment, 
        urls
      );

      if (!res.success) {
        showError(res.error || 'Failed to post comment.');
      } else {
        setNewComment('');
        setCommentAttachments([]);
        setIsInternalComment(false);
        showSuccess('✓ Comment posted.');
      }
    } catch (err: any) {
      console.error('Failed to add comment:', err);
      handleError(err, '✕ Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEditComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !selectedTicket || !userSession || !editingComment || !editCommentText.trim()) return;

    setIsSavingEdit(true);
    try {
      const res = await ServiceDeskService.editComment(
        userSession,
        activeCompany.companyId,
        selectedTicket.id,
        editingComment.id,
        editCommentText.trim()
      );
      if (!res.success) {
        showError(res.error || 'Failed to edit comment.');
      } else {
        setEditingComment(null);
        setEditCommentText('');
        showSuccess('✓ Comment updated.');
      }
    } catch (err: any) {
      console.error('Error editing comment:', err);
      handleError(err, '✕ Failed to edit comment');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleArchiveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !selectedTicket || !userSession || !archivingComment) return;

    setIsArchiving(true);
    try {
      const res = await ServiceDeskService.archiveComment(
        userSession,
        activeCompany.companyId,
        selectedTicket.id,
        archivingComment.id,
        archiveReason.trim()
      );
      if (!res.success) {
        showError(res.error || 'Failed to archive comment.');
      } else {
        setArchivingComment(null);
        setArchiveReason('');
        showSuccess('✓ Comment archived.');
      }
    } catch (err: any) {
      console.error('Error archiving comment:', err);
      handleError(err, '✕ Failed to archive comment');
    } finally {
      setIsArchiving(false);
    }
  };

  // Metrics computation
  const openCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'REOPENED').length;
  const criticalCount = tickets.filter(t => t.priority === 'CRITICAL' && t.status !== 'CLOSED').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const slaBreachedCount = tickets.filter(t => {
    if (t.status === 'CLOSED' || t.status === 'RESOLVED') return t.isSlaBreached;
    return t.isSlaBreached || new Date(t.resolutionDueTime || t.slaDueTime).getTime() < Date.now();
  }).length;

  const getSeverity = (priorityCode: string) => {
    const config = priorityConfigs.find(c => c.code === priorityCode);
    if (config) return config.severity;
    switch (priorityCode) {
      case 'CRITICAL': return 1;
      case 'HIGH': return 2;
      case 'MEDIUM': return 3;
      case 'LOW': return 4;
      default: return 5;
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  }).sort((a, b) => {
    const sevA = getSeverity(a.priority);
    const sevB = getSeverity(b.priority);
    if (sevA !== sevB) return sevA - sevB;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getCategoryName = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : catId.replace(/_/g, ' ');
  };

  const getPriorityBadge = (priority: ServiceTicketPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">Critical</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">High</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">Medium</span>;
      case 'LOW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">Low</span>;
    }
  };

  const getStatusBadge = (status: ServiceTicketStatus) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">Open</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">In Progress</span>;
      case 'PENDING_CLIENT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">Pending Client</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Resolved</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Closed</span>;
      case 'REOPENED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">Reopened</span>;
      case 'ASSIGNED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">Assigned</span>;
      case 'ACCEPTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">Accepted</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getSlaStatusBadge = (t: ServiceTicketRecord) => {
    const isPaused = t.resolutionSlaStatus === 'PAUSED' || !!t.lastPausedAt;
    const isBreached = t.isSlaBreached || t.resolutionSlaStatus === 'BREACHED' || (
      !['RESOLVED', 'CLOSED'].includes(t.status) && new Date(t.resolutionDueTime || t.slaDueTime).getTime() < Date.now()
    );
    const isWarning = t.resolutionSlaStatus === 'WARNING' || t.slaWarningTriggered;
    const isMet = t.resolutionSlaStatus === 'MET' || (t.status === 'RESOLVED' && !t.isSlaBreached);

    if (isPaused) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
          <PauseCircle className="w-3 h-3" /> Paused ({t.totalPausedDurationMinutes || 0}m)
        </span>
      );
    }

    if (isBreached) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          <AlertTriangle className="w-3 h-3" /> SLA Breached
        </span>
      );
    }

    if (isWarning) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <Clock className="w-3 h-3" /> Near Breach (Warning)
        </span>
      );
    }

    if (isMet) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" /> SLA Met
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
        <Clock className="w-3 h-3" /> Active SLA
      </span>
    );
  };

  return (
    <div className={`p-4 md:p-6 space-y-6 min-h-screen ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Client Service Desk & SLA</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Module 11: Enterprise Client Service Management, Real-time Ticket SLA & Resolution
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Satisfaction (CSAT) Analytics */}
          <button
            onClick={() => setShowSatisfactionAnalytics(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Star className="w-4 h-4" />
            <span>CSAT Metrics</span>
          </button>

          {/* SLA Performance & Analytics */}
          <button
            onClick={() => setShowSlaAnalytics(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <BarChart3 className="w-4 h-4" />
            <span>SLA Performance</span>
          </button>

          {/* Manage SLA Policies */}
          {(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPERATIONS_MANAGER', 'SERVICE_DESK'] as string[]).includes(userSession?.role || '') && (
            <button
              onClick={() => setShowSlaPolicyManager(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Sliders className="w-4 h-4" />
              <span>SLA Policies</span>
            </button>
          )}

          {/* Categories */}
          {(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'] as string[]).includes(userSession?.role || '') && (
            <button
              onClick={() => setShowCategoryManager(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <span>Categories</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Ticket</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Active Tickets</span>
            <LifeBuoy className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{openCount}</p>
          <span className="text-xs text-slate-500">Awaiting resolution</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Critical Priority</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-rose-600 dark:text-rose-400">{criticalCount}</p>
          <span className="text-xs text-slate-500">High priority response</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">SLA Breaches</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-amber-600 dark:text-amber-400">{slaBreachedCount}</p>
          <span className="text-xs text-slate-500">Exceeded SLA target deadline</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Resolved Total</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">{resolvedCount}</p>
          <span className="text-xs text-slate-500">Completed cases</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center gap-3 justify-between ${
        isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ticket #, site, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg text-sm border focus:outline-none ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING_CLIENT">Pending Client (Paused)</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg text-sm border focus:outline-none ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Ticket List Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
            <p>Loading service desk tickets from Firestore...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <LifeBuoy className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="font-bold text-base text-slate-700 dark:text-slate-300">No Tickets Found</h3>
            <p className="text-sm mt-1">There are no client service tickets matching your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`border-b text-xs uppercase font-semibold ${
                isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
              }`}>
                <tr>
                  <th className="p-3.5">Ticket #</th>
                  <th className="p-3.5">Subject & Category</th>
                  <th className="p-3.5">Client & Site</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">SLA Target & Deadline</th>
                  <th className="p-3.5">SLA Status</th>
                  <th className="p-3.5">Workflow Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredTickets.map((t) => {
                  const targetDueDate = new Date(t.resolutionDueTime || t.slaDueTime);
                  const isBreached = t.isSlaBreached || (!['RESOLVED', 'CLOSED'].includes(t.status) && targetDueDate.getTime() < Date.now());

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`cursor-pointer transition ${
                        isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {t.ticketNumber}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{t.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{getCategoryName(t.category)}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{t.siteName}</div>
                        <div className="text-xs text-slate-500">{t.clientName}</div>
                      </td>
                      <td className="p-3.5">
                        {getPriorityBadge(t.priority)}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock className={`w-3.5 h-3.5 ${isBreached ? 'text-rose-500' : 'text-slate-400'}`} />
                          <span className={isBreached ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-300'}>
                            {targetDueDate.toLocaleDateString()} {targetDueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {t.slaPolicyName && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                            {t.slaPolicyName}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {getSlaStatusBadge(t)}
                      </td>
                      <td className="p-3.5">
                        {getStatusBadge(t.status)}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(t);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-semibold rounded-lg transition"
                        >
                          View & Reply
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Details & Discussion Drawer / Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-lg">
                  {selectedTicket.ticketNumber}
                </div>
                {getStatusBadge(selectedTicket.status)}
                {getPriorityBadge(selectedTicket.priority)}
                {getSlaStatusBadge(selectedTicket)}
              </div>
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  setErrorMsg('');
                  setIsPausingSla(false);
                }}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs border border-red-200 dark:border-red-800 flex items-center justify-between">
                  <span>{errorMsg}</span>
                  <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
                </div>
              )}

              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedTicket.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> Client: {selectedTicket.clientName}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Site: {selectedTicket.siteName}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Reported By: {selectedTicket.reportedByName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Logged: {new Date(selectedTicket.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Operational SLA Tracking Panel */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      SLA Target Management & Timer Controls
                    </h4>
                  </div>

                  {/* Pause / Resume Actions */}
                  {['OPEN', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'PENDING_CLIENT'].includes(selectedTicket.status) && (
                    <div className="flex items-center gap-2">
                      {selectedTicket.resolutionSlaStatus === 'PAUSED' || selectedTicket.lastPausedAt ? (
                        <button
                          onClick={handleResumeSla}
                          disabled={actionLoading}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          Resume SLA Timer
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsPausingSla(true)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          Pause SLA Timer (Hold)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750">
                    <span className="text-slate-500 block mb-0.5">Matched Policy</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedTicket.slaPolicyName || 'Default Priority Matrix'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750">
                    <span className="text-slate-500 block mb-0.5">First Response Status</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold ${
                        selectedTicket.responseSlaStatus === 'MET' 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : selectedTicket.responseSlaStatus === 'BREACHED'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {selectedTicket.responseSlaStatus || 'PENDING'}
                      </span>
                      {selectedTicket.respondedAt && (
                        <span className="text-[10px] text-slate-400">
                          ({new Date(selectedTicket.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-slate-500">Resolution Deadline</span>
                      {selectedTicket.reopenCount && selectedTicket.reopenCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                          Cycle #{selectedTicket.reopenCount + 1}
                        </span>
                      ) : null}
                    </div>
                    <span className={`font-bold ${
                      selectedTicket.isSlaBreached 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {new Date(selectedTicket.resolutionDueTime || selectedTicket.slaDueTime).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Pause Form */}
                {isPausingSla && (
                  <div className="mt-3 p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-purple-900 dark:text-purple-300">
                        Pause SLA Countdown (Pending Hold)
                      </span>
                      <button onClick={() => setIsPausingSla(false)} className="text-xs text-slate-500">Cancel</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Hold Reason *
                        </label>
                        <select
                          value={pauseReason}
                          onChange={e => setPauseReason(e.target.value as TicketSlaPauseReason)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        >
                          <option value="WAITING_ON_CLIENT">Waiting on Client Response</option>
                          <option value="WAITING_ON_PARTS">Waiting on Parts / Materials</option>
                          <option value="CLIENT_ACCESS_RESTRICTED">Client Facility Access Restricted</option>
                          <option value="PENDING_EXTERNAL_APPROVAL">Pending External / Regulatory Approval</option>
                          <option value="CHANGE_REQUEST_PENDING">Pending Change Request</option>
                          <option value="OTHER">Other Operational Hold</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Notes / Explanation
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Awaiting client gate pass clearance"
                          value={pauseNotes}
                          onChange={e => setPauseNotes(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={handlePauseSla}
                        disabled={actionLoading}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition disabled:opacity-50"
                      >
                        Confirm SLA Timer Pause
                      </button>
                    </div>
                  </div>
                )}

                {/* Pause History Timeline */}
                {selectedTicket.pauseHistory && selectedTicket.pauseHistory.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 flex items-center gap-1">
                      <History className="w-3 h-3" /> SLA Pause History ({selectedTicket.pauseHistory.length} events)
                    </span>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto">
                      {selectedTicket.pauseHistory.map(ph => (
                        <div key={ph.id} className="text-[11px] p-2 rounded bg-slate-100 dark:bg-slate-800 flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-purple-700 dark:text-purple-400">[{ph.reason}]</span>
                            <span className="text-slate-600 dark:text-slate-300 ml-1.5">{ph.notes || 'No notes'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {ph.pausedDurationMinutes ? `${ph.pausedDurationMinutes}m paused` : 'Active hold'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={`p-4 rounded-xl border text-sm ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Issue Description</h4>
                <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">{selectedTicket.description}</p>
              </div>

              {/* Assignment & Dispatch UI */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Assignment Details</h4>
                {selectedTicket.assignedToUserId ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <User className="w-4 h-4 text-indigo-500" />
                      <strong>Assigned To:</strong> {selectedTicket.assignedToName} 
                      <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full">{selectedTicket.status}</span>
                    </div>
                    {isDeclining ? (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={declineReason}
                          onChange={e => setDeclineReason(e.target.value)}
                          placeholder="Reason for declining..."
                          className="w-full text-sm p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                        />
                        <div className="flex gap-2">
                          <button onClick={handleDecline} disabled={actionLoading} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50">Confirm Decline</button>
                          <button onClick={() => setIsDeclining(false)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold shadow-sm transition">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-1">
                        {selectedTicket.status === 'ASSIGNED' && isAssignee && (
                          <>
                            <button onClick={handleAccept} disabled={actionLoading} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50">Accept Assignment</button>
                            <button onClick={() => setIsDeclining(true)} disabled={actionLoading} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50">Decline</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="text-sm text-slate-500 italic">Unassigned</span>
                  </div>
                )}
                
                {canDispatch && (selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'CANCELLED') && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {selectedTicket.assignedToUserId ? 'Reassign Ticket (Employees)' : 'Dispatch Ticket (Employees)'}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedAssignee}
                        onChange={e => setSelectedAssignee(e.target.value)}
                        className="flex-1 p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Select Employee --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.role}) - {emp.status}</option>
                        ))}
                      </select>
                      <button onClick={handleAssign} disabled={!selectedAssignee || actionLoading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition disabled:opacity-50">
                        {selectedTicket.assignedToUserId ? 'Reassign' : 'Assign'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Action Buttons (Point 8: Service Ticket Status Workflow Engine) */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-indigo-50/50 border-indigo-100'}`}>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Workflow Status Controls</span>
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Current Status:</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      ServiceDeskService.STATUS_DEFINITIONS[ServiceDeskService.normalizeStatus(selectedTicket.status)]?.badgeBg || 'bg-slate-100'
                    } ${
                      ServiceDeskService.STATUS_DEFINITIONS[ServiceDeskService.normalizeStatus(selectedTicket.status)]?.badgeText || 'text-slate-800'
                    } ${
                      ServiceDeskService.STATUS_DEFINITIONS[ServiceDeskService.normalizeStatus(selectedTicket.status)]?.badgeBorder || 'border-slate-300'
                    }`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const isAssigneeUser = selectedTicket.assignedToUserId === userSession?.userId || selectedTicket.assignedToUserId === userSession?.employeeId;
                    const isCreatorUser = selectedTicket.reportedByUserId === userSession?.userId;
                    const availableTransitions = ServiceDeskService.getAvailableTransitions(
                      selectedTicket.status,
                      userSession?.role || 'EMPLOYEE',
                      Boolean(isAssigneeUser),
                      Boolean(isCreatorUser)
                    );

                    if (availableTransitions.length === 0) {
                      return (
                        <div className="w-full py-1 text-xs text-slate-500 italic flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                          <span>No workflow state transitions available in current state ({selectedTicket.status}) for your role.</span>
                        </div>
                      );
                    }

                    return availableTransitions.map(def => {
                      let btnColor = 'bg-indigo-600 hover:bg-indigo-700 text-white';
                      if (def.status === 'IN_PROGRESS') btnColor = 'bg-sky-600 hover:bg-sky-700 text-white';
                      if (def.status === 'ON_HOLD' || def.status === 'PENDING_CLIENT') btnColor = 'bg-amber-600 hover:bg-amber-700 text-white';
                      if (def.status === 'RESOLVED') btnColor = 'bg-emerald-600 hover:bg-emerald-700 text-white';
                      if (def.status === 'CLOSED') btnColor = 'bg-zinc-800 hover:bg-zinc-900 text-white dark:bg-zinc-700 dark:hover:bg-zinc-600';
                      if (def.status === 'REOPENED') btnColor = 'bg-rose-600 hover:bg-rose-700 text-white';
                      if (def.status === 'CANCELLED') btnColor = 'bg-red-600 hover:bg-red-700 text-white';

                      let btnLabel = `Move to ${def.name}`;
                      if (def.status === 'IN_PROGRESS') btnLabel = '▶ Start Work (In Progress)';
                      if (def.status === 'ON_HOLD') btnLabel = '⏸ Put On Hold';
                      if (def.status === 'PENDING_CLIENT') btnLabel = '⏸ Request Client Info';
                      if (def.status === 'RESOLVED') btnLabel = '✓ Mark as Resolved';
                      if (def.status === 'CLOSED') btnLabel = '🛡 Close Ticket (CSAT)';
                      if (def.status === 'REOPENED') btnLabel = '↺ Reopen Ticket';
                      if (def.status === 'CANCELLED') btnLabel = '✕ Cancel Ticket';

                      return (
                        <button
                          key={def.status}
                          type="button"
                          onClick={() => {
                            if (def.status === 'REOPENED') {
                              setIsReopenModalOpen(true);
                            } else {
                              setTransitionTargetDef(def);
                              setIsTransitionModalOpen(true);
                            }
                          }}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 ${btnColor}`}
                          title={def.description}
                          disabled={actionLoading}
                        >
                          <span>{btnLabel}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Tab Navigation: Communication & Activity vs Evidence & Attachments Vault vs Status Lifecycle */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pt-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setModalTab('COMMENTS')}
                  className={`pb-2.5 px-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                    modalTab === 'COMMENTS'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Activity & Comments</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                    modalTab === 'COMMENTS'
                      ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {comments.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('EVIDENCE')}
                  className={`pb-2.5 px-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                    modalTab === 'EVIDENCE'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Paperclip className="w-4 h-4" />
                  <span>Evidence & Attachments Vault</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                    modalTab === 'EVIDENCE'
                      ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {evidenceCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('STATUS_HISTORY')}
                  className={`pb-2.5 px-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                    modalTab === 'STATUS_HISTORY'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Lifecycle & Audit History</span>
                  {selectedTicket.statusHistory && selectedTicket.statusHistory.length > 0 && (
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                      modalTab === 'STATUS_HISTORY'
                        ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {selectedTicket.statusHistory.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('RESOLUTION')}
                  className={`pb-2.5 px-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                    modalTab === 'RESOLUTION'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Resolution & RCA</span>
                  {selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED' ? (
                    <span className="px-2 py-0.5 text-[10px] rounded-full font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      {selectedTicket.verificationStatus === 'VERIFIED' ? 'Verified' : 'Resolved'}
                    </span>
                  ) : selectedTicket.verificationStatus === 'REJECTED' ? (
                    <span className="px-2 py-0.5 text-[10px] rounded-full font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                      Rework
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('FEEDBACK')}
                  className={`pb-2.5 px-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                    modalTab === 'FEEDBACK'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400 dark:border-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Star className="w-4 h-4 fill-current text-amber-500" />
                  <span>Client Feedback</span>
                  {selectedTicket.clientRating ? (
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold flex items-center gap-1 ${
                      selectedTicket.hasNegativeFeedback
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                    }`}>
                      ★ {selectedTicket.clientRating.toFixed(1)}
                    </span>
                  ) : selectedTicket.feedbackStatus === 'REQUESTED' ? (
                    <span className="px-2 py-0.5 text-[10px] rounded-full font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                      Requested
                    </span>
                  ) : null}
                </button>
              </div>

              {modalTab === 'EVIDENCE' ? (
                <ServiceDeskEvidenceVault
                  ticket={selectedTicket}
                  userSession={userSession!}
                  activeCompany={activeCompany!}
                  isStaff={Boolean(isStaff)}
                  onAttachmentCountChange={(cnt) => setEvidenceCount(cnt)}
                />
              ) : modalTab === 'STATUS_HISTORY' ? (
                <ServiceDeskStatusTimeline
                  ticket={selectedTicket}
                  companyId={activeCompany!.companyId}
                  userSession={userSession!}
                />
              ) : modalTab === 'RESOLUTION' ? (
                <ServiceDeskResolutionView
                  ticket={selectedTicket}
                  companyId={activeCompany!.companyId}
                  userSession={userSession!}
                  onOpenResolveModal={() => setIsResolutionModalOpen(true)}
                  onOpenReopenModal={() => setIsReopenModalOpen(true)}
                  onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)}
                  onTicketUpdated={(updatedTicket) => {
                    setSelectedTicket(updatedTicket);
                    fetchTickets();
                  }}
                />
              ) : modalTab === 'FEEDBACK' ? (
                <ServiceDeskFeedbackView
                  ticket={selectedTicket}
                  companyId={activeCompany!.companyId}
                  userSession={userSession!}
                  onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)}
                  onTicketUpdated={(updatedTicket: any) => {
                    setSelectedTicket(updatedTicket);
                    fetchTickets();
                  }}
                />
              ) : (
                /* Comments & Activity Stream (Module 11 / Point 6: Comments & Communication) */
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-indigo-500" /> Activity & Communication Thread
                      </h4>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {comments.length}
                      </span>
                    </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setCommentFilter('ALL')}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${
                        commentFilter === 'ALL'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      All ({comments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommentFilter('CLIENT')}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${
                        commentFilter === 'CLIENT'
                          ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Client Visible ({comments.filter(c => !c.isInternalOnly).length})
                    </button>
                    {isStaff && (
                      <button
                        type="button"
                        onClick={() => setCommentFilter('INTERNAL')}
                        className={`px-2.5 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition ${
                          commentFilter === 'INTERNAL'
                            ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        Internal Notes ({comments.filter(c => c.isInternalOnly).length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Search if many comments */}
                {comments.length > 3 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search messages or authors..."
                      value={commentSearch}
                      onChange={(e) => setCommentSearch(e.target.value)}
                      className={`w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isDark ? 'bg-slate-900/60 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {comments
                    .filter(c => {
                      if (commentFilter === 'CLIENT') return !c.isInternalOnly;
                      if (commentFilter === 'INTERNAL') return c.isInternalOnly;
                      return true;
                    })
                    .filter(c => {
                      if (!commentSearch.trim()) return true;
                      const q = commentSearch.toLowerCase();
                      return (
                        c.comment.toLowerCase().includes(q) ||
                        c.authorName.toLowerCase().includes(q) ||
                        c.authorRole.toLowerCase().includes(q)
                      );
                    }).length === 0 ? (
                    <div className="text-center py-6 border border-dashed rounded-xl border-slate-300 dark:border-slate-800">
                      <MessageSquare className="w-6 h-6 mx-auto text-slate-400 mb-1 opacity-50" />
                      <p className="text-xs text-slate-500 italic">No notes matching filter.</p>
                    </div>
                  ) : (
                    comments
                      .filter(c => {
                        if (commentFilter === 'CLIENT') return !c.isInternalOnly;
                        if (commentFilter === 'INTERNAL') return c.isInternalOnly;
                        return true;
                      })
                      .filter(c => {
                        if (!commentSearch.trim()) return true;
                        const q = commentSearch.toLowerCase();
                        return (
                          c.comment.toLowerCase().includes(q) ||
                          c.authorName.toLowerCase().includes(q) ||
                          c.authorRole.toLowerCase().includes(q)
                        );
                      })
                      .map((comm) => {
                        const canEdit = userSession && (comm.authorUserId === userSession.userId || ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(userSession.role));
                        return (
                          <div
                            key={comm.id}
                            className={`p-3.5 rounded-xl border text-xs transition-all ${
                              comm.isInternalOnly
                                ? isDark 
                                  ? 'bg-amber-950/20 border-amber-800/40 text-amber-100' 
                                  : 'bg-amber-50/80 border-amber-200/90 text-amber-950'
                                : isDark 
                                  ? 'bg-slate-850/80 border-slate-700/80 text-slate-200' 
                                  : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold mb-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold flex items-center gap-1">
                                  {comm.authorName}
                                </span>
                                <span className="px-1.5 py-0.2 text-[9px] rounded font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {comm.authorRole}
                                </span>
                                {comm.isInternalOnly ? (
                                  <span className="px-2 py-0.5 text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-md font-bold flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" /> INTERNAL STAFF NOTE
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-md font-bold flex items-center gap-1">
                                    <Unlock className="w-2.5 h-2.5" /> CLIENT VISIBLE
                                  </span>
                                )}
                                {comm.isEdited && (
                                  <span className="text-[9px] text-slate-400 italic" title={comm.editedAt ? `Edited: ${new Date(comm.editedAt).toLocaleString()}` : 'Edited'}>
                                    (edited)
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-[10px]">
                                  {new Date(comm.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                                {canEdit && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      title="Edit Note"
                                      onClick={() => {
                                        setEditingComment(comm);
                                        setEditCommentText(comm.comment);
                                      }}
                                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Archive Note"
                                      onClick={() => {
                                        setArchivingComment(comm);
                                        setArchiveReason('');
                                      }}
                                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <p className="whitespace-pre-wrap leading-relaxed">{comm.comment}</p>

                            {/* Attachments rendering */}
                            {comm.attachmentUrls && comm.attachmentUrls.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-2">
                                {comm.attachmentUrls.map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/50 dark:border-indigo-800/40 text-[11px] font-medium transition"
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span>Attachment #{idx + 1}</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Quick Canned Response Templates */}
                {isStaff && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" /> Quick Reply Templates:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Technician dispatched to client site for investigation.',
                        'Awaiting client site clearance / access approval.',
                        'Parts ordered; expected delivery within standard window.',
                        'Issue investigated and resolution verified with on-site supervisor.'
                      ].map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewComment(prev => prev ? `${prev}\n${tmpl}` : tmpl)}
                          className="px-2 py-1 text-[10px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 transition"
                        >
                          + {tmpl.substring(0, 32)}...
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Comment Input Composer */}
                <form onSubmit={handleAddComment} className="pt-2 space-y-2">
                  <div className="relative">
                    <textarea
                      rows={3}
                      maxLength={4000}
                      placeholder="Add an update, response or investigation note (up to 4,000 chars)..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <span className="absolute bottom-2 right-3 text-[10px] text-slate-400">
                      {newComment.length} / 4,000
                    </span>
                  </div>

                  {/* Attachments preview row */}
                  {commentAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {commentAttachments.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-1 px-2.5 py-1 bg-slate-200 dark:bg-slate-800 rounded-lg text-xs">
                          <Paperclip className="w-3 h-3 text-slate-400" />
                          <span className="max-w-[150px] truncate">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => setCommentAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="p-0.5 hover:text-rose-500 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-3">
                      {/* File attachment button */}
                      <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span>Attach Files</span>
                        <input
                          type="file"
                          multiple
                          onChange={(e) => {
                            if (e.target.files) {
                              const files = Array.from(e.target.files);
                              setCommentAttachments(prev => [...prev, ...files]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>

                      {/* Internal note checkbox (Staff only) */}
                      {isStaff ? (
                        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isInternalComment}
                            onChange={(e) => setIsInternalComment(e.target.checked)}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
                            <Lock className="w-3 h-3" /> Internal Staff Note (Hidden from Client)
                          </span>
                        </label>
                      ) : (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <Unlock className="w-3 h-3" /> Client Communication
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingComment || !newComment.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                    >
                      {isSubmittingComment ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isInternalComment ? 'Post Internal Note' : 'Post Message'}</span>
                    </button>
                  </div>
                </form>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Comment Modal */}
      {editingComment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-500" /> Edit Comment
              </h3>
              <button onClick={() => setEditingComment(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditComment} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Updated Comment Text *</label>
                <textarea
                  rows={4}
                  required
                  maxLength={4000}
                  value={editCommentText}
                  onChange={(e) => setEditCommentText(e.target.value)}
                  className={`w-full p-3 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-850 border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Editing preserves an immutable version history for compliance audits.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingComment(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editCommentText.trim()}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {isSavingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Comment Modal */}
      {archivingComment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <h3 className="font-bold text-sm flex items-center gap-2 text-rose-600">
                <Trash2 className="w-4 h-4" /> Archive Comment
              </h3>
              <button onClick={() => setArchivingComment(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleArchiveComment} className="p-4 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Are you sure you want to archive this comment? It will be removed from the active discussion thread while maintaining immutable compliance logs.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Reason for Archiving (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Duplicate information, superseded by new SLA agreement"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                    isDark ? 'bg-slate-850 border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setArchivingComment(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isArchiving}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {isArchiving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirm Archive</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <h3 className="font-bold text-lg">Create Service Desk Ticket</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                  Ticket Subject / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Guard replacement requested for night shift"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const catId = e.target.value;
                      const cat = categories.find(c => c.id === catId);
                      setFormData(prev => ({ 
                        ...prev, 
                        category: catId,
                        priority: cat?.defaultPriority ? (cat.defaultPriority as any) : prev.priority
                      }));
                    }}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {categories.filter(c => c.isActive).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.parentId ? '(Subcategory)' : ''}
                      </option>
                    ))}
                    {categories.length === 0 && <option value="">No categories available</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Priority & SLA *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as ServiceTicketPriority }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Site Location *
                  </label>
                  <select
                    value={formData.siteId}
                    onChange={(e) => setFormData(prev => ({ ...prev, siteId: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">-- Select Site --</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name || s.siteName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Client Account
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">-- Auto-detect from Site --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.legalName || c.primaryContactName || c.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                  Detailed Issue Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide any specific location, guard name, or incident background..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTicket}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
                >
                  {savingTicket ? 'Logging Ticket...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <ServiceDeskCategoryManager
          userSession={userSession!}
          activeCompany={activeCompany!}
          priorityConfigs={priorityConfigs}
          onClose={() => setShowCategoryManager(false)}
        />
      )}

      {/* SLA Policy Manager Modal */}
      {showSlaPolicyManager && (
        <ServiceDeskSlaPolicyManager
          userSession={userSession!}
          activeCompany={activeCompany!}
          categories={categories}
          clients={clients}
          sites={sites}
          onClose={() => setShowSlaPolicyManager(false)}
        />
      )}

      {/* SLA Performance & Analytics Modal */}
      {showSlaAnalytics && (
        <ServiceDeskSlaAnalytics
          userSession={userSession!}
          activeCompany={activeCompany!}
          tickets={tickets}
          onClose={() => setShowSlaAnalytics(false)}
          onRefreshTickets={fetchTickets}
        />
      )}

      {/* Satisfaction (CSAT) Analytics Modal (Point 12) */}
      {showSatisfactionAnalytics && (
        <ServiceDeskSatisfactionAnalytics
          userSession={userSession!}
          activeCompany={activeCompany!}
          onClose={() => setShowSatisfactionAnalytics(false)}
        />
      )}

      {/* Status Workflow Transition Modal (Point 8) */}
      {isTransitionModalOpen && selectedTicket && transitionTargetDef && (
        <ServiceDeskTransitionModal
          isOpen={isTransitionModalOpen}
          onClose={() => {
            setIsTransitionModalOpen(false);
            setTransitionTargetDef(null);
          }}
          ticket={selectedTicket}
          targetDefinition={transitionTargetDef}
          userSession={userSession!}
          activeCompanyId={activeCompany!.companyId}
          onSuccess={(updatedTicket) => {
            setSelectedTicket(updatedTicket);
            fetchTickets();
          }}
        />
      )}

      {/* Resolution & RCA Modal (Point 9) */}
      {isResolutionModalOpen && selectedTicket && (
        <ServiceDeskResolutionModal
          ticket={selectedTicket}
          companyId={activeCompany!.companyId}
          userSession={userSession!}
          onClose={() => setIsResolutionModalOpen(false)}
          onResolved={(updatedTicket) => {
            setSelectedTicket(updatedTicket);
            fetchTickets();
            setModalTab('RESOLUTION');
          }}
        />
      )}

      {/* Service Ticket Reopen Modal (Point 10) */}
      {isReopenModalOpen && selectedTicket && (
        <ServiceDeskReopenModal
          isOpen={isReopenModalOpen}
          ticket={selectedTicket}
          companyId={activeCompany!.companyId}
          userSession={userSession!}
          employees={employees}
          onClose={() => setIsReopenModalOpen(false)}
          onReopened={(updatedTicket) => {
            setSelectedTicket(updatedTicket);
            fetchTickets();
            setModalTab('STATUS_HISTORY');
          }}
        />
      )}

      {/* Client Feedback Modal (Point 11) */}
      {isFeedbackModalOpen && selectedTicket && (
        <ServiceDeskFeedbackModal
          isOpen={isFeedbackModalOpen}
          ticket={selectedTicket}
          companyId={activeCompany!.companyId}
          userSession={userSession!}
          onClose={() => setIsFeedbackModalOpen(false)}
          onFeedbackSubmitted={(updatedTicket) => {
            setSelectedTicket(updatedTicket);
            fetchTickets();
            setModalTab('FEEDBACK');
          }}
        />
      )}

    </div>
  );
};

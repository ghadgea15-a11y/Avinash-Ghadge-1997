import { collection, doc, getDoc, getDocs, query, setDoc, where, writeBatch, onSnapshot, orderBy, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ServiceTicketRecord, 
  TicketCommentRecord, 
  TicketAttachmentRecord,
  TicketEvidenceType,
  UserSession, 
  TicketSlaPauseReason,
  TicketSlaPauseRecord,
  SlaBreachRecord,
  ServiceSlaPolicyRecord,
  ServiceTicketStatus,
  TicketStatusHistoryRecord,
  TicketStatusDefinition,
  TicketStatusTransitionPayload,
  ServiceTicketResolutionRecord,
  TicketVerificationStatus,
  TicketVerificationResult,
  SubmitResolutionPayload,
  VerifyResolutionPayload,
  TicketReopenReasonCategory,
  TicketReopenRecord,
  ReopenTicketPayload,
  TicketReopenEligibilityResult,
  TicketFeedbackStatus,
  FeedbackSentiment,
  TicketFeedbackRatingBreakdown,
  TicketFeedbackRecord,
  SubmitClientFeedbackPayload,
  ReviewClientFeedbackPayload,
  RequestClientFeedbackPayload,
  TicketFeedbackEligibilityResult
} from '../types';
import { SecurityAuditService } from './securityAuditService';
import { ServiceSlaEngine } from './serviceSlaEngine';
import { slaService } from './slaService';
import { StorageService } from './storageService';
import { BpmService } from './bpmService';

// Module 11 Point 1-8: Client Service Desk & SLA Management logic

// Dependency injection wrappers for testing
export let _sdsGetDoc: any = getDoc;
export let _sdsGetDocs: any = getDocs;
export let _sdsSetDoc: any = setDoc;
export let _sdsWriteBatch: any = writeBatch;
export let _sdsRunTransaction: any = runTransaction;

export function _setSdsGetDocMock(mock: any) { _sdsGetDoc = mock; }
export function _setSdsGetDocsMock(mock: any) { _sdsGetDocs = mock; }
export function _setSdsSetDocMock(mock: any) { _sdsSetDoc = mock; }
export function _setSdsWriteBatchMock(mock: any) { _sdsWriteBatch = mock; }
export function _setSdsRunTransactionMock(mock: any) { _sdsRunTransaction = mock; }

export class ServiceDeskService {
  /**
   * Generates a ticket number: TKT-YYYYMMDD-XXXX
   */
  private static generateTicketNumber(): string {
    const d = new Date();
    const dateStr = d.toISOString().split('T')[0].replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${dateStr}-${randomStr}`;
  }

  // --- Category Management ---

  public static async getTicketCategories(companyId: string, includeInactive: boolean = false): Promise<import('../types').TicketCategoryRecord[]> {
    const colRef = collection(db, 'companies', companyId, 'ticketCategories');
    const q = includeInactive ? query(colRef, orderBy('displayOrder', 'asc')) : query(colRef, where('isActive', '==', true), orderBy('displayOrder', 'asc'));
    const snap = await _sdsGetDocs(q);
    return snap.docs.map((d: any) => d.data() as import('../types').TicketCategoryRecord);
  }

  public static subscribeToCategories(companyId: string, callback: (categories: import('../types').TicketCategoryRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'ticketCategories');
    const q = query(colRef, orderBy('displayOrder', 'asc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as import('../types').TicketCategoryRecord));
    });
  }

  public static async saveTicketCategory(session: UserSession, companyId: string, category: Partial<import('../types').TicketCategoryRecord>): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId) return { success: false, error: 'Unauthorized company scope' };
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'].includes(session.role)) {
      return { success: false, error: 'Unauthorized to manage categories' };
    }

    try {
      const isNew = !category.id;
      const id = isNew ? doc(collection(db, 'companies', companyId, 'ticketCategories')).id : category.id!;
      const docRef = doc(db, 'companies', companyId, 'ticketCategories', id);

      const now = new Date().toISOString();
      const record = {
        ...category,
        id,
        companyId,
        updatedAt: now,
        updatedBy: session.userId,
        ...(isNew ? { createdAt: now, createdBy: session.userId } : {})
      };

      await _sdsSetDoc(docRef, record, { merge: true });

      // Audit
      await SecurityAuditService.logEvent(
        companyId,
        session.userId,
        session.role,
        session.employeeId,
        isNew ? 'CREATE_TICKET_CATEGORY' : 'UPDATE_TICKET_CATEGORY',
        'TICKET_CATEGORY',
        id,
        true,
        'LOW',
        JSON.stringify(isNew ? { created: true } : { updated: true })
      );

      return { success: true };
    } catch (err: any) {
      console.error('Error saving ticket category:', err);
      return { success: false, error: err.message };
    }
  }

  // --- End Category Management ---


  /**
   * Validate a service ticket request against core logical rules.
   */
  private static async validateTicketRequest(companyId: string, ticket: Partial<ServiceTicketRecord>): Promise<string | null> {
    if (!companyId) return 'Company ID is required.';
    if (!ticket.clientId) return 'Client ID is required.';
    if (!ticket.siteId) return 'Site ID is required.';
    if (!ticket.title?.trim()) return 'Title is required.';
    if (!ticket.description?.trim()) return 'Description is required.';
    if (!ticket.category) return 'Category is required.';
    if (!ticket.priority) return 'Priority is required.';

    try {
      const clientRef = doc(db, 'companies', companyId, 'clients', ticket.clientId);
      const clientSnap = await _sdsGetDoc(clientRef);
      if (!clientSnap.exists()) return 'Invalid client selected.';

      const siteRef = doc(db, 'companies', companyId, 'sites', ticket.siteId);
      const siteSnap = await _sdsGetDoc(siteRef);
      if (!siteSnap.exists()) return 'Invalid site selected.';
      
      if (ticket.contractId) {
        const contractRef = doc(db, 'companies', companyId, 'contracts', ticket.contractId);
        const contractSnap = await _sdsGetDoc(contractRef);
        if (!contractSnap.exists()) return 'Invalid contract selected.';
      }
    } catch (e) {
      console.warn('[ServiceDeskService] Error during validation checks:', e);
    }

    return null;
  }

  /**
   * Deduplication check based on Client + Site + Title + Open status.
   */
  private static async isDuplicateTicket(companyId: string, ticket: Partial<ServiceTicketRecord>): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'serviceTickets'),
        where('clientId', '==', ticket.clientId),
        where('siteId', '==', ticket.siteId),
        where('status', 'in', ['OPEN', 'IN_PROGRESS'])
      );
      const snap = await _sdsGetDocs(q);
      const docs = snap.docs.map((d: any) => d.data() as ServiceTicketRecord);
      
      const isDuplicate = docs.some((d: any) => d.title.trim().toLowerCase() === ticket.title?.trim().toLowerCase());
      return isDuplicate;
    } catch (e) {
      console.warn('[ServiceDeskService] Duplicate check failed (might be offline)', e);
      return false;
    }
  }

  /**
   * Create a new service desk ticket with full SLA policy evaluation.
   */
  static async createTicket(session: UserSession, companyId: string, payload: Partial<ServiceTicketRecord>): Promise<{ success: boolean; error?: string; ticket?: ServiceTicketRecord }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    const validationError = await this.validateTicketRequest(companyId, payload);
    if (validationError) return { success: false, error: validationError };

    const isDup = await this.isDuplicateTicket(companyId, payload);
    if (isDup) {
      await SecurityAuditService.logEvent(companyId, session.userId, session.role, session.employeeId, 'SERVICE_TICKET_DUPLICATE_ATTEMPT', 'ServiceTicket', payload.clientId || 'unknown', false, 'LOW', `Duplicate ticket prevented for title: ${payload.title}`);
      return { success: false, error: 'A duplicate active ticket already exists for this site.' };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const ticketId = payload.id || `st-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const ticketNumber = this.generateTicketNumber();

    // 1. Fetch active SLA policies and match against ticket attributes
    let matchedPolicy: ServiceSlaPolicyRecord | null = null;
    try {
      const policies = await slaService.getServiceSlaPolicies(companyId, false);
      const matchResult = ServiceSlaEngine.matchPolicy(payload, policies);
      matchedPolicy = matchResult.policy;
    } catch (e) {
      console.warn('[ServiceDeskService] Failed to load SLA policies during ticket creation:', e);
    }

    // 2. Compute Target Times
    const targets = matchedPolicy 
      ? { responseMinutes: matchedPolicy.responseTargetMinutes, resolutionMinutes: matchedPolicy.resolutionTargetMinutes }
      : ServiceSlaEngine.getDefaultTargetsByPriority(payload.priority);

    const responseDueDate = ServiceSlaEngine.calculateTargetDueTime(now, targets.responseMinutes, matchedPolicy);
    const resolutionDueDate = ServiceSlaEngine.calculateTargetDueTime(now, targets.resolutionMinutes, matchedPolicy);

    const ticketRecord: ServiceTicketRecord = {
      id: ticketId,
      ticketNumber,
      companyId,
      clientId: payload.clientId!,
      clientName: payload.clientName || 'Unknown Client',
      contactId: payload.contactId,
      contactName: payload.contactName,
      siteId: payload.siteId!,
      siteName: payload.siteName || 'Unknown Site',
      contractId: payload.contractId,
      title: payload.title!,
      description: payload.description!,
      category: payload.category!,
      priority: payload.priority!,
      status: 'OPEN',
      source: payload.source || 'WEB',
      reportedByUserId: session.userId,
      reportedByName: (session.fullName || session.email),
      reportedByEmail: payload.reportedByEmail || session.email,
      assignedToUserId: payload.assignedToUserId,
      assignedToName: payload.assignedToName,
      assignedTeam: payload.assignedTeam,

      // SLA Tracking Attributes
      slaPolicyId: matchedPolicy?.id,
      slaPolicyName: matchedPolicy?.policyName,
      responseTargetMinutes: targets.responseMinutes,
      resolutionTargetMinutes: targets.resolutionMinutes,
      responseDueTime: responseDueDate.toISOString(),
      responseSlaStatus: 'PENDING',
      slaDueTime: resolutionDueDate.toISOString(),
      resolutionDueTime: resolutionDueDate.toISOString(),
      resolutionSlaStatus: 'ACTIVE',
      isSlaBreached: false,
      isResponseBreached: false,
      isResolutionBreached: false,
      totalPausedDurationMinutes: 0,
      pauseHistory: [],

      attachmentUrls: payload.attachmentUrls || [],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    try {
      const docRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      await _sdsSetDoc(docRef, ticketRecord);

      // Audit Log
      await SecurityAuditService.logEvent(
        companyId, session.userId, session.role, session.employeeId,
        'SERVICE_TICKET_CREATED', 'ServiceTicket', ticketId, true, 'LOW',
        `Created ticket ${ticketNumber} with SLA Target ${Math.round(targets.resolutionMinutes / 60)}h (Policy: ${matchedPolicy?.policyName || 'Default'})`
      );

      // Notification
      await this.notifyForTicket(companyId, ticketRecord, `New ticket logged (${ticketRecord.ticketNumber}) - Resolution SLA: ${Math.round(targets.resolutionMinutes / 60)}h.`);

      return { success: true, ticket: ticketRecord };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error creating ticket:', e);
      return { success: false, error: e.message || 'Failed to create ticket.' };
    }
  }

  /**
   * Update a service desk ticket (e.g. status, assignment, priority).
   */
  static async updateTicket(session: UserSession, companyId: string, ticketId: string, updates: Partial<ServiceTicketRecord>, reason: string): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    try {
      const docRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const snap = await _sdsGetDoc(docRef);
      if (!snap.exists()) return { success: false, error: 'Ticket not found.' };

      const current = snap.data() as ServiceTicketRecord;
      const now = new Date().toISOString();

      const merged: ServiceTicketRecord = {
        ...current,
        ...updates,
        updatedAt: now
      };

      // Track first response if not already tracked
      if (!current.respondedAt && (updates.assignedToUserId || updates.status === 'IN_PROGRESS' || updates.status === 'ASSIGNED' || updates.status === 'ACCEPTED')) {
        merged.respondedAt = now;
        merged.respondedByUserId = session.userId;
        const respDueDate = new Date(current.responseDueTime || current.createdAt);
        merged.responseSlaStatus = new Date(now).getTime() <= respDueDate.getTime() ? 'MET' : 'BREACHED';
        merged.isResponseBreached = merged.responseSlaStatus === 'BREACHED';
      }

      // Track resolution
      if (updates.status === 'RESOLVED' && current.status !== 'RESOLVED') {
        merged.resolvedAt = now;
        merged.resolvedByUserId = session.userId;
        const resDueDate = new Date(current.resolutionDueTime || current.slaDueTime);
        const isMet = new Date(now).getTime() <= resDueDate.getTime() && !current.isSlaBreached;
        merged.resolutionSlaStatus = isMet ? 'MET' : 'FAILED';
        merged.isResolutionBreached = !isMet;
      }
      if (updates.status === 'CLOSED' && current.status !== 'CLOSED') {
        merged.closedAt = now;
        if (!merged.resolutionSlaStatus || merged.resolutionSlaStatus === 'ACTIVE' || merged.resolutionSlaStatus === 'WARNING') {
          const resDueDate = new Date(current.resolutionDueTime || current.slaDueTime);
          const isMet = new Date(now).getTime() <= resDueDate.getTime() && !current.isSlaBreached;
          merged.resolutionSlaStatus = isMet ? 'MET' : 'FAILED';
          merged.isResolutionBreached = !isMet;
        }
      }

      await _sdsSetDoc(docRef, merged, { merge: true });

      // Audit Log
      await SecurityAuditService.logEvent(
        companyId, session.userId, session.role, session.employeeId,
        'SERVICE_TICKET_MODIFIED', 'ServiceTicket', ticketId, true, 'LOW',
        `Modified ticket ${current.ticketNumber}. Reason: ${reason}`
      );

      // Notify if significant changes
      if (current.status !== merged.status) {
        await this.notifyForTicket(companyId, merged, `Ticket status changed to ${merged.status}`);
      } else if (current.assignedToUserId !== merged.assignedToUserId) {
        await this.notifyForTicket(companyId, merged, `Ticket assigned to ${merged.assignedToName}`);
      }

      return { success: true };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error updating ticket:', e);
      return { success: false, error: e.message || 'Failed to update ticket.' };
    }
  }

  /**
   * Helper to determine if a role represents internal operations/staff.
   */
  public static isStaffRole(role: string): boolean {
    const staffRoles = [
      'SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 
      'FIELD_OFFICER', 'MANAGER', 'SUPERVISOR', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 
      'GENERAL_MANAGER', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'SITE_IN_CHARGE', 
      'HR', 'FINANCE', 'PROCUREMENT', 'EHS', 'QUALITY', 'COMMERCIAL', 
      'MIS', 'IT', 'OPERATIONS_OFFICE', 'SERVICE_DESK', 'TECHNICIAN', 'SAFETY_OFFICER'
    ];
    return staffRoles.includes(role);
  }

  /**
   * Validate a comment request before persistence.
   */
  public static validateCommentRequest(
    session: UserSession,
    companyId: string,
    commentText: string,
    isInternalOnly: boolean,
    ticket?: ServiceTicketRecord | null
  ): { valid: boolean; error?: string } {
    if (!session || !session.userId) {
      return { valid: false, error: 'User session is required.' };
    }
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { valid: false, error: 'Unauthorized company scope.' };
    }
    const trimmed = (commentText || '').trim();
    if (!trimmed) {
      return { valid: false, error: 'Comment text cannot be empty.' };
    }
    if (trimmed.length > 4000) {
      return { valid: false, error: 'Comment text exceeds maximum permitted limit of 4,000 characters.' };
    }
    if (isInternalOnly && !this.isStaffRole(session.role)) {
      return { valid: false, error: 'Clients and external users are not permitted to create internal staff notes.' };
    }
    if (ticket && ticket.companyId !== companyId) {
      return { valid: false, error: 'Ticket does not belong to the authorized company.' };
    }
    return { valid: true };
  }

  /**
   * Add a comment to a ticket, enforce visibility rules, audit log, and update SLA/response metrics.
   */
  static async addComment(
    session: UserSession, 
    companyId: string, 
    ticketId: string, 
    comment: string, 
    isInternalOnly: boolean = false, 
    attachmentUrls?: string[],
    customCommentId?: string
  ): Promise<{ success: boolean; comment?: TicketCommentRecord; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    try {
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketSnap = await _sdsGetDoc(ticketRef);
      if (!ticketSnap.exists()) {
        return { success: false, error: 'Target service ticket not found.' };
      }

      const ticketData = ticketSnap.data() as ServiceTicketRecord;
      const validation = this.validateCommentRequest(session, companyId, comment, isInternalOnly, ticketData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const now = new Date().toISOString();
      const commentId = customCommentId || `comm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const commentRecord: TicketCommentRecord = {
        id: commentId,
        ticketId,
        companyId,
        clientId: ticketData.clientId,
        siteId: ticketData.siteId,
        authorUserId: session.userId,
        authorName: session.fullName || session.email || 'Service Agent',
        authorRole: session.role,
        comment: comment.trim(),
        isInternalOnly: Boolean(isInternalOnly),
        visibility: isInternalOnly ? 'INTERNAL' : 'CLIENT_VISIBLE',
        attachmentUrls: attachmentUrls || [],
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      };

      const commentDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments', commentId);
      await _sdsSetDoc(commentDocRef, commentRecord);

      // Check if this counts as first staff response on ticket
      const updates: Partial<ServiceTicketRecord> = { updatedAt: now };
      const isStaff = this.isStaffRole(session.role);
      if (!ticketData.respondedAt && !isInternalOnly && isStaff && session.userId !== ticketData.reportedByUserId) {
        updates.respondedAt = now;
        updates.respondedByUserId = session.userId;
        const respDueDate = new Date(ticketData.responseDueTime || ticketData.createdAt);
        updates.responseSlaStatus = new Date(now).getTime() <= respDueDate.getTime() ? 'MET' : 'BREACHED';
        updates.isResponseBreached = updates.responseSlaStatus === 'BREACHED';
      }

      await _sdsSetDoc(ticketRef, updates, { merge: true });

      // Audit Log
      await SecurityAuditService.logEvent(
        companyId, session.userId, session.role, session.employeeId,
        'SERVICE_TICKET_COMMENT_ADDED', 'serviceTickets', ticketId, true, 'LOW',
        `Added ${isInternalOnly ? 'INTERNAL' : 'PUBLIC'} comment (${commentId}) on ticket ${ticketData.ticketNumber}`
      );

      // Send Notification (Visibility-safe)
      const notifMsg = isInternalOnly
        ? `[Internal Note] ${session.fullName || 'Staff'} added a note on ticket ${ticketData.ticketNumber}`
        : `New update from ${session.fullName || 'Staff'} on ticket ${ticketData.ticketNumber}: "${comment.substring(0, 60)}..."`;
      
      await this.notifyForTicket(
        companyId, 
        ticketData, 
        notifMsg, 
        isInternalOnly ? undefined : ticketData.reportedByUserId
      );

      return { success: true, comment: commentRecord };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error adding comment:', e);
      return { success: false, error: e.message || 'Failed to add comment.' };
    }
  }

  /**
   * Edit an existing comment, maintaining an immutable version history for compliance.
   */
  static async editComment(
    session: UserSession,
    companyId: string,
    ticketId: string,
    commentId: string,
    newText: string
  ): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    const trimmed = (newText || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Comment text cannot be empty.' };
    }
    if (trimmed.length > 4000) {
      return { success: false, error: 'Comment text exceeds maximum permitted limit of 4,000 characters.' };
    }

    try {
      const commentDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments', commentId);
      const snap = await _sdsGetDoc(commentDocRef);
      if (!snap.exists()) {
        return { success: false, error: 'Comment not found.' };
      }

      const currentComment = snap.data() as TicketCommentRecord;
      if (currentComment.status === 'ARCHIVED') {
        return { success: false, error: 'Cannot edit an archived comment.' };
      }

      const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN'].includes(session.role);
      const isAuthor = currentComment.authorUserId === session.userId;
      if (!isAuthor && !isAdmin) {
        return { success: false, error: 'You are not authorized to edit this comment.' };
      }

      const now = new Date().toISOString();
      const historyItem = {
        text: currentComment.comment,
        editedAt: now,
        editedByUserId: session.userId,
        editedByName: session.fullName || session.email || 'Service User'
      };

      const updatedHistory = [...(currentComment.editHistory || []), historyItem];

      const updates: Partial<TicketCommentRecord> = {
        comment: trimmed,
        isEdited: true,
        editedAt: now,
        editedByUserId: session.userId,
        editedByName: session.fullName || session.email || 'Service User',
        editHistory: updatedHistory,
        updatedAt: now
      };

      await _sdsSetDoc(commentDocRef, updates, { merge: true });

      // Audit Log
      await SecurityAuditService.logEvent(
        companyId, session.userId, session.role, session.employeeId,
        'SERVICE_TICKET_COMMENT_EDITED', 'serviceTickets', ticketId, true, 'LOW',
        `Edited comment (${commentId}) on ticket ${ticketId}. Previous: "${currentComment.comment.substring(0, 40)}..."`
      );

      return { success: true };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error editing comment:', e);
      return { success: false, error: e.message || 'Failed to edit comment.' };
    }
  }

  /**
   * Soft-archive / hide a comment with a recorded reason (never destructive purge).
   */
  static async archiveComment(
    session: UserSession,
    companyId: string,
    ticketId: string,
    commentId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    try {
      const commentDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments', commentId);
      const snap = await _sdsGetDoc(commentDocRef);
      if (!snap.exists()) {
        return { success: false, error: 'Comment not found.' };
      }

      const currentComment = snap.data() as TicketCommentRecord;
      const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN'].includes(session.role);
      const isAuthor = currentComment.authorUserId === session.userId;
      if (!isAuthor && !isAdmin) {
        return { success: false, error: 'You are not authorized to archive this comment.' };
      }

      const now = new Date().toISOString();
      const updates: Partial<TicketCommentRecord> = {
        status: 'ARCHIVED',
        archivedAt: now,
        archivedByUserId: session.userId,
        archivedByName: session.fullName || session.email,
        archiveReason: (reason || 'Archived by user').trim(),
        updatedAt: now
      };

      await _sdsSetDoc(commentDocRef, updates, { merge: true });

      // Audit Log
      await SecurityAuditService.logEvent(
        companyId, session.userId, session.role, session.employeeId,
        'SERVICE_TICKET_COMMENT_ARCHIVED', 'serviceTickets', ticketId, true, 'LOW',
        `Archived comment (${commentId}) on ticket ${ticketId}. Reason: ${reason || 'None'}`
      );

      return { success: true };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error archiving comment:', e);
      return { success: false, error: e.message || 'Failed to archive comment.' };
    }
  }

  /**
   * Subscribe to comments for a ticket in real-time with role-based visibility filtering.
   */
  static subscribeToTicketComments(
    companyId: string,
    ticketId: string,
    userRole: string,
    callback: (comments: TicketCommentRecord[]) => void
  ): () => void {
    const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments');
    const q = query(colRef, orderBy('createdAt', 'asc'));
    const isStaff = this.isStaffRole(userRole);

    return onSnapshot(q, (snap) => {
      let list = snap.docs.map(d => d.data() as TicketCommentRecord);
      
      // Filter out archived comments unless staff admin
      list = list.filter(c => c.status !== 'ARCHIVED');

      // Enforce client-visibility boundary: Non-staff/clients cannot see internal notes
      if (!isStaff) {
        list = list.filter(c => !c.isInternalOnly && c.visibility !== 'INTERNAL');
      }

      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      callback(list);
    }, (err) => {
      console.error('[ServiceDeskService] Error listening to ticket comments:', err);
      callback([]);
    });
  }

  /**
   * Fetch comments directly with role-based visibility enforcement.
   */
  static async getComments(companyId: string, ticketId: string, userRole: string = 'EMPLOYEE'): Promise<TicketCommentRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments');
      const snap = await _sdsGetDocs(colRef);
      let list = snap.docs.map((d: any) => d.data() as TicketCommentRecord);

      const isStaff = this.isStaffRole(userRole);
      list = list.filter((c: TicketCommentRecord) => c.status !== 'ARCHIVED');
      if (!isStaff) {
        list = list.filter((c: TicketCommentRecord) => !c.isInternalOnly && c.visibility !== 'INTERNAL');
      }

      return list.sort((a: TicketCommentRecord, b: TicketCommentRecord) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (e) {
      console.error('[ServiceDeskService] Error fetching comments:', e);
      return [];
    }
  }

  // ============================================================================
  // MODULE 11 / POINT 7: SERVICE TICKET ATTACHMENTS & EVIDENCE
  // ============================================================================

  /**
   * Validates file upload against security, type, and size policies.
   */
  public static validateAttachmentFile(
    file: File,
    visibility: 'CLIENT_VISIBLE' | 'INTERNAL',
    userRole: string
  ): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided.' };
    }

    // 1. File size limit: 15MB
    const MAX_SIZE_BYTES = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return { valid: false, error: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed 15 MB limit.` };
    }

    // 2. Reject dangerous executable & script extensions
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.sh', '.bin', '.msi', '.com', 
      '.js', '.mjs', '.cjs', '.vbs', '.ps1', '.php', '.py', 
      '.html', '.htm', '.apk', '.jar', '.scr', '.pif'
    ];
    const fileNameLower = file.name.toLowerCase();
    for (const ext of dangerousExtensions) {
      if (fileNameLower.endsWith(ext)) {
        return { valid: false, error: `Security violation: File type '${ext}' is not permitted for upload.` };
      }
    }

    // 3. Visibility permission validation
    if (visibility === 'INTERNAL' && !this.isStaffRole(userRole)) {
      return { valid: false, error: 'Unauthorized: Non-staff users cannot create internal-only evidence.' };
    }

    return { valid: true };
  }

  /**
   * Upload an evidence attachment for a service ticket with Firestore reference & audit logging.
   */
  static async uploadTicketAttachment(
    session: UserSession,
    companyId: string,
    ticketId: string,
    file: File,
    options: {
      evidenceType?: TicketEvidenceType;
      notes?: string;
      visibility?: 'CLIENT_VISIBLE' | 'INTERNAL';
      commentId?: string;
    } = {}
  ): Promise<{ success: boolean; attachment?: TicketAttachmentRecord; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    const visibility = options.visibility || 'CLIENT_VISIBLE';
    const validation = this.validateAttachmentFile(file, visibility, session.role);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // 1. Ensure ticket exists
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketSnap = await _sdsGetDoc(ticketRef);
      if (!ticketSnap.exists()) {
        return { success: false, error: 'Service ticket not found.' };
      }
      const ticketData = ticketSnap.data() as ServiceTicketRecord;

      // 2. Construct clean storage path
      const attachmentId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `companies/${companyId}/serviceTickets/${ticketId}/attachments/${Date.now()}_${sanitizedName}`;

      // 3. Upload file to Firebase Storage
      const downloadUrl = await StorageService.uploadFile(storagePath, file, session);

      // 4. Create metadata record
      const now = new Date().toISOString();
      const attachment: TicketAttachmentRecord = {
        id: attachmentId,
        ticketId,
        companyId,
        siteId: ticketData.siteId,
        clientId: ticketData.clientId,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        storagePath,
        downloadUrl,
        uploadedByUserId: session.userId,
        uploadedByName: session.fullName || session.email || 'User',
        uploadedByRole: session.role,
        uploadedAt: now,
        createdAt: now,
        updatedAt: now,
        visibility,
        evidenceType: options.evidenceType || 'DOCUMENT',
        notes: (options.notes || '').trim(),
        status: 'ACTIVE',
        commentId: options.commentId
      };

      // 5. Store metadata in Firestore subcollection
      const attachmentDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'attachments', attachmentId);
      await _sdsSetDoc(attachmentDocRef, attachment);

      // 6. Update ticket's attachmentUrls list & timestamp
      const existingUrls = ticketData.attachmentUrls || [];
      if (!existingUrls.includes(downloadUrl)) {
        await _sdsSetDoc(ticketRef, {
          attachmentUrls: [...existingUrls, downloadUrl],
          updatedAt: now
        }, { merge: true });
      }

      // 7. Immutable Security Audit Log
      await SecurityAuditService.logEvent(
        companyId, session.userId, session.role, session.employeeId,
        'SERVICE_TICKET_ATTACHMENT_UPLOADED', 'serviceTickets', ticketId, true, 'LOW',
        `Uploaded evidence attachment '${file.name}' (${attachment.evidenceType}, ${(file.size / 1024).toFixed(1)} KB) on ticket #${ticketData.ticketNumber || ticketId}. Visibility: ${visibility}`
      );

      // 8. Trigger in-app notification
      if (visibility === 'CLIENT_VISIBLE') {
        await this.notifyForTicket(
          companyId,
          ticketData,
          `New evidence uploaded to ticket #${ticketData.ticketNumber || ticketId}: "${file.name}" (${attachment.evidenceType.replace('_', ' ')})`
        );
      } else {
        // Internal staff notification only
        await this.notifyForTicket(
          companyId,
          ticketData,
          `Internal evidence attached to ticket #${ticketData.ticketNumber || ticketId}: "${file.name}"`
        );
      }

      return { success: true, attachment };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error uploading attachment:', e);
      return { success: false, error: e.message || 'Failed to upload evidence attachment.' };
    }
  }

  /**
   * Soft-archives a ticket attachment preserving immutable history.
   */
  static async archiveTicketAttachment(
    session: UserSession,
    companyId: string,
    ticketId: string,
    attachmentId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    try {
      const attDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'attachments', attachmentId);
      const attSnap = await _sdsGetDoc(attDocRef);
      if (!attSnap.exists()) {
        return { success: false, error: 'Attachment record not found.' };
      }

      const attData = attSnap.data() as TicketAttachmentRecord;
      const isUploader = attData.uploadedByUserId === session.userId;
      const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN'].includes(session.role);

      if (!isUploader && !isAdmin) {
        return { success: false, error: 'Permission denied: Only the uploader or administrators can archive this evidence.' };
      }

      const now = new Date().toISOString();
      const updates = {
        status: 'ARCHIVED',
        archivedAt: now,
        archivedByUserId: session.userId,
        archivedByName: session.fullName || session.email || 'User',
        archiveReason: (reason || 'Archived by user').trim(),
        updatedAt: now
      };

      await _sdsSetDoc(attDocRef, updates, { merge: true });

      // Audit Log
      await SecurityAuditService.logEvent(
        companyId, session.userId, session.role, session.employeeId,
        'SERVICE_TICKET_ATTACHMENT_ARCHIVED', 'serviceTickets', ticketId, true, 'LOW',
        `Archived evidence attachment '${attData.fileName}' (${attachmentId}) on ticket ${ticketId}. Reason: ${reason || 'None'}`
      );

      return { success: true };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error archiving attachment:', e);
      return { success: false, error: e.message || 'Failed to archive attachment.' };
    }
  }

  /**
   * Updates metadata (evidence type, notes, visibility) of an active attachment.
   */
  static async updateAttachmentMetadata(
    session: UserSession,
    companyId: string,
    ticketId: string,
    attachmentId: string,
    updates: {
      notes?: string;
      evidenceType?: TicketEvidenceType;
      visibility?: 'CLIENT_VISIBLE' | 'INTERNAL';
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    try {
      const attDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'attachments', attachmentId);
      const attSnap = await _sdsGetDoc(attDocRef);
      if (!attSnap.exists()) {
        return { success: false, error: 'Attachment not found.' };
      }

      const attData = attSnap.data() as TicketAttachmentRecord;
      const isUploader = attData.uploadedByUserId === session.userId;
      const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN'].includes(session.role);

      if (!isUploader && !isAdmin) {
        return { success: false, error: 'Permission denied to update attachment metadata.' };
      }

      if (updates.visibility === 'INTERNAL' && !this.isStaffRole(session.role)) {
        return { success: false, error: 'Permission denied: Non-staff users cannot set internal visibility.' };
      }

      const now = new Date().toISOString();
      const sanitizedUpdates: Partial<TicketAttachmentRecord> = {
        updatedAt: now
      };
      if (updates.notes !== undefined) sanitizedUpdates.notes = updates.notes.trim();
      if (updates.evidenceType) sanitizedUpdates.evidenceType = updates.evidenceType;
      if (updates.visibility) sanitizedUpdates.visibility = updates.visibility;

      await _sdsSetDoc(attDocRef, sanitizedUpdates, { merge: true });

      // Audit Log
      await SecurityAuditService.logEvent(
        companyId, session.userId, session.role, session.employeeId,
        'SERVICE_TICKET_ATTACHMENT_UPDATED', 'serviceTickets', ticketId, true, 'LOW',
        `Updated metadata for attachment '${attData.fileName}' (${attachmentId}) on ticket ${ticketId}.`
      );

      return { success: true };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error updating attachment metadata:', e);
      return { success: false, error: e.message || 'Failed to update attachment metadata.' };
    }
  }

  /**
   * Subscribe to real-time attachments for a ticket with role-based visibility filtering.
   */
  static subscribeToTicketAttachments(
    companyId: string,
    ticketId: string,
    userRole: string,
    callback: (attachments: TicketAttachmentRecord[]) => void
  ): () => void {
    const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'attachments');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const isStaff = this.isStaffRole(userRole);

    return onSnapshot(q, (snap) => {
      let list = snap.docs.map(d => d.data() as TicketAttachmentRecord);
      list = list.filter(a => a.status !== 'ARCHIVED');
      if (!isStaff) {
        list = list.filter(a => a.visibility !== 'INTERNAL');
      }
      list.sort((a, b) => new Date(b.createdAt || b.uploadedAt).getTime() - new Date(a.createdAt || a.uploadedAt).getTime());
      callback(list);
    }, (err) => {
      console.error('[ServiceDeskService] Error listening to ticket attachments:', err);
      callback([]);
    });
  }

  /**
   * Fetch ticket attachments directly with role-based visibility enforcement.
   */
  static async getTicketAttachments(
    companyId: string,
    ticketId: string,
    userRole: string = 'EMPLOYEE'
  ): Promise<TicketAttachmentRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'attachments');
      const snap = await _sdsGetDocs(colRef);
      let list = snap.docs.map((d: any) => d.data() as TicketAttachmentRecord);

      const isStaff = this.isStaffRole(userRole);
      list = list.filter((a: TicketAttachmentRecord) => a.status !== 'ARCHIVED');
      if (!isStaff) {
        list = list.filter((a: TicketAttachmentRecord) => a.visibility !== 'INTERNAL');
      }

      return list.sort((a: TicketAttachmentRecord, b: TicketAttachmentRecord) => new Date(b.createdAt || b.uploadedAt).getTime() - new Date(a.createdAt || a.uploadedAt).getTime());
    } catch (e) {
      console.error('[ServiceDeskService] Error fetching attachments:', e);
      return [];
    }
  }

  /**
   * Fetch tickets for listing.
   */
  static async getTickets(session: UserSession, companyId: string): Promise<ServiceTicketRecord[]> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') return [];

    try {
      const q = query(collection(db, 'companies', companyId, 'serviceTickets'));
      const snap = await _sdsGetDocs(q);
      const docs = snap.docs.map((d: any) => d.data() as ServiceTicketRecord);
      return docs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.error('[ServiceDeskService] Error fetching tickets:', e);
      return [];
    }
  }

  /**
   * Internal notification helper.
   */
  public static async notifyForTicket(companyId: string, ticket: ServiceTicketRecord, message: string, targetUserId?: string) {
    try {
      const notifId = `NOTIF-TKT-${ticket.id}-${Date.now()}`;
      const notification = {
        id: notifId,
        companyId,
        userId: targetUserId || 'SYSTEM',
        title: `Service Desk: ${ticket.ticketNumber}`,
        message: message,
        type: 'LOW',
        isRead: false,
        timestamp: new Date().toISOString(),
        severity: ticket.priority === 'CRITICAL' ? 'HIGH' : 'LOW',
        referenceId: ticket.id,
        referenceType: 'SERVICE_TICKET',
        roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'CLIENT_MANAGEMENT', 'OPERATIONS_OFFICE']
      };
      
      const notifRef = doc(db, 'companies', companyId, 'notifications', notifId);
      await _sdsSetDoc(notifRef, notification);
    } catch (e) {
      console.error('[ServiceDeskService] Failed to generate notification', e);
    }
  }

  // ============================================================================
  // MODULE 11 / POINT 5: SLA PAUSE & RESUME
  // ============================================================================

  /**
   * Pause the SLA timer of a ticket (e.g. Waiting on Client, Pending Parts)
   */
  static async pauseTicketSla(
    session: UserSession,
    companyId: string,
    ticketId: string,
    reason: TicketSlaPauseReason,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    const authorizedRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPERATIONS_MANAGER', 'SITE_MANAGER', 'SUPERVISOR', 'SERVICE_DESK'];
    if (!authorizedRoles.includes(session.role)) {
      return { success: false, error: 'Unauthorized to pause ticket SLA timer.' };
    }

    try {
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const snap = await _sdsGetDoc(ticketRef);
      if (!snap.exists()) return { success: false, error: 'Ticket not found.' };

      const t = snap.data() as ServiceTicketRecord;
      if (['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status)) {
        return { success: false, error: 'Cannot pause SLA on a resolved or closed ticket.' };
      }

      if (t.resolutionSlaStatus === 'PAUSED' || t.lastPausedAt) {
        return { success: false, error: 'SLA timer is already paused.' };
      }

      const { updatedTicket, pauseRecord } = ServiceSlaEngine.pauseTicketSla(t, reason, session, notes);
      await _sdsSetDoc(ticketRef, updatedTicket, { merge: true });

      // Add comment about pause
      const commentRef = doc(collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments'));
      await _sdsSetDoc(commentRef, {
        id: commentRef.id,
        ticketId,
        authorUserId: session.userId,
        authorName: session.fullName || session.email,
        authorRole: session.role,
        comment: `⏸️ SLA PAUSED: Reason [${reason}]. ${notes || ''}`,
        isInternalOnly: false,
        createdAt: new Date().toISOString()
      });

      // Audit log
      await SecurityAuditService.logEvent(
        companyId, session.userId, session.role, session.employeeId,
        'PAUSE_TICKET_SLA', 'serviceTickets', ticketId, true, 'LOW',
        `SLA paused for ${t.ticketNumber} (${reason}). Notes: ${notes || 'None'}`
      );

      return { success: true };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error pausing ticket SLA:', e);
      return { success: false, error: e.message || 'Failed to pause SLA.' };
    }
  }

  /**
   * Resume the SLA timer and extend due time by paused duration.
   */
  static async resumeTicketSla(
    session: UserSession,
    companyId: string,
    ticketId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    try {
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const snap = await _sdsGetDoc(ticketRef);
      if (!snap.exists()) return { success: false, error: 'Ticket not found.' };

      const t = snap.data() as ServiceTicketRecord;
      if (!t.lastPausedAt && t.resolutionSlaStatus !== 'PAUSED') {
        return { success: false, error: 'SLA timer is not currently paused.' };
      }

      const { updatedTicket, resumeNotes } = ServiceSlaEngine.resumeTicketSla(t, session, notes);
      await _sdsSetDoc(ticketRef, updatedTicket, { merge: true });

      // Add comment about resume
      const commentRef = doc(collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments'));
      await _sdsSetDoc(commentRef, {
        id: commentRef.id,
        ticketId,
        authorUserId: session.userId,
        authorName: session.fullName || session.email,
        authorRole: session.role,
        comment: `▶️ SLA RESUMED: ${resumeNotes}`,
        isInternalOnly: false,
        createdAt: new Date().toISOString()
      });

      // Audit log
      await SecurityAuditService.logEvent(
        companyId, session.userId, session.role, session.employeeId,
        'RESUME_TICKET_SLA', 'serviceTickets', ticketId, true, 'LOW',
        `SLA resumed for ${t.ticketNumber}. Extended due time to ${updatedTicket.resolutionDueTime}`
      );

      return { success: true };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error resuming ticket SLA:', e);
      return { success: false, error: e.message || 'Failed to resume SLA.' };
    }
  }

  // ============================================================================
  // MODULE 11 / POINT 5: MONITORING, WARNING & BREACH DETECTION ENGINE
  // ============================================================================

  /**
   * Evaluates active tickets in the company, raises SLA warnings, detects breaches,
   * logs SLA breach records, and triggers escalation workflows.
   */
  static async monitorAndProcessSlaBreaches(session: UserSession, companyId: string): Promise<{
    evaluatedCount: number;
    warningsTriggered: number;
    breachesTriggered: number;
  }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      throw new Error('Unauthorized company scope.');
    }

    try {
      const tickets = await this.getTickets(session, companyId);
      const policies = await slaService.getServiceSlaPolicies(companyId, false);

      const activeTickets = tickets.filter(t => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status));
      let warningsTriggered = 0;
      let breachesTriggered = 0;

      const now = new Date();

      for (const t of activeTickets) {
        let policy: ServiceSlaPolicyRecord | null = null;
        if (t.slaPolicyId) {
          policy = policies.find(p => p.id === t.slaPolicyId) || null;
        } else {
          policy = ServiceSlaEngine.matchPolicy(t, policies).policy;
        }

        const evalResult = ServiceSlaEngine.evaluateTicketSla(t, policy, now);

        const updates: Partial<ServiceTicketRecord> = {};
        let needsUpdate = false;

        // 1. Check Warning Threshold
        if (evalResult.isNearBreach && !t.slaWarningTriggered) {
          updates.slaWarningTriggered = true;
          updates.resolutionSlaStatus = 'WARNING';
          needsUpdate = true;
          warningsTriggered++;

          // Send warning notification
          await this.notifyForTicket(
            companyId,
            t,
            `⚠️ SLA WARNING: Ticket ${t.ticketNumber} (${t.title}) has reached ${evalResult.resolutionElapsedPercentage}% of its SLA target.`
          );

          await SecurityAuditService.logEvent(
            companyId, session.userId, session.role, session.employeeId,
            'SLA_WARNING_TRIGGERED', 'serviceTickets', t.id, true, 'MEDIUM',
            `SLA warning triggered for ${t.ticketNumber} at ${evalResult.resolutionElapsedPercentage}% elapsed`
          );
        }

        // 2. Check SLA Breach
        if (evalResult.isBreached && (!t.isSlaBreached || !t.slaBreachRecorded)) {
          updates.isSlaBreached = true;
          updates.slaBreachTriggered = true;
          updates.slaBreachRecorded = true;
          updates.resolutionSlaStatus = 'BREACHED';
          needsUpdate = true;
          breachesTriggered++;

          // Record official SLA breach document
          const breachId = `BR-TKT-${t.id}-${Date.now()}`;
          const breachRecord: SlaBreachRecord = {
            id: breachId,
            companyId,
            clientId: t.clientId,
            contractId: t.contractId || 'GEN-CONTRACT',
            siteId: t.siteId,
            slaId: policy?.id || 'DEFAULT-SLA',
            sourceRecordId: t.id,
            targetValue: evalResult.resolutionTargetMinutes,
            actualValue: evalResult.resolutionTargetMinutes + evalResult.overdueMinutes,
            variance: evalResult.overdueMinutes,
            detectedAt: now.toISOString(),
            severity: t.priority === 'CRITICAL' ? 'CRITICAL' : t.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
            status: 'OPEN'
          };

          await slaService.saveSlaBreach(companyId, breachRecord);

          // Trigger high-severity escalation notification
          await this.notifyForTicket(
            companyId,
            t,
            `🚨 SLA BREACH: Ticket ${t.ticketNumber} (${t.priority}) has breached its resolution SLA by ${evalResult.overdueMinutes} minutes!`
          );

          await SecurityAuditService.logEvent(
            companyId, session.userId, session.role, session.employeeId,
            'SLA_BREACH_DETECTED', 'serviceTickets', t.id, true, 'HIGH',
            `SLA Breach registered for ${t.ticketNumber}. Overdue by ${evalResult.overdueMinutes} mins. Breach ID: ${breachId}`
          );
        }

        if (needsUpdate) {
          const docRef = doc(db, 'companies', companyId, 'serviceTickets', t.id);
          await _sdsSetDoc(docRef, updates, { merge: true });
        }
      }

      return { evaluatedCount: activeTickets.length, warningsTriggered, breachesTriggered };
    } catch (e) {
      console.error('[ServiceDeskService] Error running SLA monitor:', e);
      return { evaluatedCount: 0, warningsTriggered: 0, breachesTriggered: 0 };
    }
  }


  // ============================================================================
  // MODULE 11 / POINT 2: TICKET ASSIGNMENT & DISPATCH
  // ============================================================================

  /**
   * Assign a ticket to an employee (Dispatch)
   */
  static async assignTicket(session: UserSession, companyId: string, ticketId: string, assigneeId: string, assigneeName: string, teamId?: string): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }
    
    const authorizedRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPERATIONS_MANAGER', 'SITE_MANAGER', 'SUPERVISOR', 'SERVICE_DESK'];
    if (!authorizedRoles.includes(session.role)) {
      return { success: false, error: 'Unauthorized. Only dispatchers and managers can assign tickets.' };
    }

    try {
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketSnap = await _sdsGetDoc(ticketRef);
      if (!ticketSnap.exists()) return { success: false, error: 'Ticket not found.' };
      
      const t = ticketSnap.data() as ServiceTicketRecord;
      
      if (t.status === 'CLOSED' || t.status === 'CANCELLED') {
        return { success: false, error: 'Cannot assign a closed or cancelled ticket.' };
      }

      const empRef = doc(db, 'companies', companyId, 'employees', assigneeId);
      const empSnap = await _sdsGetDoc(empRef);
      if (!empSnap.exists()) {
        return { success: false, error: 'Selected assignee does not exist.' };
      }
      const empData = empSnap.data();
      if (empData.status && empData.status !== 'ACTIVE') {
        return { success: false, error: 'Selected assignee is not active.' };
      }

      const now = new Date().toISOString();
      const updates: Partial<ServiceTicketRecord> = {
        assignedToUserId: assigneeId,
        assignedToName: assigneeName,
        assignedTeam: teamId || t.assignedTeam,
        status: 'ASSIGNED',
        updatedAt: now
      };

      // First response tracking
      if (!t.respondedAt) {
        updates.respondedAt = now;
        updates.respondedByUserId = session.userId;
        const respDueDate = new Date(t.responseDueTime || t.createdAt);
        updates.responseSlaStatus = new Date(now).getTime() <= respDueDate.getTime() ? 'MET' : 'BREACHED';
        updates.isResponseBreached = updates.responseSlaStatus === 'BREACHED';
      }

      await _sdsSetDoc(ticketRef, updates, { merge: true });

      await SecurityAuditService.logEvent(companyId, session.userId, session.role, session.employeeId,
        'ASSIGN_TICKET', 'serviceTickets', ticketId, true, 'LOW',
        `Ticket ${t.ticketNumber} assigned to ${assigneeName} by ${session.fullName || session.email}`
      );

      await this.notifyForTicket(companyId, t, `You have been assigned ticket ${t.ticketNumber}: ${t.title}`);

      return { success: true };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error assigning ticket:', e);
      return { success: false, error: 'Failed to assign ticket.' };
    }
  }

  /**
   * Accept an assigned ticket
   */
  static async acceptTicket(session: UserSession, companyId: string, ticketId: string): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    try {
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketSnap = await _sdsGetDoc(ticketRef);
      if (!ticketSnap.exists()) return { success: false, error: 'Ticket not found.' };
      
      const t = ticketSnap.data() as ServiceTicketRecord;
      
      if (t.assignedToUserId !== session.userId && t.assignedToUserId !== session.employeeId && session.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Unauthorized to accept this assignment. You are not the assignee.' };
      }
      if (t.status !== 'ASSIGNED' && t.status !== 'REOPENED') {
        return { success: false, error: 'Ticket is not in an assignable state.' };
      }

      const now = new Date().toISOString();
      const updates: Partial<ServiceTicketRecord> = {
        status: 'ACCEPTED',
        updatedAt: now
      };

      // Record first response
      if (!t.respondedAt) {
        updates.respondedAt = now;
        updates.respondedByUserId = session.userId;
        const respDueDate = new Date(t.responseDueTime || t.createdAt);
        updates.responseSlaStatus = new Date(now).getTime() <= respDueDate.getTime() ? 'MET' : 'BREACHED';
        updates.isResponseBreached = updates.responseSlaStatus === 'BREACHED';
      }

      await _sdsSetDoc(ticketRef, updates, { merge: true });

      await SecurityAuditService.logEvent(companyId, session.userId, session.role, session.employeeId,
        'ACCEPT_TICKET', 'serviceTickets', ticketId, true, 'LOW',
        `Ticket ${t.ticketNumber} accepted by ${session.fullName || session.email}`
      );

      return { success: true };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error accepting ticket:', e);
      return { success: false, error: 'Failed to accept ticket.' };
    }
  }

  /**
   * Decline an assigned ticket
   */
  static async declineTicket(session: UserSession, companyId: string, ticketId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }
    
    if (!reason?.trim()) {
      return { success: false, error: 'Decline reason is required.' };
    }

    try {
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketSnap = await _sdsGetDoc(ticketRef);
      if (!ticketSnap.exists()) return { success: false, error: 'Ticket not found.' };
      
      const t = ticketSnap.data() as ServiceTicketRecord;
      
      if (t.assignedToUserId !== session.userId && t.assignedToUserId !== session.employeeId && session.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Unauthorized to decline this assignment. You are not the assignee.' };
      }
      if (t.status !== 'ASSIGNED') {
        return { success: false, error: 'Ticket is not in ASSIGNED state.' };
      }

      const updates: Partial<ServiceTicketRecord> = {
        status: 'OPEN',
        assignedToUserId: '',
        assignedToName: '',
        updatedAt: new Date().toISOString()
      };

      await _sdsSetDoc(ticketRef, updates, { merge: true });

      const commentRef = doc(collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments'));
      await _sdsSetDoc(commentRef, {
        id: commentRef.id,
        ticketId,
        authorUserId: session.userId,
        authorName: session.fullName || session.email,
        authorRole: session.role,
        comment: `ASSIGNMENT DECLINED: ${reason}`,
        isInternalOnly: true,
        createdAt: new Date().toISOString()
      });

      await SecurityAuditService.logEvent(companyId, session.userId, session.role, session.employeeId,
        'DECLINE_TICKET', 'serviceTickets', ticketId, true, 'MEDIUM',
        `Ticket ${t.ticketNumber} declined by ${session.fullName || session.email}. Reason: ${reason}`
      );

      await this.notifyForTicket(companyId, t, `Ticket ${t.ticketNumber} was DECLINED by ${session.fullName || session.email}.`);

      return { success: true };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error declining ticket:', e);
      return { success: false, error: 'Failed to decline ticket.' };
    }
  }

  // ============================================================================
  // MODULE 11 / POINT 8: SERVICE TICKET STATUS WORKFLOW ENGINE
  // ============================================================================

  public static readonly STATUS_DEFINITIONS: Record<ServiceTicketStatus, TicketStatusDefinition> = {
    NEW: {
      status: 'NEW',
      code: 'NEW',
      name: 'New',
      description: 'Ticket newly created and awaiting triage or dispatch.',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-700',
      badgeBorder: 'border-blue-200',
      allowedTransitions: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
      permittedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'SERVICE_DESK', 'MANAGER', 'SUPERVISOR'],
      affectsSla: 'START_RESPONSE'
    },
    OPEN: {
      status: 'OPEN',
      code: 'OPEN',
      name: 'Open (New)',
      description: 'Ticket open and awaiting assignment.',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-700',
      badgeBorder: 'border-blue-200',
      allowedTransitions: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
      permittedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'SERVICE_DESK', 'MANAGER', 'SUPERVISOR'],
      affectsSla: 'START_RESPONSE'
    },
    ASSIGNED: {
      status: 'ASSIGNED',
      code: 'ASSIGNED',
      name: 'Assigned',
      description: 'Ticket dispatched and assigned to a technician.',
      badgeBg: 'bg-indigo-50',
      badgeText: 'text-indigo-700',
      badgeBorder: 'border-indigo-200',
      allowedTransitions: ['IN_PROGRESS', 'ON_HOLD', 'PENDING_CLIENT', 'ASSIGNED', 'CANCELLED'],
      permittedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'SERVICE_DESK', 'MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'FIELD_OFFICER'],
      affectsSla: 'START_RESPONSE'
    },
    ACCEPTED: {
      status: 'ACCEPTED',
      code: 'ACCEPTED',
      name: 'Accepted',
      description: 'Assigned technician has acknowledged the assignment.',
      badgeBg: 'bg-purple-50',
      badgeText: 'text-purple-700',
      badgeBorder: 'border-purple-200',
      allowedTransitions: ['IN_PROGRESS', 'ON_HOLD', 'PENDING_CLIENT', 'ASSIGNED', 'CANCELLED'],
      permittedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'SERVICE_DESK', 'MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'FIELD_OFFICER'],
      affectsSla: 'START_RESPONSE'
    },
    IN_PROGRESS: {
      status: 'IN_PROGRESS',
      code: 'IN_PROGRESS',
      name: 'In Progress',
      description: 'Work and active diagnostics/resolution underway.',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-700',
      badgeBorder: 'border-amber-200',
      allowedTransitions: ['ON_HOLD', 'PENDING_CLIENT', 'RESOLVED', 'ASSIGNED', 'CANCELLED'],
      permittedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'SERVICE_DESK', 'MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'FIELD_OFFICER'],
      affectsSla: 'RESUME'
    },
    ON_HOLD: {
      status: 'ON_HOLD',
      code: 'ON_HOLD',
      name: 'On Hold',
      description: 'Work paused pending client reply, spare parts or 3rd party dependency.',
      badgeBg: 'bg-orange-50',
      badgeText: 'text-orange-700',
      badgeBorder: 'border-orange-200',
      allowedTransitions: ['IN_PROGRESS', 'ASSIGNED', 'CANCELLED'],
      requiresPauseReason: true,
      requiresReason: true,
      permittedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'SERVICE_DESK', 'MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'FIELD_OFFICER'],
      affectsSla: 'PAUSE'
    },
    PENDING_CLIENT: {
      status: 'PENDING_CLIENT',
      code: 'PENDING_CLIENT',
      name: 'Pending Client',
      description: 'Awaiting information or verification from client contact.',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-200',
      allowedTransitions: ['IN_PROGRESS', 'ASSIGNED', 'CANCELLED'],
      requiresPauseReason: true,
      requiresReason: true,
      permittedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'SERVICE_DESK', 'MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'FIELD_OFFICER'],
      affectsSla: 'PAUSE'
    },
    RESOLVED: {
      status: 'RESOLVED',
      code: 'RESOLVED',
      name: 'Resolved',
      description: 'Remediation completed; awaiting client confirmation and closure.',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-700',
      badgeBorder: 'border-emerald-200',
      allowedTransitions: ['CLOSED', 'REOPENED', 'CANCELLED'],
      requiresResolutionDetails: true,
      requiresReason: false,
      permittedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'SERVICE_DESK', 'MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'FIELD_OFFICER'],
      affectsSla: 'COMPLETE_RESOLUTION'
    },
    CLOSED: {
      status: 'CLOSED',
      code: 'CLOSED',
      name: 'Closed',
      description: 'Ticket confirmed and formally closed with satisfaction rating.',
      badgeBg: 'bg-zinc-100',
      badgeText: 'text-zinc-700',
      badgeBorder: 'border-zinc-300',
      allowedTransitions: ['REOPENED'],
      requiresRating: false,
      permittedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'SERVICE_DESK', 'MANAGER', 'SUPERVISOR', 'CLIENT_CONTACT', 'EMPLOYEE'],
      affectsSla: 'COMPLETE_LIFECYCLE'
    },
    REOPENED: {
      status: 'REOPENED',
      code: 'REOPENED',
      name: 'Reopened',
      description: 'Resolution rejected or issue recurred; restarted lifecycle.',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-700',
      badgeBorder: 'border-rose-200',
      allowedTransitions: ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
      requiresReopenReason: true,
      requiresReason: true,
      permittedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'SERVICE_DESK', 'MANAGER', 'SUPERVISOR', 'CLIENT_CONTACT', 'EMPLOYEE'],
      affectsSla: 'RESET_RESOLUTION'
    },
    CANCELLED: {
      status: 'CANCELLED',
      code: 'CANCELLED',
      name: 'Cancelled',
      description: 'Ticket marked as duplicate, invalid or withdrawn.',
      badgeBg: 'bg-red-50',
      badgeText: 'text-red-700',
      badgeBorder: 'border-red-200',
      allowedTransitions: ['REOPENED'],
      requiresCancellationReason: true,
      requiresReason: true,
      permittedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'SERVICE_DESK', 'MANAGER', 'SUPERVISOR', 'CLIENT_CONTACT', 'EMPLOYEE'],
      affectsSla: 'CANCEL'
    }
  };

  /**
   * Helper to normalize aliases
   */
  public static normalizeStatus(status: ServiceTicketStatus | string): ServiceTicketStatus {
    if (!status) return 'NEW';
    const s = status.toUpperCase();
    if (s === 'OPEN') return 'NEW';
    if (s === 'PENDING_CLIENT') return 'ON_HOLD';
    if (s === 'ACCEPTED') return 'ASSIGNED';
    return (s as ServiceTicketStatus) in this.STATUS_DEFINITIONS ? (s as ServiceTicketStatus) : 'NEW';
  }

  /**
   * Returns allowed transition targets for a ticket based on current state and user permissions
   */
  public static getAvailableTransitions(
    currentStatus: ServiceTicketStatus | string,
    userRole: string,
    isAssignee: boolean = false,
    isCreator: boolean = false
  ): TicketStatusDefinition[] {
    const norm = this.normalizeStatus(currentStatus);
    const def = this.STATUS_DEFINITIONS[norm] || this.STATUS_DEFINITIONS.NEW;
    const adminRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER'];

    return def.allowedTransitions
      .map((st: any) => this.STATUS_DEFINITIONS[st])
      .filter((tDef: any) => {
        if (!tDef) return false;
        if (adminRoles.includes(userRole)) return true;
        if (isAssignee && ['IN_PROGRESS', 'ON_HOLD', 'PENDING_CLIENT', 'RESOLVED', 'ASSIGNED'].includes(tDef.status)) return true;
        if (isCreator && ['CLOSED', 'REOPENED', 'CANCELLED'].includes(tDef.status)) return true;
        if (tDef.permittedRoles && tDef.permittedRoles.includes(userRole)) return true;
        return false;
      });
  }

  /**
   * Core State Machine & Transition Engine for Service Tickets
   */
  public static async transitionTicketStatus(
    session: UserSession,
    companyId: string,
    ticketId: string,
    payload: TicketStatusTransitionPayload
  ): Promise<{ success: boolean; error?: string; idempotent?: boolean; updatedTicket?: ServiceTicketRecord }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    try {
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketSnap = await _sdsGetDoc(ticketRef);
      if (!ticketSnap.exists()) {
        return { success: false, error: 'Ticket not found.' };
      }

      const t = ticketSnap.data() as ServiceTicketRecord;
      const currentNorm = this.normalizeStatus(t.status);
      const targetNorm = this.normalizeStatus(payload.toStatus);

      // Optimistic concurrency check
      if (payload.expectedCurrentStatus && this.normalizeStatus(payload.expectedCurrentStatus) !== currentNorm) {
        return {
          success: false,
          error: `Conflict: Ticket status was modified to ${t.status} by another user. Please refresh.`
        };
      }

      // Idempotency check
      if (t.status === payload.toStatus || currentNorm === targetNorm) {
        return { success: true, idempotent: true, updatedTicket: t };
      }

      // Validate transition in state machine
      const currentDef = this.STATUS_DEFINITIONS[currentNorm] || this.STATUS_DEFINITIONS.NEW;
      const isAllowedTransition = currentDef.allowedTransitions.some(
        (st: any) => this.normalizeStatus(st) === targetNorm || st === payload.toStatus
      );

      // Super admins / company admins can force-reopen or correct states if needed
      const isSuperOrAdmin = session.role === 'SUPER_ADMIN' || session.role === 'COMPANY_ADMIN';
      if (!isAllowedTransition && !isSuperOrAdmin) {
        return {
          success: false,
          error: `Invalid transition: Cannot move ticket from ${t.status} to ${payload.toStatus}. Allowed transitions: ${currentDef.allowedTransitions.join(', ')}.`
        };
      }

      // Role authorization check
      const isAssignee = t.assignedToUserId === session.userId || t.assignedToUserId === session.employeeId;
      const isCreator = t.reportedByUserId === session.userId;
      const targetDef = this.STATUS_DEFINITIONS[payload.toStatus] || this.STATUS_DEFINITIONS[targetNorm];

      let isAuthorized = isSuperOrAdmin;
      if (!isAuthorized && targetDef.permittedRoles?.includes(session.role)) isAuthorized = true;
      if (!isAuthorized && isAssignee && ['IN_PROGRESS', 'ON_HOLD', 'PENDING_CLIENT', 'RESOLVED', 'ASSIGNED'].includes(payload.toStatus)) isAuthorized = true;
      if (!isAuthorized && isCreator && ['CLOSED', 'REOPENED', 'CANCELLED'].includes(payload.toStatus)) isAuthorized = true;

      if (!isAuthorized) {
        return {
          success: false,
          error: `Permission denied: Role ${session.role} is not authorized to transition this ticket to ${payload.toStatus}.`
        };
      }

      // Field & Business Rule Validations
      if (targetNorm === 'CANCELLED') {
        const reasonText = (payload.reason || payload.notes || '').trim();
        if (!reasonText || reasonText.length < 3) {
          return { success: false, error: 'A cancellation reason (at least 3 characters) is required to cancel this ticket.' };
        }
      }

      if (targetNorm === 'ON_HOLD') {
        if (!payload.pauseReason) {
          return { success: false, error: 'A pause reason (e.g. Waiting on Client, Pending Parts) is required to put this ticket on hold.' };
        }
        const reasonText = (payload.reason || payload.notes || '').trim();
        if (!reasonText) {
          return { success: false, error: 'Please provide notes/reason explaining why the ticket is being put on hold.' };
        }
      }

      if (targetNorm === 'RESOLVED') {
        const resolutionText = (payload.resolutionSummary || payload.notes || '').trim();
        if (!resolutionText || resolutionText.length < 5) {
          return { success: false, error: 'A resolution summary (at least 5 characters) describing the fix is required to resolve this ticket.' };
        }
      }

      if (targetNorm === 'REOPENED') {
        const reopenReason = (payload.reason || payload.notes || '').trim();
        if (!reopenReason || reopenReason.length < 5) {
          return { success: false, error: 'A reopening justification (at least 5 characters) is required to reopen this ticket.' };
        }
      }

      const now = new Date().toISOString();
      const updates: Partial<ServiceTicketRecord> = {
        status: payload.toStatus,
        previousStatus: t.status,
        lastStatusChangedAt: now,
        lastStatusChangedByUserId: session.userId,
        lastStatusChangedByName: session.fullName || session.email || 'User',
        statusChangeReason: payload.reason || payload.resolutionSummary || payload.notes || '',
        updatedAt: now
      };

      // -------------------------------------------------------------
      // SLA Timers & Lifecycle Engine Updates
      // -------------------------------------------------------------

      // 1. First Response SLA tracking
      if (!t.respondedAt && ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(payload.toStatus)) {
        updates.respondedAt = now;
        updates.respondedByUserId = session.userId;
        const respDueDate = new Date(t.responseDueTime || t.createdAt);
        updates.responseSlaStatus = new Date(now).getTime() <= respDueDate.getTime() ? 'MET' : 'BREACHED';
        updates.isResponseBreached = updates.responseSlaStatus === 'BREACHED';
      }

      // 2. Pause SLA (Entering ON_HOLD / PENDING_CLIENT)
      if (targetNorm === 'ON_HOLD') {
        if (!t.lastPausedAt) {
          const pauseRecord: TicketSlaPauseRecord = {
            id: `pause_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            ticketId,
            companyId,
            pausedAt: now,
            reason: payload.pauseReason || 'WAITING_ON_CLIENT',
            notes: payload.reason || payload.notes || 'Status changed to On Hold',
            pausedByUserId: session.userId,
            pausedByName: session.fullName || session.email || 'User'
          };
          updates.pauseHistory = [...(t.pauseHistory || []), pauseRecord];
          updates.lastPausedAt = now;
          updates.resolutionSlaStatus = 'PAUSED';
        }
      }

      // 3. Resume SLA (Leaving ON_HOLD / PENDING_CLIENT to IN_PROGRESS or ASSIGNED)
      if (currentNorm === 'ON_HOLD' && (targetNorm === 'IN_PROGRESS' || targetNorm === 'ASSIGNED')) {
        if (t.lastPausedAt) {
          const pausedMs = new Date(now).getTime() - new Date(t.lastPausedAt).getTime();
          const durationMinutes = Math.max(1, Math.round(pausedMs / (1000 * 60)));
          const updatedPauses = (t.pauseHistory || []).map((p: any, idx: number, arr: any) => {
            if (idx === arr.length - 1 && !p.resumedAt) {
              return {
                ...p,
                resumedAt: now,
                resumedByUserId: session.userId,
                resumedByName: session.fullName || session.email || 'User',
                pausedDurationMinutes: durationMinutes
              };
            }
            return p;
          });
          const totalPaused = (t.totalPausedDurationMinutes || 0) + durationMinutes;
          updates.pauseHistory = updatedPauses;
          updates.totalPausedDurationMinutes = totalPaused;
          updates.lastPausedAt = null as any;

          // Extend SLA Resolution Due Date by paused duration
          const baseResDue = new Date(t.resolutionDueTime || t.slaDueTime || t.createdAt);
          const extendedResDue = new Date(baseResDue.getTime() + durationMinutes * 60 * 1000).toISOString();
          updates.resolutionDueTime = extendedResDue;
          updates.slaDueTime = extendedResDue;
          updates.resolutionSlaStatus = 'ACTIVE';
        }
      }

      // 4. Resolution SLA tracking (Entering RESOLVED)
      let resolutionId: string | undefined;
      let calculatedSlaStatus: import('../types').TicketSlaStatus = 'ACTIVE';
      let isResolutionMet: boolean = true;
      let actualDurationMinutes: number = 0;

      if (targetNorm === 'RESOLVED') {
        updates.resolvedAt = now;
        updates.resolvedByUserId = session.userId;
        updates.resolutionSummary = payload.resolutionSummary || payload.notes || '';
        updates.resolutionCategory = payload.resolutionCategory || t.category;
        updates.rootCause = payload.rootCause || 'Remediation completed';
        updates.correctiveAction = payload.correctiveAction || 'Verified service restored and operational';

        const createdMs = new Date(t.createdAt).getTime();
        const nowMs = new Date(now).getTime();
        const pausedMins = t.totalPausedDurationMinutes || 0;
        const totalElapsedMinutes = Math.max(1, Math.round((nowMs - createdMs) / 60000));
        actualDurationMinutes = Math.max(1, totalElapsedMinutes - pausedMins);

        const effectiveDue = new Date(t.resolutionDueTime || t.slaDueTime || t.createdAt);
        isResolutionMet = nowMs <= effectiveDue.getTime() && !t.isSlaBreached;
        calculatedSlaStatus = isResolutionMet ? 'MET' : 'FAILED';
        updates.resolutionSlaStatus = calculatedSlaStatus;
        updates.isResolutionBreached = !isResolutionMet;

        resolutionId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        updates.activeResolutionId = resolutionId;
      }

      // 5. Formal Closure (Entering CLOSED)
      if (targetNorm === 'CLOSED') {
        updates.closedAt = now;
        if (payload.clientRating !== undefined) updates.clientRating = payload.clientRating;
        if (payload.clientFeedbackNotes) updates.clientFeedbackNotes = payload.clientFeedbackNotes;
        if (!t.resolvedAt) updates.resolvedAt = now;
      }

      // 6. Reopened Lifecycle (Entering REOPENED)
      if (targetNorm === 'REOPENED') {
        updates.resolvedAt = null as any;
        updates.closedAt = null as any;
        updates.resolutionSlaStatus = 'ACTIVE';
        updates.verificationStatus = 'REJECTED';
      }

      // 7. Cancellation (Entering CANCELLED)
      if (targetNorm === 'CANCELLED') {
        updates.resolutionSlaStatus = 'CANCELLED';
      }

      // -------------------------------------------------------------
      // BPM Approval Workflow Integration
      // -------------------------------------------------------------
      let bpmWorkflowId: string | undefined;
      let bpmStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;

      if (
        (targetNorm === 'RESOLVED' && (t.priority === 'CRITICAL' || t.priority === 'HIGH')) ||
        (targetNorm === 'REOPENED' && t.status === 'CLOSED')
      ) {
        try {
          const bpmInstance = await BpmService.submitForApproval(
            companyId,
            session.userId,
            'SERVICE_DESK',
            t.id,
            'TICKET_STATUS_TRANSITION',
            {
              fromStatus: t.status,
              toStatus: payload.toStatus,
              reason: payload.reason,
              resolutionSummary: payload.resolutionSummary,
              priority: t.priority
            }
          );
          if (bpmInstance) {
            bpmWorkflowId = bpmInstance.id;
            bpmStatus = 'PENDING';
            updates.bpmWorkflowId = bpmInstance.id;
            updates.bpmStatus = 'PENDING';
          }
        } catch (bpmErr) {
          console.warn('[ServiceDeskService] BPM Workflow trigger note:', bpmErr);
        }
      }

      if (targetNorm === 'RESOLVED') {
        const vStatus: TicketVerificationStatus = bpmWorkflowId ? 'PENDING_VERIFICATION' : 'NOT_REQUIRED';
        updates.verificationStatus = vStatus;

        // Persist Resolution subcollection record
        try {
          const effectiveDue = new Date(t.resolutionDueTime || t.slaDueTime || t.createdAt);
          const resolutionRecord: ServiceTicketResolutionRecord = {
            id: resolutionId!,
            ticketId: t.id,
            ticketNumber: t.ticketNumber,
            companyId,
            siteId: t.siteId,
            siteName: t.siteName,
            clientId: t.clientId,
            clientName: t.clientName,
            contractId: t.contractId,
            resolutionSummary: payload.resolutionSummary || payload.notes || 'Resolution completed',
            rootCause: payload.rootCause || 'Remediation completed',
            correctiveAction: payload.correctiveAction || 'Verified service restored and operational',
            resolutionCategory: payload.resolutionCategory || t.category,
            resolvedByUserId: session.userId,
            resolvedByName: session.fullName || session.email || 'Technician',
            resolvedByRole: session.role,
            resolutionTimestamp: now,
            evidenceAttachmentIds: payload.evidenceAttachmentIds || payload.linkedAttachmentIds || [],
            isClientVisible: true,
            verificationStatus: vStatus,
            slaResolutionStatus: calculatedSlaStatus,
            slaTargetDueTime: effectiveDue.toISOString(),
            actualResolutionDurationMinutes: actualDurationMinutes,
            isSlaMet: isResolutionMet,
            bpmWorkflowId,
            bpmStatus,
            status: 'ACTIVE',
            auditReference: `AUD-RES-${Date.now()}`,
            createdAt: now,
            updatedAt: now
          };

          const resolutionDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'resolutions', resolutionId!);
          await _sdsSetDoc(resolutionDocRef, resolutionRecord);
        } catch (resErr) {
          console.warn('[ServiceDeskService] Resolution subcollection write note:', resErr);
        }
      }

      // -------------------------------------------------------------
      // Status History Record Creation
      // -------------------------------------------------------------
      const historyId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const historyRecord: TicketStatusHistoryRecord = {
        id: historyId,
        ticketId: t.id,
        companyId,
        fromStatus: t.status,
        toStatus: payload.toStatus,
        changedAt: now,
        changedByUserId: session.userId,
        changedByName: session.fullName || session.email || 'User',
        changedByRole: session.role,
        reason: payload.reason,
        notes: payload.notes,
        pauseReason: payload.pauseReason,
        resolutionCategory: payload.resolutionCategory,
        resolutionSummary: payload.resolutionSummary,
        rootCause: payload.rootCause,
        clientRating: payload.clientRating,
        clientFeedbackNotes: payload.clientFeedbackNotes,
        evidenceAttachmentIds: payload.evidenceAttachmentIds || payload.linkedAttachmentIds,
        bpmWorkflowId,
        bpmStatus,
        auditReference: `AUD-STATUS-${Date.now()}`
      };

      updates.statusHistory = [...(t.statusHistory || []), historyRecord];

      // Save main ticket update
      await _sdsSetDoc(ticketRef, updates, { merge: true });

      // Save subcollection history record (immutable audit trail)
      try {
        const historyDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'status_history', historyId);
        await _sdsSetDoc(historyDocRef, historyRecord);
      } catch (histErr) {
        console.warn('[ServiceDeskService] Status history subcollection write note:', histErr);
      }

      // Automatic System Activity Comment
      try {
        const commentId = `SYS-STATUS-${Date.now()}`;
        const commentDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments', commentId);
        const commentText = `Status transitioned from ${t.status} to ${payload.toStatus}.${payload.reason ? ' Reason: ' + payload.reason : ''}${payload.pauseReason ? ' (Pause Reason: ' + payload.pauseReason + ')' : ''}${payload.resolutionSummary ? ' | Resolution: ' + payload.resolutionSummary : ''}`;
        
        await _sdsSetDoc(commentDocRef, {
          id: commentId,
          ticketId,
          companyId,
          authorUserId: session.userId,
          authorName: session.fullName || session.email || 'System User',
          authorRole: session.role,
          content: commentText,
          isInternalOnly: false,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now
        });
      } catch (cErr) {
        console.warn('[ServiceDeskService] System comment creation note:', cErr);
      }

      // Security Audit Logging
      await SecurityAuditService.logEvent(
        companyId,
        session.userId,
        session.role,
        session.employeeId,
        'TICKET_STATUS_TRANSITION',
        'serviceTickets',
        ticketId,
        true,
        targetNorm === 'CANCELLED' || targetNorm === 'REOPENED' ? 'MEDIUM' : 'LOW',
        `Ticket ${t.ticketNumber} status changed from ${t.status} to ${payload.toStatus} by ${session.fullName || session.email}. Reason: ${payload.reason || 'Standard progression'}`
      );

      // Real-time Notification
      const updatedTicketObj = { ...t, ...updates } as ServiceTicketRecord;
      await this.notifyForTicket(
        companyId,
        updatedTicketObj,
        `Ticket ${t.ticketNumber} status updated to ${payload.toStatus} by ${session.fullName || session.email}`
      );

      return { success: true, updatedTicket: updatedTicketObj };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error transitioning ticket status:', e);
      return { success: false, error: e?.message || 'Failed to transition ticket status.' };
    }
  }

  /**
   * Backward-compatible updateTicketStatus wrapper routing through transitionTicketStatus
   */
  static async updateTicketStatus(
    session: UserSession, 
    companyId: string, 
    ticketId: string, 
    newStatus: import('../types').ServiceTicketStatus, 
    resolutionSummary?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.transitionTicketStatus(session, companyId, ticketId, {
      toStatus: newStatus,
      resolutionSummary,
      reason: resolutionSummary
    });
  }

  /**
   * Fetches status transition history for a ticket
   */
  static async getStatusHistory(companyId: string, ticketId: string): Promise<TicketStatusHistoryRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'status_history');
      const q = query(colRef, orderBy('changedAt', 'asc'));
      const snap = await _sdsGetDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d: any) => d.data() as TicketStatusHistoryRecord);
      }

      // Fallback to embedded ticket.statusHistory
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketSnap = await _sdsGetDoc(ticketRef);
      if (ticketSnap.exists()) {
        const t = ticketSnap.data() as ServiceTicketRecord;
        return t.statusHistory || [];
      }
      return [];
    } catch (e) {
      console.error('[ServiceDeskService] Error fetching status history:', e);
      return [];
    }
  }

  /**
   * Realtime subscription for status transition history
   */
  static subscribeToStatusHistory(
    companyId: string,
    ticketId: string,
    callback: (history: TicketStatusHistoryRecord[]) => void
  ): () => void {
    const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'status_history');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as TicketStatusHistoryRecord);
      list.sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
      callback(list);
    });
  }

  // ============================================================
  // MODULE 11 / POINT 9: SERVICE TICKET RESOLUTION & VERIFICATION
  // ============================================================

  /**
   * Submit formal resolution for a service ticket with RCA, CAPA, evidence, and SLA calculation.
   */
  static async submitTicketResolution(
    session: UserSession,
    companyId: string,
    ticketId: string,
    payload: SubmitResolutionPayload
  ): Promise<{ success: boolean; resolution?: ServiceTicketResolutionRecord; updatedTicket?: ServiceTicketRecord; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    const summary = (payload.resolutionSummary || '').trim();
    if (!summary || summary.length < 10) {
      return { success: false, error: 'A detailed resolution summary (at least 10 characters) is required.' };
    }

    const rootCause = (payload.rootCause || '').trim();
    if (!rootCause || rootCause.length < 5) {
      return { success: false, error: 'Root Cause Analysis (RCA) description (at least 5 characters) is required.' };
    }

    const correctiveAction = (payload.correctiveAction || '').trim();
    if (!correctiveAction || correctiveAction.length < 5) {
      return { success: false, error: 'Corrective & Preventive Action (CAPA) description (at least 5 characters) is required.' };
    }

    try {
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketSnap = await _sdsGetDoc(ticketRef);
      if (!ticketSnap.exists()) {
        return { success: false, error: 'Ticket not found.' };
      }

      const t = ticketSnap.data() as ServiceTicketRecord;
      if (t.status === 'CLOSED' || t.status === 'CANCELLED') {
        return { success: false, error: `Cannot resolve a ticket that is already ${t.status}.` };
      }

      // Delegate status transition through standard state machine with enriched payload
      const transitionRes = await this.transitionTicketStatus(session, companyId, ticketId, {
        toStatus: 'RESOLVED',
        resolutionSummary: summary,
        rootCause,
        correctiveAction,
        resolutionCategory: payload.resolutionCategory,
        evidenceAttachmentIds: payload.evidenceAttachmentIds,
        notes: payload.internalNotes,
        reason: `Ticket Resolved: ${summary.substring(0, 80)}`
      });

      if (!transitionRes.success) {
        return { success: false, error: transitionRes.error || 'Failed to submit ticket resolution.' };
      }

      // Optional dedicated resolution comment
      if (payload.resolutionComment && payload.resolutionComment.trim()) {
        await this.addComment(
          session,
          companyId,
          ticketId,
          payload.resolutionComment.trim(),
          payload.isClientVisible === false
        );
      }

      // Fetch the generated resolution record
      let activeResolution: ServiceTicketResolutionRecord | undefined;
      if (transitionRes.updatedTicket?.activeResolutionId) {
        const resDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'resolutions', transitionRes.updatedTicket.activeResolutionId);
        const resSnap = await _sdsGetDoc(resDocRef);
        if (resSnap.exists()) {
          activeResolution = resSnap.data() as ServiceTicketResolutionRecord;
        }
      }

      return {
        success: true,
        resolution: activeResolution,
        updatedTicket: transitionRes.updatedTicket
      };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error submitting ticket resolution:', e);
      return { success: false, error: e?.message || 'Failed to submit ticket resolution.' };
    }
  }

  /**
   * Verify and approve or reject a ticket resolution (Quality Gate & Verification Workflow).
   */
  static async verifyTicketResolution(
    session: UserSession,
    companyId: string,
    ticketId: string,
    payload: VerifyResolutionPayload
  ): Promise<{ success: boolean; resolution?: ServiceTicketResolutionRecord; updatedTicket?: ServiceTicketRecord; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    const permittedRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'SERVICE_DESK', 'MANAGER', 'SUPERVISOR'];
    if (!permittedRoles.includes(session.role)) {
      return { success: false, error: `Role ${session.role} is not authorized to verify or reject ticket resolutions.` };
    }

    if (payload.verificationResult === 'REJECTED') {
      const reason = (payload.rejectionReason || '').trim();
      if (!reason || reason.length < 5) {
        return { success: false, error: 'A specific rejection reason (at least 5 characters) explaining what needs rework is required.' };
      }
    }

    try {
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketSnap = await _sdsGetDoc(ticketRef);
      if (!ticketSnap.exists()) {
        return { success: false, error: 'Ticket not found.' };
      }

      const t = ticketSnap.data() as ServiceTicketRecord;
      const now = new Date().toISOString();
      const resolutionId = payload.resolutionId || t.activeResolutionId;

      if (!resolutionId) {
        return { success: false, error: 'No active resolution found for this ticket.' };
      }

      const resDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'resolutions', resolutionId);
      const resSnap = await _sdsGetDoc(resDocRef);
      const existingRes = resSnap.exists() ? (resSnap.data() as ServiceTicketResolutionRecord) : null;

      if (payload.verificationResult === 'APPROVED') {
        // --- 1. APPROVAL WORKFLOW ---
        const resUpdates: Partial<ServiceTicketResolutionRecord> = {
          verificationStatus: 'VERIFIED',
          verificationResult: 'APPROVED',
          verifiedByUserId: session.userId,
          verifiedByName: session.fullName || session.email || 'Quality Verifier',
          verifiedByRole: session.role,
          verifiedAt: now,
          verificationNotes: payload.verificationNotes || 'Resolution verified and operational integrity confirmed.',
          bpmStatus: 'APPROVED',
          updatedAt: now
        };

        await _sdsSetDoc(resDocRef, resUpdates, { merge: true });

        const ticketUpdates: Partial<ServiceTicketRecord> = {
          verificationStatus: 'VERIFIED',
          verifiedAt: now,
          verifiedByUserId: session.userId,
          verifiedByName: session.fullName || session.email || 'Quality Verifier',
          bpmStatus: 'APPROVED',
          updatedAt: now
        };

        await _sdsSetDoc(ticketRef, ticketUpdates, { merge: true });

        // Add Verification Activity Comment
        const commentId = `SYS-VERIFY-${Date.now()}`;
        const commentDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments', commentId);
        await _sdsSetDoc(commentDocRef, {
          id: commentId,
          ticketId,
          companyId,
          authorUserId: session.userId,
          authorName: session.fullName || session.email || 'Quality Verifier',
          authorRole: session.role,
          content: `✅ Resolution Verified & Approved by ${session.fullName || session.email}.${payload.verificationNotes ? ' Notes: ' + payload.verificationNotes : ''}`,
          isInternalOnly: false,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now
        });

        // Security Audit
        await SecurityAuditService.logEvent(
          companyId, session.userId, session.role, session.employeeId,
          'SERVICE_TICKET_RESOLUTION_VERIFIED', 'serviceTickets', ticketId, true, 'LOW',
          `Resolution verified & approved for ticket ${t.ticketNumber} by ${session.fullName || session.email}`
        );

        // Realtime Notification
        const mergedTicket = { ...t, ...ticketUpdates } as ServiceTicketRecord;
        await this.notifyForTicket(
          companyId,
          mergedTicket,
          `Resolution for Ticket ${t.ticketNumber} verified and approved.`
        );

        return {
          success: true,
          resolution: { ...(existingRes || {}), ...resUpdates } as ServiceTicketResolutionRecord,
          updatedTicket: mergedTicket
        };

      } else {
        // --- 2. REJECTION / REWORK WORKFLOW ---
        const resUpdates: Partial<ServiceTicketResolutionRecord> = {
          verificationStatus: 'REJECTED',
          verificationResult: 'REJECTED',
          rejectionReason: payload.rejectionReason,
          reworkNotes: payload.reworkNotes || '',
          rejectedByUserId: session.userId,
          rejectedByName: session.fullName || session.email || 'Quality Verifier',
          rejectedAt: now,
          bpmStatus: 'REJECTED',
          status: 'REJECTED',
          updatedAt: now
        };

        await _sdsSetDoc(resDocRef, resUpdates, { merge: true });

        // Revert ticket to IN_PROGRESS for rework
        const ticketUpdates: Partial<ServiceTicketRecord> = {
          status: 'IN_PROGRESS',
          previousStatus: 'RESOLVED',
          resolvedAt: null as any,
          verificationStatus: 'REJECTED',
          rejectionReason: payload.rejectionReason,
          reworkNotes: payload.reworkNotes || '',
          statusChangeReason: `Resolution Rejected: ${payload.rejectionReason}`,
          resolutionSlaStatus: 'ACTIVE',
          bpmStatus: 'REJECTED',
          updatedAt: now
        };

        // Add to Status History
        const histId = `hist_rej_${Date.now()}`;
        const histRecord: TicketStatusHistoryRecord = {
          id: histId,
          ticketId,
          companyId,
          fromStatus: 'RESOLVED',
          toStatus: 'IN_PROGRESS',
          changedAt: now,
          changedByUserId: session.userId,
          changedByName: session.fullName || session.email || 'Quality Verifier',
          changedByRole: session.role,
          reason: `Rework Required: ${payload.rejectionReason}`,
          notes: payload.reworkNotes,
          auditReference: `AUD-REJECT-${Date.now()}`
        };

        ticketUpdates.statusHistory = [...(t.statusHistory || []), histRecord];

        await _sdsSetDoc(ticketRef, ticketUpdates, { merge: true });

        // Save Status history subcollection
        try {
          const histDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'status_history', histId);
          await _sdsSetDoc(histDocRef, histRecord);
        } catch (hErr) {
          console.warn('[ServiceDeskService] Status history write note on rejection:', hErr);
        }

        // Add Rejection Activity Comment
        const commentId = `SYS-REJECT-${Date.now()}`;
        const commentDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments', commentId);
        await _sdsSetDoc(commentDocRef, {
          id: commentId,
          ticketId,
          companyId,
          authorUserId: session.userId,
          authorName: session.fullName || session.email || 'Quality Verifier',
          authorRole: session.role,
          content: `⚠️ Resolution Rejected by ${session.fullName || session.email}. Reason: ${payload.rejectionReason}.${payload.reworkNotes ? ' Action Required: ' + payload.reworkNotes : ''}`,
          isInternalOnly: false,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now
        });

        // Security Audit
        await SecurityAuditService.logEvent(
          companyId, session.userId, session.role, session.employeeId,
          'SERVICE_TICKET_RESOLUTION_REJECTED', 'serviceTickets', ticketId, true, 'MEDIUM',
          `Resolution rejected for ticket ${t.ticketNumber} by ${session.fullName || session.email}. Reason: ${payload.rejectionReason}`
        );

        // Realtime Notification to technician
        const mergedTicket = { ...t, ...ticketUpdates } as ServiceTicketRecord;
        await this.notifyForTicket(
          companyId,
          mergedTicket,
          `Action Required: Resolution for Ticket ${t.ticketNumber} was rejected. Reason: ${payload.rejectionReason}`
        );

        return {
          success: true,
          resolution: { ...(existingRes || {}), ...resUpdates } as ServiceTicketResolutionRecord,
          updatedTicket: mergedTicket
        };
      }
    } catch (e: any) {
      console.error('[ServiceDeskService] Error verifying ticket resolution:', e);
      return { success: false, error: e?.message || 'Failed to verify ticket resolution.' };
    }
  }

  /**
   * Fetch all resolutions for a ticket (including historical rework cycles)
   */
  static async getTicketResolutions(companyId: string, ticketId: string): Promise<ServiceTicketResolutionRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'resolutions');
      const q = query(colRef, orderBy('resolutionTimestamp', 'desc'));
      const snap = await _sdsGetDocs(q);
      return snap.docs.map((d: any) => d.data() as ServiceTicketResolutionRecord);
    } catch (e) {
      console.error('[ServiceDeskService] Error fetching ticket resolutions:', e);
      return [];
    }
  }

  /**
   * Realtime subscription for ticket resolutions
   */
  static subscribeToTicketResolutions(
    companyId: string,
    ticketId: string,
    callback: (resolutions: ServiceTicketResolutionRecord[]) => void
  ): () => void {
    const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'resolutions');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as ServiceTicketResolutionRecord);
      list.sort((a, b) => new Date(b.resolutionTimestamp).getTime() - new Date(a.resolutionTimestamp).getTime());
      callback(list);
    }, (err) => {
      console.error('[ServiceDeskService] Error subscribing to resolutions:', err);
      callback([]);
    });
  }

  // ============================================================================
  // MODULE 11 / POINT 10: SERVICE TICKET REOPEN ENGINE
  // ============================================================================

  /**
   * Evaluates ticket reopen eligibility based on state, lifecycle, RBAC, and reopen window.
   */
  static checkTicketReopenEligibility(
    session: UserSession,
    companyId: string,
    ticket: ServiceTicketRecord
  ): TicketReopenEligibilityResult {
    const currentNorm = this.normalizeStatus(ticket.status);
    const isSuperOrAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER'].includes(session.role);
    const isStaff = ['SERVICE_DESK', 'MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'FIELD_OFFICER'].includes(session.role);
    const isCreator = ticket.reportedByUserId === session.userId;
    const isClient = ['CLIENT_CONTACT', 'EMPLOYEE'].includes(session.role);
    const isAssignee = ticket.assignedToUserId === session.userId || ticket.assignedToUserId === session.employeeId;

    const currentCycleCount = (ticket.reopenCount || 0) + 1;
    const previousResolutionId = ticket.activeResolutionId;
    const reopenWindowDays = ticket.priority === 'CRITICAL' ? 14 : 30;

    // 1. Status Check: Only Resolved, Closed, or Cancelled tickets can be reopened
    const isEligibleStatus = ['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status) || 
                             ['RESOLVED', 'CLOSED', 'CANCELLED'].includes(currentNorm);
    
    if (!isEligibleStatus) {
      return {
        isEligible: false,
        reason: `Ticket cannot be reopened because its current status is ${ticket.status}. Only Resolved, Closed, or Cancelled tickets can be reopened.`,
        allowedTargetStatuses: [],
        reopenWindowDays,
        isWithinWindow: true,
        requiresApproval: false,
        previousResolutionId,
        currentCycleCount
      };
    }

    // 2. Authorization Check
    if (!isSuperOrAdmin && !isStaff && !isCreator && !isClient && !isAssignee) {
      return {
        isEligible: false,
        reason: `You do not have permission to reopen this ticket. Role ${session.role} is not authorized.`,
        allowedTargetStatuses: [],
        reopenWindowDays,
        isWithinWindow: true,
        requiresApproval: false,
        previousResolutionId,
        currentCycleCount
      };
    }

    // 3. Time Window Check (from closedAt or resolvedAt or updatedAt)
    const closureTimeStr = ticket.closedAt || ticket.resolvedAt || ticket.updatedAt || ticket.createdAt;
    const closureDate = new Date(closureTimeStr);
    const now = new Date();
    const diffDays = Math.max(0, Math.floor((now.getTime() - closureDate.getTime()) / (1000 * 60 * 60 * 24)));
    const isWithinWindow = diffDays <= reopenWindowDays;

    if (!isWithinWindow && !isSuperOrAdmin) {
      return {
        isEligible: false,
        reason: `The standard reopen window of ${reopenWindowDays} days has expired (${diffDays} days since closure). An administrator or manager must authorize a reopen.`,
        allowedTargetStatuses: [],
        reopenWindowDays,
        daysSinceClosure: diffDays,
        isWithinWindow: false,
        requiresApproval: true,
        previousResolutionId,
        currentCycleCount
      };
    }

    const allowedTargetStatuses: ServiceTicketStatus[] = ['REOPENED', 'IN_PROGRESS'];
    if (ticket.assignedToUserId) {
      allowedTargetStatuses.push('ASSIGNED');
    }

    const requiresApproval = !isWithinWindow || ticket.priority === 'CRITICAL' || currentCycleCount > 2;

    return {
      isEligible: true,
      allowedTargetStatuses,
      reopenWindowDays,
      daysSinceClosure: diffDays,
      isWithinWindow,
      requiresApproval,
      previousResolutionId,
      currentCycleCount
    };
  }

  /**
   * Reopen a resolved or closed ticket with validation, SLA re-calculation, audit, and notifications.
   */
  static async reopenTicket(
    session: UserSession,
    companyId: string,
    ticketId: string,
    payload: ReopenTicketPayload
  ): Promise<{
    success: boolean;
    error?: string;
    reopenRecord?: TicketReopenRecord;
    updatedTicket?: ServiceTicketRecord;
  }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    if (!payload.reason || payload.reason.trim().length < 5) {
      return { success: false, error: 'A meaningful reopen justification of at least 5 characters is required.' };
    }

    if (!payload.reasonCategory) {
      return { success: false, error: 'A valid reopen reason category must be selected.' };
    }

    try {
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketSnap = await _sdsGetDoc(ticketRef);
      if (!ticketSnap.exists()) {
        return { success: false, error: 'Ticket not found.' };
      }

      const t = ticketSnap.data() as ServiceTicketRecord;
      const eligibility = this.checkTicketReopenEligibility(session, companyId, t);
      if (!eligibility.isEligible) {
        return { success: false, error: eligibility.reason || 'Ticket is not eligible for reopen.' };
      }

      const now = new Date().toISOString();
      const reopenId = `reopen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newCycleNumber = (t.reopenCount || 0) + 1;
      const targetStatus = payload.targetStatus || 'REOPENED';
      const activeResolutionId = t.activeResolutionId;

      // 1. Historical SLA cycle preservation
      const historicalCycle = {
        cycleNumber: t.slaCycleCount || 1,
        startedAt: t.createdAt,
        endedAt: t.resolvedAt || t.closedAt || now,
        dueTime: t.resolutionDueTime || t.slaDueTime || t.createdAt,
        slaStatus: t.resolutionSlaStatus || (t.isSlaBreached ? 'FAILED' : 'MET'),
        isMet: !t.isSlaBreached && t.resolutionSlaStatus !== 'FAILED' && t.resolutionSlaStatus !== 'BREACHED',
        resolutionId: activeResolutionId
      };

      const updatedSlaCycles = [...(t.historicalSlaCycles || []), historicalCycle];

      // 2. SLA Recalculation for the new cycle
      const effectivePriority = payload.updatedPriority || t.priority;
      let targetResolutionMinutes = t.resolutionTargetMinutes || 1440;

      if (payload.customSlaTargetMinutes && payload.customSlaTargetMinutes > 0) {
        targetResolutionMinutes = payload.customSlaTargetMinutes;
      } else {
        const targets = ServiceSlaEngine.getDefaultTargetsByPriority(effectivePriority);
        targetResolutionMinutes = targets.resolutionMinutes;
      }

      // Calculate fresh resolution due date from reopen moment
      const newResolutionDueDate = ServiceSlaEngine.calculateTargetDueTime(new Date(now), targetResolutionMinutes, null);
      const newDueTimeIso = newResolutionDueDate.toISOString();

      // 3. Priority update check
      const priorityHistory = [...(t.priorityHistory || [])];
      if (payload.updatedPriority && payload.updatedPriority !== t.priority) {
        priorityHistory.push({
          id: `prio_reopen_${Date.now()}`,
          ticketId: t.id,
          companyId,
          previousPriority: t.priority,
          newPriority: payload.updatedPriority,
          reason: `Priority adjusted on reopen (${payload.reasonCategory}): ${payload.reason}`,
          changedByUserId: session.userId,
          changedByName: session.fullName || session.email || 'User',
          timestamp: now
        });
      }

      // 4. Assignment updates
      let assignedUserId = t.assignedToUserId;
      let assignedName = t.assignedToName;
      let assignedTeam = t.assignedTeam;
      if (payload.assignedToUserId) {
        assignedUserId = payload.assignedToUserId;
        assignedName = payload.assignedToName || 'Technician';
        if (payload.assignedTeam) assignedTeam = payload.assignedTeam;
      }

      // 5. BPM Approval trigger if required
      let bpmWorkflowId: string | undefined;
      let bpmStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED' | undefined;
      if (eligibility.requiresApproval || payload.requireApproval) {
        try {
          const bpmInstance = await BpmService.submitForApproval(
            companyId,
            session.userId,
            'SERVICE_DESK',
            t.id,
            'TICKET_STATUS_TRANSITION',
            {
              fromStatus: t.status,
              toStatus: targetStatus,
              reopenReasonCategory: payload.reasonCategory,
              reopenReason: payload.reason,
              reopenCycle: newCycleNumber,
              priority: effectivePriority
            }
          );
          if (bpmInstance) {
            bpmWorkflowId = bpmInstance.id;
            bpmStatus = 'PENDING';
          }
        } catch (bpmErr) {
          console.warn('[ServiceDeskService] BPM trigger note on ticket reopen:', bpmErr);
        }
      } else {
        bpmStatus = 'AUTO_APPROVED';
      }

      // 6. Build immutable Reopen Subcollection Record
      const reopenRecord: TicketReopenRecord = {
        id: reopenId,
        ticketId: t.id,
        ticketNumber: t.ticketNumber,
        companyId,
        siteId: t.siteId,
        siteName: t.siteName,
        clientId: t.clientId,
        clientName: t.clientName,
        contractId: t.contractId,
        reasonCategory: payload.reasonCategory,
        reason: payload.reason.trim(),
        notes: payload.notes?.trim() || '',
        previousStatus: t.status,
        newStatus: targetStatus,
        previousResolutionId: activeResolutionId,
        reopenedByUserId: session.userId,
        reopenedByName: session.fullName || session.email || 'Authorized User',
        reopenedByRole: session.role,
        reopenedAt: now,
        evidenceAttachmentIds: payload.evidenceAttachmentIds || [],
        slaCycleNumber: newCycleNumber,
        slaRecalculationMode: payload.slaRecalculationMode || 'NEW_CYCLE',
        previousSlaResolutionStatus: t.resolutionSlaStatus,
        previousSlaDueTime: t.resolutionDueTime || t.slaDueTime,
        newSlaDueTime: newDueTimeIso,
        assignedToUserId: assignedUserId,
        assignedToName: assignedName,
        assignedTeam,
        priorityAtReopen: effectivePriority,
        bpmWorkflowId,
        bpmStatus,
        status: 'ACTIVE',
        auditReference: `AUD-REOPEN-${Date.now()}`,
        createdAt: now,
        updatedAt: now
      };

      // 7. If previous resolution exists, update its status to SUPERSEDED / REJECTED
      if (activeResolutionId) {
        try {
          const prevResRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'resolutions', activeResolutionId);
          await _sdsSetDoc(prevResRef, {
            status: 'SUPERSEDED',
            verificationStatus: 'REJECTED',
            rejectionReason: `Reopened (Cycle #${newCycleNumber} - ${payload.reasonCategory}): ${payload.reason}`,
            updatedAt: now
          }, { merge: true });
        } catch (rErr) {
          console.warn('[ServiceDeskService] Note updating superseded resolution:', rErr);
        }
      }

      // 8. Prepare Ticket Updates
      const ticketUpdates: Partial<ServiceTicketRecord> = {
        status: targetStatus,
        previousStatus: t.status,
        lastStatusChangedAt: now,
        lastStatusChangedByUserId: session.userId,
        lastStatusChangedByName: session.fullName || session.email || 'User',
        statusChangeReason: `Reopened (${payload.reasonCategory}): ${payload.reason}`,
        priority: effectivePriority,
        priorityHistory,
        assignedToUserId: assignedUserId,
        assignedToName: assignedName,
        assignedTeam,
        // Reset active lifecycle / resolution state for new cycle
        resolvedAt: null as any,
        closedAt: null as any,
        verificationStatus: 'PENDING_VERIFICATION',
        // SLA Reset for new cycle
        resolutionSlaStatus: 'ACTIVE',
        isSlaBreached: false,
        isResolutionBreached: false,
        slaDueTime: newDueTimeIso,
        resolutionDueTime: newDueTimeIso,
        resolutionTargetMinutes: targetResolutionMinutes,
        totalPausedDurationMinutes: 0,
        lastPausedAt: null as any,
        // Reopen tracking
        reopenCount: newCycleNumber,
        slaCycleCount: newCycleNumber + 1,
        lastReopenedAt: now,
        lastReopenedByUserId: session.userId,
        lastReopenedByName: session.fullName || session.email || 'Authorized User',
        lastReopenedByRole: session.role,
        activeReopenId: reopenId,
        historicalSlaCycles: updatedSlaCycles,
        bpmWorkflowId,
        bpmStatus: bpmStatus === 'PENDING' ? 'PENDING' : undefined,
        updatedAt: now
      };

      // 9. Status History Record
      const histId = `hist_reopen_${Date.now()}`;
      const histRecord: TicketStatusHistoryRecord = {
        id: histId,
        ticketId: t.id,
        companyId,
        fromStatus: t.status,
        toStatus: targetStatus,
        changedAt: now,
        changedByUserId: session.userId,
        changedByName: session.fullName || session.email || 'Authorized User',
        changedByRole: session.role,
        reason: `Ticket Reopened [${payload.reasonCategory}]: ${payload.reason}`,
        notes: payload.notes,
        evidenceAttachmentIds: payload.evidenceAttachmentIds,
        bpmWorkflowId,
        bpmStatus: bpmStatus === 'PENDING' ? 'PENDING' : undefined,
        auditReference: reopenRecord.auditReference
      };
      ticketUpdates.statusHistory = [...(t.statusHistory || []), histRecord];

      // Save ticket document
      await _sdsSetDoc(ticketRef, ticketUpdates, { merge: true });

      // Save reopen subcollection document
      try {
        const reopenDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'reopens', reopenId);
        await _sdsSetDoc(reopenDocRef, reopenRecord);
      } catch (reErr) {
        console.warn('[ServiceDeskService] Reopen subcollection write note:', reErr);
      }

      // Save status history subcollection
      try {
        const histDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'status_history', histId);
        await _sdsSetDoc(histDocRef, histRecord);
      } catch (hErr) {
        console.warn('[ServiceDeskService] Status history write note on reopen:', hErr);
      }

      // 10. Automatic Discussion Activity Comment
      try {
        const commentId = `SYS-REOPEN-${Date.now()}`;
        const commentDocRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments', commentId);
        const commentText = `↺ TICKET REOPENED (Cycle #${newCycleNumber}) by ${session.fullName || session.email} [${session.role}]. Category: ${payload.reasonCategory}. Justification: ${payload.reason}.${payload.notes ? ' Notes: ' + payload.notes : ''} (SLA reset with new resolution deadline: ${new Date(newDueTimeIso).toLocaleString()})`;
        
        await _sdsSetDoc(commentDocRef, {
          id: commentId,
          ticketId,
          companyId,
          authorUserId: session.userId,
          authorName: session.fullName || session.email || 'System User',
          authorRole: session.role,
          content: commentText,
          isInternalOnly: false,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now
        });
      } catch (cErr) {
        console.warn('[ServiceDeskService] Reopen comment creation note:', cErr);
      }

      // 11. Security Audit Event
      await SecurityAuditService.logEvent(
        companyId,
        session.userId,
        session.role,
        session.employeeId,
        'SERVICE_TICKET_REOPENED',
        'serviceTickets',
        ticketId,
        true,
        'MEDIUM',
        `Ticket ${t.ticketNumber} reopened (Cycle #${newCycleNumber}) by ${session.fullName || session.email}. Reason [${payload.reasonCategory}]: ${payload.reason}`
      );

      // 12. Real-time Notification
      const mergedTicket = { ...t, ...ticketUpdates } as ServiceTicketRecord;
      await this.notifyForTicket(
        companyId,
        mergedTicket,
        `Action Required: Ticket ${t.ticketNumber} was REOPENED (Cycle #${newCycleNumber}) by ${session.fullName || session.email}. Reason: ${payload.reason}`
      );

      return {
        success: true,
        reopenRecord,
        updatedTicket: mergedTicket
      };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error reopening ticket:', e);
      return { success: false, error: e?.message || 'Failed to reopen ticket.' };
    }
  }

  /**
   * Fetch all reopen records for a ticket (subcollection)
   */
  static async getTicketReopens(companyId: string, ticketId: string): Promise<TicketReopenRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'reopens');
      const q = query(colRef, orderBy('reopenedAt', 'desc'));
      const snap = await _sdsGetDocs(q);
      return snap.docs.map((d: any) => d.data() as TicketReopenRecord);
    } catch (e) {
      console.error('[ServiceDeskService] Error fetching ticket reopens:', e);
      return [];
    }
  }

  /**
   * Realtime subscription for ticket reopens
   */
  static subscribeToTicketReopens(
    companyId: string,
    ticketId: string,
    callback: (reopens: TicketReopenRecord[]) => void
  ): () => void {
    const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'reopens');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as TicketReopenRecord);
      list.sort((a, b) => new Date(b.reopenedAt).getTime() - new Date(a.reopenedAt).getTime());
      callback(list);
    }, (err) => {
      console.error('[ServiceDeskService] Error subscribing to reopens:', err);
      callback([]);
    });
  }



  // ==============================
  // PRIORITY MANAGEMENT
  // ==============================

  static async getPriorityConfigs(session: UserSession, companyId: string): Promise<import('../types').ServicePriorityConfigRecord[]> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') throw new Error('Unauthorized');
    const colRef = collection(db, 'companies', companyId, 'priorityConfigs');
    const q = query(colRef, orderBy('ordering', 'asc'));
    const snap = await _sdsGetDocs(q);
    return snap.docs.map((d: any) => d.data() as import('../types').ServicePriorityConfigRecord);
  }

  static async initializeDefaultPriorities(companyId: string, userId: string): Promise<void> {
    const defaultConfigs: Omit<import('../types').ServicePriorityConfigRecord, 'id'>[] = [
      { companyId, name: 'Critical', code: 'CRITICAL', severity: 1, description: 'Urgent, business-critical issue.', ordering: 1, isActive: true, dispatchImpact: 'HIGH', escalationImpact: 'ACCELERATED', requiresReasonToChange: true, slaTargetHours: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: userId },
      { companyId, name: 'High', code: 'HIGH', severity: 2, description: 'Major issue, high operational impact.', ordering: 2, isActive: true, dispatchImpact: 'HIGH', escalationImpact: 'ACCELERATED', requiresReasonToChange: true, slaTargetHours: 6, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: userId },
      { companyId, name: 'Medium', code: 'MEDIUM', severity: 3, description: 'Normal issue, moderate impact.', ordering: 3, isActive: true, dispatchImpact: 'NORMAL', escalationImpact: 'STANDARD', requiresReasonToChange: false, slaTargetHours: 24, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: userId },
      { companyId, name: 'Low', code: 'LOW', severity: 4, description: 'Minor issue, low impact.', ordering: 4, isActive: true, dispatchImpact: 'NONE', escalationImpact: 'NONE', requiresReasonToChange: false, slaTargetHours: 48, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: userId },
    ];
    
    for (const conf of defaultConfigs) {
      const docRef = doc(db, 'companies', companyId, 'priorityConfigs', conf.code);
      await _sdsSetDoc(docRef, { ...conf, id: conf.code });
    }
  }

  static async changeTicketPriority(
    session: UserSession, 
    companyId: string, 
    ticketId: string, 
    newPriority: import('../types').ServiceTicketPriority | string, 
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    try {
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketSnap = await _sdsGetDoc(ticketRef);
      if (!ticketSnap.exists()) return { success: false, error: 'Ticket not found.' };
      const t = ticketSnap.data() as import('../types').ServiceTicketRecord;

      if (t.status === 'CLOSED' || t.status === 'CANCELLED') {
        return { success: false, error: 'Cannot change priority of a closed or cancelled ticket.' };
      }

      const configRef = doc(db, 'companies', companyId, 'priorityConfigs', newPriority);
      const configSnap = await _sdsGetDoc(configRef);
      if (!configSnap.exists()) {
        return { success: false, error: 'Invalid priority code.' };
      }
      const pConfig = configSnap.data() as import('../types').ServicePriorityConfigRecord;

      if (!pConfig.isActive) {
        return { success: false, error: 'Selected priority is currently inactive.' };
      }

      if (pConfig.requiresReasonToChange && (!reason || reason.trim().length === 0)) {
        return { success: false, error: 'A reason is required to change to this priority.' };
      }

      if (pConfig.restrictedRoles && pConfig.restrictedRoles.length > 0 && !pConfig.restrictedRoles.includes(session.role)) {
        return { success: false, error: 'You do not have permission to assign this priority.' };
      }

      const now = new Date().toISOString();
      const historyRecord: import('../types').TicketPriorityHistoryRecord = {
        id: 'hist_' + Date.now().toString(),
        ticketId,
        companyId,
        previousPriority: t.priority,
        newPriority,
        reason,
        changedByUserId: session.userId,
        changedByName: session.fullName || session.email || 'Unknown',
        timestamp: now
      };

      const history = t.priorityHistory || [];
      history.push(historyRecord);

      // Re-evaluate SLA target time for updated priority
      const targets = ServiceSlaEngine.getDefaultTargetsByPriority(newPriority);
      const newResolutionDueDate = ServiceSlaEngine.calculateTargetDueTime(new Date(t.createdAt), targets.resolutionMinutes, null);

      const updates: Partial<import('../types').ServiceTicketRecord> = {
        priority: newPriority as import('../types').ServiceTicketPriority,
        priorityHistory: history,
        slaDueTime: newResolutionDueDate.toISOString(),
        resolutionDueTime: newResolutionDueDate.toISOString(),
        resolutionTargetMinutes: targets.resolutionMinutes,
        updatedAt: now
      };

      await _sdsSetDoc(ticketRef, updates, { merge: true });

      await SecurityAuditService.logEvent(companyId, session.userId, session.role, session.employeeId,
        'UPDATE_TICKET_PRIORITY', 'serviceTickets', ticketId, true, 'MEDIUM',
        `Ticket ${t.ticketNumber} priority changed from ${t.priority} to ${newPriority} by ${session.fullName || session.email}. Reason: ${reason}`
      );

      // Notification
      if (pConfig.severity <= 2) {
         await this.notifyForTicket(companyId, { ...t, ...updates } as import('../types').ServiceTicketRecord, `Urgent: Ticket ${t.ticketNumber} priority escalated to ${pConfig.name}`);
      } else {
         await this.notifyForTicket(companyId, { ...t, ...updates } as import('../types').ServiceTicketRecord, `Ticket ${t.ticketNumber} priority changed to ${pConfig.name}`);
      }

      return { success: true };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error changing priority:', e);
      return { success: false, error: 'Failed to change priority.' };
    }
  }

  // ============================================================================
  // MODULE 11 / POINT 11: CLIENT FEEDBACK & CSAT
  // ============================================================================

  /**
   * Evaluates eligibility for submitting, requesting, or reviewing client feedback.
   */
  public static async checkFeedbackEligibility(
    session: UserSession,
    companyId: string,
    ticket: ServiceTicketRecord
  ): Promise<TicketFeedbackEligibilityResult> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return {
        isEligible: false,
        reason: 'Unauthorized company scope.',
        isWithinWindow: false,
        feedbackWindowDays: 30,
        alreadySubmitted: false,
        canRequestFeedback: false,
        canSubmitFeedback: false,
        canReviewFeedback: false
      };
    }

    const isStaff = this.isStaffRole(session.role);
    const isAdminOrManager = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'MANAGER', 'DIRECTOR_CEO'].includes(session.role);

    // Status gate: Ticket must be RESOLVED or CLOSED to submit feedback
    const isEligibleStatus = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
    if (!isEligibleStatus) {
      return {
        isEligible: false,
        reason: `Feedback can only be provided for resolved or closed tickets (current status: ${ticket.status}).`,
        isWithinWindow: false,
        feedbackWindowDays: 30,
        alreadySubmitted: false,
        canRequestFeedback: false,
        canSubmitFeedback: false,
        canReviewFeedback: false
      };
    }

    // Feedback window check (default 30 days from resolution/closure)
    const refDateStr = ticket.closedAt || ticket.resolvedAt || ticket.updatedAt;
    const refTime = refDateStr ? new Date(refDateStr).getTime() : Date.now();
    const diffDays = Math.max(0, (Date.now() - refTime) / (1000 * 60 * 60 * 24));
    const feedbackWindowDays = 30;
    const isWithinWindow = diffDays <= feedbackWindowDays;

    // Check if feedback already exists for this ticket
    let existingFeedback: TicketFeedbackRecord | undefined = undefined;
    let alreadySubmitted = false;

    try {
      const fbCol = collection(db, 'companies', companyId, 'serviceTickets', ticket.id, 'feedback');
      const snap = await _sdsGetDocs(query(fbCol, orderBy('submittedAt', 'desc')));
      if (!snap.empty) {
        existingFeedback = snap.docs[0].data() as TicketFeedbackRecord;
        alreadySubmitted = true;
      }
    } catch (err) {
      console.warn('[ServiceDeskService] Error checking existing feedback:', err);
    }

    // Check client authorization
    const isReportedBySession = ticket.reportedByUserId === session.userId || (ticket.reportedByEmail && ticket.reportedByEmail.toLowerCase() === (session.email || '').toLowerCase());
    const isClientOfCompany = session.role === 'CLIENT_MANAGEMENT' || (!isStaff && session.companyId === companyId);
    const canSubmitFeedback = isWithinWindow && (!alreadySubmitted || isAdminOrManager) && (isReportedBySession || isClientOfCompany || isStaff);
    const canRequestFeedback = isStaff && isWithinWindow && !alreadySubmitted;
    const canReviewFeedback = isAdminOrManager || isStaff;

    return {
      isEligible: isWithinWindow && (canSubmitFeedback || alreadySubmitted),
      reason: !isWithinWindow 
        ? `Feedback window of ${feedbackWindowDays} days has expired.` 
        : alreadySubmitted 
          ? 'Client feedback has already been submitted for this resolution.' 
          : undefined,
      isWithinWindow,
      feedbackWindowDays,
      daysSinceResolution: Math.floor(diffDays),
      alreadySubmitted,
      feedbackId: existingFeedback?.id,
      existingFeedback,
      canRequestFeedback,
      canSubmitFeedback,
      canReviewFeedback
    };
  }

  /**
   * Submits client feedback with rating, breakdown, sentiment tagging, negative feedback escalation,
   * atomic updates, audit trail, and notifications.
   */
  public static async submitClientFeedback(
    session: UserSession,
    companyId: string,
    ticketId: string,
    payload: SubmitClientFeedbackPayload
  ): Promise<{ success: boolean; feedback?: TicketFeedbackRecord; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    // Validation
    const rating = Math.round(payload.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be an integer between 1 and 5 stars.' };
    }

    const comment = (payload.comment || '').trim();
    if (!comment && rating <= 2) {
      return { success: false, error: 'Please provide explanatory feedback comments for ratings of 2 stars or below.' };
    }

    try {
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketSnap = await _sdsGetDoc(ticketRef);
      if (!ticketSnap.exists()) {
        return { success: false, error: 'Service ticket not found.' };
      }
      const ticket = ticketSnap.data() as ServiceTicketRecord;

      if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
        return { success: false, error: 'Feedback can only be submitted for resolved or closed tickets.' };
      }

      const now = new Date().toISOString();
      const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Determine sentiment & negative feedback threshold
      const isNegative = rating <= 2 || (payload.feedbackTags && payload.feedbackTags.some((t: any) => /dissatisfied|unresolved|poor|delay|rude/i.test(t)));
      const sentiment: FeedbackSentiment = rating >= 4 ? 'POSITIVE' : rating === 3 ? 'NEUTRAL' : 'NEGATIVE';

      const feedbackRecord: TicketFeedbackRecord = {
        id: feedbackId,
        ticketId,
        ticketNumber: ticket.ticketNumber,
        companyId,
        clientId: ticket.clientId,
        clientName: ticket.clientName,
        siteId: ticket.siteId,
        siteName: ticket.siteName,
        contractId: ticket.contractId,
        contactId: ticket.contactId || session.userId,
        contactName: payload.contactName || session.fullName || session.email || 'Client User',
        contactEmail: payload.contactEmail || session.email,
        contactPhone: payload.contactPhone || ticket.reportedByPhone,
        rating,
        ratingBreakdown: payload.ratingBreakdown || { overallRating: rating },
        comment,
        feedbackTags: payload.feedbackTags || [],
        sentiment,
        isNegativeFeedback: Boolean(isNegative),
        followUpRequested: Boolean(payload.followUpRequested),
        followUpNotes: payload.followUpNotes,
        followUpContactPreferred: payload.followUpContactPreferred,
        status: 'SUBMITTED',
        resolutionId: ticket.activeResolutionId,
        slaCycleNumber: (ticket.reopenCount || 0) + 1,
        submittedByUserId: session.userId,
        submittedByName: session.fullName || session.email || 'Client',
        submittedByRole: session.role,
        submittedByEmail: session.email,
        submittedAt: now,
        isEscalated: isNegative,
        ...(isNegative ? {
          escalatedAt: now,
          escalationStatus: 'OPEN',
          escalationNotes: `Negative feedback (${rating}★) received from ${payload.contactName || session.fullName || 'Client'}. Follow-up required.`
        } : {}),
        auditReference: `AUD-FB-${Date.now().toString(36).toUpperCase()}`,
        createdAt: now,
        updatedAt: now
      };

      // Atomic batch to write subcollection record, company-wide feedback doc, and update ticket
      const batch = _sdsWriteBatch(db);

      // 1. Ticket subcollection
      const fbSubRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'feedback', feedbackId);
      batch.set(fbSubRef, feedbackRecord);

      // 2. Company top-level CSAT collection for analytics
      const fbTopRef = doc(db, 'companies', companyId, 'ticketFeedback', feedbackId);
      batch.set(fbTopRef, feedbackRecord);

      // 3. Update ServiceTicketRecord with CSAT fields
      const ticketUpdates: Partial<ServiceTicketRecord> = {
        clientRating: rating,
        clientFeedbackNotes: comment,
        feedbackStatus: 'SUBMITTED',
        hasNegativeFeedback: isNegative,
        activeFeedbackId: feedbackId,
        feedbackSubmittedAt: now,
        feedbackEscalationStatus: isNegative ? 'ESCALATED' : 'NONE',
        updatedAt: now
      };
      batch.set(ticketRef, ticketUpdates, { merge: true });

      await batch.commit();

      // Audit Log
      await SecurityAuditService.logEvent(
        companyId,
        session.userId,
        session.role,
        session.employeeId,
        isNegative ? 'CLIENT_FEEDBACK_NEGATIVE_ESCALATION' : 'SUBMIT_CLIENT_FEEDBACK',
        'serviceTickets',
        ticketId,
        true,
        isNegative ? 'HIGH' : 'LOW',
        `Client Feedback submitted for Ticket ${ticket.ticketNumber} (${rating}★ - ${sentiment}). ${isNegative ? '[AUTOMATIC ESCALATION TRIGGERED]' : ''} Submitter: ${session.fullName || session.email}. Comment: ${comment}`
      );

      // Notifications
      if (isNegative) {
        await this.notifyForTicket(
          companyId,
          { ...ticket, ...ticketUpdates } as ServiceTicketRecord,
          `⚠️ CSAT Alert: Ticket ${ticket.ticketNumber} received ${rating}★ negative feedback from client. Immediate review required.`
        );
      } else {
        await this.notifyForTicket(
          companyId,
          { ...ticket, ...ticketUpdates } as ServiceTicketRecord,
          `Client feedback received for Ticket ${ticket.ticketNumber}: ${rating}★ rating.`
        );
      }

      return { success: true, feedback: feedbackRecord };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error submitting client feedback:', e);
      return { success: false, error: e.message || 'Failed to submit client feedback.' };
    }
  }

  /**
   * Initiates a feedback request to the client.
   */
  public static async requestClientFeedback(
    session: UserSession,
    companyId: string,
    ticketId: string,
    payload?: RequestClientFeedbackPayload
  ): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    try {
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketSnap = await _sdsGetDoc(ticketRef);
      if (!ticketSnap.exists()) {
        return { success: false, error: 'Service ticket not found.' };
      }
      const ticket = ticketSnap.data() as ServiceTicketRecord;

      if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
        return { success: false, error: 'Feedback can only be requested for resolved or closed tickets.' };
      }

      const now = new Date().toISOString();
      const updates: Partial<ServiceTicketRecord> = {
        feedbackStatus: 'REQUESTED',
        feedbackRequestedAt: now,
        updatedAt: now
      };

      await _sdsSetDoc(ticketRef, updates, { merge: true });

      // Audit Log
      await SecurityAuditService.logEvent(
        companyId,
        session.userId,
        session.role,
        session.employeeId,
        'REQUEST_CLIENT_FEEDBACK',
        'serviceTickets',
        ticketId,
        true,
        'LOW',
        `Client feedback survey requested for Ticket ${ticket.ticketNumber} by ${session.fullName || session.email}.`
      );

      // Notification to client
      await this.notifyForTicket(
        companyId,
        { ...ticket, ...updates } as ServiceTicketRecord,
        `Service Desk: Please share your feedback on resolved ticket ${ticket.ticketNumber}.`
      );

      return { success: true };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error requesting client feedback:', e);
      return { success: false, error: e.message || 'Failed to request feedback.' };
    }
  }

  /**
   * Reviews client feedback and resolves negative escalation if applicable.
   */
  public static async reviewClientFeedback(
    session: UserSession,
    companyId: string,
    ticketId: string,
    feedbackId: string,
    payload: ReviewClientFeedbackPayload
  ): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    if (!payload.reviewNotes || payload.reviewNotes.trim().length === 0) {
      return { success: false, error: 'Review notes are required.' };
    }

    try {
      const fbRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'feedback', feedbackId);
      const fbSnap = await _sdsGetDoc(fbRef);
      if (!fbSnap.exists()) {
        return { success: false, error: 'Feedback record not found.' };
      }
      const feedback = fbSnap.data() as TicketFeedbackRecord;

      const now = new Date().toISOString();
      const newStatus = payload.newStatus || (payload.closeEscalation ? 'CLOSED' : 'REVIEWED');

      const fbUpdates: Partial<TicketFeedbackRecord> = {
        reviewedByUserId: session.userId,
        reviewedByName: session.fullName || session.email || 'Service Manager',
        reviewedAt: now,
        reviewNotes: payload.reviewNotes.trim(),
        actionTaken: payload.actionTaken?.trim(),
        status: newStatus,
        ...(payload.closeEscalation ? {
          escalationStatus: 'RESOLVED',
          isEscalated: false
        } : {}),
        updatedAt: now
      };

      const batch = _sdsWriteBatch(db);
      batch.set(fbRef, fbUpdates, { merge: true });

      // Top level doc sync
      const fbTopRef = doc(db, 'companies', companyId, 'ticketFeedback', feedbackId);
      batch.set(fbTopRef, fbUpdates, { merge: true });

      // Update ticket record
      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId);
      const ticketUpdates: Partial<ServiceTicketRecord> = {
        feedbackStatus: newStatus,
        feedbackReviewNotes: payload.reviewNotes.trim(),
        feedbackEscalationStatus: payload.closeEscalation ? 'CLOSED' : 'REVIEWED',
        updatedAt: now
      };
      batch.set(ticketRef, ticketUpdates, { merge: true });

      await batch.commit();

      // Audit Log
      await SecurityAuditService.logEvent(
        companyId,
        session.userId,
        session.role,
        session.employeeId,
        'REVIEW_CLIENT_FEEDBACK',
        'serviceTickets',
        ticketId,
        true,
        'MEDIUM',
        `Client feedback #${feedbackId} reviewed by ${session.fullName || session.email}. Action: ${payload.actionTaken || 'Reviewed'}. Escalation closed: ${Boolean(payload.closeEscalation)}.`
      );

      return { success: true };
    } catch (e: any) {
      console.error('[ServiceDeskService] Error reviewing client feedback:', e);
      return { success: false, error: e.message || 'Failed to review client feedback.' };
    }
  }

  /**
   * Fetches all feedback records for a ticket.
   */
  public static async getTicketFeedback(companyId: string, ticketId: string): Promise<TicketFeedbackRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'feedback');
      const q = query(colRef, orderBy('submittedAt', 'desc'));
      const snap = await _sdsGetDocs(q);
      return snap.docs.map((d: any) => d.data() as TicketFeedbackRecord);
    } catch (e) {
      console.error('[ServiceDeskService] Error getting ticket feedback:', e);
      return [];
    }
  }

  /**
   * Subscribes to real-time feedback updates for a ticket.
   */
  public static subscribeToTicketFeedback(
    companyId: string,
    ticketId: string,
    callback: (feedback: TicketFeedbackRecord[]) => void
  ): () => void {
    const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'feedback');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as TicketFeedbackRecord);
      list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      callback(list);
    }, (err) => {
      console.error('[ServiceDeskService] Error subscribing to feedback:', err);
      callback([]);
    });
  }

  /**
   * Queries company-wide feedback / CSAT records with optional filtering.
   */
  public static async getCompanyFeedbackList(
    companyId: string,
    filters?: { minRating?: number; maxRating?: number; isNegativeOnly?: boolean }
  ): Promise<TicketFeedbackRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'ticketFeedback');
      let q = query(colRef, orderBy('submittedAt', 'desc'));
      if (filters?.isNegativeOnly) {
        q = query(colRef, where('isNegativeFeedback', '==', true), orderBy('submittedAt', 'desc'));
      }
      const snap = await _sdsGetDocs(q);
      let list = snap.docs.map((d: any) => d.data() as TicketFeedbackRecord);
      if (filters?.minRating != null) {
        list = list.filter((f: TicketFeedbackRecord) => f.rating >= filters.minRating!);
      }
      if (filters?.maxRating != null) {
        list = list.filter((f: TicketFeedbackRecord) => f.rating <= filters.maxRating!);
      }
      return list;
    } catch (e) {
      console.error('[ServiceDeskService] Error getting company feedback list:', e);
      return [];
    }
  }

}


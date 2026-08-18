import { 
  updateDoc,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  runTransaction 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { QueryScopeEngine } from './queryScopeEngine';
import { 
  TaskRecord,
  WorkOrderRecord,
  AnnouncementRecord,
  DocumentRecord,
  AppNotification, 
  UserProfileData, 
  AppSettings, 
  UserSession, 
  EmployeeRecord,
  ClientRecord,
  DeploymentRecord,
  RosterRecord,
  DeploymentHistoryRecord, 
  CompanyTenant, 
  BranchRecord, 
  SiteRecord, 
  DepartmentRecord, 
  DesignationRecord, 
  UserMembershipRecord, 
  UserRole,
  ShiftRecord,
  AttendanceRecord,
  PatrolCheckpointRecord,
  PatrolPlanRecord,
  PatrolTourRecord,
  PatrolTourCheckpointScan,
  PatrolTourStatus,
  PatrolLogRecord,
  IncidentReportRecord,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  VisitorLogRecord,
  MaterialMovementRecord,
  DailySiteLogRecord,
  ApprovalRequestRecord,
  AuditLogRecord,
  SystemConfigRecord,
  AccountStatus,
  ApprovalStatus,
  MASTER_APP_MODULES,
  VendorRecord,
  LeaveRequestRecord,
  LeaveBalanceRecord,
  OvertimePolicyRecord,
  OvertimeRequestRecord,
  OvertimeAdjustmentRecord,
  AttendanceCalculationResult,
  AttendanceExceptionType,
  SalaryStructureRecord,
  EmployeeSalaryProfileRecord,
  SalaryAdvanceRecord,
  PayrollCycleRecord,
  SalarySlipRecord,
  PaymentBatchRecord,
  PaymentBatchStatus,
  CompanyBankAccountRecord,
  BankExportFormat,
  InventoryItemRecord,
  StockTransactionRecord,
  InventoryVendorRecord,
  AssetRecord,
  AssetMovementHistoryRecord,
  AssetMaintenanceRecord,
  AssetCondition,
  AssetMovementAction,
  ServiceTicketRecord,
  TicketCommentRecord,
  JobRequisitionRecord,
  CandidateRecord,
  TrainingProgramRecord,
  TrainingEnrollmentRecord,
  ProcurementRequisitionRecord,
  PurchaseOrderRecord,
  GoodsReceiptNoteRecord,
  ThreeWayMatchRecord,
  OnboardingTask,
  LifecycleHistoryRecord,
  PromotionRequest,
  TransferRequest,
  ExitRequest,
  IdentityBadgeRecord,
  BadgeStatus,
  BadgeType,
  BadgeLifecycleEvent,
  DocumentTypeConfig,
  EmployeeDocumentRecord,
  DocumentStatus,
} from '../types';
import { WorkflowEngine } from './workflowEngine';
import { WfmService } from './wfmService';
import { AttendanceCalculationEngine } from './calculationEngine';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Handles Firestore permissions and data exceptions according to Enterprise standard.
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isOfflineError = errorMessage.toLowerCase().includes('offline') || 
                         errorMessage.toLowerCase().includes('unavailable') ||
                         (error as any)?.code === 'unavailable';

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isOfflineError) {
    console.warn('[Firestore Offline Warning]: Operation queued or skipped offline:', JSON.stringify(errInfo));
    return;
  }

  console.error('[Firestore Service Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export class FirestoreService {
  /**
   * ============================================================
   * VENDOR MANAGEMENT
   * ============================================================
   */

  static async getVendors(companyId: string): Promise<VendorRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'vendors');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as VendorRecord);
    } catch (err) {
      console.warn('[FirestoreService] getVendors error:', err);
      return [];
    }
  }

  static async saveVendor(companyId: string, vendor: VendorRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'vendors', vendor.id);
      await setDoc(docRef, vendor, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] saveVendor error:', err);
      return false;
    }
  }

  static async deleteVendor(companyId: string, vendorId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'vendors', vendorId);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error('[FirestoreService] deleteVendor error:', err);
      return false;
    }
  }

  /**
   * Listen to real-time Employees list for a company
   */
  
  static subscribeToEmployees(session: UserSession, companyId: string, onData: (employees: EmployeeRecord[]) => void
  ): () => void {
    const path = `companies/${companyId}/employees`;
    try {
      const colRef = collection(db, 'companies', companyId, 'employees');
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        if (!snapshot.empty) {
          const list: EmployeeRecord[] = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              documents: [],
              ...data
            } as unknown as EmployeeRecord;
          });
          onData(list);
        } else {
          // If subcollection is empty, check global users collection for this company
          const legacyRef = collection(db, 'users');
          const legacyQuery = query(legacyRef, where('companyId', '==', companyId));
          getDocs(legacyQuery).then((legacySnap) => {
            if (!legacySnap.empty) {
              const legacyList = legacySnap.docs.map(snap => ({
                id: snap.id,
                documents: [],
                ...snap.data()
              } as unknown as EmployeeRecord));
              onData(legacyList);
            } else {
              onData([]);
            }
          }).catch(() => {
            onData([]);
          });
        }
      }, (err) => {
        console.warn('[Firestore] Employee subscription error:', err);
        // Fallback check to users query
        const legacyRef = collection(db, 'users');
        const legacyQuery = query(legacyRef, where('companyId', '==', companyId));
        getDocs(legacyQuery).then((legacySnap) => {
          if (!legacySnap.empty) {
            const legacyList = legacySnap.docs.map(snap => ({
              id: snap.id,
              documents: [],
              ...snap.data()
            } as unknown as EmployeeRecord));
            onData(legacyList);
          } else {
            onData([]);
          }
        }).catch(() => {
          onData([]);
        });
      });
      return unsubscribe;
    } catch (e) {
      console.warn('[Firestore] Employee subscription exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async getEmployees(companyId: string): Promise<EmployeeRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'employees');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        return snap.docs.map(docSnap => ({
          id: docSnap.id,
          documents: [],
          ...docSnap.data()
        } as unknown as EmployeeRecord));
      }
      const legacyRef = collection(db, 'users');
      const legacyQuery = query(legacyRef, where('companyId', '==', companyId));
      const legacySnap = await getDocs(legacyQuery);
      return legacySnap.docs.map(snap => ({
        id: snap.id,
        documents: [],
        ...snap.data()
      } as unknown as EmployeeRecord));
    } catch (err) {
      console.warn('[FirestoreService] getEmployees error:', err);
      return [];
    }
  }

  static async createApprovalRequest(companyId: string, request: {
    type: string;
    requestedByUid: string;
    targetEntity: string;
    details: string;
  }): Promise<boolean> {
    try {
      const id = `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const docRef = doc(db, 'companies', companyId, 'approval_requests', id);
      await setDoc(docRef, {
        id,
        companyId,
        ...request,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] createApprovalRequest error:', err);
      return false;
    }
  }

  /**
   * Check if an Employee ID is unique within the company
   */
  static async isEmployeeIdUnique(companyId: string, employeeId: string, excludeInternalId?: string): Promise<boolean> {
    try {
      const colRef = collection(db, 'companies', companyId, 'employees');
      const q = query(colRef, where('employeeId', '==', employeeId));
      const snap = await getDocs(q);
      
      if (snap.empty) return true;
      if (excludeInternalId && snap.docs.length === 1 && snap.docs[0].id === excludeInternalId) return true;
      
      return false;
    } catch (err) {
      console.error('[FirestoreService] isEmployeeIdUnique error:', err);
      return false;
    }
  }

  /**
   * Check if an Employee Code is unique within the company
   */
  static async isEmployeeCodeUnique(companyId: string, employeeCode: string, excludeInternalId?: string): Promise<boolean> {
    try {
      const colRef = collection(db, 'companies', companyId, 'employees');
      const q = query(colRef, where('employeeCode', '==', employeeCode));
      const snap = await getDocs(q);
      
      if (snap.empty) return true;
      if (excludeInternalId && snap.docs.length === 1 && snap.docs[0].id === excludeInternalId) return true;
      
      return false;
    } catch (err) {
      console.error('[FirestoreService] isEmployeeCodeUnique error:', err);
      return false;
    }
  }

  /**
   * Create or update Employee document in Firestore (Dual-writing for 100% sync)
   */
  static async saveEmployee(companyId: string, employee: EmployeeRecord, actor: { id: string, name: string }): Promise<boolean> {
    const legacyPath = `users/${employee.id}`;
    const newPath = `companies/${companyId}/employees/${employee.id}`;
    try {
      const isUpdate = !!employee.updatedAt && employee.createdAt !== employee.updatedAt;
      
      const payload = {
        ...employee,
        companyId, // ensure companyId matches
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      };

      // 1. Write to modern subcollection (Android & Web app alignment)
      const refNew = doc(db, 'companies', companyId, 'employees', employee.id);
      await setDoc(refNew, payload, { merge: true });

      // 2. Write to legacy root 'users' collection (Web login support)
      // Only write to 'users' if the employee has app access (authUid exists)
      if (employee.authUid) {
        const refLegacy = doc(db, 'users', employee.id);
        await setDoc(refLegacy, payload, { merge: true });
      }

      // 3. Audit Log
      await this.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        isUpdate ? 'EMPLOYEE_UPDATED' : 'EMPLOYEE_CREATED',
        `${isUpdate ? 'Updated' : 'Created'} employee record for ${employee.firstName} ${employee.lastName} (${employee.employeeId})`,
        employee.id
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${newPath} & ${legacyPath}`);
      return false;
    }
  }

  /**
   * Convert a recruitment candidate to an active employee
   */
  static async convertCandidateToEmployee(
    companyId: string,
    candidate: CandidateRecord,
    employeeData: Partial<EmployeeRecord>,
    actor: { id: string, name: string }
  ): Promise<string | null> {
    try {
      const employeeId = employeeData.id || `EMP-${Date.now()}`;
      
      const newEmployee: EmployeeRecord = {
        ...employeeData,
        id: employeeId,
        companyId,
        firstName: candidate.fullName.split(' ')[0],
        lastName: candidate.fullName.split(' ').slice(1).join(' ') || ' ',
        email: candidate.email || '',
        contactNumber: candidate.phoneNumber,
        dateOfBirth: candidate.dateOfBirth,
        gender: candidate.gender,
        maskedAadhaar: candidate.aadhaarNumber ? `XXXX-XXXX-${candidate.aadhaarNumber.slice(-4)}` : '',
        panNumber: candidate.panNumber || '',
        lifecycleStatus: 'ONBOARDING',
        status: 'PENDING_VERIFICATION',
        onboardingTasks: this.getDefaultOnboardingTasks(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: actor.id,
        updatedBy: actor.id,
      } as EmployeeRecord;

      const ok = await this.saveEmployee(companyId, newEmployee, actor);
      
      if (ok) {
        // Update candidate stage
        await setDoc(doc(db, 'companies', companyId, 'candidates', candidate.id), {
          stage: 'CONVERTED',
          convertedToEmployeeId: employeeId,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Add Lifecycle Event
        await this.addLifecycleEvent(companyId, employeeId, {
          type: 'STATUS_CHANGE',
          toStatus: 'ONBOARDING',
          effectiveDate: new Date().toISOString(),
          reason: 'Converted from candidate',
          initiatedBy: actor.id,
          timestamp: new Date().toISOString(),
          details: { candidateId: candidate.id }
        }, actor);

        return employeeId;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `candidate conversion ${candidate.id}`);
      return null;
    }
  }

  private static getDefaultOnboardingTasks(): OnboardingTask[] {
    return [
      { id: 'OT-01', title: 'Identity Verification', status: 'PENDING', isMandatory: true },
      { id: 'OT-02', title: 'Address Verification', status: 'PENDING', isMandatory: true },
      { id: 'OT-03', title: 'Bank Details Collection', status: 'PENDING', isMandatory: true },
      { id: 'OT-04', title: 'Policy Acknowledgement', status: 'PENDING', isMandatory: true },
      { id: 'OT-05', title: 'Profile Photo Upload', status: 'PENDING', isMandatory: false },
      { id: 'OT-06', title: 'Emergency Contact Setup', status: 'PENDING', isMandatory: true },
      { id: 'OT-07', title: 'Site Induction Training', status: 'PENDING', isMandatory: true },
    ];
  }

  /**
   * Add a lifecycle history event for an employee
   */
  static async addLifecycleEvent(
    companyId: string,
    employeeId: string,
    event: Omit<LifecycleHistoryRecord, 'id'>,
    actor: { id: string, name: string }
  ): Promise<boolean> {
    try {
      const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const ref = doc(db, 'companies', companyId, 'employees', employeeId, 'lifecycleEvents', eventId);
      
      await setDoc(ref, {
        ...event,
        id: eventId,
        timestamp: new Date().toISOString()
      });

      // Audit Log
      await this.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        'EMPLOYEE_LIFECYCLE_EVENT',
        `Recorded ${event.type} event for employee ${employeeId}: ${event.reason || 'No reason provided'}`,
        employeeId
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lifecycle event ${employeeId}`);
      return false;
    }
  }

  /**
   * Update an onboarding task status
   */
  static async updateOnboardingTask(
    companyId: string,
    employeeId: string,
    taskId: string,
    updates: Partial<OnboardingTask>,
    actor: { id: string, name: string }
  ): Promise<boolean> {
    try {
      const empRef = doc(db, 'companies', companyId, 'employees', employeeId);
      const snap = await getDoc(empRef);
      if (!snap.exists()) return false;

      const employee = snap.data() as EmployeeRecord;
      const tasks = employee.onboardingTasks || [];
      const updatedTasks = tasks.map(t => t.id === taskId ? { 
        ...t, 
        ...updates, 
        completedAt: updates.status === 'COMPLETED' ? new Date().toISOString() : t.completedAt,
        completedBy: updates.status === 'COMPLETED' ? actor.id : t.completedBy,
        waivedBy: updates.status === 'WAIVED' ? actor.id : t.waivedBy
      } : t);

      await setDoc(empRef, { 
        onboardingTasks: updatedTasks,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      }, { merge: true });

      // If all mandatory tasks are completed, move to ACTIVE if current status is ONBOARDING
      const mandatoryTasks = updatedTasks.filter(t => t.isMandatory);
      const allMandatoryDone = mandatoryTasks.every(t => t.status === 'COMPLETED' || t.status === 'WAIVED');

      if (allMandatoryDone && employee.lifecycleStatus === 'ONBOARDING') {
        await setDoc(empRef, { 
          lifecycleStatus: 'ACTIVE',
          status: 'ACTIVE'
        }, { merge: true });
        
        await this.addLifecycleEvent(companyId, employeeId, {
          type: 'STATUS_CHANGE',
          fromStatus: 'ONBOARDING',
          toStatus: 'ACTIVE',
          effectiveDate: new Date().toISOString(),
          reason: 'Mandatory onboarding completed',
          initiatedBy: 'SYSTEM',
          timestamp: new Date().toISOString()
        }, actor);
      }

      // Record lifecycle history for task completion
      await this.addLifecycleEvent(companyId, employeeId, {
        type: 'ONBOARDING_TASK',
        toStatus: updates.status || 'UPDATED',
        effectiveDate: new Date().toISOString(),
        reason: `Onboarding task ${taskId} marked as ${updates.status}`,
        initiatedBy: actor.id,
        timestamp: new Date().toISOString(),
        details: { taskId, updates }
      }, actor);

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `onboarding task ${employeeId}`);
      return false;
    }
  }

  /**
   * Initiate a promotion request
   */
  static async initiatePromotion(
    companyId: string,
    request: Omit<PromotionRequest, 'id' | 'status' | 'createdAt'>,
    actor: { id: string, name: string }
  ): Promise<string | null> {
    try {
      const requestId = `PROM-${Date.now()}`;
      const ref = doc(db, 'companies', companyId, 'promotions', requestId);
      
      await setDoc(ref, {
        ...request,
        id: requestId,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });

      // Update employee lifecycle status
      await setDoc(doc(db, 'companies', companyId, 'employees', request.employeeId), {
        lifecycleStatus: 'PROMOTION_PENDING'
      }, { merge: true });

      await this.addLifecycleEvent(companyId, request.employeeId, {
        type: 'PROMOTION',
        toStatus: 'PROMOTION_PENDING',
        effectiveDate: request.effectiveDate,
        reason: request.reason,
        initiatedBy: actor.id,
        timestamp: new Date().toISOString(),
        details: { requestId }
      }, actor);

      return requestId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `promotion request ${request.employeeId}`);
      return null;
    }
  }

  /**
   * Approve promotion request and apply changes
   */
  static async approvePromotion(
    companyId: string,
    requestId: string,
    actor: { id: string, name: string }
  ): Promise<boolean> {
    try {
      const promoRef = doc(db, 'companies', companyId, 'promotions', requestId);
      const promoSnap = await getDoc(promoRef);
      if (!promoSnap.exists()) return false;

      const promo = promoSnap.data() as PromotionRequest;
      
      // Update Employee Record
      const empRef = doc(db, 'companies', companyId, 'employees', promo.employeeId);
      await setDoc(empRef, {
        designation: promo.newDesignation,
        departmentId: promo.newDepartmentId,
        reportingManagerId: promo.newManagerId || promo.previousManagerId,
        lifecycleStatus: 'ACTIVE',
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      }, { merge: true });

      // Update Promotion Status
      await setDoc(promoRef, {
        status: 'APPROVED',
        approvedBy: actor.id,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await this.addLifecycleEvent(companyId, promo.employeeId, {
        type: 'PROMOTION',
        fromStatus: 'PROMOTION_PENDING',
        toStatus: 'ACTIVE',
        effectiveDate: promo.effectiveDate,
        reason: 'Promotion Approved',
        initiatedBy: promo.initiatedBy,
        approvedBy: actor.id,
        timestamp: new Date().toISOString(),
        details: { requestId, promoData: promo }
      }, actor);

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `approve promotion ${requestId}`);
      return false;
    }
  }

  /**
   * Initiate a transfer request
   */
  static async initiateTransfer(
    companyId: string,
    request: Omit<TransferRequest, 'id' | 'status' | 'createdAt'>,
    actor: { id: string, name: string }
  ): Promise<string | null> {
    try {
      const requestId = `XFER-${Date.now()}`;
      const ref = doc(db, 'companies', companyId, 'transfers', requestId);
      
      await setDoc(ref, {
        ...request,
        id: requestId,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });

      // Update employee lifecycle status
      await setDoc(doc(db, 'companies', companyId, 'employees', request.employeeId), {
        lifecycleStatus: 'TRANSFER_PENDING'
      }, { merge: true });

      await this.addLifecycleEvent(companyId, request.employeeId, {
        type: 'TRANSFER',
        toStatus: 'TRANSFER_PENDING',
        effectiveDate: request.effectiveDate,
        reason: request.reason,
        initiatedBy: actor.id,
        timestamp: new Date().toISOString(),
        details: { requestId }
      }, actor);

      return requestId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `transfer request ${request.employeeId}`);
      return null;
    }
  }

  /**
   * Approve transfer request and apply changes
   */
  static async approveTransfer(
    companyId: string,
    requestId: string,
    actor: { id: string, name: string }
  ): Promise<boolean> {
    try {
      const xferRef = doc(db, 'companies', companyId, 'transfers', requestId);
      const xferSnap = await getDoc(xferRef);
      if (!xferSnap.exists()) return false;

      const xfer = xferSnap.data() as TransferRequest;
      
      // Update Employee Record
      const empRef = doc(db, 'companies', companyId, 'employees', xfer.employeeId);
      await setDoc(empRef, {
        assignedSiteId: xfer.newSiteId,
        assignedBranchId: xfer.newBranchId,
        assignedRegionId: xfer.newRegionId,
        lifecycleStatus: 'ACTIVE',
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      }, { merge: true });

      // Update Transfer Status
      await setDoc(xferRef, {
        status: 'APPROVED',
        approvedBy: actor.id,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await this.addLifecycleEvent(companyId, xfer.employeeId, {
        type: 'TRANSFER',
        fromStatus: 'TRANSFER_PENDING',
        toStatus: 'ACTIVE',
        effectiveDate: xfer.effectiveDate,
        reason: 'Transfer Approved',
        initiatedBy: xfer.initiatedBy,
        approvedBy: actor.id,
        timestamp: new Date().toISOString(),
        details: { requestId, transferData: xfer }
      }, actor);

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `approve transfer ${requestId}`);
      return false;
    }
  }

  /**
   * Initiate an exit process
   */
  static async initiateExit(
    companyId: string,
    request: Omit<ExitRequest, 'id' | 'status' | 'createdAt' | 'exitChecklist'>,
    actor: { id: string, name: string }
  ): Promise<string | null> {
    try {
      const requestId = `EXIT-${Date.now()}`;
      const ref = doc(db, 'companies', companyId, 'exits', requestId);
      
      const exitChecklist: OnboardingTask[] = [
        { id: 'EXT-01', title: 'ID Badge Return', status: 'PENDING', isMandatory: true },
        { id: 'EXT-02', title: 'Uniform/Company Property Return', status: 'PENDING', isMandatory: true },
        { id: 'EXT-03', title: 'Asset Clearance', status: 'PENDING', isMandatory: true },
        { id: 'EXT-04', title: 'Supervisor Clearance', status: 'PENDING', isMandatory: true },
        { id: 'EXT-05', title: 'Final HR Clearance', status: 'PENDING', isMandatory: true },
      ];

      await setDoc(ref, {
        ...request,
        id: requestId,
        status: 'PENDING',
        exitChecklist,
        createdAt: new Date().toISOString()
      });

      // Update employee lifecycle status
      await setDoc(doc(db, 'companies', companyId, 'employees', request.employeeId), {
        lifecycleStatus: 'EXIT_INITIATED'
      }, { merge: true });

      await this.addLifecycleEvent(companyId, request.employeeId, {
        type: 'EXIT',
        toStatus: 'EXIT_INITIATED',
        effectiveDate: request.lastWorkingDay,
        reason: request.reason,
        initiatedBy: actor.id,
        timestamp: new Date().toISOString(),
        details: { requestId, exitType: request.exitType }
      }, actor);

      return requestId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `exit request ${request.employeeId}`);
      return null;
    }
  }

  /**
   * Approve exit and deactivate access
   */
  static async approveExit(
    companyId: string,
    requestId: string,
    actor: { id: string, name: string }
  ): Promise<boolean> {
    try {
      const exitRef = doc(db, 'companies', companyId, 'exits', requestId);
      const exitSnap = await getDoc(exitRef);
      if (!exitSnap.exists()) return false;

      const exit = exitSnap.data() as ExitRequest;
      
      // Update Employee Record
      const empRef = doc(db, 'companies', companyId, 'employees', exit.employeeId);
      await setDoc(empRef, {
        lifecycleStatus: 'EXITED',
        status: 'DEACTIVATED',
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      }, { merge: true });

      // Update Exit Status
      await setDoc(exitRef, {
        status: 'APPROVED',
        approvedBy: actor.id,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Deactivate Auth if exists
      const empSnap = await getDoc(empRef);
      const empData = empSnap.data() as EmployeeRecord;
      if (empData.authUid) {
        // Log access deactivation
        await this.logAuditEvent(
          companyId,
          actor.id,
          actor.name,
          'ACCESS_DEACTIVATED',
          `Deactivated application access for exited employee ${exit.employeeId}`,
          exit.employeeId
        );
      }

      await this.addLifecycleEvent(companyId, exit.employeeId, {
        type: 'EXIT',
        fromStatus: 'EXIT_PENDING',
        toStatus: 'EXITED',
        effectiveDate: exit.lastWorkingDay,
        reason: 'Exit Process Approved & Finalized',
        initiatedBy: exit.initiatedBy,
        approvedBy: actor.id,
        timestamp: new Date().toISOString(),
        details: { requestId, exitData: exit }
      }, actor);

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `approve exit ${requestId}`);
      return false;
    }
  }

  /**
   * Approve or update Employee status (Active / Suspended / Terminated)
   */
  static async updateEmployeeStatus(
    companyId: string,
    employeeId: string,
    status: EmployeeRecord['status'],
    actor: { id: string, name: string }
  ): Promise<boolean> {
    const legacyPath = `users/${employeeId}`;
    const newPath = `companies/${companyId}/employees/${employeeId}`;
    try {
      const payload = {
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      };

      const refNew = doc(db, 'companies', companyId, 'employees', employeeId);
      await setDoc(refNew, payload, { merge: true });

      const refLegacy = doc(db, 'users', employeeId);
      await setDoc(refLegacy, payload, { merge: true });

      // Audit Log
      await this.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        'EMPLOYEE_STATUS_CHANGED',
        `Changed employee ${employeeId} status to ${status}`,
        employeeId
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${newPath} & ${legacyPath}`);
      return false;
    }
  }

  /**
   * Subscribe to employee lifecycle history
   */
  static subscribeToLifecycleHistory(
    companyId: string,
    employeeId: string,
    onUpdate: (data: LifecycleHistoryRecord[]) => void
  ) {
    const q = query(
      collection(db, 'companies', companyId, 'employees', employeeId, 'lifecycleEvents'),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as LifecycleHistoryRecord));
    });
  }

  /**
   * Verify an employee KYC document
   */
  static async verifyEmployeeDocument(
    companyId: string,
    employeeId: string,
    documents: EmployeeRecord['documents'],
    approverId: string
  ): Promise<boolean> {
    const legacyPath = `users/${employeeId}`;
    const newPath = `companies/${companyId}/employees/${employeeId}`;
    try {
      const payload = {
        documents,
        updatedAt: new Date().toISOString()
      };

      const refNew = doc(db, 'companies', companyId, 'employees', employeeId);
      await setDoc(refNew, payload, { merge: true });

      const refLegacy = doc(db, 'users', employeeId);
      await setDoc(refLegacy, payload, { merge: true });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${newPath} & ${legacyPath}`);
      return false;
    }
  }

  /**
   * Delete an employee record from Firestore
   */
  static async deleteEmployee(companyId: string, employeeId: string, actor: { id: string, name: string }): Promise<boolean> {
    const legacyPath = `users/${employeeId}`;
    const newPath = `companies/${companyId}/employees/${employeeId}`;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const refNew = doc(db, 'companies', companyId, 'employees', employeeId);
      await deleteDoc(refNew);

      const refLegacy = doc(db, 'users', employeeId);
      await deleteDoc(refLegacy);

      // Audit Log
      await this.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        'EMPLOYEE_DELETED',
        `Permanently deleted employee record ${employeeId}`,
        employeeId
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${newPath} & ${legacyPath}`);
      return false;
    }
  }

  /**
   * Check if an employee ID exists in the company
   */
  static async checkEmployeeExists(companyId: string, employeeId: string): Promise<boolean> {
    try {
      const refNew = doc(db, 'companies', companyId, 'employees', employeeId);
      const snap = await getDoc(refNew);
      if (snap.exists()) return true;

      const refLegacy = doc(db, 'users', employeeId);
      const snapLegacy = await getDoc(refLegacy);
      return snapLegacy.exists();
    } catch (err) {
      console.warn('[Firestore] checkEmployeeExists error:', err);
      return false;
    }
  }

  /**
   * Save or sync User Profile to Firestore
   */
  static async saveUserProfile(userId: string, profile: UserProfileData): Promise<boolean> {
    const path = `users/${userId}`;
    try {
      const ref = doc(db, 'users', userId);
      await setDoc(ref, { ...profile, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Fetch User Profile from Firestore
   */
  static async getUserProfile(userId: string): Promise<UserProfileData | null> {
    const path = `users/${userId}`;
    try {
      const ref = doc(db, 'users', userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as UserProfileData;
      }
    } catch (err) {
      console.warn('[Firestore] getUserProfile error:', err);
    }
    return null;
  }

  /**
   * Save or sync App Settings to Firestore
   */
  static async saveAppSettings(userId: string, settings: AppSettings): Promise<boolean> {
    const path = `users/${userId}`;
    try {
      const ref = doc(db, 'users', userId);
      await setDoc(ref, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Fetch App Settings from Firestore
   */
  static async getAppSettings(userId: string): Promise<AppSettings | null> {
    const path = `users/${userId}`;
    try {
      const ref = doc(db, 'users', userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as AppSettings;
      }
    } catch (err) {
      console.warn('[Firestore] getAppSettings error:', err);
    }
    return null;
  }

  /**
   * ============================================================
   * SHIFTS MANAGEMENT METHODS
   * ============================================================
   */
  static subscribeToShifts(session: UserSession, companyId: string, onData: (shifts: ShiftRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'shifts');
      return onSnapshot(colRef, (snap) => {
        const shifts = snap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftRecord));
        onData(shifts);
      }, (err) => {
        console.warn('[Firestore] subscribeToShifts error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToShifts exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async getShifts(companyId: string): Promise<ShiftRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'shifts');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftRecord));
    } catch (err) {
      console.warn('[Firestore] getShifts error:', err);
      return [];
    }
  }

  static async saveShift(companyId: string, shift: ShiftRecord): Promise<boolean> {
    const path = `companies/${companyId}/shifts/${shift.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'shifts', shift.id);
      await setDoc(ref, {
        ...shift,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async updateShiftStatus(companyId: string, shiftId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<boolean> {
    const path = `companies/${companyId}/shifts/${shiftId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'shifts', shiftId);
      await setDoc(ref, { status, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  static async deleteShift(companyId: string, shiftId: string): Promise<boolean> {
    const path = `companies/${companyId}/shifts/${shiftId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'shifts', shiftId);
      await deleteDoc(ref);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return false;
    }
  }

  static async checkDuplicateShiftCode(companyId: string, code: string, excludeId?: string): Promise<boolean> {
    try {
      const colRef = collection(db, 'companies', companyId, 'shifts');
      const q = query(colRef, where('shiftCode', '==', code.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) return false;
      return snap.docs.some(d => d.id !== excludeId);
    } catch (err) {
      console.warn('[Firestore] checkDuplicateShiftCode error:', err);
      return false;
    }
  }

  /**
   * ============================================================
   * ROSTER MANAGEMENT METHODS
   * ============================================================
   */
  static subscribeToRosters(session: UserSession, companyId: string, onData: (rosters: RosterRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'rosters');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'ATTENDANCE'));
      return onSnapshot(q, (snap) => {
        const rosters = snap.docs.map(d => ({ id: d.id, ...d.data() } as RosterRecord));
        onData(rosters);
      }, (err) => {
        console.warn('[Firestore] subscribeToRosters error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToRosters exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async saveRoster(companyId: string, roster: RosterRecord): Promise<boolean> {
    const path = `companies/${companyId}/rosters/${roster.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'rosters', roster.id);
      await setDoc(ref, {
        ...roster,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async bulkSaveRosters(companyId: string, rosters: RosterRecord[], actor: { id: string; name: string }): Promise<boolean> {
    try {
      await runTransaction(db, async (transaction) => {
        for (const roster of rosters) {
          const ref = doc(db, 'companies', companyId, 'rosters', roster.id);
          transaction.set(ref, {
            ...roster,
            companyId,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      });

      // Send Notifications to employees
      for (const roster of rosters) {
        const notifId = `NOTIF_ROSTER_${roster.id}`;
        const notifRef = doc(db, 'companies', companyId, 'notifications', notifId);
        await setDoc(notifRef, {
          id: notifId,
          title: 'Shift Assigned',
          message: `You have been assigned to ${roster.shiftName} at ${roster.siteName} for ${roster.date || roster.rosterDate}.`,
          type: 'INFO',
          timestamp: new Date().toISOString(),
          isRead: false,
          userId: roster.employeeId, // Target specific employee
          actionRoute: 'ATTENDANCE_SHIFTS'
        });
      }

      // Audit Log
      await this.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        'ROSTER_BULK_ASSIGN',
        `Assigned shifts to ${rosters.length} members for ${rosters[0]?.date || rosters[0]?.rosterDate}`
      );

      return true;
    } catch (err) {
      console.error('[Firestore] bulkSaveRosters error:', err);
      return false;
    }
  }

  static async deleteRoster(companyId: string, rosterId: string, actor: { id: string; name: string }): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'rosters', rosterId);
      const snap = await getDoc(ref);
      const rosterData = snap.data() as RosterRecord | undefined;
      
      await deleteDoc(ref);

      if (rosterData) {
        const notifId = `NOTIF_ROSTER_DEL_${rosterId}`;
        const notifRef = doc(db, 'companies', companyId, 'notifications', notifId);
        await setDoc(notifRef, {
          id: notifId,
          title: 'Shift Cancelled',
          message: `Your shift on ${rosterData.date || rosterData.rosterDate} has been cancelled.`,
          type: 'WARNING',
          timestamp: new Date().toISOString(),
          isRead: false,
          userId: rosterData.employeeId,
          actionRoute: 'ATTENDANCE_SHIFTS'
        });
      }

      await this.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        'ROSTER_DELETE',
        `Deleted roster assignment ${rosterId}`
      );

      return true;
    } catch (err) {
      console.error('[Firestore] deleteRoster error:', err);
      return false;
    }
  }

  /**
   * ============================================================
   * ATTENDANCE & PUNCH MANAGEMENT METHODS
   * ============================================================
   */
  static subscribeToAttendance(session: UserSession, companyId: string, onData: (logs: AttendanceRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'attendance');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'ATTENDANCE'));
      return onSnapshot(q, (snap) => {
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
        onData(logs);
      }, (err) => {
        console.warn('[Firestore] subscribeToAttendance error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToAttendance exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async saveAttendance(companyId: string, record: AttendanceRecord): Promise<boolean> {
    const path = `companies/${companyId}/attendance/${record.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'attendance', record.id);
      await setDoc(ref, {
        ...record,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async punchIn(
    companyId: string, 
    employeeId: string, 
    employeeName: string,
    rosterId: string,
    shift: ShiftRecord,
    siteId: string,
    siteName: string,
    gps?: { latitude: number, longitude: number, accuracy?: number },
    deviceInfo?: string,
    biometricResult?: import('../types').BiometricVerificationResult,
    geofenceOverrideRequested?: boolean,
    geofenceOverrideReason?: string
  ): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
    const date = new Date().toISOString().split('T')[0];
    const id = `ATT-${date}-${employeeId}`;
    try {
      const now = new Date().toISOString();
      const metrics = WfmService.calculateAttendanceMetrics(shift, date, now);
      
      // Geo-Fence & Biometric Validation
      const siteSnap = await getDoc(doc(db, 'companies', companyId, 'sites', siteId));
      let geoVerification: import('../types').GeoVerificationData | undefined = undefined;
      
      if (siteSnap.exists()) {
        const site = siteSnap.data() as SiteRecord;
        if (gps) {
          const { GeoUtils } = await import('../utils/geoUtils');
          const suspiciousFlag = GeoUtils.detectTampering(gps.latitude, gps.longitude, Date.now()) || undefined;
          
          if (site.geofenceEnabled && site.latitude && site.longitude) {
            const geoResult = GeoUtils.evaluateGeofence(
              gps.latitude, gps.longitude, gps.accuracy || 0,
              site.latitude, site.longitude, site.geofenceRadius || 100, site.accuracyThreshold || 50
            );
            
            geoVerification = {
              latitude: gps.latitude,
              longitude: gps.longitude,
              accuracy: gps.accuracy,
              distanceFromSite: geoResult.distance,
              verification: geoResult.result,
              timestamp: now,
              biometricVerification: biometricResult,
              suspiciousFlag,
              geofenceOverrideRequested,
              geofenceOverrideReason,
            };
          } else {
            geoVerification = {
              latitude: gps.latitude,
              longitude: gps.longitude,
              accuracy: gps.accuracy,
              verification: 'GEOFENCE_NOT_CONFIGURED',
              timestamp: now,
              biometricVerification: biometricResult,
              suspiciousFlag
            };
          }
        }
      }

      const record: AttendanceRecord = {
        id,
        companyId,
        employeeId,
        employeeName,
        rosterId,
        shiftId: shift.id,
        shiftName: shift.shiftName,
        siteId,
        siteName,
        attendanceDate: date,
        checkIn: now,
        status: metrics.status,
        lateMinutes: metrics.lateMinutes,
        earlyDepartureMinutes: 0,
        workedMinutes: 0,
        overtimeMinutes: 0,
        source: 'EMPLOYEE',
        checkInGps: geoVerification,
        deviceInfo,
        createdBy: employeeId,
        updatedBy: employeeId,
        createdAt: now,
        updatedAt: now
      };

      const ok = await this.saveAttendance(companyId, record);
      return { success: ok, message: ok ? 'Check-in successful' : 'Failed to save attendance', record: ok ? record : undefined };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `attendance/${id}`);
      return { success: false, message: 'Internal error during check-in' };
    }
  }

  static async punchOut(
    companyId: string,
    attendanceId: string,
    shift: ShiftRecord,
    gps?: { latitude: number, longitude: number, accuracy?: number },
    biometricResult?: import('../types').BiometricVerificationResult,
    geofenceOverrideRequested?: boolean,
    geofenceOverrideReason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const ref = doc(db, 'companies', companyId, 'attendance', attendanceId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return { success: false, message: 'Attendance record not found' };

      const record = snap.data() as AttendanceRecord;
      const now = new Date().toISOString();
      const policy = await this.getOvertimePolicy(companyId, record.siteId);
      const calcResult = AttendanceCalculationEngine.calculate({
        workDate: record.attendanceDate,
        shift,
        checkInIso: record.checkIn,
        checkOutIso: now,
        policy,
        siteId: record.siteId
      });

      // Geo-Fence & Biometric Validation
      const siteSnap = await getDoc(doc(db, 'companies', companyId, 'sites', record.siteId));
      let geoVerification: import('../types').GeoVerificationData | undefined = undefined;
      
      if (siteSnap.exists()) {
        const site = siteSnap.data() as SiteRecord;
        if (gps) {
          const { GeoUtils } = await import('../utils/geoUtils');
          const suspiciousFlag = GeoUtils.detectTampering(gps.latitude, gps.longitude, Date.now()) || undefined;
          
          if (site.geofenceEnabled && site.latitude && site.longitude) {
            const geoResult = GeoUtils.evaluateGeofence(
              gps.latitude, gps.longitude, gps.accuracy || 0,
              site.latitude, site.longitude, site.geofenceRadius || 100, site.accuracyThreshold || 50
            );
            
            geoVerification = {
              latitude: gps.latitude,
              longitude: gps.longitude,
              accuracy: gps.accuracy,
              distanceFromSite: geoResult.distance,
              verification: geoResult.result,
              timestamp: now,
              biometricVerification: biometricResult,
              suspiciousFlag,
              geofenceOverrideRequested,
              geofenceOverrideReason,
            };
          } else {
            geoVerification = {
              latitude: gps.latitude,
              longitude: gps.longitude,
              accuracy: gps.accuracy,
              verification: 'GEOFENCE_NOT_CONFIGURED',
              timestamp: now,
              biometricVerification: biometricResult,
              suspiciousFlag
            };
          }
        }
      }

      const updates: Partial<AttendanceRecord> = {
        checkOut: now,
        status: calcResult.status,
        lateMinutes: calcResult.lateMinutes,
        earlyDepartureMinutes: calcResult.earlyDepartureMinutes,
        workedMinutes: calcResult.workedMinutes,
        overtimeMinutes: calcResult.calculatedOvertimeMinutes,
        scheduledMinutes: calcResult.scheduledMinutes,
        breakMinutes: calcResult.breakMinutes,
        netWorkedMinutes: calcResult.netWorkedMinutes,
        shortfallMinutes: calcResult.shortfallMinutes,
        approvedOvertimeMinutes: calcResult.approvedOvertimeMinutes,
        unapprovedOvertimeMinutes: calcResult.unapprovedOvertimeMinutes,
        overtimeStatus: calcResult.calculatedOvertimeMinutes > 0 
          ? (calcResult.approvedOvertimeMinutes > 0 ? 'APPROVED' : 'PENDING_APPROVAL')
          : undefined,
        calculationExplanation: calcResult.humanExplanation,
        exceptions: calcResult.exceptions,
        requiresReview: calcResult.requiresReview,
        checkOutGps: geoVerification,
        updatedAt: now
      };

      await setDoc(ref, updates, { merge: true });

      // Automatically create Overtime Request if Overtime exists
      if (calcResult.calculatedOvertimeMinutes > 0) {
        await this.createOrSyncOvertimeRequest(companyId, {
          attendanceId,
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          siteId: record.siteId,
          siteName: record.siteName,
          workDate: record.attendanceDate,
          shiftId: shift.id,
          shiftName: shift.shiftName,
          shiftStart: shift.startTime,
          shiftEnd: shift.endTime,
          actualCheckIn: record.checkIn,
          actualCheckOut: now,
          scheduledMinutes: calcResult.scheduledMinutes,
          workedMinutes: calcResult.workedMinutes,
          breakMinutes: calcResult.breakMinutes,
          netWorkedMinutes: calcResult.netWorkedMinutes,
          rawOvertimeMinutes: calcResult.rawOvertimeMinutes,
          roundedOvertimeMinutes: calcResult.calculatedOvertimeMinutes,
          approvedOvertimeMinutes: calcResult.approvedOvertimeMinutes,
          status: calcResult.approvedOvertimeMinutes > 0 ? 'APPROVED' : 'PENDING_APPROVAL',
          calculationBreakdown: calcResult.breakdownSteps.join('\n'),
          exceptionFlags: calcResult.exceptions,
          requestedBy: record.employeeId,
          requestedByName: record.employeeName,
          requestedAt: now
        });
      }

      return { success: true, message: 'Check-out successful' };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `attendance/${attendanceId}`);
      return { success: false, message: 'Internal error during check-out' };
    }
  }

  static async supervisorPunch(
    companyId: string,
    employeeId: string,
    employeeName: string,
    rosterId: string,
    shift: ShiftRecord,
    siteId: string,
    siteName: string,
    action: 'IN' | 'OUT',
    supervisorId: string,
    remarks?: string
  ): Promise<boolean> {
    const date = new Date().toISOString().split('T')[0];
    const id = `ATT-${date}-${employeeId}`;
    try {
      const now = new Date().toISOString();
      const policy = await this.getOvertimePolicy(companyId, siteId);
      
      if (action === 'IN') {
        const calcResult = AttendanceCalculationEngine.calculate({
          workDate: date,
          shift,
          checkInIso: now,
          policy,
          siteId
        });

        const record: AttendanceRecord = {
          id,
          companyId,
          employeeId,
          employeeName,
          rosterId,
          shiftId: shift.id,
          shiftName: shift.shiftName,
          siteId,
          siteName,
          attendanceDate: date,
          checkIn: now,
          status: calcResult.status,
          lateMinutes: calcResult.lateMinutes,
          earlyDepartureMinutes: 0,
          workedMinutes: 0,
          overtimeMinutes: 0,
          scheduledMinutes: calcResult.scheduledMinutes,
          breakMinutes: calcResult.breakMinutes,
          netWorkedMinutes: 0,
          shortfallMinutes: 0,
          approvedOvertimeMinutes: 0,
          unapprovedOvertimeMinutes: 0,
          calculationExplanation: calcResult.humanExplanation,
          exceptions: calcResult.exceptions,
          requiresReview: calcResult.requiresReview,
          source: 'SUPERVISOR',
          remarks: remarks || 'Supervisor Punch-In',
          createdBy: supervisorId,
          updatedBy: supervisorId,
          createdAt: now,
          updatedAt: now
        };
        return await this.saveAttendance(companyId, record);
      } else {
        const ref = doc(db, 'companies', companyId, 'attendance', id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return false;
        
        const record = snap.data() as AttendanceRecord;
        const calcResult = AttendanceCalculationEngine.calculate({
          workDate: record.attendanceDate,
          shift,
          checkInIso: record.checkIn,
          checkOutIso: now,
          policy,
          siteId
        });
        
        await setDoc(ref, {
          checkOut: now,
          status: calcResult.status,
          lateMinutes: calcResult.lateMinutes,
          earlyDepartureMinutes: calcResult.earlyDepartureMinutes,
          workedMinutes: calcResult.workedMinutes,
          overtimeMinutes: calcResult.calculatedOvertimeMinutes,
          scheduledMinutes: calcResult.scheduledMinutes,
          breakMinutes: calcResult.breakMinutes,
          netWorkedMinutes: calcResult.netWorkedMinutes,
          shortfallMinutes: calcResult.shortfallMinutes,
          approvedOvertimeMinutes: calcResult.approvedOvertimeMinutes,
          unapprovedOvertimeMinutes: calcResult.unapprovedOvertimeMinutes,
          overtimeStatus: calcResult.calculatedOvertimeMinutes > 0 
            ? (calcResult.approvedOvertimeMinutes > 0 ? 'APPROVED' : 'PENDING_APPROVAL')
            : undefined,
          calculationExplanation: calcResult.humanExplanation,
          exceptions: calcResult.exceptions,
          requiresReview: calcResult.requiresReview,
          remarks: (record.remarks ? record.remarks + '; ' : '') + (remarks || 'Supervisor Punch-Out'),
          updatedAt: now,
          updatedBy: supervisorId
        }, { merge: true });

        // Automatically create Overtime Request if Overtime exists
        if (calcResult.calculatedOvertimeMinutes > 0) {
          await this.createOrSyncOvertimeRequest(companyId, {
            attendanceId: id,
            employeeId,
            employeeName,
            siteId,
            siteName,
            workDate: record.attendanceDate,
            shiftId: shift.id,
            shiftName: shift.shiftName,
            shiftStart: shift.startTime,
            shiftEnd: shift.endTime,
            actualCheckIn: record.checkIn,
            actualCheckOut: now,
            scheduledMinutes: calcResult.scheduledMinutes,
            workedMinutes: calcResult.workedMinutes,
            breakMinutes: calcResult.breakMinutes,
            netWorkedMinutes: calcResult.netWorkedMinutes,
            rawOvertimeMinutes: calcResult.rawOvertimeMinutes,
            roundedOvertimeMinutes: calcResult.calculatedOvertimeMinutes,
            approvedOvertimeMinutes: calcResult.approvedOvertimeMinutes,
            status: calcResult.approvedOvertimeMinutes > 0 ? 'APPROVED' : 'PENDING_APPROVAL',
            calculationBreakdown: calcResult.breakdownSteps.join('\n'),
            exceptionFlags: calcResult.exceptions,
            requestedBy: supervisorId,
            requestedByName: 'Supervisor',
            requestedAt: now
          });
        }

        return true;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `attendance/${id}`);
      return false;
    }
  }

  /**
   * Save Attendance Log to Firestore (Legacy compat)
   */
  static async logAttendance(session: UserSession, action: 'PUNCH_IN' | 'PUNCH_OUT', locationDetails?: string): Promise<boolean> {
    const collectionName = session.companyId ? `attendance_${session.companyId}` : 'attendance_DEFAULT';
    const logId = `ATT-${Date.now()}`;
    const legacyPath = `${collectionName}/${logId}`;
    const newPath = `companies/${session.companyId}/attendance/${logId}`;
    try {
      const payload = {
        logId,
        userId: session.userId,
        employeeId: session.employeeId,
        userName: session.fullName,
        role: session.role,
        action,
        timestamp: new Date().toISOString(),
        siteId: session.assignedSiteId || 'SITE-DEFAULT',
        locationDetails: locationDetails || 'GPS Verified'
      };

      const refLegacy = doc(db, collectionName, logId);
      await setDoc(refLegacy, payload);

      if (session.companyId) {
        const refNew = doc(db, 'companies', session.companyId, 'attendance', logId);
        await setDoc(refNew, payload);
      }

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${newPath} & ${legacyPath}`);
      return false;
    }
  }

  /**
   * Fetch recent attendance logs
   */
  static async getAttendanceLogs(companyId: string, limitCount: number = 20): Promise<any[]> {
    const collectionName = companyId ? `attendance_${companyId}` : 'attendance_DEFAULT';
    try {
      const q = query(
        collection(db, collectionName),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      const subColRef = collection(db, 'companies', companyId, 'attendance');
      const qSub = query(
        subColRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const snapSub = await getDocs(qSub);
      return snapSub.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn(`[Firestore] getAttendanceLogs error for ${companyId}:`, err);
      return [];
    }
  }

  /**
   * Listen to real-time Notifications
   */
  static async createNotification(notification: AppNotification): Promise<boolean> {
    try {
      const ref = doc(db, 'notifications', notification.id);
      await setDoc(ref, notification);
      return true;
    } catch (e) {
      console.warn('[Firestore] createNotification error:', e);
      return false;
    }
  }

  static subscribeToNotifications(
    role: string, 
    onData: (notifications: AppNotification[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'notifications'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const notifs: AppNotification[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as AppNotification));
          onData(notifs);
        } else {
          onData([]);
        }
      }, (err) => {
        console.warn('[Firestore] Notifications subscription error:', err);
        onData([]);
      });

      return unsubscribe;
    } catch (e) {
      console.warn('[Firestore] Notifications realtime failed:', e);
      onData([]);
      return () => {};
    }
  }

  /**
   * Fetch Company Tenant profile
   */
  static async getCompanyTenantDetails(companyId: string): Promise<CompanyTenant | null> {
    try {
      const ref = doc(db, 'companies', companyId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as CompanyTenant;
      }
    } catch (err) {
      console.warn('[Firestore] getCompanyTenantDetails error:', err);
    }
    return null;
  }

  /**
   * Update Company Tenant details
   */
  static async updateCompanyTenantDetails(company: CompanyTenant): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', company.companyId);
      await setDoc(ref, {
        ...company,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `companies/${company.companyId}`);
      return false;
    }
  }

  /**
   * Branches CRUD
   */
  static async getBranches(companyId: string): Promise<BranchRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'branches');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as BranchRecord));
    } catch (err) {
      console.warn('[Firestore] getBranches error:', err);
      return [];
    }
  }

  static async saveBranch(companyId: string, branch: BranchRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'branches', branch.id);
      await setDoc(ref, {
        ...branch,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/branches/${branch.id}`);
      return false;
    }
  }

  /**
   * Sites CRUD
   */
  static async getSites(companyId: string): Promise<SiteRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'sites');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as SiteRecord));
    } catch (err) {
      console.warn('[Firestore] getSites error:', err);
      return [];
    }
  }

  static async saveSite(companyId: string, site: SiteRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'sites', site.id);
      await setDoc(ref, {
        ...site,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/sites/${site.id}`);
      return false;
    }
  }

  /**
   * Departments CRUD
   */
  static async getDepartments(companyId: string): Promise<DepartmentRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'departments');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as DepartmentRecord));
    } catch (err) {
      console.warn('[Firestore] getDepartments error:', err);
      return [];
    }
  }

  static async saveDepartment(companyId: string, dept: DepartmentRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'departments', dept.id);
      await setDoc(ref, {
        ...dept,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/departments/${dept.id}`);
      return false;
    }
  }

  /**
   * Designations CRUD
   */
  static async getDesignations(companyId: string): Promise<DesignationRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'designations');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as DesignationRecord));
    } catch (err) {
      console.warn('[Firestore] getDesignations error:', err);
      return [];
    }
  }

  static async saveDesignation(companyId: string, desig: DesignationRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'designations', desig.id);
      await setDoc(ref, {
        ...desig,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/designations/${desig.id}`);
      return false;
    }
  }

  /**
   * User Memberships & Role Assignments
   */
  static async getMemberships(companyId: string): Promise<UserMembershipRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'employees');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => {
        const data = d.data();
        return {
          userId: d.id,
          email: data.email || `${data.employeeId}@company.com`,
          fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Employee',
          role: (data.role as UserRole) || 'GUARD',
          companyId: companyId,
          assignedBranchId: data.assignedBranchId || 'MAIN_BRANCH',
          status: data.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
          updatedAt: data.updatedAt
        } as UserMembershipRecord;
      });
    } catch (err) {
      console.warn('[Firestore] getMemberships error:', err);
      return [];
    }
  }

  static async updateUserMembership(companyId: string, membership: UserMembershipRecord): Promise<boolean> {
    try {
      // 1. Update in company employee subcollection
      const empRef = doc(db, 'companies', companyId, 'employees', membership.userId);
      await setDoc(empRef, {
        role: membership.role,
        status: membership.status,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Update user root document role if authorized
      const userRef = doc(db, 'users', membership.userId);
      await setDoc(userRef, {
        role: membership.role,
        companyId: companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 3. Update membership subcollection under users/
      const memRef = doc(db, 'users', membership.userId, 'memberships', companyId);
      await setDoc(memRef, {
        companyId: companyId,
        role: membership.role,
        status: membership.status,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/employees/${membership.userId}`);
      return false;
    }
  }

  /**
   * ============================================================
   * SITE OPERATIONS: PATROLS & CHECKPOINTS
   * ============================================================
   */
  static subscribeToPatrolLogs(session: UserSession, companyId: string, onData: (logs: PatrolLogRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'patrol_logs');
      return onSnapshot(colRef, (snap) => {
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as PatrolLogRecord));
        onData(logs);
      }, (err) => {
        console.warn('[Firestore] subscribeToPatrolLogs error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToPatrolLogs exception:', e);
      onData([]);
      return () => {};
    }
  }

  static subscribeToPatrolCheckpoints(
    session: UserSession,
    companyId: string,
    onData: (checkpoints: PatrolCheckpointRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'patrol_checkpoints');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'SITE_OPERATIONS'));
      return onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PatrolCheckpointRecord));
        list.sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0));
        onData(list);
      }, (err) => {
        console.warn('[Firestore] subscribeToPatrolCheckpoints error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToPatrolCheckpoints exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async getPatrolCheckpoints(companyId: string, siteId?: string): Promise<PatrolCheckpointRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'patrol_checkpoints');
      const snap = await getDocs(colRef);
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PatrolCheckpointRecord));
      if (siteId && siteId !== 'ALL') {
        list = list.filter(c => c.siteId === siteId);
      }
      return list.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    } catch (err) {
      console.warn('[Firestore] getPatrolCheckpoints error:', err);
      return [];
    }
  }

  static async savePatrolCheckpoint(companyId: string, checkpoint: PatrolCheckpointRecord): Promise<boolean> {
    const path = `companies/${companyId}/patrol_checkpoints/${checkpoint.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'patrol_checkpoints', checkpoint.id);
      await setDoc(ref, {
        ...checkpoint,
        companyId,
        createdAt: checkpoint.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Audit Log
      await this.logAuditEvent(
        companyId,
        'SYSTEM',
        'Management',
        'PATROL_CHECKPOINT_UPDATED',
        `Patrol Checkpoint updated: ${checkpoint.checkpointName} (${checkpoint.code}). Site: ${checkpoint.siteName || checkpoint.siteId}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async deletePatrolCheckpoint(companyId: string, checkpointId: string, checkpointName?: string): Promise<boolean> {
    const path = `companies/${companyId}/patrol_checkpoints/${checkpointId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'patrol_checkpoints', checkpointId);
      await deleteDoc(ref);

      await this.logAuditEvent(
        companyId,
        'SYSTEM',
        'Management',
        'PATROL_CHECKPOINT_DELETED',
        `Patrol Checkpoint deleted: ${checkpointName || checkpointId}`
      );
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return false;
    }
  }

  /**
   * ============================================================
   * SITE OPERATIONS: PATROL PLANS & ROUTES
   * ============================================================
   */
  static subscribeToPatrolPlans(
    session: UserSession,
    companyId: string,
    onData: (plans: PatrolPlanRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'patrol_plans');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'SITE_OPERATIONS'));
      return onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PatrolPlanRecord));
        onData(list);
      }, (err) => {
        console.warn('[Firestore] subscribeToPatrolPlans error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToPatrolPlans exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async getPatrolPlans(companyId: string, siteId?: string): Promise<PatrolPlanRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'patrol_plans');
      const snap = await getDocs(colRef);
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PatrolPlanRecord));
      if (siteId && siteId !== 'ALL') {
        list = list.filter(p => p.siteId === siteId);
      }
      return list;
    } catch (err) {
      console.warn('[Firestore] getPatrolPlans error:', err);
      return [];
    }
  }

  static async savePatrolPlan(companyId: string, plan: PatrolPlanRecord): Promise<boolean> {
    const path = `companies/${companyId}/patrol_plans/${plan.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'patrol_plans', plan.id);
      await setDoc(ref, {
        ...plan,
        companyId,
        createdAt: plan.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await this.logAuditEvent(
        companyId,
        plan.createdBy || 'SYSTEM',
        plan.createdByName || 'Management',
        'PATROL_PLAN_SAVED',
        `Patrol Plan saved: ${plan.planName} (${plan.frequency}). Site: ${plan.siteName || plan.siteId}`
      );
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async deletePatrolPlan(companyId: string, planId: string, planName?: string): Promise<boolean> {
    const path = `companies/${companyId}/patrol_plans/${planId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'patrol_plans', planId);
      await deleteDoc(ref);

      await this.logAuditEvent(
        companyId,
        'SYSTEM',
        'Management',
        'PATROL_PLAN_DELETED',
        `Patrol Plan deleted: ${planName || planId}`
      );
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return false;
    }
  }

  /**
   * ============================================================
   * SITE OPERATIONS: PATROL TOURS (LIVE & HISTORICAL)
   * ============================================================
   */
  static subscribeToPatrolTours(
    session: UserSession,
    companyId: string,
    onData: (tours: PatrolTourRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'patrol_tours');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'SITE_OPERATIONS'));
      return onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PatrolTourRecord));
        // Sort descending by actualStart or createdAt
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        onData(list);
      }, (err) => {
        console.warn('[Firestore] subscribeToPatrolTours error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToPatrolTours exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async getPatrolTours(companyId: string, siteId?: string): Promise<PatrolTourRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'patrol_tours');
      const snap = await getDocs(colRef);
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PatrolTourRecord));
      if (siteId && siteId !== 'ALL') {
        list = list.filter(t => t.siteId === siteId);
      }
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (err) {
      console.warn('[Firestore] getPatrolTours error:', err);
      return [];
    }
  }

  static async savePatrolTour(companyId: string, tour: PatrolTourRecord): Promise<boolean> {
    const path = `companies/${companyId}/patrol_tours/${tour.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'patrol_tours', tour.id);
      await setDoc(ref, {
        ...tour,
        companyId,
        createdAt: tour.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async recordTourCheckpointScan(
    companyId: string,
    tourId: string,
    scan: PatrolTourCheckpointScan,
    currentTour: PatrolTourRecord
  ): Promise<boolean> {
    const path = `companies/${companyId}/patrol_tours/${tourId}`;
    try {
      const existingScans = currentTour.checkpointScans || [];
      const updatedScans = [...existingScans.filter(s => s.checkpointId !== scan.checkpointId), scan];
      const completedCount = updatedScans.filter(s => s.status === 'COMPLETED').length;
      const totalCheckpoints = currentTour.totalCheckpoints || 1;
      const completionPercentage = Math.round((completedCount / totalCheckpoints) * 100);

      const exceptions = [...(currentTour.exceptionsDetected || [])];
      if (scan.sequenceStatus === 'OUT_OF_SEQUENCE' && !exceptions.includes('OUT_OF_SEQUENCE_SCAN')) {
        exceptions.push('OUT_OF_SEQUENCE_SCAN');
      }
      if (scan.geofenceStatus === 'OUTSIDE_GEOFENCE' && !exceptions.includes('OUTSIDE_GEOFENCE_SCAN')) {
        exceptions.push('OUTSIDE_GEOFENCE_SCAN');
      }

      const updates: Partial<PatrolTourRecord> = {
        checkpointScans: updatedScans,
        completedCheckpointsCount: completedCount,
        completionPercentage,
        exceptionsDetected: exceptions,
        updatedAt: new Date().toISOString()
      };

      const ref = doc(db, 'companies', companyId, 'patrol_tours', tourId);
      await setDoc(ref, updates, { merge: true });

      // Audit Log for checkpoint scan
      await this.logAuditEvent(
        companyId,
        scan.scannedByUid || 'SYSTEM',
        scan.scannedByName || 'Guard',
        'PATROL_CHECKPOINT_SCANNED',
        `Checkpoint scanned: ${scan.checkpointName} (${scan.code}) - ${scan.geofenceStatus} - Tour: ${currentTour.tourNumber}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  static async completePatrolTour(
    companyId: string,
    tourId: string,
    tour: PatrolTourRecord,
    remarks?: string,
    endGps?: { latitude: number; longitude: number; accuracy?: number }
  ): Promise<boolean> {
    const path = `companies/${companyId}/patrol_tours/${tourId}`;
    try {
      const total = tour.totalCheckpoints || 1;
      const completed = tour.completedCheckpointsCount || (tour.checkpointScans?.filter(s => s.status === 'COMPLETED').length || 0);
      const percentage = Math.round((completed / total) * 100);
      const isComplete = percentage >= 100;
      const status: PatrolTourStatus = isComplete ? 'COMPLETED' : 'INCOMPLETE';

      const updates: Partial<PatrolTourRecord> = {
        status,
        actualEnd: new Date().toISOString(),
        completionPercentage: percentage,
        remarks: remarks || tour.remarks || '',
        endGps,
        updatedAt: new Date().toISOString()
      };

      const ref = doc(db, 'companies', companyId, 'patrol_tours', tourId);
      await setDoc(ref, updates, { merge: true });

      // Also persist legacy patrol log for compatibility
      const legacyLogRef = doc(db, 'companies', companyId, 'patrol_logs', tourId);
      await setDoc(legacyLogRef, {
        id: tourId,
        companyId,
        assignedRegionId: tour.assignedRegionId,
        assignedBranchId: tour.assignedBranchId,
        siteId: tour.siteId,
        siteName: tour.siteName,
        patrolName: tour.patrolPlanName || `Patrol Tour ${tour.tourNumber}`,
        guardId: tour.assignedGuardId,
        guardName: tour.assignedGuardName,
        startTime: tour.actualStart || tour.createdAt,
        endTime: updates.actualEnd,
        checkpointsVisited: (tour.checkpointScans || []).map(s => s.checkpointId),
        totalCheckpoints: tour.totalCheckpoints,
        status: isComplete ? 'COMPLETED' : 'INCOMPLETE',
        remarks: remarks || tour.remarks || '',
        gpsLocation: endGps ? { latitude: endGps.latitude, longitude: endGps.longitude } : undefined,
        createdAt: tour.createdAt || new Date().toISOString()
      }, { merge: true });

      await this.logAuditEvent(
        companyId,
        tour.assignedGuardId || 'SYSTEM',
        tour.assignedGuardName || 'Security Guard',
        'PATROL_TOUR_COMPLETED',
        `Patrol Tour ${tour.tourNumber} finished as ${status} (${percentage}% checkpoints completed). Site: ${tour.siteName}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  static async overridePatrolTour(
    companyId: string,
    tourId: string,
    overrideReason: string,
    supervisorSession: UserSession
  ): Promise<boolean> {
    return this.supervisorOverrideTour(
      companyId,
      tourId,
      supervisorSession.userId,
      supervisorSession.fullName,
      overrideReason
    );
  }

  static async supervisorOverrideTour(
    companyId: string,
    tourId: string,
    supervisorUid: string,
    supervisorName: string,
    overrideReason: string
  ): Promise<boolean> {
    const path = `companies/${companyId}/patrol_tours/${tourId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'patrol_tours', tourId);
      const updates: Partial<PatrolTourRecord> = {
        isOverridden: true,
        overrideReason,
        overriddenByUid: supervisorUid,
        overriddenByName: supervisorName,
        overriddenAt: new Date().toISOString(),
        supervisorOverride: {
          reason: overrideReason,
          overriddenByUid: supervisorUid,
          overriddenByName: supervisorName,
          overriddenAt: new Date().toISOString()
        },
        status: 'COMPLETED',
        updatedAt: new Date().toISOString()
      };
      await setDoc(ref, updates, { merge: true });

      await this.logAuditEvent(
        companyId,
        supervisorUid,
        supervisorName,
        'PATROL_TOUR_OVERRIDDEN',
        `Patrol Tour ${tourId} overridden to COMPLETED by supervisor. Reason: ${overrideReason}`
      );
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  static async savePatrolLog(companyId: string, log: PatrolLogRecord): Promise<boolean> {
    const path = `companies/${companyId}/patrol_logs/${log.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'patrol_logs', log.id);
      await setDoc(ref, {
        ...log,
        companyId,
        createdAt: log.createdAt || new Date().toISOString(),
        updatedAt: Date.now()
      }, { merge: true });

      // Audit Log
      await this.logAuditEvent(
        companyId,
        log.guardId || 'SYSTEM',
        log.guardName || 'Security Guard',
        'PATROL_COMPLETED',
        `Patrol completed: ${log.patrolName} (${log.status}). Site: ${log.siteName || log.siteId}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * ============================================================
   * SITE OPERATIONS: INCIDENT REPORTS & INVESTIGATION WORKFLOW
   * ============================================================
   */
  static subscribeToIncidentReports(
    session: UserSession, 
    companyId: string, 
    onData: (reports: IncidentReportRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'incident_reports');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'INCIDENTS'));
      return onSnapshot(q, (snap) => {
        const reports = snap.docs.map(d => ({ id: d.id, ...d.data() } as IncidentReportRecord));
        reports.sort((a, b) => new Date(b.reportedAt || 0).getTime() - new Date(a.reportedAt || 0).getTime());
        onData(reports);
      }, (err) => {
        console.warn('[Firestore] subscribeToIncidentReports error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToIncidentReports exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async saveIncidentReport(companyId: string, report: IncidentReportRecord): Promise<boolean> {
    const path = `companies/${companyId}/incident_reports/${report.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'incident_reports', report.id);
      const isNew = !report.createdAt;
      
      const payload: IncidentReportRecord = {
        ...report,
        companyId,
        incidentNumber: report.incidentNumber || `INC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        reportedAt: report.reportedAt || new Date().toISOString(),
        createdAt: report.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: report.timeline || [
          {
            timestamp: new Date().toISOString(),
            actorId: report.reportedById || 'SYSTEM',
            actorName: report.reportedByName || 'Reporter',
            action: 'INCIDENT_LOGGED',
            notes: `Incident reported: ${report.title} (${report.severity})`
          }
        ]
      };

      await setDoc(ref, payload, { merge: true });

      // Audit Log
      await this.logAuditEvent(
        companyId,
        report.reportedById || 'SYSTEM',
        report.reportedByName || 'System',
        'INCIDENT_REPORTED',
        `Incident reported: ${report.title} (${report.severity}). Site: ${report.siteName || report.siteId}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async updateIncidentStatus(
    companyId: string, 
    reportId: string, 
    status: IncidentReportRecord['status'], 
    resolutionNotes?: string,
    resolverId?: string,
    resolverName?: string
  ): Promise<boolean> {
    const path = `companies/${companyId}/incident_reports/${reportId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'incident_reports', reportId);
      const snap = await getDoc(ref);
      const current = snap.exists() ? snap.data() as IncidentReportRecord : null;
      
      const timeline = current?.timeline || [];
      timeline.push({
        timestamp: new Date().toISOString(),
        actorId: resolverId || 'SYSTEM',
        actorName: resolverName || 'User',
        action: `STATUS_UPDATED_${status}`,
        notes: resolutionNotes || `Status updated to ${status}`
      });

      const updates: Partial<IncidentReportRecord> = {
        status,
        resolutionNotes: resolutionNotes || current?.resolutionNotes,
        resolvedById: resolverId || current?.resolvedById,
        resolvedByName: resolverName || current?.resolvedByName,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? (current?.resolvedAt || new Date().toISOString()) : undefined,
        closedById: status === 'CLOSED' ? (resolverId || current?.closedById) : undefined,
        closedByName: status === 'CLOSED' ? (resolverName || current?.closedByName) : undefined,
        closedAt: status === 'CLOSED' ? new Date().toISOString() : undefined,
        timeline,
        updatedAt: new Date().toISOString()
      };
      await setDoc(ref, updates, { merge: true });

      await this.logAuditEvent(
        companyId,
        resolverId || 'SYSTEM',
        resolverName || 'User',
        'INCIDENT_STATUS_CHANGED',
        `Incident ${reportId} updated to ${status}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  static async investigateIncident(
    companyId: string,
    reportId: string,
    investigation: {
      investigatorId: string;
      investigatorName: string;
      rootCause?: string;
      immediateAction?: string;
      correctiveAction?: string;
      preventiveAction?: string;
      notes?: string;
    }
  ): Promise<boolean> {
    const path = `companies/${companyId}/incident_reports/${reportId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'incident_reports', reportId);
      const snap = await getDoc(ref);
      const current = snap.exists() ? snap.data() as IncidentReportRecord : null;
      
      const timeline = current?.timeline || [];
      timeline.push({
        timestamp: new Date().toISOString(),
        actorId: investigation.investigatorId,
        actorName: investigation.investigatorName,
        action: 'INVESTIGATION_UPDATED',
        notes: investigation.notes || 'Root cause and corrective actions documented'
      });

      const updates: Partial<IncidentReportRecord> = {
        assignedInvestigatorId: investigation.investigatorId,
        assignedInvestigatorName: investigation.investigatorName,
        rootCause: investigation.rootCause,
        immediateAction: investigation.immediateAction,
        correctiveAction: investigation.correctiveAction,
        preventiveAction: investigation.preventiveAction,
        status: 'UNDER_INVESTIGATION',
        timeline,
        updatedAt: new Date().toISOString()
      };
      await setDoc(ref, updates, { merge: true });

      await this.logAuditEvent(
        companyId,
        investigation.investigatorId,
        investigation.investigatorName,
        'INCIDENT_INVESTIGATED',
        `Incident ${reportId} investigation updated with root cause and corrective actions.`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  static async verifyAndCloseIncident(
    companyId: string,
    reportId: string,
    verifierSession: UserSession,
    verificationNotes?: string
  ): Promise<boolean> {
    const path = `companies/${companyId}/incident_reports/${reportId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'incident_reports', reportId);
      const snap = await getDoc(ref);
      const current = snap.exists() ? snap.data() as IncidentReportRecord : null;

      const timeline = current?.timeline || [];
      timeline.push({
        timestamp: new Date().toISOString(),
        actorId: verifierSession.userId,
        actorName: verifierSession.fullName,
        action: 'INCIDENT_VERIFIED_AND_CLOSED',
        notes: verificationNotes || 'Resolution verified by supervisor/manager and marked CLOSED'
      });

      const updates: Partial<IncidentReportRecord> = {
        status: 'CLOSED',
        verifiedById: verifierSession.userId,
        verifiedByName: verifierSession.fullName,
        verifiedAt: new Date().toISOString(),
        closedById: verifierSession.userId,
        closedByName: verifierSession.fullName,
        closedAt: new Date().toISOString(),
        timeline,
        updatedAt: new Date().toISOString()
      };

      await setDoc(ref, updates, { merge: true });

      await this.logAuditEvent(
        companyId,
        verifierSession.userId,
        verifierSession.fullName,
        'INCIDENT_CLOSED',
        `Incident ${reportId} verified and closed.`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  /**
   * ============================================================
   * SITE OPERATIONS: VISITOR LOG REGISTER
   * ============================================================
   */
  static subscribeToVisitorLogs(session: UserSession, companyId: string, onData: (visitors: VisitorLogRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'visitor_logs');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'VISITORS'));
      return onSnapshot(q, (snap) => {
        const visitors = snap.docs.map(d => ({ id: d.id, ...d.data() } as VisitorLogRecord));
        onData(visitors);
      }, (err) => {
        console.warn('[Firestore] subscribeToVisitorLogs error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToVisitorLogs exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async checkInVisitor(companyId: string, visitor: VisitorLogRecord): Promise<boolean> {
    const path = `companies/${companyId}/visitor_logs/${visitor.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'visitor_logs', visitor.id);
      await setDoc(ref, {
        ...visitor,
        companyId,
        status: 'IN_SITE',
        createdAt: visitor.createdAt || new Date().toISOString(),
        updatedAt: Date.now()
      }, { merge: true });

      // Audit Log
      await this.logAuditEvent(
        companyId,
        visitor.entryGateGuardId || 'SYSTEM',
        'Gate Guard',
        'VISITOR_CHECK_IN',
        `Visitor Checked In: ${visitor.visitorName} (Badge: ${visitor.badgeNumber}). Site: ${visitor.siteName || visitor.siteId}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async checkOutVisitor(companyId: string, visitorId: string, checkOutTimeISO?: string, badgeReturned = true, checkoutNotes?: string): Promise<boolean> {
    const path = `companies/${companyId}/visitor_logs/${visitorId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'visitor_logs', visitorId);
      await setDoc(ref, {
        checkOutTime: checkOutTimeISO || new Date().toISOString(),
        status: 'CHECKED_OUT',
        badgeReturned,
        ...(checkoutNotes ? { checkoutNotes } : {})
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  /**
   * ============================================================
   * SITE OPERATIONS: MATERIAL MOVEMENT LOG REGISTER
   * ============================================================
   */
  static subscribeToMaterialLogs(session: UserSession, companyId: string, onData: (materials: MaterialMovementRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'material_movement_logs');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'MATERIALS'));
      return onSnapshot(q, (snap) => {
        const materials = snap.docs.map(d => ({ id: d.id, ...d.data() } as MaterialMovementRecord));
        onData(materials);
      }, (err) => {
        console.warn('[Firestore] subscribeToMaterialLogs error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToMaterialLogs exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async saveMaterialMovementLog(companyId: string, material: MaterialMovementRecord): Promise<boolean> {
    const path = `companies/${companyId}/material_movement_logs/${material.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'material_movement_logs', material.id);
      await setDoc(ref, {
        ...material,
        companyId,
        createdAt: material.createdAt || new Date().toISOString(),
        updatedAt: Date.now()
      }, { merge: true });

      // Audit Log
      await this.logAuditEvent(
        companyId,
        material.createdBy || 'SYSTEM',
        'System',
        'MATERIAL_MOVEMENT_LOGGED',
        `${material.movementType} movement: ${material.materialDescription} (GP: ${material.gatePassNumber}). Site: ${material.siteName || material.siteId}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async updateMaterialStatus(
    companyId: string, 
    materialId: string, 
    status: MaterialMovementRecord['status'],
    approverId?: string,
    approverName?: string
  ): Promise<boolean> {
    const path = `companies/${companyId}/material_movement_logs/${materialId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'material_movement_logs', materialId);
      await setDoc(ref, {
        status,
        approvedById: approverId,
        approvedByName: approverName
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  /**
   * ============================================================
   * SITE OPERATIONS: DAILY SITE LOG SUMMARY
   * ============================================================
   */
  static subscribeToDailySiteLogs(session: UserSession, companyId: string, onData: (siteLogs: DailySiteLogRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'daily_site_logs');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'LOGS'));
      return onSnapshot(q, (snap) => {
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as DailySiteLogRecord));
        onData(logs);
      }, (err) => {
        console.warn('[Firestore] subscribeToDailySiteLogs error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToDailySiteLogs exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async saveDailySiteLog(companyId: string, log: DailySiteLogRecord): Promise<boolean> {
    const path = `companies/${companyId}/daily_site_logs/${log.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'daily_site_logs', log.id);
      await setDoc(ref, {
        ...log,
        companyId,
        createdAt: log.createdAt || new Date().toISOString(),
        updatedAt: Date.now()
      }, { merge: true });

      // Audit Log
      await this.logAuditEvent(
        companyId,
        log.supervisorId || 'SYSTEM',
        log.supervisorName || 'System',
        'DAILY_LOG_SUBMITTED',
        `${log.logType} log submitted for ${log.date}. Site: ${log.siteName || log.siteId}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async saveWorkOrder(companyId: string, workOrder: WorkOrderRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'work_orders', workOrder.id);
      await setDoc(ref, {
        ...workOrder,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Log Audit Event
      await this.logAuditEvent(
        companyId,
        workOrder.createdBy,
        'System',
        'WORK_ORDER_CREATED',
        `New work order created: ${workOrder.title}. Priority: ${workOrder.priority}`
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] saveWorkOrder error:', err);
      return false;
    }
  }

  static async saveTask(companyId: string, task: TaskRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'tasks', task.id);
      await setDoc(ref, {
        ...task,
        updatedAt: Date.now()
      }, { merge: true });

      // Log Audit Event
      await this.logAuditEvent(
        companyId,
        task.createdBy,
        task.createdByName || 'System',
        'TASK_CREATED',
        `New task dispatched: ${task.title}. Assigned to: ${task.assignedToName || task.assignedTo}`
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] saveTask error:', err);
      return false;
    }
  }

  static async saveAnnouncement(companyId: string, ann: AnnouncementRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'announcements', ann.id);
      await setDoc(ref, {
        ...ann,
        updatedAt: Date.now()
      }, { merge: true });

      // Audit Log
      await this.logAuditEvent(
        companyId,
        ann.createdBy || 'SYSTEM',
        ann.createdByName || 'Management',
        'ANNOUNCEMENT_PUBLISHED',
        `Announcement broadcast: ${ann.title}. Target: ${ann.targetAudience}`
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] saveAnnouncement error:', err);
      return false;
    }
  }

  static async deleteAnnouncement(companyId: string, annId: string): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'announcements', annId);
      await deleteDoc(ref);
      return true;
    } catch (err) {
      console.error('[FirestoreService] deleteAnnouncement error:', err);
      return false;
    }
  }

  static async saveDocumentRecord(companyId: string, docRec: DocumentRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'documents', docRec.id);
      await setDoc(ref, {
        ...docRec,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] saveDocumentRecord error:', err);
      return false;
    }
  }

  /**
   * ============================================================
   * DEPARTMENTS: DYNAMIC COMPANY DEPARTMENTS
   * ============================================================
   */
  static async getCompanyDepartments(companyId: string): Promise<DepartmentRecord[]> {
    try {
      // 1. Check company subcollection 'departments'
      const colRef = collection(db, 'companies', companyId, 'departments');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as DepartmentRecord));
      }

      // 2. Check top-level 'departments'
      const topRef = collection(db, 'departments');
      const topSnap = await getDocs(topRef);
      if (!topSnap.empty) {
        return topSnap.docs.map(d => ({ id: d.id, ...d.data() } as DepartmentRecord));
      }
    } catch (err) {
      console.warn('[FirestoreService] getCompanyDepartments error:', err);
    }

    // Default fallback company departments
    return [
      { id: 'DEPT-HR', name: 'HR', code: 'HR', description: 'Human Resources' },
      { id: 'DEPT-ADMIN', name: 'Administration', code: 'ADMIN', description: 'General Administration' },
      { id: 'DEPT-SEC', name: 'Security', code: 'SEC', description: 'Physical & Field Security' },
      { id: 'DEPT-OPS', name: 'Operations', code: 'OPS', description: 'Site Operations' },
      { id: 'DEPT-FIN', name: 'Finance', code: 'FIN', description: 'Finance & Accounts' },
      { id: 'DEPT-ACCTS', name: 'Accounts', code: 'ACCTS', description: 'Accounting & Payroll' },
      { id: 'DEPT-IT', name: 'IT', code: 'IT', description: 'Information Technology' }
    ];
  }

  /**
   * ============================================================
   * USER & APPROVAL WORKFLOW MANAGEMENT
   * ============================================================
   */
  static subscribeToUserStatus(
    uid: string,
    onData: (userData: any) => void
  ): () => void {
    try {
      const userRef = doc(db, 'users', uid);
      return onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          onData(docSnap.data());
        } else {
          onData(null);
        }
      }, (err) => {
        console.warn('[Firestore] subscribeToUserStatus error:', err);
        onData(null);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToUserStatus exception:', e);
      onData(null);
      return () => {};
    }
  }

  static async saveApprovalRequest(request: ApprovalRequestRecord): Promise<boolean> {
    try {
      // Dual-write to root 'approval_requests' and 'companies/{companyId}/approval_requests'
      const rootRef = doc(db, 'approval_requests', request.id);
      await setDoc(rootRef, request, { merge: true });

      if (request.companyId) {
        const compRef = doc(db, 'companies', request.companyId, 'approval_requests', request.id);
        await setDoc(compRef, request, { merge: true });
      }
      return true;
    } catch (err) {
      console.error('[FirestoreService] saveApprovalRequest error:', err);
      return false;
    }
  }

  static subscribeToApprovalRequests(session: UserSession, companyId: string, onData: (requests: ApprovalRequestRecord[]) => void
  ): () => void {
    try {
      if (companyId === 'GLOBAL_ADMIN') {
        const rootRef = collection(db, 'approval_requests');
        return onSnapshot(rootRef, (snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequestRecord));
          onData(list);
        }, (err) => {
          console.warn('[Firestore] subscribeToApprovalRequests (GLOBAL) error:', err);
          onData([]);
        });
      }

      const colRef = collection(db, 'companies', companyId, 'approval_requests');
      return onSnapshot(colRef, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequestRecord));
          onData(list);
        } else {
          // Fallback query on root approval_requests collection
          const rootRef = collection(db, 'approval_requests');
          const q = query(rootRef, where('companyId', '==', companyId));
          getDocs(q).then((rootSnap) => {
            const list = rootSnap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequestRecord));
            onData(list);
          }).catch(() => onData([]));
        }
      }, (err) => {
        console.warn('[Firestore] subscribeToApprovalRequests error:', err);
        const rootRef = collection(db, 'approval_requests');
        const q = query(rootRef, where('companyId', '==', companyId));
        getDocs(q).then((rootSnap) => {
          const list = rootSnap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequestRecord));
          onData(list);
        }).catch(() => onData([]));
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToApprovalRequests exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async approveUserByCompanyAdmin(
    companyId: string,
    requestId: string,
    adminUid: string,
    adminName: string
  ): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString();
      const reqRef = doc(db, 'companies', companyId, 'approval_requests', requestId);
      const rootReqRef = doc(db, 'approval_requests', requestId);
      
      const reqSnap = await getDoc(reqRef);
      const reqData = reqSnap.exists() ? reqSnap.data() as ApprovalRequestRecord : (await getDoc(rootReqRef)).data() as ApprovalRequestRecord;

      if (!reqData) throw new Error('Approval request record not found');

      const isHrApproved = reqData.hrApproval === 'APPROVED';
      const isEmailVerified = reqData.emailVerified || (auth.currentUser?.emailVerified ?? false);
      const newAccountStatus: AccountStatus = (isHrApproved && isEmailVerified) ? 'ACTIVE' : 'ADMIN_APPROVED';

      const updateData = {
        companyAdminApproval: 'APPROVED' as ApprovalStatus,
        companyAdminApprovedBy: adminName || adminUid,
        companyAdminApprovedAt: timestamp,
        accountStatus: newAccountStatus,
        updatedAt: timestamp
      };

      await setDoc(reqRef, updateData, { merge: true });
      await setDoc(rootReqRef, updateData, { merge: true });

      // Update user doc in root 'users' collection
      const userRef = doc(db, 'users', reqData.uid);
      await setDoc(userRef, {
        companyAdminApproval: 'APPROVED',
        accountStatus: newAccountStatus,
        ...(newAccountStatus === 'ACTIVE' ? { role: reqData.requestedRole || 'EMPLOYEE' } : {}),
        updatedAt: timestamp
      }, { merge: true });

      // Update employee record if active
      if (newAccountStatus === 'ACTIVE') {
        const empRef = doc(db, 'companies', companyId, 'employees', reqData.uid);
        await setDoc(empRef, {
          status: 'ACTIVE',
          role: reqData.requestedRole || 'EMPLOYEE',
          updatedAt: timestamp
        }, { merge: true });
      }

      await this.logAuditEvent(
        companyId,
        adminUid,
        adminName,
        'ADMIN_APPROVED',
        `Company Admin approved account for ${reqData.fullName} (${reqData.email})`,
        reqData.uid
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] approveUserByCompanyAdmin error:', err);
      return false;
    }
  }

  static async approveUserByHR(
    companyId: string,
    requestId: string,
    hrUid: string,
    hrName: string
  ): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString();
      const reqRef = doc(db, 'companies', companyId, 'approval_requests', requestId);
      const rootReqRef = doc(db, 'approval_requests', requestId);

      const reqSnap = await getDoc(reqRef);
      const reqData = reqSnap.exists() ? reqSnap.data() as ApprovalRequestRecord : (await getDoc(rootReqRef)).data() as ApprovalRequestRecord;

      if (!reqData) throw new Error('Approval request record not found');

      const isAdminApproved = reqData.companyAdminApproval === 'APPROVED';
      const isEmailVerified = reqData.emailVerified || (auth.currentUser?.emailVerified ?? false);
      const newAccountStatus: AccountStatus = (isAdminApproved && isEmailVerified) ? 'ACTIVE' : 'HR_APPROVED';

      const updateData = {
        hrApproval: 'APPROVED' as ApprovalStatus,
        hrApprovedBy: hrName || hrUid,
        hrApprovedAt: timestamp,
        accountStatus: newAccountStatus,
        updatedAt: timestamp
      };

      await setDoc(reqRef, updateData, { merge: true });
      await setDoc(rootReqRef, updateData, { merge: true });

      // Update user doc
      const userRef = doc(db, 'users', reqData.uid);
      await setDoc(userRef, {
        hrApproval: 'APPROVED',
        accountStatus: newAccountStatus,
        ...(newAccountStatus === 'ACTIVE' ? { role: reqData.requestedRole || 'EMPLOYEE' } : {}),
        updatedAt: timestamp
      }, { merge: true });

      if (newAccountStatus === 'ACTIVE') {
        const empRef = doc(db, 'companies', companyId, 'employees', reqData.uid);
        await setDoc(empRef, {
          status: 'ACTIVE',
          role: reqData.requestedRole || 'EMPLOYEE',
          updatedAt: timestamp
        }, { merge: true });
      }

      await this.logAuditEvent(
        companyId,
        hrUid,
        hrName,
        'HR_APPROVED',
        `HR approved account for ${reqData.fullName} (${reqData.email})`,
        reqData.uid
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] approveUserByHR error:', err);
      return false;
    }
  }

  static async rejectUserApplication(
    companyId: string,
    requestId: string,
    rejectorUid: string,
    reason: string
  ): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString();
      const reqRef = doc(db, 'companies', companyId, 'approval_requests', requestId);
      const rootReqRef = doc(db, 'approval_requests', requestId);

      const updateData = {
        accountStatus: 'REJECTED' as AccountStatus,
        rejectionReason: reason || 'Application rejected by company administrator.',
        rejectedBy: rejectorUid,
        rejectedAt: timestamp,
        updatedAt: timestamp
      };

      await setDoc(reqRef, updateData, { merge: true });
      await setDoc(rootReqRef, updateData, { merge: true });

      const reqSnap = await getDoc(reqRef);
      if (reqSnap.exists()) {
        const reqData = reqSnap.data() as ApprovalRequestRecord;
        const userRef = doc(db, 'users', reqData.uid);
        await setDoc(userRef, {
          accountStatus: 'REJECTED',
          rejectionReason: reason,
          rejectedBy: rejectorUid,
          updatedAt: timestamp
        }, { merge: true });
      }

      await this.logAuditEvent(
        companyId,
        rejectorUid,
        'System Approver',
        'ACCOUNT_REJECTED',
        `Application rejected. Reason: ${reason}`
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] rejectUserApplication error:', err);
      return false;
    }
  }

  /**
   * ============================================================
   * SYSTEM CONFIGURATION & SUPER ADMIN INITIALIZATION
   * ============================================================
   */
  static async getSystemConfig(): Promise<SystemConfigRecord | null> {
    try {
      const sysRef = doc(db, 'settings', 'system');
      const snap = await getDoc(sysRef);
      if (snap.exists()) {
        return snap.data() as SystemConfigRecord;
      }
    } catch (err) {
      console.warn('[FirestoreService] getSystemConfig error:', err);
    }
    return null;
  }

  static async initializeSuperAdminConfig(uid: string, email: string): Promise<boolean> {
    try {
      const sysRef = doc(db, 'settings', 'system');
      const current = await this.getSystemConfig();

      if (current && current.superAdminInitialized) {
        if (current.superAdminEmail?.toLowerCase() === email.toLowerCase()) {
          if (current.superAdminUid !== uid) {
            await setDoc(sysRef, { superAdminUid: uid, updatedAt: new Date().toISOString() }, { merge: true });
          }
          return true;
        }
        throw new Error('Super Admin account has already been initialized on this system.');
      }

      const config: SystemConfigRecord = {
        superAdminInitialized: true,
        superAdminUid: uid,
        superAdminEmail: email,
        initializedAt: new Date().toISOString()
      };

      await setDoc(sysRef, config, { merge: true });
      return true;
    } catch (err) {
      console.warn('[FirestoreService] initializeSuperAdminConfig warning:', err);
      return true;
    }
  }

  /**
   * ============================================================
   * AUDIT LOGGING
   * ============================================================
   */
  static async logAuditEvent(
    companyId: string,
    actorId: string,
    actorName: string,
    action: string,
    details: string,
    targetUser?: string
  ): Promise<boolean> {
    try {
      const logId = `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const logRecord: AuditLogRecord = {
        id: logId,
        companyId: companyId || 'GLOBAL',
        actorId,
        actorName,
        action,
        details,
        targetUser,
        timestamp: new Date().toISOString()
      };

      if (companyId && companyId !== 'GLOBAL') {
        const compLogRef = doc(db, 'companies', companyId, 'audit_logs', logId);
        await setDoc(compLogRef, logRecord);
      }

      const rootLogRef = doc(db, 'system_audit_logs', logId);
      await setDoc(rootLogRef, logRecord);

      return true;
    } catch (err) {
      console.warn('[FirestoreService] logAuditEvent error:', err);
      return false;
    }
  }

  /**
   * ============================================================
   * SUPER ADMIN & COMPANY MANAGEMENT METHODS
   * ============================================================
   */

  /**
   * Fetch all registered companies from Firestore
   */
  static async getAllCompanies(): Promise<CompanyTenant[]> {
    try {
      const colRef = collection(db, 'companies');
      const snap = await getDocs(colRef);
      if (snap.empty) return [];
      return snap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          companyId: docSnap.id,
          companyLegalName: data.companyLegalName || docSnap.id,
          brandName: data.brandName || docSnap.id,
          licenseTier: data.licenseTier || 'ENTERPRISE',
          status: data.status || 'ACTIVE',
          primaryColorHex: data.primaryColorHex || '#4f46e5',
          secondaryColorHex: data.secondaryColorHex || '#06b6d4',
          allowedBranches: data.allowedBranches || ['MAIN'],
          maxEmployeesAllowed: data.maxEmployeesAllowed || 1000,
          maxSitesAllowed: data.maxSitesAllowed || 50,
          enabledModules: data.enabledModules || MASTER_APP_MODULES.map(m => m.key),
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'India',
          adminName: data.adminName || '',
          adminEmail: data.adminEmail || '',
          createdAt: data.createdAt || new Date().toISOString()
        } as CompanyTenant;
      });
    } catch (err) {
      console.warn('[FirestoreService] getAllCompanies error:', err);
      return [];
    }
  }

  /**
   * Fetch a specific company by code/ID
   */
  static async getCompanyByCode(companyCode: string): Promise<CompanyTenant | null> {
    const cleanCode = companyCode.trim().toUpperCase();
    try {
      const compRef = doc(db, 'companies', cleanCode);
      const snap = await getDoc(compRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          companyId: snap.id,
          companyLegalName: data.companyLegalName || snap.id,
          brandName: data.brandName || snap.id,
          licenseTier: data.licenseTier || 'ENTERPRISE',
          status: data.status || 'ACTIVE',
          primaryColorHex: data.primaryColorHex || '#4f46e5',
          secondaryColorHex: data.secondaryColorHex || '#06b6d4',
          allowedBranches: data.allowedBranches || ['MAIN'],
          maxEmployeesAllowed: data.maxEmployeesAllowed || 1000,
          maxSitesAllowed: data.maxSitesAllowed || 50,
          enabledModules: data.enabledModules || MASTER_APP_MODULES.map(m => m.key),
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'India',
          adminName: data.adminName || '',
          adminEmail: data.adminEmail || '',
          createdAt: data.createdAt || new Date().toISOString()
        } as CompanyTenant;
      }
    } catch (err) {
      console.warn('[FirestoreService] getCompanyByCode error:', err);
    }
    return null;
  }

  /**
   * Update Company Enabled Modules
   */
  static async updateCompanyModules(companyId: string, enabledModules: string[]): Promise<boolean> {
    try {
      const compRef = doc(db, 'companies', companyId);
      await setDoc(compRef, { enabledModules, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] updateCompanyModules error:', err);
      return false;
    }
  }

  /**
   * Update Company Details & Status
   */
  static async updateCompanyDetails(companyId: string, updates: Partial<CompanyTenant>): Promise<boolean> {
    try {
      const compRef = doc(db, 'companies', companyId);
      await setDoc(compRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] updateCompanyDetails error:', err);
      return false;
    }
  }

  /**
   * Fetch all users globally (for Super Admin dashboard)
   */
  static async getAllUsers(): Promise<any[]> {
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      if (snap.empty) return [];
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn('[FirestoreService] getAllUsers error:', err);
      return [];
    }
  }

  /**
   * Fetch all pending registration requests globally
   */
  static async getAllApprovalRequests(): Promise<ApprovalRequestRecord[]> {
    try {
      const reqRef = collection(db, 'approval_requests');
      const snap = await getDocs(reqRef);
      if (snap.empty) return [];
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequestRecord));
    } catch (err) {
      console.warn('[FirestoreService] getAllApprovalRequests error:', err);
      return [];
    }
  }

  /**
   * Calculate real Super Admin System Statistics from Firestore
   */
  static async getSuperAdminStats(): Promise<{
    totalCompanies: number;
    activeCompanies: number;
    pendingCompanies: number;
    totalUsers: number;
    pendingUserApprovals: number;
    activeSites: number;
    todayVisitors: number;
    todayIncidents: number;
  }> {
    try {
      const companies = await this.getAllCompanies();
      const users = await this.getAllUsers();
      const requests = await this.getAllApprovalRequests();

      const totalCompanies = companies.length;
      const activeCompanies = companies.filter(c => c.status === 'ACTIVE').length;
      const pendingCompanies = companies.filter(c => c.status === 'SUSPENDED' || c.status === 'TRIAL_EXPIRED').length;

      const totalUsers = users.length;
      const pendingUserApprovals = requests.filter(r => r.accountStatus === 'PENDING_APPROVAL').length;

      return {
        totalCompanies,
        activeCompanies,
        pendingCompanies,
        totalUsers,
        pendingUserApprovals,
        activeSites: 0,
        todayVisitors: 0,
        todayIncidents: 0
      };
    } catch (err) {
      console.warn('[FirestoreService] getSuperAdminStats error:', err);
      return {
        totalCompanies: 0,
        activeCompanies: 0,
        pendingCompanies: 0,
        totalUsers: 0,
        pendingUserApprovals: 0,
        activeSites: 0,
        todayVisitors: 0,
        todayIncidents: 0
      };
    }
  }

  /**
   * Create a brand new Company along with its Company Admin and Module Entitlements
   */
  static async createCompanyWithAdmin(params: {
    company: CompanyTenant;
    adminInfo: { fullName: string; email: string; mobileNumber?: string };
    enabledModules: string[];
    createdByUid: string;
    createdByName: string;
  }): Promise<{ success: boolean; message: string; companyId: string }> {
    const { company, adminInfo, enabledModules, createdByUid, createdByName } = params;
    const cleanCompanyId = company.companyId.trim().toUpperCase();

    if (!cleanCompanyId) {
      return { success: false, message: 'Company Code is required.', companyId: '' };
    }

    try {
      const timestamp = new Date().toISOString();

      // 1. Check if Company Code already exists
      const compRef = doc(db, 'companies', cleanCompanyId);
      let existingSnap: any;
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
        existingSnap = await Promise.race([getDoc(compRef), timeoutPromise]);
      } catch (err: any) {
        if (err.message === 'timeout' || err.code === 'unavailable' || err.message?.includes('offline')) {
          console.warn('[FirestoreService] Network timeout or offline, bypassing company code existence check.');
        } else {
          throw err;
        }
      }

      if (existingSnap && existingSnap.exists()) {
        return { success: false, message: `Company Code "${cleanCompanyId}" is already registered.`, companyId: cleanCompanyId };
      }

      // 2. Save Company document
      const companyPayload: CompanyTenant = {
        ...company,
        companyId: cleanCompanyId,
        status: company.status || 'ACTIVE',
        licenseTier: company.licenseTier || 'ENTERPRISE',
        enabledModules: enabledModules.length > 0 ? enabledModules : MASTER_APP_MODULES.map(m => m.key),
        adminName: adminInfo.fullName,
        adminEmail: adminInfo.email,
        createdAt: timestamp
      };

      await setDoc(compRef, companyPayload, { merge: true });

      // 3. Save Code mappings for public lookup
      await setDoc(doc(db, 'company_codes', cleanCompanyId), {
        code: cleanCompanyId,
        companyId: cleanCompanyId,
        brandName: company.brandName,
        createdAt: timestamp
      }, { merge: true });

      // 4. Create Default Departments for the company
      const defaultDepts = [
        { id: 'DEPT-OPS', name: 'Operations & Field', code: 'OPS' },
        { id: 'DEPT-SEC', name: 'Security & Guarding', code: 'SEC' },
        { id: 'DEPT-ADMIN', name: 'Administration', code: 'ADMIN' },
        { id: 'DEPT-HR', name: 'Human Resources', code: 'HR' }
      ];

      for (const dept of defaultDepts) {
        await setDoc(doc(db, 'companies', cleanCompanyId, 'departments', dept.id), {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          companyId: cleanCompanyId,
          createdAt: timestamp
        }, { merge: true });
      }

      // 5. Create Default Branch & Primary Site
      await setDoc(doc(db, 'companies', cleanCompanyId, 'branches', 'MAIN'), {
        id: 'MAIN',
        branchId: 'MAIN',
        branchName: `${company.brandName} Head Branch`,
        code: 'MAIN',
        city: company.city || 'Mumbai',
        state: company.state || 'Maharashtra',
        companyId: cleanCompanyId,
        createdAt: timestamp
      }, { merge: true });

      await setDoc(doc(db, 'companies', cleanCompanyId, 'sites', 'SITE-HQ'), {
        id: 'SITE-HQ',
        siteId: 'SITE-HQ',
        siteName: `${company.brandName} Main Site / HQ`,
        branchId: 'MAIN',
        address: company.address || `${company.brandName} Operations Center`,
        city: company.city || 'Mumbai',
        state: company.state || 'Maharashtra',
        country: company.country || 'India',
        companyId: cleanCompanyId,
        status: 'ACTIVE',
        createdAt: timestamp
      }, { merge: true });

      // 6. Create Initial Subscription & Entitlements
      const planCode = company.licenseTier === 'STARTER' ? 'PLAN_STARTER' : company.licenseTier === 'PROFESSIONAL' ? 'PLAN_PRO' : 'PLAN_ENTERPRISE';
      const maxEmployees = company.maxEmployeesAllowed || 1000;
      const subId = `SUB-${cleanCompanyId}`;

      const initialSub = {
        subscriptionId: subId,
        companyId: cleanCompanyId,
        planId: planCode,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: timestamp,
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        employeeLimit: maxEmployees,
        userLimit: company.licenseTier === 'STARTER' ? 2 : company.licenseTier === 'PROFESSIONAL' ? 5 : 25,
        storageLimitMB: company.licenseTier === 'STARTER' ? 1024 : company.licenseTier === 'PROFESSIONAL' ? 5120 : 51200,
        source: 'SYSTEM',
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: createdByUid,
        updatedBy: createdByUid
      };

      await setDoc(doc(db, 'companies', cleanCompanyId, 'subscriptions', subId), initialSub, { merge: true });

      // Save Module Entitlements
      const finalModules = enabledModules.length > 0 ? enabledModules : MASTER_APP_MODULES.map(m => m.key);
      for (const modKey of finalModules) {
        const entId = `${cleanCompanyId}_${modKey}`;
        await setDoc(doc(db, 'companies', cleanCompanyId, 'entitlements', entId), {
          id: entId,
          companyId: cleanCompanyId,
          moduleId: modKey,
          enabled: true,
          source: 'PLAN',
          planId: planCode,
          subscriptionId: subId,
          validFrom: timestamp,
          overriddenBySuperAdmin: false
        }, { merge: true });
      }

      // 7. Create Company Admin user account record
      const adminEmail = adminInfo.email.trim().toLowerCase();
      const adminUid = `ADMIN-${cleanCompanyId}-${Date.now().toString().slice(-4)}`;

      const adminUserDoc = {
        uid: adminUid,
        email: adminEmail,
        fullName: adminInfo.fullName,
        companyId: cleanCompanyId,
        companyName: company.brandName,
        departmentId: 'DEPT-ADMIN',
        departmentName: 'Administration',
        mobileNumber: adminInfo.mobileNumber || '',
        role: 'COMPANY_ADMIN' as UserRole,
        accountStatus: 'ACTIVE' as AccountStatus,
        emailVerified: true,
        companyAdminApproval: 'APPROVED' as ApprovalStatus,
        hrApproval: 'APPROVED' as ApprovalStatus,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // Store in root users collection
      await setDoc(doc(db, 'users', adminUid), adminUserDoc, { merge: true });

      // Store in employees subcollection
      await setDoc(doc(db, 'companies', cleanCompanyId, 'employees', adminUid), {
        id: adminUid,
        employeeId: `ADM-001`,
        companyId: cleanCompanyId,
        firstName: adminInfo.fullName.split(' ')[0] || 'Company',
        lastName: adminInfo.fullName.split(' ').slice(1).join(' ') || 'Admin',
        email: adminEmail,
        contactNumber: adminInfo.mobileNumber || '',
        role: 'COMPANY_ADMIN',
        status: 'ACTIVE',
        departmentId: 'DEPT-ADMIN',
        designation: 'Company Administrator',
        assignedBranchId: 'MAIN',
        assignedRegionId: 'HQ',
        assignedSiteId: 'SITE-HQ',
        createdBy: createdByUid,
        createdAt: timestamp,
        updatedAt: timestamp
      }, { merge: true });

      // 8. Log Audit Event
      await this.logAuditEvent(
        cleanCompanyId,
        createdByUid,
        createdByName,
        'CREATE_COMPANY',
        `Created company ${company.brandName} (${cleanCompanyId}) with Admin ${adminInfo.email} and ${finalModules.length} enabled modules.`
      );

      return {
        success: true,
        message: `Company "${company.brandName}" (${cleanCompanyId}) created successfully. Admin account assigned to ${adminEmail}.`,
        companyId: cleanCompanyId
      };
    } catch (err: any) {
      console.error('[FirestoreService] createCompanyWithAdmin error:', err);
      return { success: false, message: err.message || 'Failed to create company.', companyId: cleanCompanyId };
    }
  }

  // ==========================================
  // LEAVE MANAGEMENT (HRMS) METHODS
  // ==========================================

  /**
   * Subscribe to real-time leave requests for a company
   */
  static subscribeToLeaveRequests(session: UserSession, companyId: string, onData: (leaves: LeaveRequestRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const q = query(
        collection(db, 'companies', companyId, 'leave_requests'),
        orderBy('createdAt', 'desc'),
        limit(200)
      );
      return onSnapshot(q, (snapshot) => {
        const list: LeaveRequestRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({
            id: docSnap.id,
            ...docSnap.data()
          } as LeaveRequestRecord);
        });
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToLeaveRequests error:', err);
        // Fallback to unordered if index is building
        const fallbackCol = collection(db, 'companies', companyId, 'leave_requests');
        onSnapshot(fallbackCol, (snapshot) => {
          const list: LeaveRequestRecord[] = [];
          snapshot.forEach((docSnap) => {
            list.push({
              id: docSnap.id,
              ...docSnap.data()
            } as LeaveRequestRecord);
          });
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          onData(list);
        });
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToLeaveRequests exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Get all leave requests for a company
   */
  static async getLeaveRequests(companyId: string): Promise<LeaveRequestRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'leave_requests');
      const snap = await getDocs(colRef);
      const list: LeaveRequestRecord[] = [];
      snap.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        } as LeaveRequestRecord);
      });
      return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (err) {
      console.error('[FirestoreService] getLeaveRequests error:', err);
      return [];
    }
  }

  /**
   * Submit a new leave application
   */
  static async createLeaveRequest(
    companyId: string,
    request: Omit<LeaveRequestRecord, 'id' | 'createdAt'>
  ): Promise<string | null> {
    try {
      const leaveId = `LEV_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const now = new Date().toISOString();
      const payload: LeaveRequestRecord = {
        ...request,
        id: leaveId,
        companyId,
        status: 'PENDING',
        appliedAt: now,
        createdAt: now,
        updatedAt: now
      };

      const docRef = doc(db, 'companies', companyId, 'leave_requests', leaveId);
      await setDoc(docRef, payload);

      // Also create an audit log
      await this.logAuditEvent(
        companyId,
        request.employeeId,
        request.employeeName,
        'APPLY_LEAVE',
        `Applied for ${request.daysCount} day(s) of ${request.leaveType} leave from ${request.startDate} to ${request.endDate}. Reason: ${request.reason}`
      );

      return leaveId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `companies/${companyId}/leave_requests`);
      return null;
    }
  }

  /**
   * Update leave request status (Approve, Reject, or Cancel)
   */
  static async updateLeaveRequestStatus(
    companyId: string,
    leaveId: string,
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
    reviewer: {
      uid: string;
      name: string;
      reason?: string;
    }
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'leave_requests', leaveId);
      const now = new Date().toISOString();

      const updateData: Partial<LeaveRequestRecord> = {
        status,
        updatedAt: now
      };

      if (status === 'APPROVED') {
        updateData.approvedBy = reviewer.uid;
        updateData.approvedByName = reviewer.name;
        updateData.approvedAt = now;
      } else if (status === 'REJECTED') {
        updateData.rejectedBy = reviewer.uid;
        updateData.rejectedAt = now;
        updateData.rejectionReason = reviewer.reason || 'Not approved';
      }

      await setDoc(docRef, updateData, { merge: true });

      // Log audit
      await this.logAuditEvent(
        companyId,
        reviewer.uid,
        reviewer.name,
        `LEAVE_${status}`,
        `Leave request ${leaveId} was ${status.toLowerCase()} by ${reviewer.name}. ${reviewer.reason ? `Reason: ${reviewer.reason}` : ''}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/leave_requests/${leaveId}`);
      return false;
    }
  }

  /**
   * Get or initialize leave balance for an employee for a given year
   */
  static async getLeaveBalance(
    companyId: string,
    employeeId: string,
    employeeName: string,
    year: number = new Date().getFullYear()
  ): Promise<LeaveBalanceRecord> {
    const balanceId = `${employeeId}_${year}`;
    const defaultBalance: LeaveBalanceRecord = {
      id: balanceId,
      companyId,
      employeeId,
      employeeName,
      year,
      casualLeave: { total: 12, used: 0, remaining: 12 },
      sickLeave: { total: 8, used: 0, remaining: 8 },
      earnedLeave: { total: 15, used: 0, remaining: 15 },
      unpaidLeave: { used: 0 },
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, 'companies', companyId, 'leave_balances', balanceId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as LeaveBalanceRecord;
      } else {
        await setDoc(docRef, defaultBalance);
        return defaultBalance;
      }
    } catch (err) {
      console.warn('[FirestoreService] getLeaveBalance fallback:', err);
      return defaultBalance;
    }
  }

  /**
   * Save or update leave balance
   */
  static async saveLeaveBalance(
    companyId: string,
    balance: LeaveBalanceRecord
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'leave_balances', balance.id);
      await setDoc(docRef, {
        ...balance,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/leave_balances/${balance.id}`);
      return false;
    }
  }

  // ==========================================
  // OVERTIME & LATE CALCULATION (WFM) METHODS
  // ==========================================

  /**
   * Subscribe to Overtime & Late policies for a company
   */
  static subscribeToOvertimePolicies(
    session: UserSession,
    companyId: string,
    onData: (policies: OvertimePolicyRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'overtime_policies');
      return onSnapshot(colRef, (snapshot) => {
        const list: OvertimePolicyRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as OvertimePolicyRecord);
        });
        if (list.length === 0) {
          list.push(AttendanceCalculationEngine.getDefaultPolicy(companyId));
        }
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToOvertimePolicies error:', err);
        onData([AttendanceCalculationEngine.getDefaultPolicy(companyId)]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToOvertimePolicies exception:', err);
      onData([AttendanceCalculationEngine.getDefaultPolicy(companyId)]);
      return () => {};
    }
  }

  /**
   * Get all overtime policies for a company
   */
  static async getOvertimePolicies(companyId: string): Promise<OvertimePolicyRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'overtime_policies');
      const snap = await getDocs(colRef);
      const list: OvertimePolicyRecord[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as OvertimePolicyRecord));
      if (list.length === 0) {
        return [AttendanceCalculationEngine.getDefaultPolicy(companyId)];
      }
      return list;
    } catch (err) {
      console.warn('[FirestoreService] getOvertimePolicies fallback:', err);
      return [AttendanceCalculationEngine.getDefaultPolicy(companyId)];
    }
  }

  /**
   * Get matching overtime policy for a specific site or department
   */
  static async getOvertimePolicy(companyId: string, siteId?: string, departmentId?: string): Promise<OvertimePolicyRecord> {
    try {
      const policies = await this.getOvertimePolicies(companyId);
      if (siteId) {
        const siteSpecific = policies.find(p => p.applicableSiteIds && p.applicableSiteIds.includes(siteId));
        if (siteSpecific) return siteSpecific;
      }
      if (departmentId) {
        const deptSpecific = policies.find(p => p.applicableDepartmentIds && p.applicableDepartmentIds.includes(departmentId));
        if (deptSpecific) return deptSpecific;
      }
      const defaultPol = policies.find(p => p.isDefault);
      return defaultPol || policies[0] || AttendanceCalculationEngine.getDefaultPolicy(companyId);
    } catch (err) {
      return AttendanceCalculationEngine.getDefaultPolicy(companyId);
    }
  }

  /**
   * Save or update an overtime policy
   */
  static async saveOvertimePolicy(
    companyId: string,
    policy: Partial<OvertimePolicyRecord> & { id?: string },
    actorId: string = 'SYSTEM'
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const id = policy.id || `OTPOL_${Date.now()}`;
      const docRef = doc(db, 'companies', companyId, 'overtime_policies', id);

      const payload: OvertimePolicyRecord = {
        ...AttendanceCalculationEngine.getDefaultPolicy(companyId),
        ...policy,
        id,
        companyId,
        updatedAt: now,
        updatedBy: actorId,
        createdAt: policy.createdAt || now,
        createdBy: policy.createdBy || actorId
      };

      await setDoc(docRef, payload, { merge: true });

      await this.logAuditEvent(
        companyId,
        actorId,
        actorId,
        'OVERTIME_POLICY_SAVED',
        `Overtime policy '${payload.policyName}' (${id}) was saved/updated.`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/overtime_policies`);
      return false;
    }
  }

  /**
   * Subscribe to Overtime Requests
   */
  static subscribeToOvertimeRequests(
    session: UserSession,
    companyId: string,
    onData: (requests: OvertimeRequestRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'overtime_requests');
      return onSnapshot(colRef, (snapshot) => {
        const list: OvertimeRequestRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as OvertimeRequestRecord);
        });
        list.sort((a, b) => (b.workDate || '').localeCompare(a.workDate || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToOvertimeRequests error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToOvertimeRequests exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Get all overtime requests
   */
  static async getOvertimeRequests(companyId: string, startDate?: string, endDate?: string): Promise<OvertimeRequestRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'overtime_requests');
      const snap = await getDocs(colRef);
      let list: OvertimeRequestRecord[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as OvertimeRequestRecord));

      if (startDate) list = list.filter(r => r.workDate >= startDate);
      if (endDate) list = list.filter(r => r.workDate <= endDate);

      return list.sort((a, b) => (b.workDate || '').localeCompare(a.workDate || ''));
    } catch (err) {
      console.warn('[FirestoreService] getOvertimeRequests error:', err);
      return [];
    }
  }

  /**
   * Create or synchronize an Overtime Request record for an attendance entry
   */
  static async createOrSyncOvertimeRequest(
    companyId: string,
    request: Omit<OvertimeRequestRecord, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>
  ): Promise<string | null> {
    try {
      const id = `OTREQ_${request.workDate}_${request.employeeId}`;
      const docRef = doc(db, 'companies', companyId, 'overtime_requests', id);
      const now = new Date().toISOString();

      const existingSnap = await getDoc(docRef);
      const isExisting = existingSnap.exists();
      const existingData = isExisting ? (existingSnap.data() as OvertimeRequestRecord) : null;

      // If already manually approved or rejected, preserve status unless explicitly recalculating
      const status = existingData?.status === 'APPROVED' || existingData?.status === 'REJECTED'
        ? existingData.status
        : request.status;

      const payload: OvertimeRequestRecord = {
        ...request,
        id,
        companyId,
        status,
        createdAt: existingData?.createdAt || now,
        updatedAt: now
      };

      await setDoc(docRef, payload, { merge: true });

      // Create in-app notification if pending approval
      if (status === 'PENDING_APPROVAL') {
        await this.createNotification({
          id: `NOTIF_OT_${Date.now()}`,
          title: 'Overtime Approval Pending',
          message: `${request.employeeName} has ${AttendanceCalculationEngine.formatDuration(request.roundedOvertimeMinutes)} of overtime on ${request.workDate} pending approval.`,
          type: 'INFO',
          timestamp: now,
          isRead: false
        });
      }

      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/overtime_requests`);
      return null;
    }
  }

  /**
   * Update Overtime Request status (Approve, Reject, Cancel)
   */
  static async updateOvertimeRequestStatus(
    companyId: string,
    requestId: string,
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
    reviewer: {
      uid: string;
      name: string;
      reason?: string;
      approvedMinutes?: number;
    }
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'overtime_requests', requestId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;

      const otReq = snap.data() as OvertimeRequestRecord;
      const now = new Date().toISOString();
      const approvedMinutes = status === 'APPROVED' 
        ? (reviewer.approvedMinutes !== undefined ? reviewer.approvedMinutes : otReq.roundedOvertimeMinutes)
        : 0;

      const updateData: Partial<OvertimeRequestRecord> = {
        status,
        approvedOvertimeMinutes: approvedMinutes,
        approvedBy: status === 'APPROVED' ? reviewer.uid : undefined,
        approvedByName: status === 'APPROVED' ? reviewer.name : undefined,
        approvedAt: status === 'APPROVED' ? now : undefined,
        rejectionReason: status === 'REJECTED' ? (reviewer.reason || 'Rejected by supervisor') : undefined,
        updatedAt: now
      };

      await setDoc(docRef, updateData, { merge: true });

      // Also update linked Attendance record
      if (otReq.attendanceId) {
        const attRef = doc(db, 'companies', companyId, 'attendance', otReq.attendanceId);
        const attSnap = await getDoc(attRef);
        if (attSnap.exists()) {
          await setDoc(attRef, {
            approvedOvertimeMinutes: approvedMinutes,
            unapprovedOvertimeMinutes: status === 'APPROVED' ? 0 : otReq.roundedOvertimeMinutes,
            overtimeStatus: status,
            updatedAt: now,
            updatedBy: reviewer.uid
          }, { merge: true });
        }
      }

      // Log audit
      await this.logAuditEvent(
        companyId,
        reviewer.uid,
        reviewer.name,
        `OVERTIME_${status}`,
        `Overtime request ${requestId} for ${otReq.employeeName} (${AttendanceCalculationEngine.formatDuration(otReq.roundedOvertimeMinutes)}) was ${status.toLowerCase()} by ${reviewer.name}. ${reviewer.reason ? `Reason: ${reviewer.reason}` : ''}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/overtime_requests/${requestId}`);
      return false;
    }
  }

  /**
   * Subscribe to Overtime Adjustments
   */
  static subscribeToOvertimeAdjustments(
    session: UserSession,
    companyId: string,
    onData: (adjustments: OvertimeAdjustmentRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'overtime_adjustments');
      return onSnapshot(colRef, (snapshot) => {
        const list: OvertimeAdjustmentRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as OvertimeAdjustmentRecord);
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToOvertimeAdjustments error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToOvertimeAdjustments exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Create an Overtime / Attendance Adjustment request
   */
  static async createOvertimeAdjustment(
    companyId: string,
    adjustment: Omit<OvertimeAdjustmentRecord, 'id' | 'companyId' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<string | null> {
    try {
      const id = `OTADJ_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const now = new Date().toISOString();
      const docRef = doc(db, 'companies', companyId, 'overtime_adjustments', id);

      const payload: OvertimeAdjustmentRecord = {
        ...adjustment,
        id,
        companyId,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now
      };

      await setDoc(docRef, payload);

      await this.logAuditEvent(
        companyId,
        adjustment.requestedBy,
        adjustment.requestedByName,
        'OVERTIME_ADJUSTMENT_REQUESTED',
        `Adjustment requested for ${adjustment.employeeName} (${adjustment.adjustmentType}: ${adjustment.originalMinutes}m -> ${adjustment.requestedMinutes}m). Reason: ${adjustment.reason}`
      );

      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `companies/${companyId}/overtime_adjustments`);
      return null;
    }
  }

  /**
   * Resolve an Overtime Adjustment (Approve or Reject)
   */
  static async resolveOvertimeAdjustment(
    companyId: string,
    adjustmentId: string,
    status: 'APPROVED' | 'REJECTED',
    reviewer: {
      uid: string;
      name: string;
      reason?: string;
    }
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'overtime_adjustments', adjustmentId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;

      const adj = snap.data() as OvertimeAdjustmentRecord;
      const now = new Date().toISOString();

      await setDoc(docRef, {
        status,
        approvedBy: reviewer.uid,
        approvedByName: reviewer.name,
        approvedAt: now,
        rejectionReason: status === 'REJECTED' ? reviewer.reason : undefined,
        updatedAt: now
      }, { merge: true });

      // If approved, update underlying Attendance and Overtime request
      if (status === 'APPROVED' && adj.attendanceId) {
        const attRef = doc(db, 'companies', companyId, 'attendance', adj.attendanceId);
        const attSnap = await getDoc(attRef);
        if (attSnap.exists()) {
          const updateField: any = { updatedAt: now, updatedBy: reviewer.uid };
          if (adj.adjustmentType === 'OVERTIME') {
            updateField.overtimeMinutes = adj.requestedMinutes;
            updateField.approvedOvertimeMinutes = adj.requestedMinutes;
            updateField.unapprovedOvertimeMinutes = 0;
            updateField.overtimeStatus = 'APPROVED';
          } else if (adj.adjustmentType === 'LATE') {
            updateField.lateMinutes = adj.requestedMinutes;
          } else if (adj.adjustmentType === 'EARLY_DEPARTURE') {
            updateField.earlyDepartureMinutes = adj.requestedMinutes;
          } else if (adj.adjustmentType === 'WORKED_MINUTES') {
            updateField.workedMinutes = adj.requestedMinutes;
          }
          await setDoc(attRef, updateField, { merge: true });
        }
      }

      await this.logAuditEvent(
        companyId,
        reviewer.uid,
        reviewer.name,
        `OVERTIME_ADJUSTMENT_${status}`,
        `Overtime adjustment ${adjustmentId} for ${adj.employeeName} was ${status.toLowerCase()} by ${reviewer.name}.`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/overtime_adjustments/${adjustmentId}`);
      return false;
    }
  }

  /**
   * Recalculate attendance, late and overtime for a specific attendance record
   */
  static async recalculateAttendanceRecord(
    companyId: string,
    attendanceId: string,
    customPolicy?: OvertimePolicyRecord,
    actorId: string = 'SYSTEM'
  ): Promise<AttendanceCalculationResult | null> {
    try {
      const attRef = doc(db, 'companies', companyId, 'attendance', attendanceId);
      const attSnap = await getDoc(attRef);
      if (!attSnap.exists()) return null;

      const record = attSnap.data() as AttendanceRecord;
      const policy = customPolicy || await this.getOvertimePolicy(companyId, record.siteId);

      // Fetch shift
      let shift: ShiftRecord | undefined;
      if (record.shiftId) {
        const shiftRef = doc(db, 'companies', companyId, 'shifts', record.shiftId);
        const shiftSnap = await getDoc(shiftRef);
        if (shiftSnap.exists()) shift = shiftSnap.data() as ShiftRecord;
      }

      // Fetch any approved leaves for this date
      const leaves = await this.getLeaveRequests(companyId);
      const matchingLeave = leaves.find(l => 
        l.employeeId === record.employeeId && 
        l.status === 'APPROVED' && 
        l.startDate <= record.attendanceDate && 
        l.endDate >= record.attendanceDate
      );

      const calcResult = AttendanceCalculationEngine.calculate({
        workDate: record.attendanceDate,
        shift,
        checkInIso: record.checkIn,
        checkOutIso: record.checkOut,
        policy,
        approvedLeave: matchingLeave,
        siteId: record.siteId
      });

      const now = new Date().toISOString();
      const updates: Partial<AttendanceRecord> = {
        status: calcResult.status,
        lateMinutes: calcResult.lateMinutes,
        earlyDepartureMinutes: calcResult.earlyDepartureMinutes,
        workedMinutes: calcResult.workedMinutes,
        overtimeMinutes: calcResult.calculatedOvertimeMinutes,
        scheduledMinutes: calcResult.scheduledMinutes,
        breakMinutes: calcResult.breakMinutes,
        netWorkedMinutes: calcResult.netWorkedMinutes,
        shortfallMinutes: calcResult.shortfallMinutes,
        approvedOvertimeMinutes: calcResult.approvedOvertimeMinutes,
        unapprovedOvertimeMinutes: calcResult.unapprovedOvertimeMinutes,
        overtimeStatus: calcResult.calculatedOvertimeMinutes > 0 
          ? (calcResult.approvedOvertimeMinutes > 0 ? 'APPROVED' : 'PENDING_APPROVAL')
          : undefined,
        calculationExplanation: calcResult.humanExplanation,
        exceptions: calcResult.exceptions,
        requiresReview: calcResult.requiresReview,
        updatedAt: now,
        updatedBy: actorId
      };

      await setDoc(attRef, updates, { merge: true });

      if (calcResult.calculatedOvertimeMinutes > 0 && shift) {
        await this.createOrSyncOvertimeRequest(companyId, {
          attendanceId,
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          siteId: record.siteId,
          siteName: record.siteName,
          workDate: record.attendanceDate,
          shiftId: shift.id,
          shiftName: shift.shiftName,
          shiftStart: shift.startTime,
          shiftEnd: shift.endTime,
          actualCheckIn: record.checkIn,
          actualCheckOut: record.checkOut,
          scheduledMinutes: calcResult.scheduledMinutes,
          workedMinutes: calcResult.workedMinutes,
          breakMinutes: calcResult.breakMinutes,
          netWorkedMinutes: calcResult.netWorkedMinutes,
          rawOvertimeMinutes: calcResult.rawOvertimeMinutes,
          roundedOvertimeMinutes: calcResult.calculatedOvertimeMinutes,
          approvedOvertimeMinutes: calcResult.approvedOvertimeMinutes,
          status: calcResult.approvedOvertimeMinutes > 0 ? 'APPROVED' : 'PENDING_APPROVAL',
          calculationBreakdown: calcResult.breakdownSteps.join('\n'),
          exceptionFlags: calcResult.exceptions,
          requestedBy: actorId,
          requestedByName: 'System Recalculation',
          requestedAt: now
        });
      }

      return calcResult;
    } catch (err) {
      console.error('[FirestoreService] recalculateAttendanceRecord error:', err);
      return null;
    }
  }

  /**
   * Batch recalculate attendance records within a date range
   */
  static async batchRecalculateAttendance(
    companyId: string,
    startDate: string,
    endDate: string,
    siteId?: string,
    actorId: string = 'SYSTEM'
  ): Promise<{ processed: number; successCount: number; errorsCount: number }> {
    try {
      const attCol = collection(db, 'companies', companyId, 'attendance');
      const snap = await getDocs(attCol);
      let records: AttendanceRecord[] = [];
      snap.forEach(d => records.push({ id: d.id, ...d.data() } as AttendanceRecord));

      records = records.filter(r => r.attendanceDate >= startDate && r.attendanceDate <= endDate);
      if (siteId) {
        records = records.filter(r => r.siteId === siteId);
      }

      let successCount = 0;
      let errorsCount = 0;

      for (const rec of records) {
        const res = await this.recalculateAttendanceRecord(companyId, rec.id, undefined, actorId);
        if (res) successCount++;
        else errorsCount++;
      }

      await this.logAuditEvent(
        companyId,
        actorId,
        actorId,
        'ATTENDANCE_BATCH_RECALCULATED',
        `Batch recalculated ${records.length} attendance records from ${startDate} to ${endDate}. (${successCount} succeeded, ${errorsCount} failed).`
      );

      return { processed: records.length, successCount, errorsCount };
    } catch (err) {
      console.error('[FirestoreService] batchRecalculateAttendance error:', err);
      return { processed: 0, successCount: 0, errorsCount: 0 };
    }
  }


  // ==========================================
  // STATUTORY CONFIGURATIONS
  // ==========================================
  static async getStatutoryConfigs(companyId: string): Promise<import('../types').StatutoryConfigRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'statutory_configs');
      const snap = await getDocs(colRef);
      const list: import('../types').StatutoryConfigRecord[] = [];
      snap.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        } as import('../types').StatutoryConfigRecord);
      });
      return list;
    } catch (err) {
      console.error('[FirestoreService] getStatutoryConfigs error:', err);
      return [];
    }
  }

  static async saveStatutoryConfig(
    companyId: string, 
    config: import('../types').StatutoryConfigRecord,
    actor: { uid: string, name: string }
  ): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'statutory_configs', config.id);
      await setDoc(ref, {
        ...config,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      await this.logAuditEvent(companyId, actor.uid, actor.name, 'STATUTORY_RULE_UPDATED', `Updated ${config.type} statutory rules (Version: ${config.version})`);
      return true;
    } catch (err) {
      console.error('[FirestoreService] saveStatutoryConfig error:', err);
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/statutory_configs`);
      return false;
    }
  }

  // ==========================================
  // PAYROLL & COMPENSATION (HRMS) METHODS
  // ==========================================

  /**
   * Subscribe to Salary Structures
   */
  static subscribeToSalaryStructures(session: UserSession, companyId: string, onData: (structures: SalaryStructureRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'salary_structures');
      return onSnapshot(colRef, (snapshot) => {
        const list: SalaryStructureRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as SalaryStructureRecord);
        });
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToSalaryStructures error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToSalaryStructures exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Get Salary Structures
   */
  static async getSalaryStructures(companyId: string): Promise<SalaryStructureRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'salary_structures');
      const snap = await getDocs(colRef);
      const list: SalaryStructureRecord[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SalaryStructureRecord);
      });
      return list;
    } catch (err) {
      console.error('[FirestoreService] getSalaryStructures error:', err);
      return [];
    }
  }

  /**
   * Save or Create Salary Structure
   */
  static async saveSalaryStructure(
    companyId: string,
    structure: Omit<SalaryStructureRecord, 'id' | 'createdAt'> & { id?: string }
  ): Promise<boolean> {
    try {
      const structId = structure.id || `STR_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const now = new Date().toISOString();
      const payload: SalaryStructureRecord = {
        ...structure,
        id: structId,
        companyId,
        createdAt: structure.id ? (structure as any).createdAt || now : now
      };
      const docRef = doc(db, 'companies', companyId, 'salary_structures', structId);
      await setDoc(docRef, payload, { merge: true });

      
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/salary_structures`);
      return false;
    }
  }

  /**
   * Subscribe to Employee Salary Profiles
   */
  static subscribeToSalaryProfiles(session: UserSession, companyId: string, onData: (profiles: EmployeeSalaryProfileRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'payroll_profiles');
      return onSnapshot(colRef, (snapshot) => {
        const list: EmployeeSalaryProfileRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as EmployeeSalaryProfileRecord);
        });
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToSalaryProfiles error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToSalaryProfiles exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Get all employee salary profiles
   */
  static async getSalaryProfiles(companyId: string): Promise<EmployeeSalaryProfileRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'payroll_profiles');
      const snap = await getDocs(colRef);
      const list: EmployeeSalaryProfileRecord[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as EmployeeSalaryProfileRecord);
      });
      return list;
    } catch (err) {
      console.error('[FirestoreService] getSalaryProfiles error:', err);
      return [];
    }
  }

  /**
   * Save Employee Salary Profile
   */
  static async saveSalaryProfile(
    companyId: string,
    profile: EmployeeSalaryProfileRecord
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'payroll_profiles', profile.id);
      await setDoc(docRef, {
        ...profile,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/payroll_profiles/${profile.id}`);
      return false;
    }
  }

  /**
   * Subscribe to Salary Advances
   */
  static subscribeToSalaryAdvances(session: UserSession, companyId: string, onData: (advances: SalaryAdvanceRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'advances_and_deductions');
      return onSnapshot(colRef, (snapshot) => {
        const list: SalaryAdvanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as SalaryAdvanceRecord);
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToSalaryAdvances error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToSalaryAdvances exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Create Salary Advance Request
   */
  static async createSalaryAdvance(
    companyId: string,
    advance: Omit<SalaryAdvanceRecord, 'id' | 'createdAt' | 'remainingAmount'>
  ): Promise<string | null> {
    try {
      const advanceId = `ADV_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const now = new Date().toISOString();
      const payload: SalaryAdvanceRecord = {
        ...advance,
        id: advanceId,
        companyId,
        remainingAmount: advance.amount,
        createdAt: now
      };
      const docRef = doc(db, 'companies', companyId, 'advances_and_deductions', advanceId);
      await setDoc(docRef, payload);

      await this.logAuditEvent(
        companyId,
        advance.employeeId,
        advance.employeeName,
        'SALARY_ADVANCE_REQUEST',
        `Requested salary advance of ₹${advance.amount}. Reason: ${advance.reason}`
      );

      return advanceId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `companies/${companyId}/advances_and_deductions`);
      return null;
    }
  }

  /**
   * Update Salary Advance status
   */
  static async updateSalaryAdvanceStatus(
    companyId: string,
    advanceId: string,
    status: 'APPROVED' | 'REJECTED' | 'RECOVERED',
    reviewer: { uid: string; name: string }
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'advances_and_deductions', advanceId);
      const updateData: Partial<SalaryAdvanceRecord> = {
        status,
        approvedBy: reviewer.uid,
        approvedByName: reviewer.name
      };
      await setDoc(docRef, updateData, { merge: true });

      await this.logAuditEvent(
        companyId,
        reviewer.uid,
        reviewer.name,
        `SALARY_ADVANCE_${status}`,
        `Advance ${advanceId} marked as ${status} by ${reviewer.name}`
      );
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/advances_and_deductions/${advanceId}`);
      return false;
    }
  }

  /**
   * Get all Payroll Cycles
   */
  static async getPayrollCycles(companyId: string): Promise<PayrollCycleRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'payroll');
      const snap = await getDocs(colRef);
      const list: PayrollCycleRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as PayrollCycleRecord;
        list.push({ ...data, id: docSnap.id });
      });
      list.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
      return list;
    } catch (err) {
      console.error('[FirestoreService] getPayrollCycles error:', err);
      return [];
    }
  }

  /**
   * Get Salary Advances
   */
  static async getSalaryAdvances(companyId: string): Promise<SalaryAdvanceRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'advances_and_deductions');
      const snap = await getDocs(colRef);
      const list: SalaryAdvanceRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as SalaryAdvanceRecord;
        list.push({ ...data, id: docSnap.id });
      });
      list.sort((a, b) => (b.requestedDate || '').localeCompare(a.requestedDate || ''));
      return list;
    } catch (err) {
      console.error('[FirestoreService] getSalaryAdvances error:', err);
      return [];
    }
  }

  /**
   * Subscribe to Payroll Cycles
   */
  static subscribeToPayrollCycles(session: UserSession, companyId: string, onData: (cycles: PayrollCycleRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'payroll');
      return onSnapshot(colRef, (snapshot) => {
        const list: PayrollCycleRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as PayrollCycleRecord;
          list.push({ ...data, id: docSnap.id });
        });
        list.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToPayrollCycles error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToPayrollCycles exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Get salary slips for a specific payroll cycle
   */
  static async getSalarySlips(companyId: string, cycleId: string): Promise<SalarySlipRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'salary_slips');
      const snap = await getDocs(colRef);
      const list: SalarySlipRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as SalarySlipRecord;
        if (data.payrollCycleId === cycleId) {
          list.push({ ...data, id: docSnap.id });
        }
      });
      return list;
    } catch (err) {
      console.error('[FirestoreService] getSalarySlips error:', err);
      return [];
    }
  }

  /**
   * Get salary slips for an employee
   */
  static async getEmployeeSalarySlips(companyId: string, employeeId: string): Promise<SalarySlipRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'salary_slips');
      const snap = await getDocs(colRef);
      const list: SalarySlipRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as SalarySlipRecord;
        if (data.employeeId === employeeId) {
          list.push({ ...data, id: docSnap.id });
        }
      });
      list.sort((a, b) => `${b.year}-${String(b.month).padStart(2, '0')}`.localeCompare(`${a.year}-${String(a.month).padStart(2, '0')}`));
      return list;
    } catch (err) {
      console.error('[FirestoreService] getEmployeeSalarySlips error:', err);
      return [];
    }
  }

  /**
   * Execute Full Monthly Payroll Computation
   */
  static async executeMonthlyPayrollCalculation(
    companyId: string,
    month: number,
    year: number,
    actor: { uid: string; name: string }
  ): Promise<{ success: boolean; cycleId: string; totalSlips: number }> {
    try {
      const cycleId = `${year}-${String(month).padStart(2, '0')}`;
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const cycleLabel = `${monthNames[month - 1]} ${year}`;
      const daysInMonth = new Date(year, month, 0).getDate();

      // 1. Fetch Employees, Profiles, Structures, Advances, Leaves
      const employees = await this.getEmployees(companyId);
      const profiles = await this.getSalaryProfiles(companyId);
      const structures = await this.getSalaryStructures(companyId);
      const leaves = await this.getLeaveRequests(companyId);
      const statutoryConfigs = await this.getStatutoryConfigs(companyId);
      const colAdv = collection(db, 'companies', companyId, 'advances_and_deductions');
      const snapAdv = await getDocs(colAdv);
      const advances: SalaryAdvanceRecord[] = [];
      snapAdv.forEach(d => advances.push({ id: d.id, ...d.data() } as SalaryAdvanceRecord));

      // Default structure if none exists
      let defaultStruct = structures[0];
      if (!defaultStruct) {
        defaultStruct = {
          id: 'DEFAULT_STANDARD',
          companyId,
          name: 'Standard Security & Facility Structure',
          code: 'STD_SEC',
          basicPercentage: 50,
          hraPercentage: 20,
          daPercentage: 15,
          conveyanceAllowance: 1600,
          medicalAllowance: 1250,
          specialAllowance: 0,
          pfApplicable: true,
          esicApplicable: true,
          ptApplicable: true,
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'companies', companyId, 'salary_structures', defaultStruct.id), defaultStruct);
      }

      let totalGrossPay = 0;
      let totalDeductions = 0;
      let totalNetPay = 0;
      let slipCount = 0;

      const attendancesCol = collection(db, 'companies', companyId, 'attendance');
      const attSnap = await getDocs(attendancesCol);
const allAttendances: any[] = [];
      
      const advancesSnap = await getDocs(query(collection(db, 'companies', companyId, 'advances_and_deductions'), where('status', '==', 'APPROVED')));

      attSnap.forEach(d => {
        const att = d.data();
        if (att.attendanceDate && att.attendanceDate.startsWith(`${year}-${String(month).padStart(2, '0')}`)) {
          allAttendances.push(att);
        }
      });

      const { PayrollEngine } = await import('./payrollEngine');

      const allErrors: string[] = [];

      // 2. Compute slips for active employees
      for (const emp of employees) {
        if (emp.status === 'TERMINATED') continue;

        // Profile or fallback
        const empProfile = profiles.find(p => p.employeeId === emp.id || p.id === emp.id) || {
          id: emp.id,
          companyId,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          structureId: defaultStruct.id,
          monthlyCtc: 21500,
          baseMonthlySalary: 18000,
          bankName: 'State Bank of India',
          accountNumber: '••••••••' + (emp.id.slice(-4) || '1234'),
          ifscCode: 'SBIN0001234',
          panNumber: 'ABCDE1234F',
          paymentMode: 'BANK_TRANSFER' as const,
          updatedAt: new Date().toISOString()
        };

        const struct = structures.find(s => s.id === empProfile.structureId) || defaultStruct;

        // Calculate leave deductions (Loss of Pay / Unpaid)
        
        
        const empAttendances = allAttendances.filter(a => a.employeeId === emp.id);
        const empAdvance = advances.find((a: any) => a.employeeId === emp.id && a.remainingAmount > 0) as any;
        const advanceDeduction = empAdvance ? Math.min(empAdvance.monthlyDeductionAmount || 0, empAdvance.remainingAmount || 0) : 0;

        const calc = PayrollEngine.calculate(month, year, emp as any, empProfile as any, struct as any, statutoryConfigs, leaves, empAttendances as any, advanceDeduction);
        
        if (calc.errors && calc.errors.length > 0) {
          allErrors.push(`[${emp.firstName} ${emp.lastName}] ${calc.errors.join(', ')}`);
        }
        if (calc.netPay < 0) {
          allErrors.push(`[${emp.firstName} ${emp.lastName}] Negative net pay (${calc.netPay})`);
        }


        const slipId = `SLIP_${cycleId}_${emp.id}`;
        const slipPayload: SalarySlipRecord = {
          id: slipId,
          companyId,
          payrollCycleId: cycleId,
          month,
          year,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeCode: (emp as any).employeeCode || emp.id,
          departmentName: emp.departmentId || 'Operations',
          designation: emp.designation || 'Security Officer',
          dateOfJoining: (emp as any).joiningDate || (emp as any).createdAt,
          bankName: empProfile.bankName,
          accountNumber: empProfile.accountNumber,
          ifscCode: empProfile.ifscCode,
          panNumber: empProfile.panNumber,
          uanNumber: empProfile.uanNumber,
          pfNumber: (empProfile as any).pfNumber || empProfile.uanNumber,
          esicNumber: (empProfile as any).esicNumber,
          totalMonthDays: daysInMonth,
          workedDays: calc.payableDays,
          paidLeaveDays: daysInMonth - calc.payableDays,
          lopDays: calc.lopDays,
          payableDays: calc.payableDays,
          earnings: {
            basic: calc.earnings.basic,
            hra: calc.earnings.hra,
            da: calc.earnings.da,
            conveyance: calc.earnings.conveyance,
            medical: calc.earnings.medical,
            specialAllowance: calc.earnings.specialAllowance,
            overtimePay: calc.earnings.overtimePay,
            bonus: 0,
            totalGross: calc.totalGross
          },
          deductions: {
            pf: calc.deductions.pf,
            esic: calc.deductions.esic,
            pt: calc.deductions.pt,
            tds: calc.deductions.tds,
            advanceDeduction: calc.deductions.advanceDeduction,
            lopDeduction: calc.deductions.lopDeduction,
            otherDeductions: 0,
            totalDeductions: calc.totalDeductions
          },
          netPay: calc.netPay,
          netPayInWords: numberToIndianRupeesWords(calc.netPay),
          status: 'GENERATED',
          isPublished: false,
          downloadCount: 0,
          verificationHash: `LSM-PAY-${cycleId}-${emp.id.slice(-4).toUpperCase()}`,
          generatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        // Write slip to Firestore
        const slipDocRef = doc(db, 'companies', companyId, 'salary_slips', slipId);
        await setDoc(slipDocRef, slipPayload);

        // Update advance remaining if any
        if (empAdvance && advanceDeduction > 0) {
          const newRemaining = Math.max(0, empAdvance.remainingAmount - advanceDeduction);
          await setDoc(doc(db, 'companies', companyId, 'advances_and_deductions', empAdvance.id), {
            remainingAmount: newRemaining,
            status: newRemaining === 0 ? 'RECOVERED' : 'APPROVED'
          }, { merge: true });
        }

        totalGrossPay += calc.totalGross;
        totalDeductions += calc.totalDeductions;
        totalNetPay += calc.netPay;
        slipCount++;
      }

      // Save Cycle Record
      const cyclePayload: import('../types').PayrollCycleRecord & { validationErrors?: string[] } = {
        id: cycleId,
        companyId,
        month,
        year,
        cycleLabel,
        totalEmployees: slipCount,
        totalGrossPay,
        totalDeductions,
        totalNetPay,
        status: allErrors.length > 0 ? 'DRAFT' : 'CALCULATED',
        validationErrors: allErrors,
        processedAt: new Date().toISOString(),
        processedBy: actor.uid,
        processedByName: actor.name,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'companies', companyId, 'payroll', cycleId), cyclePayload);

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'PAYROLL_CALCULATED',
        `Processed monthly payroll for ${cycleLabel}. Total Net: ₹${totalNetPay.toLocaleString('en-IN')}, Employees: ${slipCount}`
      );

      return { success: true, cycleId, totalSlips: slipCount };
    } catch (err) {
      console.error('[FirestoreService] executeMonthlyPayrollCalculation error:', err);
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/payroll`);
      return { success: false, cycleId: '', totalSlips: 0 };
    }
  }

  /**
   * Update Payroll Cycle Status (e.g. APPROVED or DISBURSED)
   */
  static async updatePayrollCycleStatus(
    companyId: string,
    cycleId: string,
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'LOCKED' | 'CANCELLED' | 'DISBURSED',
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const updateData: Partial<PayrollCycleRecord> = {
        status
      };
      if (status === 'APPROVED') {
        updateData.approvedAt = now;
      } else if (status === 'LOCKED') {
        updateData.lockedAt = now;
      } else if (status === 'DISBURSED') {
        updateData.disbursedAt = now;
      }

      await setDoc(doc(db, 'companies', companyId, 'payroll', cycleId), updateData, { merge: true });

      // Also update all slips of this cycle
      const slips = await this.getSalarySlips(companyId, cycleId);
      for (const slip of slips) {
        await setDoc(doc(db, 'companies', companyId, 'salary_slips', slip.id), {
          status: status === 'DISBURSED' ? 'PAID' : 'APPROVED'
        }, { merge: true });
      }

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        `PAYROLL_${status}`,
        `Payroll cycle ${cycleId} was marked as ${status} by ${actor.name}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/payroll/${cycleId}`);
      return false;
    }
  }

  /**
   * Publish Salary Slips to Employees
   */
  static async publishSalarySlips(
    companyId: string,
    cycleId: string,
    slipIds: string[],
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      for (const slipId of slipIds) {
        await setDoc(doc(db, 'companies', companyId, 'salary_slips', slipId), {
          isPublished: true,
          status: 'PUBLISHED',
          publishedAt: now,
          publishedBy: actor.uid
        }, { merge: true });
      }

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'PAYSLIP_PUBLISHED',
        `Published ${slipIds.length} payslips for payroll cycle ${cycleId} by ${actor.name}`
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] publishSalarySlips error:', err);
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/salary_slips`);
      return false;
    }
  }

  /**
   * Unpublish / Revert Salary Slips to Draft
   */
  static async unpublishSalarySlips(
    companyId: string,
    cycleId: string,
    slipIds: string[],
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    try {
      for (const slipId of slipIds) {
        await setDoc(doc(db, 'companies', companyId, 'salary_slips', slipId), {
          isPublished: false,
          status: 'APPROVED'
        }, { merge: true });
      }

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'PAYSLIP_UNPUBLISHED',
        `Unpublished ${slipIds.length} payslips for payroll cycle ${cycleId} by ${actor.name}`
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] unpublishSalarySlips error:', err);
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/salary_slips`);
      return false;
    }
  }

  /**
   * Log Payslip Download Audit Event and increment counter
   */
  static async logPayslipDownload(
    companyId: string,
    slipId: string,
    actor: { uid: string; name: string }
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      const slipRef = doc(db, 'companies', companyId, 'salary_slips', slipId);
      const snap = await getDoc(slipRef);
      if (snap.exists()) {
        const currentCount = snap.data()?.downloadCount || 0;
        await setDoc(slipRef, {
          downloadCount: currentCount + 1,
          lastDownloadedAt: now
        }, { merge: true });
      }

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'PAYSLIP_DOWNLOADED',
        `Payslip ${slipId} downloaded by ${actor.name}`
      );
    } catch (err) {
      console.warn('[FirestoreService] logPayslipDownload warning:', err);
    }
  }

  /**
   * ============================================================
   * NEFT / RTGS BANK PAYMENT BATCH & DISBURSEMENT METHODS
   * ============================================================
   */

  /**
   * Real-time subscription to bank payment batches for a company
   */
  static subscribePaymentBatches(
    companyId: string,
    onData: (batches: PaymentBatchRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'bank_payment_batches');
      return onSnapshot(colRef, (snapshot) => {
        const list: PaymentBatchRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as PaymentBatchRecord;
          list.push({ ...data, id: docSnap.id });
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onData(list);
      }, (err) => {
        console.error('[FirestoreService] subscribePaymentBatches snapshot error:', err);
        handleFirestoreError(err, OperationType.LIST, `companies/${companyId}/bank_payment_batches`);
      });
    } catch (err) {
      console.error('[FirestoreService] subscribePaymentBatches error:', err);
      return () => {};
    }
  }

  /**
   * Get all bank payment batches for a company
   */
  static async getPaymentBatches(companyId: string): Promise<PaymentBatchRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'bank_payment_batches');
      const snap = await getDocs(colRef);
      const list: PaymentBatchRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as PaymentBatchRecord;
        list.push({ ...data, id: docSnap.id });
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return list;
    } catch (err) {
      console.error('[FirestoreService] getPaymentBatches error:', err);
      return [];
    }
  }

  /**
   * Get a single bank payment batch
   */
  static async getPaymentBatch(companyId: string, batchId: string): Promise<PaymentBatchRecord | null> {
    try {
      const docRef = doc(db, 'companies', companyId, 'bank_payment_batches', batchId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return { ...(snap.data() as PaymentBatchRecord), id: snap.id };
    } catch (err) {
      console.error('[FirestoreService] getPaymentBatch error:', err);
      return null;
    }
  }

  /**
   * Create a new Bank Payment Batch with Idempotency and Duplicate Payment Validation
   */
  static async createPaymentBatch(
    companyId: string,
    batchPayload: PaymentBatchRecord,
    actor: { uid: string; name: string }
  ): Promise<{ success: boolean; batchId: string; error?: string }> {
    try {
      if (!companyId || !batchPayload.payrollCycleId) {
        return { success: false, batchId: '', error: 'Missing company ID or Payroll Cycle reference' };
      }

      // 1. Verify Payroll Cycle Status is APPROVED or LOCKED
      const cycleRef = doc(db, 'companies', companyId, 'payroll', batchPayload.payrollCycleId);
      const cycleSnap = await getDoc(cycleRef);
      if (!cycleSnap.exists()) {
        return { success: false, batchId: '', error: 'Referenced Payroll Cycle does not exist' };
      }
      const cycleData = cycleSnap.data() as PayrollCycleRecord;
      if (!['APPROVED', 'LOCKED', 'DISBURSED'].includes(cycleData.status)) {
        return { 
          success: false, 
          batchId: '', 
          error: `Payroll cycle is currently in '${cycleData.status}' status. Bank Payment batch can only be generated from APPROVED or LOCKED payroll.` 
        };
      }

      // 2. Duplicate Payment / Idempotency Check
      const existingBatches = await this.getPaymentBatches(companyId);
      const activeBatches = existingBatches.filter(b => 
        b.payrollCycleId === batchPayload.payrollCycleId && 
        b.status !== 'CANCELLED' && 
        b.id !== batchPayload.id
      );

      const alreadyExportedSlipIds = new Set<string>();
      activeBatches.forEach(b => {
        b.items.filter(item => item.validationStatus === 'VALID').forEach(item => {
          alreadyExportedSlipIds.add(item.salarySlipId);
        });
      });

      const duplicateSlips = batchPayload.items.filter(i => alreadyExportedSlipIds.has(i.salarySlipId));
      if (duplicateSlips.length > 0 && batchPayload.items.length === duplicateSlips.length) {
        return {
          success: false,
          batchId: '',
          error: `Duplicate Payment Blocked: All ${duplicateSlips.length} employees in this cycle are already included in active payment batches.`
        };
      }

      // 3. Batch Total Integrity Check
      const calculatedSum = batchPayload.items
        .filter(i => i.validationStatus === 'VALID')
        .reduce((sum, i) => sum + (i.netPay || 0), 0);

      if (Math.abs(calculatedSum - batchPayload.totalAmount) > 0.01) {
        return {
          success: false,
          batchId: '',
          error: `Batch total mismatch: Stored total (₹${batchPayload.totalAmount}) does not equal sum of valid items (₹${calculatedSum})`
        };
      }

      // 4. Save to Firestore
      const batchDocRef = doc(db, 'companies', companyId, 'bank_payment_batches', batchPayload.id);
      await setDoc(batchDocRef, batchPayload);

      // 5. Audit Logging & Notification
      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'BANK_PAYMENT_BATCH_CREATED',
        `Created ${batchPayload.paymentMethod} bank payment batch ${batchPayload.batchNumber} for ${batchPayload.payrollCycleLabel}. Total: ₹${batchPayload.totalAmount.toLocaleString('en-IN')}, Beneficiaries: ${batchPayload.validBeneficiaryCount}`
      );

      await this.createNotification({
        id: `NOTIF_BATCH_${batchPayload.id}`,
        title: `Bank Payment Batch Created: ${batchPayload.batchNumber}`,
        message: `Payment batch for ${batchPayload.payrollCycleLabel} (₹${batchPayload.totalAmount.toLocaleString('en-IN')}) is ready for finance review.`,
        type: 'INFO',
        timestamp: new Date().toISOString(),
        isRead: false,
        actionRoute: 'PAYROLL_COMPENSATION'
      });

      return { success: true, batchId: batchPayload.id };
    } catch (err: any) {
      console.error('[FirestoreService] createPaymentBatch error:', err);
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/bank_payment_batches`);
      return { success: false, batchId: '', error: err?.message || 'Failed to create payment batch' };
    }
  }

  /**
   * Approve a Bank Payment Batch
   */
  static async approvePaymentBatch(
    companyId: string,
    batchId: string,
    actor: { uid: string; name: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const batchRef = doc(db, 'companies', companyId, 'bank_payment_batches', batchId);
      const snap = await getDoc(batchRef);
      if (!snap.exists()) {
        return { success: false, error: 'Payment batch not found' };
      }

      const batch = snap.data() as PaymentBatchRecord;
      if (batch.status === 'APPROVED' || batch.status === 'EXPORTED') {
        return { success: true };
      }
      if (batch.status === 'CANCELLED') {
        return { success: false, error: 'Cannot approve a cancelled payment batch' };
      }

      // Check valid beneficiaries count > 0
      if (batch.validBeneficiaryCount <= 0 || batch.totalAmount <= 0) {
        return { success: false, error: 'Cannot approve batch with 0 valid beneficiaries or zero total amount' };
      }

      const now = new Date().toISOString();
      await setDoc(batchRef, {
        status: 'APPROVED',
        approvedBy: actor.uid,
        approvedByName: actor.name,
        approvedAt: now,
        updatedAt: now
      }, { merge: true });

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'BANK_PAYMENT_APPROVED',
        `Approved bank payment batch ${batch.batchNumber} (₹${batch.totalAmount.toLocaleString('en-IN')}) for export by ${actor.name}`
      );

      await this.createNotification({
        id: `NOTIF_APPV_BATCH_${batch.id}`,
        title: `Payment Batch Approved: ${batch.batchNumber}`,
        message: `Batch ${batch.batchNumber} has been approved by ${actor.name} and is ready for bank export.`,
        type: 'SUCCESS',
        timestamp: now,
        isRead: false,
        actionRoute: 'PAYROLL_COMPENSATION'
      });

      return { success: true };
    } catch (err: any) {
      console.error('[FirestoreService] approvePaymentBatch error:', err);
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/bank_payment_batches/${batchId}`);
      return { success: false, error: err?.message || 'Failed to approve payment batch' };
    }
  }

  /**
   * Record Bank Payment Batch Export event
   */
  static async recordPaymentBatchExport(
    companyId: string,
    batchId: string,
    format: BankExportFormat,
    fileName: string,
    actor: { uid: string; name: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const batchRef = doc(db, 'companies', companyId, 'bank_payment_batches', batchId);
      const snap = await getDoc(batchRef);
      if (!snap.exists()) {
        return { success: false, error: 'Payment batch not found' };
      }

      const batch = snap.data() as PaymentBatchRecord;
      const now = new Date().toISOString();
      const currentCount = batch.exportCount || 0;
      const currentVersion = batch.exportVersion || 1;

      await setDoc(batchRef, {
        status: 'EXPORTED',
        exportedBy: actor.uid,
        exportedByName: actor.name,
        exportedAt: now,
        exportCount: currentCount + 1,
        exportVersion: currentCount > 0 ? currentVersion + 1 : currentVersion,
        lastExportFormat: format,
        lastExportFileName: fileName,
        updatedAt: now
      }, { merge: true });

      // If all slips are exported, optionally mark cycle as DISBURSED or keep locked
      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'BANK_PAYMENT_EXPORTED',
        `Exported bank batch ${batch.batchNumber} format [${format}] file [${fileName}] containing ${batch.validBeneficiaryCount} records totaling ₹${batch.totalAmount.toLocaleString('en-IN')}`
      );

      return { success: true };
    } catch (err: any) {
      console.error('[FirestoreService] recordPaymentBatchExport error:', err);
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/bank_payment_batches/${batchId}`);
      return { success: false, error: err?.message || 'Failed to record batch export' };
    }
  }

  /**
   * Cancel a Bank Payment Batch
   */
  static async cancelPaymentBatch(
    companyId: string,
    batchId: string,
    reason: string,
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    try {
      const batchRef = doc(db, 'companies', companyId, 'bank_payment_batches', batchId);
      const now = new Date().toISOString();

      await setDoc(batchRef, {
        status: 'CANCELLED',
        cancellationReason: reason,
        updatedAt: now
      }, { merge: true });

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'BANK_PAYMENT_CANCELLED',
        `Payment batch ${batchId} was cancelled by ${actor.name}. Reason: ${reason}`
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] cancelPaymentBatch error:', err);
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/bank_payment_batches/${batchId}`);
      return false;
    }
  }

  /**
   * Real-time subscription to Company Bank Accounts
   */
  static subscribeCompanyBankAccounts(
    companyId: string,
    onData: (accounts: CompanyBankAccountRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'company_bank_accounts');
      return onSnapshot(colRef, (snapshot) => {
        const list: CompanyBankAccountRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as CompanyBankAccountRecord;
          list.push({ ...data, id: docSnap.id });
        });
        list.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
        onData(list);
      }, (err) => {
        console.error('[FirestoreService] subscribeCompanyBankAccounts snapshot error:', err);
      });
    } catch (err) {
      console.error('[FirestoreService] subscribeCompanyBankAccounts error:', err);
      return () => {};
    }
  }

  /**
   * Get all Company Bank Accounts
   */
  static async getCompanyBankAccounts(companyId: string): Promise<CompanyBankAccountRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'company_bank_accounts');
      const snap = await getDocs(colRef);
      const list: CompanyBankAccountRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as CompanyBankAccountRecord;
        list.push({ ...data, id: docSnap.id });
      });
      return list;
    } catch (err) {
      console.error('[FirestoreService] getCompanyBankAccounts error:', err);
      return [];
    }
  }

  /**
   * Save or Update a Company Bank Account
   */
  static async saveCompanyBankAccount(
    companyId: string,
    bankData: Partial<CompanyBankAccountRecord>,
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    try {
      const id = bankData.id || `BANK_${Date.now()}`;
      const now = new Date().toISOString();

      const { BankExportEngine } = await import('./bankExportEngine');
      const masked = BankExportEngine.maskAccountNumber(bankData.accountNumber);

      const payload: CompanyBankAccountRecord = {
        id,
        companyId,
        bankName: bankData.bankName || 'Company Bank',
        accountHolderName: bankData.accountHolderName || 'Company Legal Entity',
        accountNumber: bankData.accountNumber?.trim() || '',
        maskedAccountNumber: masked,
        ifscCode: (bankData.ifscCode || '').trim().toUpperCase(),
        branchName: bankData.branchName || '',
        accountType: bankData.accountType || 'CURRENT',
        isDefault: bankData.isDefault ?? true,
        status: bankData.status || 'ACTIVE',
        paymentReferencePrefix: bankData.paymentReferencePrefix || 'SAL',
        createdAt: bankData.createdAt || now,
        updatedAt: now,
        createdBy: bankData.createdBy || actor.uid
      };

      const docRef = doc(db, 'companies', companyId, 'company_bank_accounts', id);
      await setDoc(docRef, payload, { merge: true });

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'COMPANY_BANK_ACCOUNT_UPDATED',
        `Configured company disbursement bank account: ${payload.bankName} (${masked}) by ${actor.name}`
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] saveCompanyBankAccount error:', err);
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/company_bank_accounts`);
      return false;
    }
  }

  /**
   * ============================================================
   * INVENTORY & STOCK MANAGEMENT METHODS
   * ============================================================
   */

  /**
   * Real-time subscription to inventory items for a company
   */
  static subscribeToInventoryItems(session: UserSession, companyId: string, onData: (items: InventoryItemRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'inventory_items');
      return onSnapshot(colRef, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItemRecord));
        list.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToInventoryItems error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToInventoryItems exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Fetch all inventory items for a company
   */
  static async getInventoryItems(companyId: string): Promise<InventoryItemRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'inventory_items');
      const snap = await getDocs(colRef);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItemRecord));
      return list.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || ''));
    } catch (err) {
      console.error('[FirestoreService] getInventoryItems error:', err);
      return [];
    }
  }

  /**
   * Save or Update an Inventory Item
   */
  static async saveInventoryItem(
    companyId: string,
    item: InventoryItemRecord,
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const path = `companies/${companyId}/inventory_items/${item.id}`;
    try {
      const now = new Date().toISOString();
      const currentStock = Number(item.currentStock) || 0;
      const minThreshold = Number(item.minStockThreshold) || 5;

      let calculatedStatus: InventoryItemRecord['status'] = item.status;
      if (item.status !== 'DISCONTINUED') {
        if (currentStock <= 0) {
          calculatedStatus = 'OUT_OF_STOCK';
        } else if (currentStock <= minThreshold) {
          calculatedStatus = 'LOW_STOCK';
        } else {
          calculatedStatus = 'IN_STOCK';
        }
      }

      const payload: InventoryItemRecord = {
        ...item,
        companyId,
        currentStock,
        minStockThreshold: minThreshold,
        unitCost: Number(item.unitCost) || 0,
        status: calculatedStatus,
        createdAt: item.createdAt || now,
        updatedAt: now
      };

      const docRef = doc(db, 'companies', companyId, 'inventory_items', item.id);
      await setDoc(docRef, payload, { merge: true });

      

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'INVENTORY_ITEM_SAVED',
        `Saved item: ${item.itemName} (${item.itemCode}), Stock: ${currentStock} ${item.unit}, Status: ${calculatedStatus}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Delete an Inventory Item
   */
  static async deleteInventoryItem(
    companyId: string,
    itemId: string,
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const path = `companies/${companyId}/inventory_items/${itemId}`;
    try {
      const docRef = doc(db, 'companies', companyId, 'inventory_items', itemId);
      await deleteDoc(docRef);

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'INVENTORY_ITEM_DELETED',
        `Deleted inventory item ID: ${itemId}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return false;
    }
  }

  /**
   * Real-time subscription to stock transactions for a company
   */
  static subscribeToStockTransactions(session: UserSession, companyId: string, onData: (txs: StockTransactionRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'inventory_transactions');
      return onSnapshot(colRef, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as StockTransactionRecord));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToStockTransactions error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToStockTransactions exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Record Stock Transaction and atomically adjust stock level of item
   */
  static async recordStockTransaction(
    companyId: string,
    transaction: Omit<StockTransactionRecord, 'id' | 'createdAt' | 'previousStock' | 'newStock'>,
    actor: { uid: string; name: string }
  ): Promise<{ success: boolean; transactionId: string; newStock: number }> {
    const txId = `STX-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();
    try {
      // 1. Fetch current item details
      const itemRef = doc(db, 'companies', companyId, 'inventory_items', transaction.itemId);
      const itemSnap = await getDoc(itemRef);

      if (!itemSnap.exists()) {
        throw new Error(`Inventory item with ID ${transaction.itemId} not found.`);
      }

      const itemData = itemSnap.data() as InventoryItemRecord;
      const prevStock = Number(itemData.currentStock) || 0;
      const qty = Number(transaction.quantity) || 0;

      let newStock = prevStock;
      switch (transaction.transactionType) {
        case 'PURCHASE_INWARD':
        case 'RETURN_FROM_EMPLOYEE':
          newStock = prevStock + qty;
          break;
        case 'ISSUE_TO_EMPLOYEE':
        case 'DAMAGE_SCRAP':
          if (prevStock < qty) {
            throw new Error(`Insufficient stock for ${itemData.itemName}. Available: ${prevStock}, Requested: ${qty}`);
          }
          newStock = prevStock - qty;
          break;
        case 'SITE_TRANSFER':
          // Reduces from source site stock
          if (prevStock < qty) {
            throw new Error(`Insufficient stock for transfer. Available: ${prevStock}, Requested: ${qty}`);
          }
          newStock = prevStock - qty;
          break;
        case 'AUDIT_ADJUSTMENT':
          // Replaces with audited physical count
          newStock = qty;
          break;
        default:
          newStock = prevStock;
      }

      // Determine updated status
      let newStatus: InventoryItemRecord['status'] = itemData.status;
      if (newStatus !== 'DISCONTINUED') {
        if (newStock <= 0) {
          newStatus = 'OUT_OF_STOCK';
        } else if (newStock <= (itemData.minStockThreshold || 5)) {
          newStatus = 'LOW_STOCK';
        } else {
          newStatus = 'IN_STOCK';
        }
      }

      // Update Inventory Item doc
      await setDoc(itemRef, {
        currentStock: newStock,
        status: newStatus,
        updatedAt: now
      }, { merge: true });

      // Save Transaction Document
      const txPayload: StockTransactionRecord = {
        ...transaction,
        id: txId,
        companyId,
        previousStock: prevStock,
        newStock,
        performedByUid: actor.uid,
        performedByName: actor.name,
        createdAt: now
      };

      const txRef = doc(db, 'companies', companyId, 'inventory_transactions', txId);
      await setDoc(txRef, txPayload);

      // Audit Log
      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        `STOCK_${transaction.transactionType}`,
        `Item: ${itemData.itemName} (${itemData.itemCode}), Type: ${transaction.transactionType}, Qty: ${qty}, Stock: ${prevStock} -> ${newStock}`
      );

      return { success: true, transactionId: txId, newStock };
    } catch (err: any) {
      console.error('[FirestoreService] recordStockTransaction error:', err);
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/inventory_transactions/${txId}`);
      return { success: false, transactionId: '', newStock: 0 };
    }
  }

  /**
   * Real-time subscription to vendors for a company
   */
  static subscribeToInventoryVendors(
    userSession: UserSession,
    companyId: string,
    onData: (vendors: InventoryVendorRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'vendors');
      return onSnapshot(colRef, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryVendorRecord));
        list.sort((a, b) => (a.vendorName || '').localeCompare(b.vendorName || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToInventoryVendors error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToInventoryVendors exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Save or Update a Vendor
   */
  static async saveInventoryVendor(
    companyId: string,
    vendor: InventoryVendorRecord,
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const path = `companies/${companyId}/vendors/${vendor.id}`;
    try {
      const now = new Date().toISOString();
      const payload: InventoryVendorRecord = {
        ...vendor,
        companyId,
        createdAt: vendor.createdAt || now,
        updatedAt: now
      };

      const docRef = doc(db, 'companies', companyId, 'vendors', vendor.id);
      await setDoc(docRef, payload, { merge: true });

      

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'VENDOR_SAVED',
        `Saved vendor: ${vendor.vendorName} (${vendor.vendorCode}), Contact: ${vendor.contactPerson}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Delete a Vendor
   */
  static async deleteInventoryVendor(
    companyId: string,
    vendorId: string,
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const path = `companies/${companyId}/vendors/${vendorId}`;
    try {
      const docRef = doc(db, 'companies', companyId, 'vendors', vendorId);
      await deleteDoc(docRef);

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'VENDOR_DELETED',
        `Deleted vendor ID: ${vendorId}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return false;
    }
  }

  // ==========================================
  // ASSET TRACKING & LIFECYCLE MANAGEMENT
  // ==========================================

  /**
   * Real-time subscription to Company Assets
   */
  static subscribeToAssets(session: UserSession, companyId: string, onData: (assets: AssetRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'assets');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'ASSETS'));
      return onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AssetRecord));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToAssets error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToAssets exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Save or Update an Asset Record
   */
  static async saveAsset(
    companyId: string,
    asset: AssetRecord,
    actor: { uid: string; name: string },
    oldAsset?: AssetRecord
  ): Promise<boolean> {
    const path = `companies/${companyId}/assets/${asset.id}`;
    try {
      const now = new Date().toISOString();
      const payload: AssetRecord = {
        ...asset,
        companyId,
        createdAt: asset.createdAt || now,
        updatedAt: now
      };

      const docRef = doc(db, 'companies', companyId, 'assets', asset.id);
      await setDoc(docRef, payload, { merge: true });

      // If site or assignee changed, create a SITE_TRANSFER or CHECK_OUT movement automatically
      if (oldAsset && (oldAsset.siteId !== asset.siteId || oldAsset.assignedEmployeeId !== asset.assignedEmployeeId)) {
        const movementId = `MOV-${Date.now()}`;
        const action = oldAsset.siteId !== asset.siteId ? 'SITE_TRANSFER' : 'CHECK_OUT';
        const movementPayload: AssetMovementHistoryRecord = {
          id: movementId,
          companyId,
          assetId: asset.id,
          assetCode: asset.assetCode,
          assetName: asset.assetName,
          action,
          employeeId: asset.assignedEmployeeId,
          employeeName: asset.assignedEmployeeName,
          siteId: asset.siteId,
          siteName: asset.siteName,
          conditionAtAction: asset.condition,
          performedByUid: actor.uid,
          performedByName: actor.name,
          remarks: 'Updated via Asset Edit',
          timestamp: now
        };
        await setDoc(doc(db, 'companies', companyId, 'asset_movements', movementId), movementPayload);
      }

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'ASSET_SAVED',
        `Saved asset: ${asset.assetName} (${asset.assetCode}), Category: ${asset.category}, Status: ${asset.status}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Delete an Asset Record
   */
  static async deleteAsset(
    companyId: string,
    assetId: string,
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const path = `companies/${companyId}/assets/${assetId}`;
    try {
      const docRef = doc(db, 'companies', companyId, 'assets', assetId);
      await deleteDoc(docRef);

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'ASSET_DELETED',
        `Deleted asset ID: ${assetId}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return false;
    }
  }

  /**
   * Assign Asset to an Employee / Guard / Custodian (Check-Out)
   */
  static async assignAssetCustody(
    companyId: string,
    asset: AssetRecord,
    assignment: {
      employeeId: string;
      employeeName: string;
      siteId?: string;
      siteName?: string;
      expectedReturnDate?: string;
      condition: AssetCondition;
      remarks?: string;
    },
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const assetPath = `companies/${companyId}/assets/${asset.id}`;

    try {
      // 1. Update Asset Status & Assignment
      const updatedAsset: Partial<AssetRecord> = {
        status: 'ASSIGNED',
        condition: assignment.condition,
        assignedEmployeeId: assignment.employeeId,
        assignedEmployeeName: assignment.employeeName,
        assignedDate: now,
        expectedReturnDate: assignment.expectedReturnDate || '',
        siteId: assignment.siteId || asset.siteId || '',
        siteName: assignment.siteName || asset.siteName || '',
        updatedAt: now
      };

      await setDoc(doc(db, 'companies', companyId, 'assets', asset.id), updatedAsset, { merge: true });

      // 2. Record Custody Movement Ledger
      const movementId = `MOV-${Date.now()}`;
      const movementPayload: AssetMovementHistoryRecord = {
        id: movementId,
        companyId,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        action: 'CHECK_OUT',
        employeeId: assignment.employeeId,
        employeeName: assignment.employeeName,
        siteId: assignment.siteId || asset.siteId,
        siteName: assignment.siteName || asset.siteName,
        conditionAtAction: assignment.condition,
        performedByUid: actor.uid,
        performedByName: actor.name,
        remarks: assignment.remarks || `Issued to ${assignment.employeeName}`,
        timestamp: now
      };

      await setDoc(doc(db, 'companies', companyId, 'asset_movements', movementId), movementPayload);

      // 3. Audit Log
      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'ASSET_CHECK_OUT',
        `Issued asset ${asset.assetName} (${asset.assetCode}) to ${assignment.employeeName}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, assetPath);
      return false;
    }
  }

  /**
   * Return Asset from Employee / Guard / Custodian (Check-In)
   */
  static async returnAssetCustody(
    companyId: string,
    asset: AssetRecord,
    returnDetails: {
      condition: AssetCondition;
      warehouseLocation?: string;
      siteId?: string;
      siteName?: string;
      remarks?: string;
      sendToMaintenance?: boolean;
    },
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const assetPath = `companies/${companyId}/assets/${asset.id}`;

    try {
      const prevEmployeeName = asset.assignedEmployeeName || 'Custodian';
      const prevEmployeeId = asset.assignedEmployeeId || '';

      // 1. Update Asset Status & Clear Custody
      const updatedAsset: Partial<AssetRecord> = {
        status: returnDetails.sendToMaintenance ? 'UNDER_MAINTENANCE' : 'AVAILABLE',
        condition: returnDetails.condition,
        assignedEmployeeId: '',
        assignedEmployeeName: '',
        assignedDate: '',
        expectedReturnDate: '',
        warehouseLocation: returnDetails.warehouseLocation || asset.warehouseLocation || 'Main Store',
        siteId: returnDetails.siteId || asset.siteId || '',
        siteName: returnDetails.siteName || asset.siteName || '',
        updatedAt: now
      };

      await setDoc(doc(db, 'companies', companyId, 'assets', asset.id), updatedAsset, { merge: true });

      // 2. Record Custody Movement Ledger
      const movementId = `MOV-${Date.now()}`;
      const movementPayload: AssetMovementHistoryRecord = {
        id: movementId,
        companyId,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        action: 'CHECK_IN',
        employeeId: prevEmployeeId,
        employeeName: prevEmployeeName,
        siteId: returnDetails.siteId || asset.siteId,
        siteName: returnDetails.siteName || asset.siteName,
        conditionAtAction: returnDetails.condition,
        performedByUid: actor.uid,
        performedByName: actor.name,
        remarks: returnDetails.remarks || `Returned from ${prevEmployeeName}`,
        timestamp: now
      };

      await setDoc(doc(db, 'companies', companyId, 'asset_movements', movementId), movementPayload);

      // 3. Audit Log
      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'ASSET_CHECK_IN',
        `Returned asset ${asset.assetName} (${asset.assetCode}) from ${prevEmployeeName}, Condition: ${returnDetails.condition}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, assetPath);
      return false;
    }
  }

  /**
   * Physical Verification / Barcode Scan Audit
   */
  static async recordPhysicalAssetAudit(
    companyId: string,
    asset: AssetRecord,
    auditData: {
      condition: AssetCondition;
      verifiedLocation: string;
      notes?: string;
    },
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const assetPath = `companies/${companyId}/assets/${asset.id}`;

    try {
      const updatedAsset: Partial<AssetRecord> = {
        condition: auditData.condition,
        lastAuditDate: now,
        lastAuditedBy: actor.name,
        warehouseLocation: auditData.verifiedLocation,
        updatedAt: now
      };

      await setDoc(doc(db, 'companies', companyId, 'assets', asset.id), updatedAsset, { merge: true });

      // Record Audit Movement
      const movementId = `AUD-${Date.now()}`;
      const movementPayload: AssetMovementHistoryRecord = {
        id: movementId,
        companyId,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        action: 'AUDIT_VERIFIED',
        siteId: asset.siteId,
        siteName: asset.siteName,
        conditionAtAction: auditData.condition,
        performedByUid: actor.uid,
        performedByName: actor.name,
        remarks: auditData.notes || `Physical verification completed at ${auditData.verifiedLocation}`,
        timestamp: now
      };

      await setDoc(doc(db, 'companies', companyId, 'asset_movements', movementId), movementPayload);

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'ASSET_AUDITED',
        `Physically verified asset ${asset.assetName} (${asset.assetCode})`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, assetPath);
      return false;
    }
  }

  /**
   * Log Asset Maintenance / Calibration / Repair
   */
  static async recordAssetMaintenance(
    companyId: string,
    maintenance: Omit<AssetMaintenanceRecord, 'id' | 'createdAt'>,
    asset: AssetRecord,
    statusTransition: 'UNDER_MAINTENANCE' | 'AVAILABLE',
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const maintenanceId = `MNT-${Date.now()}`;
    const payload: AssetMaintenanceRecord = {
      ...maintenance,
      id: maintenanceId,
      companyId,
      createdAt: now
    };

    try {
      // 1. Save Maintenance Record
      await setDoc(doc(db, 'companies', companyId, 'asset_maintenance', maintenanceId), payload);

      // 2. Update Asset
      const updatedAsset: Partial<AssetRecord> = {
        status: statusTransition,
        nextMaintenanceDate: maintenance.nextServiceDate || '',
        updatedAt: now
      };

      await setDoc(doc(db, 'companies', companyId, 'assets', asset.id), updatedAsset, { merge: true });

      // 3. Record Movement Action
      const movementId = `MNT-MOV-${Date.now()}`;
      const actionType: AssetMovementAction = statusTransition === 'UNDER_MAINTENANCE' ? 'MAINTENANCE_OUT' : 'MAINTENANCE_IN';
      const movementPayload: AssetMovementHistoryRecord = {
        id: movementId,
        companyId,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        action: actionType,
        conditionAtAction: asset.condition,
        performedByUid: actor.uid,
        performedByName: actor.name,
        remarks: `${maintenance.serviceType}: ${maintenance.actionTaken || maintenance.issueDescription} (${maintenance.serviceVendor})`,
        timestamp: now
      };

      await setDoc(doc(db, 'companies', companyId, 'asset_movements', movementId), movementPayload);

      // 4. Audit Log
      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'ASSET_MAINTENANCE',
        `Logged ${maintenance.serviceType} for ${asset.assetName} (${asset.assetCode}) - Cost: ₹${maintenance.serviceCost}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/asset_maintenance/${maintenanceId}`);
      return false;
    }
  }

  /**
   * Real-time subscription to Company Sites
   */
  static subscribeToSites(
    companyId: string,
    onData: (sites: SiteRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'sites');
      return onSnapshot(colRef, (snap) => {
        const sites = snap.docs.map(d => ({ id: d.id, ...d.data() } as SiteRecord));
        onData(sites);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToSites error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[FirestoreService] subscribeToSites exception:', e);
      onData([]);
      return () => {};
    }
  }

  /**
   * Real-time subscription to Asset Movements
   */
  static subscribeToAssetMovements(
    companyId: string,
    onData: (movements: AssetMovementHistoryRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'asset_movements');
      return onSnapshot(colRef, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AssetMovementHistoryRecord));
        list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToAssetMovements error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToAssetMovements exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Real-time subscription to Asset Maintenance records
   */
  static subscribeToAssetMaintenance(
    companyId: string,
    onData: (records: AssetMaintenanceRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'asset_maintenance');
      return onSnapshot(colRef, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AssetMaintenanceRecord));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToAssetMaintenance error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToAssetMaintenance exception:', err);
      onData([]);
      return () => {};
    }

  }

  
  static subscribeToWorkOrders(userSession: UserSession, companyId: string, onData: (data: WorkOrderRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'work_orders');
    return onSnapshot(colRef, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkOrderRecord));
      onData(records);
    }, (error) => {
      console.error('Error in subscribeToWorkOrders:', error);
      onData([]);
    });
  }
  
  static subscribeToTasks(userSession: UserSession, companyId: string, onData: (data: TaskRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'tasks');
    const q = query(colRef, ...QueryScopeEngine.buildScope(userSession, 'TASKS'));
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskRecord));
      onData(records);
    }, (error) => {
      console.error('Error in subscribeToTasks:', error);
      onData([]);
    });
  }

  static subscribeToAnnouncements(userSession: UserSession, companyId: string, onData: (data: AnnouncementRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'announcements');
    const q = query(colRef, ...QueryScopeEngine.buildScope(userSession, 'ANNOUNCEMENTS'));
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnnouncementRecord));
      onData(records);
    }, (error) => {
      console.error('Error in subscribeToAnnouncements:', error);
      onData([]);
    });
  }

  static subscribeToDocuments(userSession: UserSession, companyId: string, onData: (data: DocumentRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'documents');
    const q = query(colRef, ...QueryScopeEngine.buildScope(userSession, 'DOCUMENTS'));
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentRecord));
      onData(records);
    }, (error) => {
      console.error('Error in subscribeToDocuments:', error);
      onData([]);
    });
  }

  static async updateWorkOrderStatus(workOrderId: string, companyId: string, status: WorkOrderRecord['status'], updates?: Partial<WorkOrderRecord>): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'work_orders', workOrderId);
    await updateDoc(docRef, { status, updatedAt: new Date().toISOString(), ...updates });

    // Log Audit Event
    await this.logAuditEvent(
      companyId,
      'SYSTEM',
      'Operations Engine',
      'WORK_ORDER_STATUS_UPDATED',
      `Work Order ${workOrderId} status changed to ${status}`
    );
  }

  static async updateTaskStatus(taskId: string, companyId: string, status: TaskRecord['status'], updates?: Partial<TaskRecord>): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'tasks', taskId);
    await updateDoc(docRef, { status, updatedAt: Date.now(), ...updates });

    // Log Audit Event
    await this.logAuditEvent(
      companyId,
      'SYSTEM',
      'Task Engine',
      'TASK_STATUS_UPDATED',
      `Task ${taskId} status changed to ${status}`
    );
  }

  static async updateDailySiteLog(logId: string, companyId: string, updates: Partial<DailySiteLogRecord>): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'daily_site_logs', logId);
    await updateDoc(docRef, { ...updates });
  }

  static async updateIncidentReport(incidentId: string, companyId: string, updates: Partial<IncidentReportRecord>): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'incident_reports', incidentId);
    await updateDoc(docRef, { ...updates });
  }

  static async updateDocumentStatus(documentId: string, companyId: string, status: DocumentRecord['status'], updates?: Partial<DocumentRecord>): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'documents', documentId);
    await updateDoc(docRef, { status, updatedAt: Date.now(), ...updates });
  }

  
  // ==========================================
  // CLIENT MANAGEMENT (Phase 2F P0)
  // ==========================================
  static async getClients(companyId: string): Promise<ClientRecord[]> {
    const colRef = collection(db, 'companies', companyId, 'clients');
    const q = query(colRef);
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ClientRecord);
  }

  static subscribeToClients(userSession: UserSession, companyId: string, onUpdate: (clients: ClientRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'clients');
    const q = query(colRef, ...QueryScopeEngine.buildScope(userSession, 'CLIENTS'));
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as ClientRecord));
    });
  }

  static async saveClient(companyId: string, client: ClientRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'clients', client.id);
      await setDoc(docRef, {
        ...client,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving client:', err);
      return false;
    }
  }

  // ==========================================
  // DEPLOYMENT MANAGEMENT (Phase 2F P0)
  // ==========================================
  static async getDeployments(companyId: string): Promise<DeploymentRecord[]> {
    const colRef = collection(db, 'companies', companyId, 'deployments');
    const q = query(colRef);
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DeploymentRecord);
  }

  static subscribeToDeployments(userSession: UserSession, companyId: string, onUpdate: (deps: DeploymentRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'deployments');
    const q = query(colRef, ...QueryScopeEngine.buildScope(userSession, 'DEPLOYMENTS'));
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as DeploymentRecord));
    });
  }

  static async saveDeployment(userSession: UserSession, companyId: string, deployment: DeploymentRecord, oldDeployment?: DeploymentRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'deployments', deployment.id);
      
      // If transferring site or changing rate, create history record
      if (oldDeployment && (oldDeployment.siteId !== deployment.siteId || oldDeployment.billingRate !== deployment.billingRate || oldDeployment.status !== deployment.status)) {
         const historyRef = doc(collection(db, 'companies', companyId, 'deployments', deployment.id, 'history'));
         const historyRecord: DeploymentHistoryRecord = {
           id: historyRef.id,
           companyId,
           deploymentId: deployment.id,
           employeeId: deployment.employeeId,
           action: oldDeployment.siteId !== deployment.siteId ? 'SITE_TRANSFER' : (oldDeployment.billingRate !== deployment.billingRate ? 'RATE_CHANGE' : 'STATUS_CHANGE'),
           previousValue: oldDeployment,
           newValue: deployment,
           changedByUserId: userSession.userId,
           changedAt: new Date().toISOString()
         };
         await setDoc(historyRef, historyRecord);
      }

      await setDoc(docRef, {
        ...deployment,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // BACKWARD COMPATIBILITY (Dual-write siteId to EmployeeRecord)
      if (deployment.status === 'ACTIVE') {
         const empRef = doc(db, 'companies', companyId, 'employees', deployment.employeeId);
         await setDoc(empRef, { siteId: deployment.siteId, updatedAt: new Date().toISOString() }, { merge: true });
      }

      return true;
    } catch (err) {
      console.error('Error saving deployment:', err);
      return false;
    }
  }

  // ==========================================
  // SHIFT ROSTER (Phase 2F P1)
  // ==========================================
  static subscribeToShiftRosters(userSession: UserSession, companyId: string, siteId: string, onUpdate: (rosters: RosterRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'sites', siteId, 'shiftRoster');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as RosterRecord));
    });
  }

  static async saveShiftRoster(companyId: string, siteId: string, roster: RosterRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'sites', siteId, 'shiftRoster', roster.id);
      await setDoc(docRef, {
        ...roster,
        createdAt: roster.createdAt || new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving shift roster:', err);
      return false;
    }
  }

  // ==========================================
  // MODULE 11: SERVICE MANAGEMENT / HELPDESK
  // ==========================================
  static subscribeToServiceTickets(companyId: string, onUpdate: (tickets: ServiceTicketRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'serviceTickets');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as ServiceTicketRecord));
    }, (err) => {
      console.warn('Fallback listening to serviceTickets without index:', err);
      const fallbackQ = query(colRef);
      return onSnapshot(fallbackQ, (fallbackSnap) => {
        const list = fallbackSnap.docs.map(d => d.data() as ServiceTicketRecord);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(list);
      });
    });
  }

  static async saveServiceTicket(companyId: string, ticket: ServiceTicketRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'serviceTickets', ticket.id);
      await setDoc(docRef, {
        ...ticket,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving service ticket:', err);
      return false;
    }
  }

  static subscribeToTicketComments(companyId: string, ticketId: string, onUpdate: (comments: TicketCommentRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as TicketCommentRecord);
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      onUpdate(list);
    });
  }

  static async addTicketComment(companyId: string, ticketId: string, comment: TicketCommentRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments', comment.id);
      await setDoc(docRef, comment);
      return true;
    } catch (err) {
      console.error('Error adding ticket comment:', err);
      return false;
    }
  }

  // ==========================================
  // MODULE 12: TALENT ACQUISITION & ONBOARDING (ATS)
  // ==========================================
  static subscribeToJobRequisitions(companyId: string, onUpdate: (reqs: JobRequisitionRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'jobRequisitions');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as JobRequisitionRecord);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    });
  }

  static async saveJobRequisition(companyId: string, req: JobRequisitionRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'jobRequisitions', req.id);
      await setDoc(docRef, {
        ...req,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving job requisition:', err);
      return false;
    }
  }

  static subscribeToCandidates(companyId: string, onUpdate: (candidates: CandidateRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'candidates');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as CandidateRecord);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    });
  }

  static async saveCandidate(companyId: string, candidate: CandidateRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'candidates', candidate.id);
      await setDoc(docRef, {
        ...candidate,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving candidate:', err);
      return false;
    }
  }

  /**
   * Handle approval or rejection of a lifecycle request (Promotion, Transfer, Exit)
   */
  static async resolveLifecycleApproval(
    companyId: string,
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    actor: UserSession,
    rejectionReason: string = ''
  ): Promise<boolean> {
    try {
      // 1. Verify Authority via WorkflowEngine
      // We need to fetch the request first to know its context
      const collections = {
        'PROMOTION': 'promotions',
        'TRANSFER': 'transfers',
        'EXIT': 'exits'
      } as const;

      // Try each collection to find the request (simplification for this phase)
      let requestData: any = null;
      let requestType: 'PROMOTION' | 'TRANSFER' | 'EXIT' | null = null;

      for (const [type, coll] of Object.entries(collections)) {
        const docRef = doc(db, 'companies', companyId, coll, requestId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          requestData = snap.data();
          requestType = type as any;
          break;
        }
      }

      if (!requestData || !requestType) throw new Error('Request not found');

      const resolution = WorkflowEngine.resolveApprovalAuthority(actor, requestType, {
        companyId,
        targetDepartmentId: requestData.newDepartmentId,
        targetSiteId: requestData.newSiteId,
        requestorRole: actor.role
      });

      if (!resolution.canApprove) {
        throw new Error(resolution.reason || 'Insufficient authority to resolve this lifecycle request.');
      }

      if (decision === 'REJECTED') {
        const coll = collections[requestType];
        await updateDoc(doc(db, 'companies', companyId, coll, requestId), {
          status: 'REJECTED',
          rejectionReason,
          rejectedBy: actor.userId,
          updatedAt: new Date().toISOString()
        });

        // Revert employee lifecycleStatus
        await updateDoc(doc(db, 'companies', companyId, 'employees', requestData.employeeId), {
          lifecycleStatus: 'ACTIVE'
        });

        return true;
      }

      // decision === 'APPROVED'
      const coll = collections[requestType];
      await updateDoc(doc(db, 'companies', companyId, coll, requestId), {
        status: 'APPROVED',
        approvedBy: actor.userId,
        updatedAt: new Date().toISOString()
      });

      // Apply the change to the employee record
      const empRef = doc(db, 'companies', companyId, 'employees', requestData.employeeId);
      const updates: any = {
        lifecycleStatus: 'ACTIVE',
        updatedAt: new Date().toISOString(),
        updatedBy: actor.userId
      };

      if (requestType === 'PROMOTION') {
        updates.designation = requestData.newDesignation;
        updates.departmentId = requestData.newDepartmentId || requestData.previousDepartmentId;
      } else if (requestType === 'TRANSFER') {
        updates.assignedSiteId = requestData.newSiteId;
        updates.assignedBranchId = requestData.newBranchId;
        updates.assignedRegionId = requestData.newRegionId;
      } else if (requestType === 'EXIT') {
        updates.lifecycleStatus = 'EXITED';
        updates.status = 'DEACTIVATED';
      }

      await updateDoc(empRef, updates);

      // Add History Event
      await this.addLifecycleEvent(companyId, requestData.employeeId, {
        type: requestType,
        toStatus: updates.lifecycleStatus,
        effectiveDate: requestData.effectiveDate || new Date().toISOString(),
        reason: requestData.reason,
        initiatedBy: requestData.initiatedBy,
        approvedBy: actor.userId,
        timestamp: new Date().toISOString(),
        details: { requestId, decision }
      }, { id: actor.userId, name: actor.fullName });

      return true;
    } catch (err) {
      console.error('Error resolving lifecycle approval:', err);
      return false;
    }
  }

  // ==========================================
  // MODULE 13: LEARNING & COMPLIANCE / LMS
  // ==========================================
  static subscribeToTrainingPrograms(companyId: string, onUpdate: (programs: TrainingProgramRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'trainingPrograms');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as TrainingProgramRecord);
      list.sort((a, b) => a.title.localeCompare(b.title));
      onUpdate(list);
    });
  }

  static async saveTrainingProgram(companyId: string, program: TrainingProgramRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'trainingPrograms', program.id);
      await setDoc(docRef, {
        ...program,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving training program:', err);
      return false;
    }
  }

  static subscribeToTrainingEnrollments(companyId: string, onUpdate: (enrollments: TrainingEnrollmentRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'trainingEnrollments');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as TrainingEnrollmentRecord);
      list.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
      onUpdate(list);
    });
  }

  static async saveTrainingEnrollment(companyId: string, enrollment: TrainingEnrollmentRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'trainingEnrollments', enrollment.id);
      await setDoc(docRef, {
        ...enrollment,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving training enrollment:', err);
      return false;
    }
  }

  // ==========================================
  // MODULE 14: PROCUREMENT & SOURCING / SRM
  // ==========================================
  static subscribeToProcurementRequisitions(companyId: string, onUpdate: (prs: ProcurementRequisitionRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'procurementRequisitions');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as ProcurementRequisitionRecord);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    });
  }

  static async saveProcurementRequisition(companyId: string, pr: ProcurementRequisitionRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'procurementRequisitions', pr.id);
      await setDoc(docRef, {
        ...pr,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving procurement requisition:', err);
      return false;
    }
  }

  static subscribeToPurchaseOrders(companyId: string, onUpdate: (pos: PurchaseOrderRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'purchaseOrders');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as PurchaseOrderRecord);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    });
  }

  static async savePurchaseOrder(companyId: string, po: PurchaseOrderRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'purchaseOrders', po.id);
      await setDoc(docRef, {
        ...po,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving purchase order:', err);
      return false;
    }
  }

  static subscribeToGoodsReceiptNotes(companyId: string, onUpdate: (grns: GoodsReceiptNoteRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'goodsReceiptNotes');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as GoodsReceiptNoteRecord);
      list.sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
      onUpdate(list);
    });
  }

  static async saveGoodsReceiptNote(companyId: string, grn: GoodsReceiptNoteRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'goodsReceiptNotes', grn.id);
      await setDoc(docRef, grn, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving GRN:', err);
      return false;
    }
  }

  static subscribeToThreeWayMatches(companyId: string, onUpdate: (matches: ThreeWayMatchRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'threeWayMatches');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as ThreeWayMatchRecord);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    });
  }

  static async saveThreeWayMatch(companyId: string, match: ThreeWayMatchRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'threeWayMatches', match.id);
      await setDoc(docRef, {
        ...match,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving 3-way match:', err);
      return false;
    }
  }

  static subscribeToVendors(userSession: UserSession, companyId: string, onUpdate: (vendors: VendorRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'vendors');
    return onSnapshot(colRef, (snap) => {
      const list = snap.docs.map(d => d.data() as VendorRecord);
      onUpdate(list);
    }, (err) => {
      console.warn('Error subscribing to vendors:', err);
      onUpdate([]);
    });
  }

  static subscribeToDepartments(companyId: string, onUpdate: (departments: DepartmentRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'departments');
    return onSnapshot(colRef, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as DepartmentRecord));
      onUpdate(list);
    }, (err) => {
      console.warn('Error subscribing to departments:', err);
      onUpdate([]);
    });
  }

  static subscribeToDesignations(companyId: string, onUpdate: (designations: DesignationRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'designations');
    return onSnapshot(colRef, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as DesignationRecord));
      onUpdate(list);
    }, (err) => {
      console.warn('Error subscribing to designations:', err);
      onUpdate([]);
    });
  }

  // ============================================================================
  // IDENTITY BADGE LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Check if a badge number is unique within the company
   */
  static async isBadgeNumberUnique(companyId: string, badgeNumber: string, excludeId?: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'badges'),
        where('badgeNumber', '==', badgeNumber)
      );
      const snap = await getDocs(q);
      if (snap.empty) return true;
      if (excludeId && snap.docs.length === 1 && snap.docs[0].id === excludeId) return true;
      return false;
    } catch (err) {
      console.error('[FirestoreService] isBadgeNumberUnique error:', err);
      return false;
    }
  }

  /**
   * Issues a new badge to an employee
   */
  static async issueBadge(
    companyId: string, 
    badgeData: Omit<IdentityBadgeRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'qrIdentifier'>,
    actor: { id: string; name: string }
  ): Promise<string | null> {
    try {
      // 1. Verify Uniqueness
      const isUnique = await this.isBadgeNumberUnique(companyId, badgeData.badgeNumber);
      if (!isUnique) throw new Error('Badge number already exists.');

      // 2. Verify Employee Eligibility
      const empRef = doc(db, 'companies', companyId, 'employees', badgeData.employeeId);
      const empSnap = await getDoc(empRef);
      if (!empSnap.exists()) throw new Error('Employee not found.');
      const employee = empSnap.data() as EmployeeRecord;
      if (employee.lifecycleStatus === 'EXITED') throw new Error('Cannot issue badge to an exited employee.');

      // 3. Check for existing active badge
      const activeBadge = await this.getEmployeeActiveBadge(companyId, badgeData.employeeId);
      if (activeBadge) throw new Error('Employee already has an active badge. Deactivate or replace it first.');

      const badgeId = doc(collection(db, 'companies', companyId, 'badges')).id;
      const qrIdentifier = `IDB-${companyId}-${badgeId.substring(0, 8)}-${Math.random().toString(36).substring(7)}`;

      const now = new Date().toISOString();
      const newBadge: IdentityBadgeRecord = {
        ...badgeData,
        id: badgeId,
        qrIdentifier,
        createdAt: now,
        updatedAt: now,
        createdBy: actor.id,
        updatedBy: actor.id
      };

      await setDoc(doc(db, 'companies', companyId, 'badges', badgeId), newBadge);

      // Audit and Notification
      await this.addBadgeHistory(companyId, badgeId, {
        id: '', // Will be set in addBadgeHistory
        badgeId,
        companyId,
        employeeId: badgeData.employeeId,
        action: 'BADGE_ISSUED',
        toStatus: badgeData.status,
        actorId: actor.id,
        actorName: actor.name,
        timestamp: now,
        details: { badgeNumber: badgeData.badgeNumber }
      });

      return badgeId;
    } catch (err) {
      console.error('[FirestoreService] issueBadge error:', err);
      return null;
    }
  }

  /**
   * Transitions badge status with audit trail
   */
  static async updateBadgeStatus(
    companyId: string,
    badgeId: string,
    newStatus: BadgeStatus,
    reason: string,
    actor: { id: string; name: string },
    details?: Record<string, any>
  ): Promise<boolean> {
    try {
      const badgeRef = doc(db, 'companies', companyId, 'badges', badgeId);
      const badgeSnap = await getDoc(badgeRef);
      if (!badgeSnap.exists()) throw new Error('Badge not found');
      const badge = badgeSnap.data() as IdentityBadgeRecord;

      const now = new Date().toISOString();
      const updates: Partial<IdentityBadgeRecord> = {
        status: newStatus,
        updatedAt: now,
        updatedBy: actor.id
      };

      if (newStatus === 'ACTIVE') updates.activatedDate = now;
      if (newStatus === 'DEACTIVATED') updates.deactivatedDate = now;
      if (newStatus === 'RETURNED') {
        updates.returnDate = now;
        updates.status = 'RETURNED';
      }
      if (newStatus === 'LOST') updates.lostDamagedReason = reason;
      if (newStatus === 'DAMAGED') updates.lostDamagedReason = reason;

      await updateDoc(badgeRef, updates);

      await this.addBadgeHistory(companyId, badgeId, {
        id: '', 
        badgeId,
        companyId,
        employeeId: badge.employeeId,
        action: `BADGE_${newStatus}`,
        fromStatus: badge.status,
        toStatus: newStatus,
        actorId: actor.id,
        actorName: actor.name,
        reason,
        timestamp: now,
        details
      });

      return true;
    } catch (err) {
      console.error('[FirestoreService] updateBadgeStatus error:', err);
      return false;
    }
  }

  /**
   * Replaces an old badge with a new one
   */
  static async replaceBadge(
    companyId: string,
    oldBadgeId: string,
    newBadgeData: Omit<IdentityBadgeRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'qrIdentifier' | 'status'>,
    actor: { id: string; name: string },
    reason: string
  ): Promise<string | null> {
    try {
      return await runTransaction(db, async (transaction) => {
        const oldBadgeRef = doc(db, 'companies', companyId, 'badges', oldBadgeId);
        const oldBadgeSnap = await transaction.get(oldBadgeRef);
        if (!oldBadgeSnap.exists()) throw new Error('Old badge not found');
        const oldBadge = oldBadgeSnap.data() as IdentityBadgeRecord;

        // 1. Deactivate old badge
        const now = new Date().toISOString();
        transaction.update(oldBadgeRef, {
          status: 'DEACTIVATED',
          deactivatedDate: now,
          updatedAt: now,
          updatedBy: actor.id,
          replacementReason: reason
        });

        // 2. Create new badge
        const badgeId = doc(collection(db, 'companies', companyId, 'badges')).id;
        const qrIdentifier = `IDB-${companyId}-${badgeId.substring(0, 8)}-${Math.random().toString(36).substring(7)}`;

        const newBadge: IdentityBadgeRecord = {
          ...newBadgeData,
          id: badgeId,
          status: 'ACTIVE',
          qrIdentifier,
          createdAt: now,
          updatedAt: now,
          createdBy: actor.id,
          updatedBy: actor.id,
          activatedDate: now
        };

        transaction.set(doc(db, 'companies', companyId, 'badges', badgeId), newBadge);

        // 3. Add history for replacement
        const historyId = doc(collection(db, 'companies', companyId, 'badge_history')).id;
        transaction.set(doc(db, 'companies', companyId, 'badge_history', historyId), {
          id: historyId,
          badgeId: oldBadgeId,
          companyId,
          employeeId: oldBadge.employeeId,
          action: 'BADGE_REPLACED',
          fromStatus: oldBadge.status,
          toStatus: 'DEACTIVATED' as BadgeStatus,
          actorId: actor.id,
          actorName: actor.name,
          reason,
          timestamp: now,
          details: { replacedBy: badgeId }
        });

        const newHistoryId = doc(collection(db, 'companies', companyId, 'badge_history')).id;
        transaction.set(doc(db, 'companies', companyId, 'badge_history', newHistoryId), {
          id: newHistoryId,
          badgeId: badgeId,
          companyId,
          employeeId: oldBadge.employeeId,
          action: 'BADGE_ISSUED_AS_REPLACEMENT',
          toStatus: 'ACTIVE' as BadgeStatus,
          actorId: actor.id,
          actorName: actor.name,
          reason,
          timestamp: now,
          details: { replacedOldBadge: oldBadgeId }
        });

        return badgeId;
      });
    } catch (err) {
      console.error('[FirestoreService] replaceBadge error:', err);
      return null;
    }
  }

  /**
   * Verifies a badge using QR or Badge Number
   */
  static async verifyBadge(
    companyId: string,
    identifier: string,
    type: 'NUMBER' | 'QR'
  ): Promise<{ status: 'VALID' | 'EXPIRED' | 'LOST' | 'DAMAGED' | 'RETURNED' | 'DEACTIVATED' | 'SUSPENDED' | 'INVALID', badge?: IdentityBadgeRecord, employee?: EmployeeRecord }> {
    try {
      const field = type === 'NUMBER' ? 'badgeNumber' : 'qrIdentifier';
      const q = query(collection(db, 'companies', companyId, 'badges'), where(field, '==', identifier));
      const snap = await getDocs(q);

      if (snap.empty) return { status: 'INVALID' };
      const badge = snap.docs[0].data() as IdentityBadgeRecord;

      const empSnap = await getDoc(doc(db, 'companies', companyId, 'employees', badge.employeeId));
      const employee = empSnap.exists() ? empSnap.data() as EmployeeRecord : undefined;

      // Status Mappings
      const statusMap: Record<BadgeStatus, string> = {
        'ACTIVE': 'VALID',
        'EXPIRED': 'EXPIRED',
        'LOST': 'LOST',
        'DAMAGED': 'DAMAGED',
        'RETURNED': 'RETURNED',
        'DEACTIVATED': 'DEACTIVATED',
        'SUSPENDED': 'SUSPENDED',
        'ISSUED': 'VALID', // Issued but not yet activated? Usually valid for check-in
        'APPROVED': 'INVALID',
        'REQUESTED': 'INVALID',
        'REPLACEMENT_REQUESTED': 'VALID' // Still valid until replaced? Policy dependent.
      };

      let status = (statusMap[badge.status] || 'INVALID') as any;

      // Secondary validation: Expiry
      if (status === 'VALID' && badge.expiryDate && new Date(badge.expiryDate) < new Date()) {
        status = 'EXPIRED';
      }

      // Secondary validation: Employee Exit
      if (employee && employee.lifecycleStatus === 'EXITED') {
        status = 'DEACTIVATED';
      }

      return { status, badge, employee };
    } catch (err) {
      console.error('[FirestoreService] verifyBadge error:', err);
      return { status: 'INVALID' };
    }
  }

  /**
   * Gets the active badge for an employee
   */
  static async getEmployeeActiveBadge(companyId: string, employeeId: string): Promise<IdentityBadgeRecord | null> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'badges'),
        where('employeeId', '==', employeeId),
        where('status', 'in', ['ACTIVE', 'ISSUED'])
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return snap.docs[0].data() as IdentityBadgeRecord;
    } catch (err) {
      console.error('[FirestoreService] getEmployeeActiveBadge error:', err);
      return null;
    }
  }

  /**
   * Adds record to badge history
   */
  private static async addBadgeHistory(companyId: string, badgeId: string, event: BadgeLifecycleEvent): Promise<void> {
    try {
      const historyId = doc(collection(db, 'companies', companyId, 'badge_history')).id;
      await setDoc(doc(db, 'companies', companyId, 'badge_history', historyId), {
        ...event,
        id: historyId
      });
    } catch (err) {
      console.error('[FirestoreService] addBadgeHistory error:', err);
    }
  }

  /**
   * Subscribe to all badges for a company
   */
  static subscribeToBadges(companyId: string, onData: (badges: IdentityBadgeRecord[]) => void): () => void {
    const q = query(collection(db, 'companies', companyId, 'badges'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      onData(snapshot.docs.map(d => d.data() as IdentityBadgeRecord));
    });
  }

  /**
   * Get history for a specific badge
   */
  static async getBadgeHistory(companyId: string, badgeId: string): Promise<BadgeLifecycleEvent[]> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'badge_history'),
        where('badgeId', '==', badgeId),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as BadgeLifecycleEvent);
    } catch (err) {
      console.error('[FirestoreService] getBadgeHistory error:', err);
      return [];
    }
  }

  /**
   * ============================================================
   * DOCUMENT COMPLIANCE & EXPIRATION ALERTS
   * ============================================================
   */

  static async getDocumentTypes(companyId: string): Promise<DocumentTypeConfig[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'document_types');
      const q = query(colRef, where('status', '==', 'ACTIVE'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as DocumentTypeConfig);
    } catch (err) {
      console.warn('[FirestoreService] getDocumentTypes error:', err);
      return [];
    }
  }

  static async saveDocumentType(companyId: string, config: DocumentTypeConfig): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'document_types', config.id);
      await setDoc(docRef, {
        ...config,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] saveDocumentType error:', err);
      return false;
    }
  }

  static async getEmployeeDocuments(companyId: string, employeeId: string): Promise<EmployeeDocumentRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'employee_documents');
      const q = query(
        colRef, 
        where('employeeId', '==', employeeId),
        where('isLatest', '==', true)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as EmployeeDocumentRecord);
    } catch (err) {
      console.warn('[FirestoreService] getEmployeeDocuments error:', err);
      return [];
    }
  }

  static async saveEmployeeDocument(
    companyId: string, 
    document: EmployeeDocumentRecord, 
    actor: { id: string, name: string }
  ): Promise<boolean> {
    try {
      // If this is a new version/renewal, mark the previous one as not latest
      if (document.previousDocumentId) {
        const prevRef = doc(db, 'companies', companyId, 'employee_documents', document.previousDocumentId);
        await setDoc(prevRef, { isLatest: false, updatedAt: new Date().toISOString() }, { merge: true });
      }

      const docRef = doc(db, 'companies', companyId, 'employee_documents', document.id);
      await setDoc(docRef, {
        ...document,
        isLatest: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Record History
      const historyId = `DOC_HIST_${Date.now()}`;
      const historyRef = doc(db, 'companies', companyId, 'document_history', historyId);
      await setDoc(historyRef, {
        id: historyId,
        documentId: document.id,
        employeeId: document.employeeId,
        action: document.previousDocumentId ? 'RENEWED' : 'UPLOADED',
        status: document.status,
        actorId: actor.id,
        actorName: actor.name,
        timestamp: new Date().toISOString(),
        remarks: document.remarks
      });

      // Audit Log
      await this.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        'DOCUMENT_UPLOADED',
        `Uploaded document ${document.documentTypeCode} for employee ${document.employeeId}`,
        document.employeeId
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] saveEmployeeDocument error:', err);
      return false;
    }
  }

  static async verifyDocument(
    companyId: string,
    employeeId: string,
    documentId: string,
    verification: { status: 'VERIFIED' | 'REJECTED'; reason?: string; remarks?: string },
    actor: { id: string, name: string }
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'employee_documents', documentId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;

      const docData = snap.data() as EmployeeDocumentRecord;
      
      const newStatus: DocumentStatus = verification.status === 'VERIFIED' ? 'VERIFIED' : 'REJECTED';

      await setDoc(docRef, {
        status: newStatus,
        verificationStatus: verification.status,
        verifiedBy: actor.id,
        verifiedByName: actor.name,
        verifiedAt: new Date().toISOString(),
        rejectionReason: verification.reason,
        remarks: verification.remarks,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // History
      const historyId = `DOC_HIST_${Date.now()}`;
      const historyRef = doc(db, 'companies', companyId, 'document_history', historyId);
      await setDoc(historyRef, {
        id: historyId,
        documentId,
        employeeId,
        action: verification.status,
        status: newStatus,
        actorId: actor.id,
        actorName: actor.name,
        timestamp: new Date().toISOString(),
        remarks: verification.remarks || verification.reason
      });

      // Audit
      await this.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        verification.status === 'VERIFIED' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
        `${verification.status === 'VERIFIED' ? 'Verified' : 'Rejected'} document ${docData.documentTypeCode} for employee ${employeeId}`,
        employeeId
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] verifyDocument error:', err);
      return false;
    }
  }

  static async getExpiringDocuments(companyId: string, daysThreshold: number): Promise<EmployeeDocumentRecord[]> {
    try {
      const expiryDateLimit = new Date();
      expiryDateLimit.setDate(expiryDateLimit.getDate() + daysThreshold);
      const expiryDateStr = expiryDateLimit.toISOString().split('T')[0];

      const colRef = collection(db, 'companies', companyId, 'employee_documents');
      const q = query(
        colRef,
        where('isLatest', '==', true),
        where('expiryDate', '<=', expiryDateStr),
        where('status', 'in', ['VERIFIED', 'EXPIRING_SOON'])
      );
      
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as EmployeeDocumentRecord);
    } catch (err) {
      console.error('[FirestoreService] getExpiringDocuments error:', err);
      return [];
    }
  }

  static async checkAndTriggerExpirations(companyId: string): Promise<{ alerted: number; total: number }> {
    try {
      // 1. Get all doc types to know their thresholds
      const docTypes = await this.getDocumentTypes(companyId);
      let alertCount = 0;
      let totalChecked = 0;

      // 2. Query all latest verified/expiring documents
      const colRef = collection(db, 'companies', companyId, 'employee_documents');
      const q = query(
        colRef,
        where('isLatest', '==', true),
        where('status', 'in', ['VERIFIED', 'EXPIRING_SOON'])
      );
      
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => d.data() as EmployeeDocumentRecord);
      totalChecked = docs.length;

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      for (const docRec of docs) {
        if (!docRec.expiryDate) continue;

        const expiryDate = new Date(docRec.expiryDate);
        const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const typeConfig = docTypes.find(t => t.code === docRec.documentTypeCode);
        
        if (!typeConfig) continue;

        // Check against thresholds
        const thresholds = typeConfig.expiryAlertThresholds.sort((a, b) => b - a);
        const reachedThreshold = thresholds.find(t => diffDays <= t && (!docRec.lastThresholdReached || t < docRec.lastThresholdReached));

        if (reachedThreshold !== undefined || diffDays <= 0) {
          const isExpired = diffDays <= 0;
          const newStatus: DocumentStatus = isExpired ? 'EXPIRED' : 'EXPIRING_SOON';
          
          // Update doc status
          const docRef = doc(db, 'companies', companyId, 'employee_documents', docRec.id);
          await setDoc(docRef, {
            status: newStatus,
            lastThresholdReached: reachedThreshold,
            lastAlertSentAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });

          // Send Notification
          const notificationId = `NOTIF_EXP_${docRec.id}_${reachedThreshold || 'EXPIRED'}`;
          const notifRef = doc(db, 'companies', companyId, 'notifications', notificationId);
          await setDoc(notifRef, {
            id: notificationId,
            title: isExpired ? 'Document Expired' : 'Document Expiring Soon',
            message: `${docRec.documentTypeCode} for employee ${docRec.employeeId} ${isExpired ? 'has expired' : `will expire in ${diffDays} days`}.`,
            type: isExpired ? 'ALERT' : 'WARNING',
            timestamp: new Date().toISOString(),
            isRead: false,
            roleScope: ['HR_ADMIN', 'COMPANY_ADMIN', 'OPS_MANAGER'],
            actionRoute: 'COMPLIANCE'
          });

          // Audit Log
          await this.logAuditEvent(
            companyId,
            'SYSTEM',
            'Compliance Engine',
            isExpired ? 'DOCUMENT_EXPIRED' : 'DOCUMENT_EXPIRY_ALERT',
            `Threshold ${reachedThreshold} days reached for ${docRec.documentTypeCode} (Employee: ${docRec.employeeId})`,
            docRec.employeeId
          );

          alertCount++;
        }
      }

      return { alerted: alertCount, total: totalChecked };
    } catch (err) {
      console.error('[FirestoreService] checkAndTriggerExpirations error:', err);
      return { alerted: 0, total: 0 };
    }
  }


  // ==========================================
  // SHIFT HANDOVER METHODS
  // ==========================================
  
  static subscribeToShiftHandovers(session: import('../types').UserSession, companyId: string, onData: (handovers: import('../types').ShiftHandoverRecord[]) => void): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'shift_handovers');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'ATTENDANCE'));
      return onSnapshot(q, (snap) => {
        const handovers = snap.docs.map(d => ({ id: d.id, ...d.data() } as import('../types').ShiftHandoverRecord));
        onData(handovers);
      }, (err) => {
        console.warn('[Firestore] subscribeToShiftHandovers error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToShiftHandovers exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async submitHandover(companyId: string, handover: import('../types').ShiftHandoverRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'shift_handovers', handover.id);
      await setDoc(ref, {
        ...handover,
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      console.error('Error submitting handover:', e);
      return false;
    }
  }

  static async acknowledgeHandover(companyId: string, handoverId: string, employeeId: string): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'shift_handovers', handoverId);
      await updateDoc(ref, {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: employeeId,
        acknowledgedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error('Error acknowledging handover:', e);
      return false;
    }
  }

  static async returnHandover(companyId: string, handoverId: string, reason: string): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'shift_handovers', handoverId);
      await updateDoc(ref, {
        status: 'RETURNED',
        returnReason: reason,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error('Error returning handover:', e);
      return false;
    }
  }

  // ==========================================
  // SOS & GPS TRACKING METHODS
  // ==========================================
  
  static async triggerSos(companyId: string, event: import('../types').SosEventRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'sos_events', event.id);
      await setDoc(ref, event);
      return true;
    } catch (e) {
      console.error('Error triggering SOS:', e);
      return false;
    }
  }

  static subscribeToActiveSos(session: import('../types').UserSession, companyId: string, onData: (events: import('../types').SosEventRecord[]) => void): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'sos_events');
      const q = query(colRef, where('status', 'in', ['TRIGGERED', 'ACKNOWLEDGED', 'RESPONSE_STARTED']), ...QueryScopeEngine.buildScope(session, 'ATTENDANCE'));
      return onSnapshot(q, (snap) => {
        const events = snap.docs.map(d => ({ id: d.id, ...d.data() } as import('../types').SosEventRecord));
        onData(events);
      }, (err) => {
        console.warn('[Firestore] subscribeToActiveSos error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToActiveSos exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async updateSosStatus(companyId: string, sosId: string, status: import('../types').SosStatus, updates: Partial<import('../types').SosEventRecord>): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'sos_events', sosId);
      await updateDoc(ref, {
        status,
        updatedAt: new Date().toISOString(),
        ...updates
      });
      return true;
    } catch (e) {
      console.error('Error updating SOS:', e);
      return false;
    }
  }

  static async startTrackingSession(companyId: string, sessionData: import('../types').TrackingSessionRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'tracking_sessions', sessionData.id);
      await setDoc(ref, sessionData);
      return true;
    } catch (e) {
      console.error('Error starting tracking session:', e);
      return false;
    }
  }

  static async endTrackingSession(companyId: string, sessionId: string, endedBy: string): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'tracking_sessions', sessionId);
      await updateDoc(ref, {
        status: 'ENDED',
        endedAt: new Date().toISOString(),
        endedBy,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error('Error ending tracking session:', e);
      return false;
    }
  }

  static async recordGpsEvent(companyId: string, event: import('../types').GpsLocationEvent): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'gps_events', event.id);
      await setDoc(ref, event);
      return true;
    } catch (e) {
      console.error('Error recording GPS event:', e);
      return false;
    }
  }

  static subscribeToTrackingSessionEvents(session: import('../types').UserSession, companyId: string, trackingSessionId: string, onData: (events: import('../types').GpsLocationEvent[]) => void): () => void {
     try {
      const colRef = collection(db, 'companies', companyId, 'gps_events');
      const q = query(colRef, where('trackingSessionId', '==', trackingSessionId), orderBy('sequenceNumber', 'asc'));
      return onSnapshot(q, (snap) => {
        const events = snap.docs.map(d => ({ id: d.id, ...d.data() } as import('../types').GpsLocationEvent));
        onData(events);
      }, (err) => {
        console.warn('[Firestore] subscribeToTrackingSessionEvents error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToTrackingSessionEvents exception:', e);
      onData([]);
      return () => {};
    }
  }

  // ==========================================
  // LEADS (Public Forms & Super Admin CRM)
  // ==========================================

  static async createLead(lead: import('../types').LeadRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'leads', lead.id);
      await setDoc(ref, lead);
      return true;
    } catch (e) {
      console.error('Error creating lead:', e);
      return false;
    }
  }

  static async getLeads(): Promise<import('../types').LeadRecord[]> {
    try {
      const colRef = collection(db, 'leads');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => d.data() as import('../types').LeadRecord);
    } catch (err) {
      console.error('[FirestoreService] getLeads error:', err);
      return [];
    }
  }

  static subscribeToLeads(onData: (leads: import('../types').LeadRecord[]) => void): () => void {
    try {
      const colRef = collection(db, 'leads');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snap) => {
        const leads = snap.docs.map(d => ({ ...d.data() } as import('../types').LeadRecord));
        onData(leads);
      }, (err) => {
        console.error('[Firestore] subscribeToLeads error:', err);
        onData([]);
      });
    } catch (e) {
      console.error('[Firestore] subscribeToLeads exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async updateLead(leadId: string, updates: Partial<import('../types').LeadRecord>): Promise<boolean> {
    try {
      const ref = doc(db, 'leads', leadId);
      await updateDoc(ref, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error('Error updating lead:', e);
      return false;
    }
  }

  static async deleteLead(leadId: string): Promise<boolean> {
    try {
      const ref = doc(db, 'leads', leadId);
      await deleteDoc(ref);
      return true;
    } catch (e) {
      console.error('Error deleting lead:', e);
      return false;
    }
  }
} // <- this is the closing brace for the class



// Indian Rupee Words Helper Function
function numberToIndianRupeesWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(n: number): string {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str.trim();
  }

  let num = Math.floor(amount);
  let crore = Math.floor(num / 10000000);
  num %= 10000000;
  let lakh = Math.floor(num / 100000);
  num %= 100000;
  let thousand = Math.floor(num / 1000);
  num %= 1000;
  let remainder = num;

  let result = '';
  if (crore > 0) result += convertChunk(crore) + ' Crore ';
  if (lakh > 0) result += convertChunk(lakh) + ' Lakh ';
  if (thousand > 0) result += convertChunk(thousand) + ' Thousand ';
  if (remainder > 0) result += convertChunk(remainder) + ' ';

  return (result.trim() + ' Rupees Only').replace(/\s+/g, ' ');


}

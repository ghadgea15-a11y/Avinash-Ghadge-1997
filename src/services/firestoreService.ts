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
  runTransaction,
  writeBatch,
  startAfter,
  startAt,
  getCountFromServer,
  Transaction
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { QueryScopeEngine } from './queryScopeEngine';
import { SessionManager } from './sessionManager';
import { AuditTrailService } from './auditTrailService';
import { RbacService } from './rbacService';
import { SuspiciousPunchService } from './suspiciousPunchService';
import { BulkExportGovernanceService } from './bulkExportGovernanceService';
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
  VisitorWatchlistRecord,
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
  TicketAttachmentRecord,
  TicketStatusHistoryRecord,
  TicketStatusTransitionPayload,
  JobRequisitionRecord,
  CandidateRecord,
  CandidateDocumentRecord,
  ScreeningRecord,
  InterviewRecord,
  SelectionRecord,
  BackgroundVerificationRecord,
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

import { BpmService } from './bpmService';

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
      const docRef = doc(db, 'companies', companyId || '', 'vendors', vendor.id);
      await setDoc(docRef, vendor, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] saveVendor error:', err);
      return false;
    }
  }

  static async deleteVendor(companyId: string, vendorId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId || '', 'vendors', vendorId);
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
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'EMPLOYEES'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
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

  static async getEmployees(session: UserSession, companyId: string): Promise<EmployeeRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'employees');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'EMPLOYEES'));
      const snap = await getDocs(q);
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
      const docRef = doc(db, 'companies', companyId || '', 'approval_requests', id);
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
   * Check if an Employee Email is unique within the company
   */
  static async isEmployeeEmailUnique(companyId: string, email: string, excludeInternalId?: string): Promise<boolean> {
    try {
      const colRef = collection(db, 'companies', companyId, 'employees');
      const q = query(colRef, where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) return true;
      if (excludeInternalId && snap.docs.length === 1 && snap.docs[0].id === excludeInternalId) return true;
      
      return false;
    } catch (err) {
      console.error('[FirestoreService] isEmployeeEmailUnique error:', err);
      return false;
    }
  }

  /**
   * Create or update Employee document in Firestore (Dual-writing for 100% sync)
   */
  static async inviteEmployeeUser(companyId: string, employeeId: string): Promise<{ success: boolean; resetLink?: string; message?: string }> {
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const inviteEmployee = httpsCallable(functions, 'inviteEmployee');
      const result = await inviteEmployee({ companyId, employeeId }) as any;
      if (result.data && result.data.success) {
        return { 
          success: true, 
          resetLink: result.data.resetLink,
          message: result.data.message || 'Invitation sent successfully.' 
        };
      }
      return { success: false, message: result.data?.message || 'Failed to create system invitation.' };
    } catch (err: any) {
      console.warn('[FirestoreService] Cloud function inviteEmployee unavailable, using client fallback:', err);
      try {
        const empRef = doc(db, 'companies', companyId || '', 'employees', employeeId);
        const empSnap = await getDoc(empRef);
        if (!empSnap.exists()) return { success: false, message: 'Employee record not found.' };
        const emp = empSnap.data() as EmployeeRecord;
        if (!emp.email) return { success: false, message: 'Email address is required for system access.' };

        const email = emp.email.trim().toLowerCase();
        const invId = `INV-${employeeId}-${Date.now().toString(36).toUpperCase()}`;
        const invRef = doc(db, 'companies', companyId || '', 'invitations', invId);
        const timestamp = new Date().toISOString();

        await setDoc(invRef, {
          id: invId,
          companyId,
          employeeId,
          email,
          role: emp.role || 'GUARD',
          siteId: emp.assignedSiteId || '',
          departmentId: emp.departmentId || '',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: timestamp,
          updatedAt: timestamp
        });

        await setDoc(empRef, { 
          hasSystemAccess: true, 
          invitationId: invId, 
          invitationSentAt: timestamp,
          updatedAt: timestamp 
        }, { merge: true });

        return { 
          success: true, 
          message: `System access invitation recorded for ${email}.` 
        };
      } catch (clientErr: any) {
        console.error('[FirestoreService] inviteEmployeeUser fallback error:', clientErr);
        return { success: false, message: clientErr.message || 'Invitation failed.' };
      }
    }
  }

  static async saveEmployee(companyId: string, employee: EmployeeRecord, actor: { id: string, name: string }): Promise<boolean> {
    const newPath = `companies/${companyId}/employees/${employee.id}`;
    try {
      // Enterprise Conflict Pre-Validation (Optimized)
      try {
        const { EnterpriseConflictEngine } = await import('./enterpriseConflictEngine');
        const empAny = employee as any;
        
        // Targeted conflict check for ID duplicates (Aadhaar/PAN)
        const conflictQueries: any[] = [];
        if (empAny.aadhaarNumber) {
          conflictQueries.push(getDocs(query(collection(db, 'companies', companyId, 'employees'), where('aadhaarNumber', '==', empAny.aadhaarNumber), where('status', '==', 'ACTIVE'))));
        }
        if (empAny.panNumber) {
          conflictQueries.push(getDocs(query(collection(db, 'companies', companyId, 'employees'), where('panNumber', '==', empAny.panNumber), where('status', '==', 'ACTIVE'))));
        }
        
        const conflictSnaps = await Promise.all(conflictQueries);
        const conflictingEmployees = conflictSnaps.flatMap((s: any) => s.docs.map((d: any) => ({ id: d.id, ...d.data() } as EmployeeRecord)));
        
        // For sites, we can still fetch all as they are usually < 100 per company
        const snapSites = await getDocs(query(collection(db, 'companies', companyId, 'sites')));
        const allSites = snapSites.docs.map(d => ({ id: d.id, ...d.data() } as SiteRecord));
        const activeOverrides = await EnterpriseConflictEngine.getActiveOverrides(companyId);
        
        const conflictRes = EnterpriseConflictEngine.validateEmployeeAssignment(
          employee,
          conflictingEmployees, // Pass only the potentially conflicting ones
          allSites,
          activeOverrides.map(o => o.override)
        );

        if (conflictRes.hasBlockers) {
          const blockerMsg = `[CONFLICT BLOCKED]: ${conflictRes.summary} - ${conflictRes.conflicts[0]?.reason}`;
          console.error(blockerMsg);
          await (AuditTrailService as any).recordEvent({
            session: { userId: actor.id, companyId, role: "SYSTEM" },
            companyId,
            module: "CONFLICT_GOVERNANCE",
            action: "ENTERPRISE_CONFLICT_BLOCKED",
            method: "BLOCK",
            entity: "EmployeeRecord",
            entityId: employee.id,
            success: false,
            severity: "HIGH",
            reason: blockerMsg
          });
          throw new Error(blockerMsg);
        }
      } catch (confErr: any) {
        if (confErr.message?.includes('[CONFLICT BLOCKED]')) throw confErr;
        console.warn('[EnterpriseConflictEngine] Pre-validation check non-fatal warning:', confErr);
      }

      const isUpdate = !!employee.updatedAt && employee.createdAt !== employee.updatedAt;
      
      const payload = {
        ...employee,
        companyId, // ensure companyId matches
        hasSystemAccess: !!employee.hasSystemAccess,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      };

      const batch = writeBatch(db);

      // 1. Write to modern subcollection (Android & Web app alignment)
      const refNew = doc(db, 'companies', companyId || '', 'employees', employee.id);
      batch.set(refNew, payload, { merge: true });

      // 2. If employee is linked to Firebase Auth UID, synchronize profile and membership
      if (employee.authUid) {
        const userRef = doc(db, 'users', employee.authUid);
        batch.set(userRef, {
          fullName: `${employee.firstName} ${employee.lastName}`.trim(),
          role: employee.role,
          companyId: companyId,
          departmentId: employee.departmentId || '',
          assignedSiteId: employee.assignedSiteId || '',
          mobileNumber: employee.contactNumber || '',
          accountStatus: (employee.status === 'SUSPENDED' || employee.status === 'TERMINATED' || employee.status === 'DEACTIVATED') ? 'DISABLED' : 'ACTIVE',
          updatedAt: new Date().toISOString()
        }, { merge: true });

        const memRef = doc(db, 'users', employee.authUid, 'memberships', companyId);
        batch.set(memRef, {
          userId: employee.authUid,
          companyId: companyId,
          employeeId: employee.id,
          role: employee.role,
          siteId: employee.assignedSiteId || '',
          departmentId: employee.departmentId || '',
          status: (employee.status === 'SUSPENDED' || employee.status === 'TERMINATED' || employee.status === 'DEACTIVATED') ? 'SUSPENDED' : 'ACTIVE',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      await batch.commit();

      // 3. Audit Log (Async, don't block return)
      const auditActor: any = { userId: actor.id, companyId, role: 'SYSTEM' };
      if (isUpdate) {
        AuditTrailService.logUpdate(auditActor, 'EMPLOYEES', 'EmployeeRecord', employee.id, `Updated employee ${employee.firstName} ${employee.lastName}`).catch(() => {});
      } else {
        AuditTrailService.logCreate(auditActor, 'EMPLOYEES', 'EmployeeRecord', employee.id, `Created employee ${employee.firstName} ${employee.lastName}`).catch(() => {});
      }

      // Module 10 / Point 5: HCM Compliance Policy Check
      try {
        const { CompliancePolicyEngine } = await import('./compliancePolicyEngine');
        const empAny = employee as any;
        await CompliancePolicyEngine.evaluateTransaction({
          companyId,
          module: 'HCM',
          transactionType: 'EMPLOYEE_SAVE',
          transactionId: employee.id,
          subjectId: employee.id,
          subjectName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
          data: {
            isKycVerified: !!(empAny.aadhaarNumber || empAny.panNumber || empAny.uan || empAny.governmentId),
            hasIdentityProof: !!(empAny.aadhaarNumber || empAny.panNumber || empAny.governmentId),
            status: employee.status
          },
          department: empAny.department || empAny.departmentId,
          source: 'EMPLOYEE_MANAGEMENT'
        } as any);
      } catch (compErr) {
        console.warn('[Compliance] Employee KYC evaluation warning:', compErr);
      }

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, newPath);
      return false;
    }
  }

  /**
   * Updates an employee's security PIN (Dual-write support)
   */
  static async updateEmployeePin(companyId: string, employeeId: string, newPin: string, actorId: string, actorName: string): Promise<boolean> {
    try {
      const empColRef = collection(db, 'companies', companyId, 'employees');
      
      // 1. Try to find by employeeId field
      const q = query(empColRef, where('employeeId', '==', employeeId));
      const snap = await getDocs(q);
      
      let empDocRef: any = null;
      let empData: any = null;
      let docId: string | null = null;

      if (!snap.empty) {
        const empDoc = snap.docs[0];
        docId = empDoc.id;
        empData = empDoc.data();
        empDocRef = doc(db, 'companies', companyId || '', 'employees', docId);
      } else {
        // 2. Try to find by document ID
        const directRef = doc(db, 'companies', companyId || '', 'employees', employeeId);
        const directSnap = await getDoc(directRef);
        if (directSnap.exists()) {
          docId = employeeId;
          empData = directSnap.data();
          empDocRef = directRef;
        }
      }
      
      if (empDocRef) {
        await updateDoc(empDocRef, {
          pin: newPin,
          updatedAt: new Date().toISOString(),
          updatedBy: actorId
        });

        if (empData && empData.authUid) {
          const legacyRef = doc(db, 'users', empData.authUid);
          const legacySnap = await getDoc(legacyRef);
          if (legacySnap.exists()) {
            await updateDoc(legacyRef, { pin: newPin });
          }
        }
      } else if (companyId === 'GLOBAL_ADMIN' || actorId) {
        // 3. Fallback for Super Admins or users without a specific employee record
        // Try updating the users collection directly using actorId (Firebase UID)
        const userRef = doc(db, 'users', actorId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, { 
            pin: newPin,
            updatedAt: new Date().toISOString()
          });
          
          // Also sync to super_admins if they are a super admin
          const saRef = doc(db, 'super_admins', actorId);
          const saSnap = await getDoc(saRef);
          if (saSnap.exists()) {
            await updateDoc(saRef, { 
              pin: newPin,
              updatedAt: new Date().toISOString()
            });
          }
        } else {
          throw new Error('Employee record not found and no associated user profile identified.');
        }
      } else {
        throw new Error('Employee record not found');
      }
      
      await this.logAuditEvent(companyId, actorId, actorName, 'SECURITY_PIN_UPDATED', `Security PIN updated for ${employeeId}`);
      return true;
    } catch (err) {
      console.error('[FirestoreService] updateEmployeePin error:', err);
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
        await setDoc(doc(db, 'companies', companyId || '', 'candidates', candidate.id), {
          stage: 'ONBOARDED', // Using ONBOARDED as requested in Module 12 types
          convertedToEmployeeId: employeeId,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Update Requisition Capacity (Module 12 / Point 3.7)
        if (candidate.requisitionId) {
          const { TalentAcquisitionService } = await import('./talentAcquisitionService');
          await TalentAcquisitionService.updateRequisitionCapacity(companyId, candidate.requisitionId, 1, -1);
        }

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
      const ref = doc(db, 'companies', companyId || '', 'employees', employeeId, 'lifecycleEvents', eventId);
      
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
      const empRef = doc(db, 'companies', companyId || '', 'employees', employeeId);
      const snap = await getDoc(empRef);
      if (!snap.exists()) return false;

      const employee = snap.data() as EmployeeRecord;
      const tasks = employee.onboardingTasks || [];
      const updatedTasks = tasks.map((t: any) => t.id === taskId ? { 
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
      const mandatoryTasks = updatedTasks.filter((t: any) => t.isMandatory);
      const allMandatoryDone = mandatoryTasks.every((t: any) => t.status === 'COMPLETED' || t.status === 'WAIVED');

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
      const ref = doc(db, 'companies', companyId || '', 'promotions', requestId);
      
      await setDoc(ref, {
        ...request,
        id: requestId,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });

      // Update employee lifecycle status
      await setDoc(doc(db, 'companies', companyId || '', 'employees', request.employeeId), {
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
      const promoRef = doc(db, 'companies', companyId || '', 'promotions', requestId);
      const now = new Date().toISOString();
      const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      let employeeId = '';
      
      await runTransaction(db, async (t) => {
        const promoSnap = await t.get(promoRef);
        if (!promoSnap.exists()) throw new Error('Promotion not found');
        const promo = promoSnap.data() as PromotionRequest;
        
        if (promo.status !== 'PENDING') {
          throw new Error('Promotion is not pending approval');
        }
        
        employeeId = promo.employeeId;
        const empRef = doc(db, 'companies', companyId || '', 'employees', employeeId);
        const eventRef = doc(db, 'companies', companyId || '', 'employees', employeeId, 'lifecycleEvents', eventId);
        
        t.set(empRef, {
          designation: promo.newDesignation,
          departmentId: promo.newDepartmentId,
          reportingManagerId: promo.newManagerId || promo.previousManagerId,
          lifecycleStatus: 'ACTIVE',
          updatedAt: now,
          updatedBy: actor.id
        }, { merge: true });

        t.set(promoRef, {
          status: 'APPROVED',
          approvedBy: actor.id,
          updatedAt: now
        }, { merge: true });

        t.set(eventRef, {
          id: eventId,
          type: 'PROMOTION',
          fromStatus: 'PROMOTION_PENDING',
          toStatus: 'ACTIVE',
          effectiveDate: promo.effectiveDate,
          reason: 'Promotion Approved',
          initiatedBy: promo.initiatedBy,
          approvedBy: actor.id,
          timestamp: now,
          details: { requestId, promoData: promo }
        });
      });
      
      if (employeeId) {
        await this.logAuditEvent(companyId, actor.id, actor.name, 'EMPLOYEE_LIFECYCLE_EVENT', `Recorded PROMOTION event for employee ${employeeId}: Promotion Approved`, employeeId);
      }
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
      // Enterprise Conflict Pre-Validation
      try {
        const { EnterpriseConflictEngine } = await import('./enterpriseConflictEngine');
        const empSnap = await getDoc(doc(db, 'companies', companyId || '', 'employees', request.employeeId));
        if (empSnap.exists()) {
          const emp = { id: empSnap.id, ...empSnap.data() } as EmployeeRecord;
          const xfersSnap = await getDocs(query(collection(db, 'companies', companyId, 'transfers'), where('employeeId', '==', request.employeeId)));
          const allXfers = xfersSnap.docs.map(d => ({ id: d.id, ...d.data() } as TransferRequest));
          const activeOverrides = await EnterpriseConflictEngine.getActiveOverrides(companyId);
          
          const conflictRes = EnterpriseConflictEngine.validateTransferRequest(
            request,
            emp,
            allXfers,
            activeOverrides.map(o => o.override)
          );

          if (conflictRes.hasBlockers) {
            const blockerMsg = `[TRANSFER CONFLICT BLOCKED]: ${conflictRes.summary} - ${conflictRes.conflicts[0]?.reason}`;
            console.error(blockerMsg);
            throw new Error(blockerMsg);
          }
        }
      } catch (confErr: any) {
        if (confErr.message?.includes('[TRANSFER CONFLICT BLOCKED]')) throw confErr;
        console.warn('[EnterpriseConflictEngine] Transfer validation warning:', confErr);
      }

      const requestId = `XFER-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'transfers', requestId);
      
      await setDoc(ref, {
        ...request,
        id: requestId,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });

      // Update employee lifecycle status
      await setDoc(doc(db, 'companies', companyId || '', 'employees', request.employeeId), {
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
      const xferRef = doc(db, 'companies', companyId || '', 'transfers', requestId);
      const now = new Date().toISOString();
      const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      let employeeId = '';
      
      await runTransaction(db, async (t) => {
        const xferSnap = await t.get(xferRef);
        if (!xferSnap.exists) throw new Error('Transfer not found');
        const xfer = xferSnap.data() as TransferRequest;
        
        if (xfer.status !== 'PENDING') {
          throw new Error('Transfer is not pending approval');
        }
        
        employeeId = xfer.employeeId;
        const empRef = doc(db, 'companies', companyId || '', 'employees', employeeId);
        const eventRef = doc(db, 'companies', companyId || '', 'employees', employeeId, 'lifecycleEvents', eventId);
        
        t.set(empRef, {
          assignedSiteId: xfer.newSiteId,
          assignedBranchId: xfer.newBranchId,
          assignedRegionId: xfer.newRegionId,
          lifecycleStatus: 'ACTIVE',
          updatedAt: now,
          updatedBy: actor.id
        }, { merge: true });

        t.set(xferRef, {
          status: 'APPROVED',
          approvedBy: actor.id,
          updatedAt: now
        }, { merge: true });

        t.set(eventRef, {
          id: eventId,
          type: 'TRANSFER',
          fromStatus: 'TRANSFER_PENDING',
          toStatus: 'ACTIVE',
          effectiveDate: xfer.effectiveDate,
          reason: 'Transfer Approved',
          initiatedBy: xfer.initiatedBy,
          approvedBy: actor.id,
          timestamp: now,
          details: { requestId, transferData: xfer }
        });
      });
      
      if (employeeId) {
        await this.logAuditEvent(companyId, actor.id, actor.name, 'EMPLOYEE_LIFECYCLE_EVENT', `Recorded TRANSFER event for employee ${employeeId}: Transfer Approved`, employeeId);
      }
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
    request: Omit<ExitRequest, 'id' | 'status' | 'createdAt'>,
    actor: { id: string, name: string }
  ): Promise<string | null> {
    try {
      const requestId = `EXIT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const exitRef = doc(db, 'companies', companyId || '', 'exits', requestId);
      const empRef = doc(db, 'companies', companyId || '', 'employees', request.employeeId);
      const now = new Date().toISOString();
      const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const eventRef = doc(db, 'companies', companyId || '', 'employees', request.employeeId, 'lifecycleEvents', eventId);

      await runTransaction(db, async (t) => {
        t.set(exitRef, {
          ...request,
          id: requestId,
          status: 'PENDING',
          createdAt: now
        });
        
        t.set(empRef, {
          lifecycleStatus: 'EXIT_INITIATED'
        }, { merge: true });

        t.set(eventRef, {
          id: eventId,
          type: 'EXIT',
          toStatus: 'EXIT_INITIATED',
          effectiveDate: request.lastWorkingDay,
          reason: request.reason,
          initiatedBy: actor.id,
          timestamp: now,
          details: { requestId, exitType: request.exitType }
        });
      });

      await this.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        'EMPLOYEE_LIFECYCLE_EVENT',
        `Recorded EXIT event for employee ${request.employeeId}: ${request.reason || 'No reason provided'}`,
        request.employeeId
      );

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
      const exitRef = doc(db, 'companies', companyId || '', 'exits', requestId);
      const now = new Date().toISOString();
      const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      let employeeId = '';

      await runTransaction(db, async (t) => {
        const exitSnap = await t.get(exitRef);
        if (!exitSnap.exists()) throw new Error('Exit not found');
        const exit = exitSnap.data() as ExitRequest;
        
        if (exit.status !== 'PENDING') {
          throw new Error('Exit is not pending approval');
        }
        
        employeeId = exit.employeeId;
        const empRef = doc(db, 'companies', companyId || '', 'employees', employeeId);
        const eventRef = doc(db, 'companies', companyId || '', 'employees', employeeId, 'lifecycleEvents', eventId);

        t.set(empRef, {
          lifecycleStatus: 'EXITED',
          status: 'DEACTIVATED',
          updatedAt: now,
          updatedBy: actor.id
        }, { merge: true });

        t.set(exitRef, {
          status: 'APPROVED',
          approvedBy: actor.id,
          updatedAt: now
        }, { merge: true });

        t.set(eventRef, {
          id: eventId,
          type: 'EXIT',
          fromStatus: 'EXIT_INITIATED',
          toStatus: 'EXITED',
          effectiveDate: exit.lastWorkingDay,
          reason: 'Exit Approved',
          initiatedBy: exit.initiatedBy,
          approvedBy: actor.id,
          timestamp: now,
          details: { requestId, exitData: exit }
        });
      });

      if (employeeId) {
        await this.logAuditEvent(companyId, actor.id, actor.name, 'EMPLOYEE_LIFECYCLE_EVENT', `Recorded EXIT event for employee ${employeeId}: Exit Approved`, employeeId);
      }
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

      const refNew = doc(db, 'companies', companyId || '', 'employees', employeeId);
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
   * Suspend Employee
   */
  static async suspendEmployee(
    companyId: string,
    employeeId: string,
    reason: string,
    effectiveDate: string,
    actor: { id: string; name: string }
  ): Promise<boolean> {
    try {
      const empRef = doc(db, 'companies', companyId || '', 'employees', employeeId);
      const empSnap = await getDoc(empRef);
      if (!empSnap.exists()) return false;

      await setDoc(empRef, {
        lifecycleStatus: 'SUSPENDED',
        status: 'INACTIVE', // Also mark overall status inactive
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      }, { merge: true });

      await this.addLifecycleEvent(companyId, employeeId, {
        type: 'STATUS_CHANGE',
        toStatus: 'SUSPENDED',
        effectiveDate,
        reason,
        initiatedBy: actor.id,
        timestamp: new Date().toISOString()
      }, actor);

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `suspend employee ${employeeId}`);
      return false;
    }
  }

  /**
   * Revoke Suspension
   */
  static async revokeSuspension(
    companyId: string,
    employeeId: string,
    reason: string,
    effectiveDate: string,
    actor: { id: string; name: string }
  ): Promise<boolean> {
    try {
      const empRef = doc(db, 'companies', companyId || '', 'employees', employeeId);
      const empSnap = await getDoc(empRef);
      if (!empSnap.exists()) return false;

      await setDoc(empRef, {
        lifecycleStatus: 'ACTIVE',
        status: 'ACTIVE', 
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      }, { merge: true });

      await this.addLifecycleEvent(companyId, employeeId, {
        type: 'STATUS_CHANGE',
        toStatus: 'ACTIVE',
        effectiveDate,
        reason: reason || 'Suspension Revoked',
        initiatedBy: actor.id,
        timestamp: new Date().toISOString()
      }, actor);

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `revoke suspension ${employeeId}`);
      return false;
    }
  }

  /**
   * Confirm Probation
   */
  static async confirmProbation(
    companyId: string,
    employeeId: string,
    effectiveDate: string,
    actor: { id: string; name: string }
  ): Promise<boolean> {
    try {
      const empRef = doc(db, 'companies', companyId || '', 'employees', employeeId);
      const empSnap = await getDoc(empRef);
      if (!empSnap.exists()) return false;

      await setDoc(empRef, {
        employmentType: 'PERMANENT',
        lifecycleStatus: 'ACTIVE',
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      }, { merge: true });

      await this.addLifecycleEvent(companyId, employeeId, {
        type: 'STATUS_CHANGE',
        fromStatus: 'PROBATION',
        toStatus: 'PERMANENT',
        effectiveDate,
        reason: 'Probation Confirmation',
        initiatedBy: actor.id,
        timestamp: new Date().toISOString()
      }, actor);

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `confirm probation ${employeeId}`);
      return false;
    }
  }

  /**
   * Process Final Settlement
   */
  static async processFinalSettlement(
    companyId: string,
    employeeId: string,
    settlementAmount: number,
    remarks: string,
    actor: { id: string; name: string }
  ): Promise<boolean> {
    try {
      const empRef = doc(db, 'companies', companyId || '', 'employees', employeeId);
      const empSnap = await getDoc(empRef);
      if (!empSnap.exists()) return false;

      await setDoc(empRef, {
        finalSettlementStatus: 'SETTLED',
        finalSettlementAmount: settlementAmount,
        finalSettlementDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      }, { merge: true });

      await this.addLifecycleEvent(companyId, employeeId, {
        type: 'EXIT',
        toStatus: 'SETTLED',
        effectiveDate: new Date().toISOString(),
        reason: `Final Settlement: ₹${settlementAmount}. ${remarks}`,
        initiatedBy: actor.id,
        timestamp: new Date().toISOString()
      }, actor);

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `final settlement ${employeeId}`);
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

      const refNew = doc(db, 'companies', companyId || '', 'employees', employeeId);
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
      const refNew = doc(db, 'companies', companyId || '', 'employees', employeeId);
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
      const refNew = doc(db, 'companies', companyId || '', 'employees', employeeId);
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
      const ref = doc(db, 'companies', companyId || '', 'shifts', shift.id);
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
      const ref = doc(db, 'companies', companyId || '', 'shifts', shiftId);
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
      const ref = doc(db, 'companies', companyId || '', 'shifts', shiftId);
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
      // Enterprise Conflict Pre-Validation (Optimized)
      try {
        const { EnterpriseConflictEngine } = await import('./enterpriseConflictEngine');
        
        // Only fetch relevant data for this employee/date conflict check
        const targetDate = roster.date || roster.rosterDate || new Date().toISOString().split('T')[0];
        const q = query(
          collection(db, 'companies', companyId, 'rosters'),
          where('employeeId', '==', roster.employeeId),
          where('date', '==', targetDate)
        );
        const snapRosters = await getDocs(q);
        const existingRosters = snapRosters.docs.map(d => ({ id: d.id, ...d.data() } as RosterRecord));
        
        // Shifts and Sites are usually smaller, but we should still be careful.
        // For a true enterprise, these should be cached or fetched by ID.
        const snapShifts = await getDocs(query(collection(db, 'companies', companyId, 'shifts')));
        const allShifts = snapShifts.docs.map(d => ({ id: d.id, ...d.data() } as ShiftRecord));
        const snapSites = await getDocs(query(collection(db, 'companies', companyId, 'sites')));
        const allSites = snapSites.docs.map(d => ({ id: d.id, ...d.data() } as SiteRecord));
        
        const activeOverrides = await EnterpriseConflictEngine.getActiveOverrides(companyId);

        const conflictRes = EnterpriseConflictEngine.validateRosterAssignment(
          roster,
          existingRosters,
          allShifts,
          allSites,
          activeOverrides.map(o => o.override)
        );

        if (conflictRes.hasBlockers) {
          const blockerMsg = `[ROSTER CONFLICT BLOCKED]: ${conflictRes.summary} - ${conflictRes.conflicts[0]?.reason}`;
          console.error(blockerMsg);
          throw new Error(blockerMsg);
        }
      } catch (confErr: any) {
        if (confErr.message?.includes('[ROSTER CONFLICT BLOCKED]')) throw confErr;
        console.warn('[EnterpriseConflictEngine] Roster validation warning:', confErr);
      }

      const rId = roster.id || `ROSTER_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const ref = doc(db, 'companies', companyId || '', 'rosters', rId);
      await setDoc(ref, {
        ...roster,
        id: rId,
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
      // Enterprise Conflict Pre-Validation for Bulk Roster
      try {
        const { EnterpriseConflictEngine } = await import('./enterpriseConflictEngine');
        const snapRosters = await getDocs(query(collection(db, 'companies', companyId, 'rosters')));
        const existingRosters = snapRosters.docs.map(d => ({ id: d.id, ...d.data() } as RosterRecord));
        const snapShifts = await getDocs(query(collection(db, 'companies', companyId, 'shifts')));
        const allShifts = snapShifts.docs.map(d => ({ id: d.id, ...d.data() } as ShiftRecord));
        const snapSites = await getDocs(query(collection(db, 'companies', companyId, 'sites')));
        const allSites = snapSites.docs.map(d => ({ id: d.id, ...d.data() } as SiteRecord));
        const activeOverrides = await EnterpriseConflictEngine.getActiveOverrides(companyId);

        for (const roster of rosters) {
          const conflictRes = EnterpriseConflictEngine.validateRosterAssignment(
            roster,
            existingRosters,
            allShifts,
            allSites,
            activeOverrides.map(o => o.override)
          );

          if (conflictRes.hasBlockers) {
            const blockerMsg = `[BULK ROSTER CONFLICT BLOCKED]: ${roster.employeeName || roster.employeeId} - ${conflictRes.conflicts[0]?.reason}`;
            console.error(blockerMsg);
            throw new Error(blockerMsg);
          }
        }
      } catch (confErr: any) {
        if (confErr.message?.includes('[BULK ROSTER CONFLICT BLOCKED]')) throw confErr;
        console.warn('[EnterpriseConflictEngine] Bulk roster validation warning:', confErr);
      }

      await runTransaction(db, async (transaction) => {
        for (const roster of rosters) {
          const rId = roster.id || `ROSTER_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          roster.id = rId;
          const ref = doc(db, 'companies', companyId || '', 'rosters', rId);
          transaction.set(ref, {
            ...roster,
            id: rId,
            companyId,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      });

      // Send Notifications to employees
      for (const roster of rosters) {
        const notifId = `NOTIF_ROSTER_${roster.id}`;
        const notifRef = doc(db, 'companies', companyId || '', 'notifications', notifId);
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

            // Module 10.4: Bulk Governance Evaluation
      const sessionInfo = { userId: actor.id, role: 'COMPANY_ADMIN', displayName: actor.name, companyId };
      await BulkExportGovernanceService.evaluateAndRecordBulkOperation({
        session: sessionInfo as any,
        companyId,
        module: 'WFM_ROSTER',
        entityType: 'RosterRecord',
        operation: 'BULK_ASSIGN',
        affectedRecordCount: rosters.length,
        affectedRecordIds: rosters.map(r => r.id || ''),
        reason: `Assigned shifts to ${rosters.length} members for ${rosters[0]?.date || rosters[0]?.rosterDate}`,
        metadata: { siteId: rosters[0]?.siteId, siteName: rosters[0]?.siteName }
      });

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
      const ref = doc(db, 'companies', companyId || '', 'rosters', rosterId);
      const snap = await getDoc(ref);
      const rosterData = snap.data() as RosterRecord | undefined;
      
      await deleteDoc(ref);

      if (rosterData) {
        const notifId = `NOTIF_ROSTER_DEL_${rosterId}`;
        const notifRef = doc(db, 'companies', companyId || '', 'notifications', notifId);
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
      const ref = doc(db, 'companies', companyId || '', 'attendance', record.id);
      
      // Ensure data consistency between 'date' and 'attendanceDate'
      const normalizedRecord = { ...record };
      if (!normalizedRecord.date && normalizedRecord.attendanceDate) {
        normalizedRecord.date = normalizedRecord.attendanceDate;
      } else if (normalizedRecord.date && !normalizedRecord.attendanceDate) {
        normalizedRecord.attendanceDate = normalizedRecord.date;
      }

      await setDoc(ref, {
        ...normalizedRecord,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async getRostersByDate(companyId: string, date: string): Promise<RosterRecord[]> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'rosters'),
        where('date', '==', date)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as RosterRecord));
    } catch (err) {
      console.warn('[FirestoreService] getRostersByDate error:', err);
      return [];
    }
  }

  static async getAttendanceById(companyId: string, attendanceId: string): Promise<AttendanceRecord | null> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'attendance', attendanceId);
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as AttendanceRecord) : null;
    } catch (err) {
      return null;
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
    selfieBase64?: string,
    biometricResult?: import('../types').BiometricVerificationResult,
    geofenceOverrideRequested?: boolean,
    geofenceOverrideReason?: string
  ): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
    const date = new Date().toISOString().split('T')[0];
    const id = `ATT-${rosterId}`;
    try {
      const now = new Date().toISOString();
      
      const result = await runTransaction(db, async (transaction) => {
        const ref = doc(db, 'companies', companyId || '', 'attendance', id);
        const snap = await transaction.get(ref);
        
        if (snap.exists()) {
          return { success: false, message: 'Attendance already recorded for this roster slot.', record: snap.data() as AttendanceRecord };
        }

        // Verify Employee Status & Get Profile Photo
        const empRef = doc(db, 'companies', companyId || '', 'employees', employeeId);
        const empSnap = await transaction.get(empRef);
        if (!empSnap.exists()) {
          return { success: false, message: 'Employee record not found. Cannot punch in.' };
        }
        const empData = empSnap.data() as EmployeeRecord;
        if (empData.status !== 'ACTIVE') {
          return { success: false, message: `Punch-in denied: Employee status is currently ${empData.status.replace(/_/g, ' ')}.` };
        }

        // Statutory & Training Compliance Verification (PSARA / Fire Safety / Security Refreshers)
        const { CertificationTrackingService } = await import('./certificationTrackingService');
        const certCompliance = await CertificationTrackingService.checkEmployeeComplianceStatus(companyId, employeeId);
        if (!certCompliance.isCompliant && !geofenceOverrideRequested) {
          return {
            success: false,
            message: `Punch-in denied: ${certCompliance.blockingReason} Please complete statutory renewal before site authorization.`
          };
        }

        const { LearningManagementService } = await import('./learningManagementService');
        const trainingCompliance = await LearningManagementService.checkEmployeeTrainingCompliance(companyId, employeeId);
        if (!trainingCompliance.isCompliant && !geofenceOverrideRequested) {
          return {
            success: false,
            message: `Punch-in denied: ${trainingCompliance.blockingReason}`
          };
        }

        // AI Vision Verification (Face Match & Liveness)
        let aiVerificationResult: any = null;
        if (selfieBase64 && empData.profilePhotoUrl) {
          const { AiVisionService } = await import('./aiVisionService');
          // In a real production environment, this should ideally be handled in a background Cloud Function
          // but for this implementation we call the service.
          aiVerificationResult = await AiVisionService.verifyLivenessAndMatch(selfieBase64, empData.profilePhotoUrl);
        }

        const metrics = WfmService.calculateAttendanceMetrics(shift, date, now);
        
        // Geo-Fence Validation
        let geoVerification: import('../types').GeoVerificationData | undefined = undefined;
        const siteSnap = await transaction.get(doc(db, 'companies', companyId || '', 'sites', siteId));
        
        if (siteSnap.exists()) {
          const site = siteSnap.data() as SiteRecord;
          if (gps) {
            const { GeoUtils } = await import('../utils/geoUtils');
            const suspiciousFlag = GeoUtils.detectTampering(gps.latitude, gps.longitude, Date.now()) || undefined;
            
            if ((site as any).geofenceEnabled && site.latitude && site.longitude) {
              const geoResult = GeoUtils.evaluateGeofence(
                gps.latitude, gps.longitude, gps.accuracy || 0,
                site.latitude, site.longitude, (site as any).geofenceRadius || 100, (site as any).accuracyThreshold || 50
              );

              // Log Anomaly if AI Vision fails or Geofence fails
              const isVisionFailed = aiVerificationResult && (!aiVerificationResult.isMatch || aiVerificationResult.isSpoofDetected);

              if ((geoResult.result === 'OUTSIDE_GEOFENCE' && !geofenceOverrideRequested) || isVisionFailed) {
                const anomalyId = `SUSP-PUNCH-${Date.now()}-${employeeId}`;
                const anomalyRef = doc(db, 'companies', companyId || '', 'suspicious_punches', anomalyId);
                
                const anomalyData: any = {
                  id: anomalyId,
                  companyId,
                  employeeId,
                  employeeName,
                  siteId,
                  siteName,
                  punchType: 'PUNCH_IN',
                  punchTimestamp: now,
                  severity: isVisionFailed ? 'CRITICAL' : 'HIGH',
                  riskScore: isVisionFailed ? 95 : 85,
                  status: 'UNRESOLVED',
                  deviceInfo: deviceInfo || 'Web/Mobile Client',
                  createdAt: now
                };

                if (isVisionFailed) {
                  anomalyData.anomalyType = aiVerificationResult.isSpoofDetected ? 'SPOOFING_ATTEMPT' : 'IDENTITY_MISMATCH';
                  anomalyData.evidence = `AI Vision Alert: ${aiVerificationResult.analysis}`;
                  anomalyData.aiMetadata = aiVerificationResult;
                  anomalyData.selfieUrl = selfieBase64; // In production, upload to Storage and save URL
                } else {
                  anomalyData.anomalyType = 'GEOFENCE_BREACH';
                  anomalyData.evidence = `Location Breach: ${Math.round(geoResult.distance)}m from site.`;
                  anomalyData.gpsCoordinates = {
                    latitude: gps.latitude,
                    longitude: gps.longitude,
                    distanceMeters: Math.round(geoResult.distance)
                  };
                }

                transaction.set(anomalyRef, anomalyData);

                if (isVisionFailed) {
                  return { success: false, message: `Identity Verification Failed: ${aiVerificationResult.analysis}. This attempt has been logged for security audit.` };
                }

                if (geoResult.result === 'OUTSIDE_GEOFENCE' && !geofenceOverrideRequested) {
                  return { success: false, message: `Punch-In Rejected: You are ${Math.round(geoResult.distance)}m from site.` };
                }
              }
              
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
          attendanceDate: date, date: date,
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

        transaction.set(ref, record);
        return { success: true, message: 'Check-in successful', record };
      });

      if (result.success && result.record) {
        try {
          const { CompliancePolicyEngine } = await import('./compliancePolicyEngine');
          CompliancePolicyEngine.evaluateTransaction({
            companyId,
            module: 'WFM',
            transactionType: 'ATTENDANCE_PUNCH',
            transactionId: id,
            subjectId: employeeId,
            subjectName: employeeName,
            data: {
              distanceMeters: result.record.checkInGps?.distanceFromSite ?? 0,
              lateMinutes: result.record.lateMinutes,
              isGeofenceViolated: result.record.checkInGps?.verification === 'OUTSIDE_GEOFENCE',
              biometricPassed: biometricResult === 'SUCCESS' || biometricResult === 'NOT_REQUIRED'
            },
            siteId,
            source: 'PUNCH_IN'
          } as any).catch(() => {});
        } catch (compErr) {
          console.warn('[Compliance] Punch compliance evaluation error:', compErr);
        }
      }

      return { success: result.success, message: result.message, record: result.record };
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
      const now = new Date().toISOString();
      
      const result = await runTransaction(db, async (transaction) => {
        const ref = doc(db, 'companies', companyId || '', 'attendance', attendanceId);
        const snap = await transaction.get(ref);
        if (!snap.exists()) {
          return { success: false, message: 'Attendance record not found' };
        }

        const record = snap.data() as AttendanceRecord;
        if (record.checkOut) {
          return { success: false, message: 'Already punched out.' };
        }

        const policy = await this.getOvertimePolicy(companyId, record.siteId || '');
        const calcResult = AttendanceCalculationEngine.calculate({
          workDate: record.attendanceDate || new Date().toISOString().split('T')[0],
          shift,
          checkInIso: record.checkIn,
          checkOutIso: now,
          policy: policy || undefined,
          siteId: record.siteId || '',
          rosterId: record.rosterId
        });

        // Geo-Fence & Biometric Validation
        let geoVerification: import('../types').GeoVerificationData | undefined = undefined;
        const siteSnap = await transaction.get(doc(db, 'companies', companyId || '', 'sites', record.siteId || ''));
        
        if (siteSnap.exists()) {
        const site = siteSnap.data() as SiteRecord;
        if (gps) {
          const { GeoUtils } = await import('../utils/geoUtils');
          const suspiciousFlag = GeoUtils.detectTampering(gps.latitude, gps.longitude, Date.now()) || undefined;
          
          if ((site as any).geofenceEnabled && site.latitude && site.longitude) {
            const geoResult = GeoUtils.evaluateGeofence(
              gps.latitude, gps.longitude, gps.accuracy || 0,
              site.latitude, site.longitude, (site as any).geofenceRadius || 100, (site as any).accuracyThreshold || 50
            );

            // STRICT SERVER-SIDE REJECTION IF OUTSIDE GEOFENCE
            if (geoResult.result === 'OUTSIDE_GEOFENCE' && !geofenceOverrideRequested) {
              // Log suspicious breach
              const anomalyId = `SUSP-GEO-${Date.now()}-${record.employeeId}`;
              const anomalyRef = doc(db, 'companies', companyId || '', 'suspicious_punches', anomalyId);
              transaction.set(anomalyRef, {
                id: anomalyId,
                companyId,
                employeeId: record.employeeId,
                employeeName: record.employeeName,
                siteId: record.siteId || '' || '' || '',
                siteName: record.siteName,
                punchType: 'PUNCH_OUT',
                punchTimestamp: now,
                anomalyType: 'GEOFENCE_BREACH',
                severity: 'HIGH',
                riskScore: 85,
                status: 'UNRESOLVED',
                evidence: `Punch-out rejected: Location is ${Math.round(geoResult.distance)}m from site. Allowed radius is ${(site as any).geofenceRadius || 100}m.`,
                gpsCoordinates: {
                  latitude: gps.latitude,
                  longitude: gps.longitude,
                  accuracy: gps.accuracy || 0,
                  distanceMeters: Math.round(geoResult.distance),
                  siteLatitude: site.latitude,
                  siteLongitude: site.longitude,
                  geofenceRadius: (site as any).geofenceRadius || 100
                },
                deviceInfo: 'Web/Mobile Client',
                createdAt: now
              });

              return {
                success: false,
                message: `Punch-Out Rejected: You are ${Math.round(geoResult.distance)}m from ${record.siteName || 'the site'}, outside the permitted geofence radius (${(site as any).geofenceRadius || 100}m).`
              };
            }
            
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

        transaction.set(ref, updates, { merge: true });

        // Automatically create Overtime Request if Overtime exists
        if (calcResult.calculatedOvertimeMinutes > 0) {
          await this.createOrSyncOvertimeRequest(companyId, {
            attendanceId,
            employeeId: record.employeeId,
            employeeName: record.employeeName,
            siteId: record.siteId || '' || '' || '',
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
          }, transaction);
        }

        return { success: true, message: 'Check-out successful' };
      });

      // Module 10 / Point 5: GRC Compliance Evaluation for Attendance Punch Out & Overtime
      if (result.success) {
        try {
          const { CompliancePolicyEngine } = await import('./compliancePolicyEngine');
          // Fetch the final record to get metrics if needed, or pass from result
          // For compliance, we can use the same metrics calculated above
        } catch (compErr) {
          console.warn('[Compliance] Punch out compliance evaluation error:', compErr);
        }
      }

      return { success: result.success, message: result.message };
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
    const id = `ATT-${rosterId}`;
    try {
      const now = new Date().toISOString();
      const policy = await this.getOvertimePolicy(companyId, siteId || '');
      
      if (action === 'IN') {
        const calcResult = AttendanceCalculationEngine.calculate({
          workDate: date,
          shift,
          checkInIso: now,
          policy: policy || undefined,
          siteId,
          rosterId
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
          attendanceDate: date, date: date,
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
        const ref = doc(db, 'companies', companyId || '', 'attendance', id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return false;
        
        const record = snap.data() as AttendanceRecord;
        const calcResult = AttendanceCalculationEngine.calculate({
          workDate: record.attendanceDate || new Date().toISOString().split('T')[0],
          shift,
          checkInIso: record.checkIn,
          checkOutIso: now,
          policy: policy || undefined,
          siteId,
          rosterId
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
  static async createNotification(companyId: string, notification: AppNotification): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'notifications', notification.id);
      await setDoc(ref, notification);
      return true;
    } catch (e) {
      console.warn('[Firestore] createNotification error:', e);
      return false;
    }
  }

  static subscribeToNotifications(
    companyId: string,
    role: string, 
    onData: (notifications: AppNotification[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'notifications'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const notifs: AppNotification[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as AppNotification)).filter(n => {
            if (!n.roleScope || n.roleScope.length === 0) return true;
            return n.roleScope.includes(role as UserRole);
          });
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
      const sess = SessionManager.getUserSession();
      const q = sess ? query(colRef, ...QueryScopeEngine.buildScope(sess as any, 'SITE_OPERATIONS')) : query(colRef);
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as BranchRecord));
    } catch (err) {
      console.warn('[Firestore] getBranches error:', err);
      return [];
    }
  }

  static async saveBranch(companyId: string, branch: BranchRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'branches', branch.id);
      await setDoc(ref, {
        ...branch, companyId,
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
      const sess = SessionManager.getUserSession();
      const q = sess ? query(colRef, ...QueryScopeEngine.buildScope(sess as any, 'SITE_OPERATIONS')) : query(colRef);
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as SiteRecord));
    } catch (err) {
      console.warn('[Firestore] getSites error:', err);
      return [];
    }
  }

  static async saveSite(companyId: string, site: SiteRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'sites', site.id);
      
      // Sanitize object to remove undefined values
      const sanitizedSite = Object.fromEntries(
        Object.entries({ ...site, companyId, updatedAt: new Date().toISOString() }).filter(([_, v]) => v !== undefined)
      );
      
      await setDoc(ref, sanitizedSite, { merge: true });
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

  /**
   * ============================================================
   * GROUP & MEMBERSHIP MANAGEMENT
   * ============================================================
   */

  static async getGroups(companyId: string): Promise<any[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'groups');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    } catch (err) {
      console.warn('[FirestoreService] getGroups error:', err);
      return [];
    }
  }

  static async saveGroup(companyId: string, group: any): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId || '', 'groups', group.id);
      await setDoc(docRef, {
        ...group,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] saveGroup error:', err);
      return false;
    }
  }

  static async deleteGroup(companyId: string, groupId: string): Promise<boolean> {
    try {
      // 1. Check if group has members
      const membersRef = collection(db, 'companies', companyId, 'groups', groupId, 'members');
      const membersSnap = await getDocs(query(membersRef, limit(1)));
      if (!membersSnap.empty) {
        throw new Error('Cannot delete group with active members. Remove members first.');
      }

      // 2. Delete group doc
      const docRef = doc(db, 'companies', companyId || '', 'groups', groupId);
      await deleteDoc(docRef);
      return true;
    } catch (err: any) {
      console.error('[FirestoreService] deleteGroup error:', err);
      throw err;
    }
  }

  static async getGroupMembers(companyId: string, groupId: string): Promise<any[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'groups', groupId, 'members');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    } catch (err) {
      console.warn('[FirestoreService] getGroupMembers error:', err);
      return [];
    }
  }

  static async assignEmployeeToGroup(companyId: string, groupId: string, employeeId: string, siteId?: string, departmentId?: string): Promise<boolean> {
    try {
      const memberId = `${groupId}_${employeeId}`;
      const docRef = doc(db, 'companies', companyId || '', 'groups', groupId, 'members', memberId);
      
      const memberData: any = {
        id: memberId,
        companyId,
        groupId,
        employeeId,
        siteId,
        departmentId,
        assignedAt: new Date().toISOString(),
        status: 'ACTIVE'
      };

      await setDoc(docRef, memberData);

      // Also update employee record to reflect primary group
      const empRef = doc(db, 'companies', companyId || '', 'employees', employeeId);
      await setDoc(empRef, {
        groupId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update group member count
      const groupRef = doc(db, 'companies', companyId || '', 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const currentCount = groupSnap.data().memberCount || 0;
        await setDoc(groupRef, { memberCount: currentCount + 1 }, { merge: true });
      }

      return true;
    } catch (err) {
      console.error('[FirestoreService] assignEmployeeToGroup error:', err);
      return false;
    }
  }

  static async removeEmployeeFromGroup(companyId: string, groupId: string, employeeId: string): Promise<boolean> {
    try {
      const memberId = `${groupId}_${employeeId}`;
      const docRef = doc(db, 'companies', companyId || '', 'groups', groupId, 'members', memberId);
      await deleteDoc(docRef);

      // Also update employee record
      const empRef = doc(db, 'companies', companyId || '', 'employees', employeeId);
      const empSnap = await getDoc(empRef);
      if (empSnap.exists() && empSnap.data().groupId === groupId) {
        await setDoc(empRef, {
          groupId: null,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // Update group member count
      const groupRef = doc(db, 'companies', companyId || '', 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const currentCount = groupSnap.data().memberCount || 0;
        await setDoc(groupRef, { memberCount: Math.max(0, currentCount - 1) }, { merge: true });
      }

      return true;
    } catch (err) {
      console.error('[FirestoreService] removeEmployeeFromGroup error:', err);
      return false;
    }
  }

  static async saveDepartment(companyId: string, dept: DepartmentRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'departments', dept.id);
      await setDoc(ref, {
        ...dept, companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/departments/${dept.id}`);
      return false;
    }
  }

  static async getCostCentres(companyId: string): Promise<any[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'cost_centres');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn('[Firestore] getCostCentres error:', err);
      return [];
    }
  }

  static async saveCostCentre(companyId: string, costCentre: any): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'cost_centres', costCentre.id);
      await setDoc(ref, {
        ...costCentre, companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/cost_centres/${costCentre.id}`);
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
      const ref = doc(db, 'companies', companyId || '', 'designations', desig.id);
      await setDoc(ref, {
        ...desig, companyId,
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
      const sess = SessionManager.getUserSession();
      const q = sess ? query(colRef, ...QueryScopeEngine.buildScope(sess as any, 'EMPLOYEES')) : query(colRef);
      const snap = await getDocs(q);
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

  static async updateUserMembership(session: UserSession | null, companyId: string, membership: UserMembershipRecord): Promise<boolean> {
    try {
      // 1. Update in company employee subcollection
      const empRef = doc(db, 'companies', companyId || '', 'employees', membership.userId);
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
      const sess = SessionManager.getUserSession();
      const q = sess ? query(colRef, ...QueryScopeEngine.buildScope(sess as any, 'SITE_OPERATIONS')) : query(colRef);
      const snap = await getDocs(q);
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
      const ref = doc(db, 'companies', companyId || '', 'patrol_checkpoints', checkpoint.id);
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
      const ref = doc(db, 'companies', companyId || '', 'patrol_checkpoints', checkpointId);
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
      const ref = doc(db, 'companies', companyId || '', 'patrol_plans', plan.id);
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
      const ref = doc(db, 'companies', companyId || '', 'patrol_plans', planId);
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
      const sess = SessionManager.getUserSession();
      const q = sess ? query(colRef, ...QueryScopeEngine.buildScope(sess as any, 'SITE_OPERATIONS')) : query(colRef);
      const snap = await getDocs(q);
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
      const ref = doc(db, 'companies', companyId || '', 'patrol_tours', tour.id);
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
    currentTour: PatrolTourRecord,
    session?: UserSession
  ): Promise<boolean> {
    const path = `companies/${companyId}/patrol_tours/${tourId}`;
    try {
      const existingScans = currentTour.checkpointScans || [];
      const updatedScans = [...existingScans.filter((s: any) => s.checkpointId !== scan.checkpointId), scan];
      const completedCount = updatedScans.filter((s: any) => s.status === 'COMPLETED').length;
      const totalCheckpoints = currentTour.totalCheckpoints || 1;
      const completionPercentage = Math.round((completedCount / totalCheckpoints) * 100);

      const exceptions = [...(currentTour.exceptionsDetected || [])];
      if (scan.sequenceStatus === 'OUT_OF_SEQUENCE' && !exceptions.includes('OUT_OF_SEQUENCE_SCAN')) {
        exceptions.push('OUT_OF_SEQUENCE_SCAN');
      }
      if (scan.geofenceStatus === 'OUTSIDE_GEOFENCE' && !exceptions.includes('OUTSIDE_GEOFENCE_SCAN')) {
        exceptions.push('OUTSIDE_GEOFENCE_SCAN');
      }

      // �� Operational Intelligence: Anomaly Detection
      if (session) {
        const { SuspiciousPatrolService } = await import('./suspiciousPatrolService');
        const anomaly = await SuspiciousPatrolService.evaluateScan(
          session,
          companyId,
          currentTour.siteId || '',
          { id: scan.checkpointId, checkpointName: scan.checkpointName, code: scan.code },
          scan,
          currentTour
        );
        
        if (anomaly && !exceptions.includes('SUSPICIOUS_SCAN_ACTIVITY')) {
          exceptions.push('SUSPICIOUS_SCAN_ACTIVITY');
        }
      }

      const updates: Partial<PatrolTourRecord> = {
        checkpointScans: updatedScans,
        completedCheckpointsCount: completedCount,
        completionPercentage,
        exceptionsDetected: exceptions,
        updatedAt: new Date().toISOString()
      };

      const ref = doc(db, 'companies', companyId || '', 'patrol_tours', tourId);
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
      const completed = tour.completedCheckpointsCount || (tour.checkpointScans?.filter((s: any) => s.status === 'COMPLETED').length || 0);
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

      const ref = doc(db, 'companies', companyId || '', 'patrol_tours', tourId);
      await setDoc(ref, updates, { merge: true });

      // Also persist legacy patrol log for compatibility
      const legacyLogRef = doc(db, 'companies', companyId || '', 'patrol_logs', tourId);
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
        checkpointsVisited: (tour.checkpointScans || []).map((s: any) => s.checkpointId),
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
      const ref = doc(db, 'companies', companyId || '', 'patrol_tours', tourId);
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
      const ref = doc(db, 'companies', companyId || '', 'patrol_logs', log.id);
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
      const ref = doc(db, 'companies', companyId || '', 'incident_reports', report.id);
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
      const ref = doc(db, 'companies', companyId || '', 'incident_reports', reportId);
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
      const ref = doc(db, 'companies', companyId || '', 'incident_reports', reportId);
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
      const ref = doc(db, 'companies', companyId || '', 'incident_reports', reportId);
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
   * WFM: ATTENDANCE RULES & POLICIES
   * ============================================================
   */
  static async getAttendancePolicy(companyId: string): Promise<OvertimePolicyRecord | null> {
    try {
      const colRef = collection(db, 'companies', companyId, 'attendance_policies');
      const q = query(colRef, where('isDefault', '==', true), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as OvertimePolicyRecord;
      }
      
      // Fallback: search for any policy
      const snapAny = await getDocs(colRef);
      if (!snapAny.empty) {
        return { id: snapAny.docs[0].id, ...snapAny.docs[0].data() } as OvertimePolicyRecord;
      }

      return null;
    } catch (err) {
      console.warn('[Firestore] getAttendancePolicy error:', err);
      return null;
    }
  }

  static async saveAttendancePolicy(companyId: string, policy: OvertimePolicyRecord): Promise<boolean> {
    const path = `companies/${companyId}/attendance_policies/${policy.id}`;
    try {
      const ref = doc(db, 'companies', companyId || '', 'attendance_policies', policy.id);
      await setDoc(ref, {
        ...policy,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await this.logAuditEvent(
        companyId,
        policy.updatedBy || 'SYSTEM',
        'Management',
        'ATTENDANCE_POLICY_UPDATED',
        `Attendance rules updated: ${policy.policyName}`
      );
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
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
      const ref = doc(db, 'companies', companyId || '', 'visitor_logs', visitor.id);
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
      const ref = doc(db, 'companies', companyId || '', 'visitor_logs', visitorId);
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
   * SITE OPERATIONS: VISITOR WATCHLIST & SECURITY BLACKLIST
   * ============================================================
   */
  static subscribeToVisitorWatchlist(
    session: UserSession,
    companyId: string,
    onData: (records: VisitorWatchlistRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'visitor_watchlist');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'VISITORS'));
      return onSnapshot(q, (snap) => {
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as VisitorWatchlistRecord));
        onData(records);
      }, (err) => {
        console.warn('[Firestore] subscribeToVisitorWatchlist error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToVisitorWatchlist exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async addToVisitorWatchlist(
    companyId: string,
    record: VisitorWatchlistRecord,
    session: UserSession
  ): Promise<boolean> {
    const path = `companies/${companyId}/visitor_watchlist/${record.id}`;
    try {
      const ref = doc(db, 'companies', companyId || '', 'visitor_watchlist', record.id);
      await setDoc(ref, {
        ...record,
        companyId,
        status: 'ACTIVE',
        blacklistedBy: session.employeeId,
        blacklistedByName: session.fullName || session.email,
        blacklistedAt: record.blacklistedAt || new Date().toISOString(),
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await this.logAuditEvent(
        companyId,
        session.employeeId,
        session.fullName || 'Security Officer',
        'VISITOR_BLACKLISTED',
        `Visitor Added to Watchlist: ${record.visitorName} (${record.visitorPhone || 'No Phone'}). Severity: ${record.severity}. Reason: ${record.reason}`
      );
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async revokeVisitorWatchlistEntry(
    companyId: string,
    entryId: string,
    session: UserSession,
    reason: string
  ): Promise<boolean> {
    const path = `companies/${companyId}/visitor_watchlist/${entryId}`;
    try {
      const ref = doc(db, 'companies', companyId || '', 'visitor_watchlist', entryId);
      await setDoc(ref, {
        status: 'REVOKED',
        revokedAt: new Date().toISOString(),
        revokedBy: session.employeeId,
        revocationReason: reason,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await this.logAuditEvent(
        companyId,
        session.employeeId,
        session.fullName || 'Security Officer',
        'VISITOR_BLACKLIST_REVOKED',
        `Visitor Watchlist Entry Revoked: ${entryId}. Reason: ${reason}`
      );
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
      const ref = doc(db, 'companies', companyId || '', 'material_movement_logs', material.id);
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
      const ref = doc(db, 'companies', companyId || '', 'material_movement_logs', materialId);
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
      const ref = doc(db, 'companies', companyId || '', 'daily_site_logs', log.id);
      const snap = await getDoc(ref);
      
      let finalLog = { ...log };
      
      if (snap.exists()) {
        const oldData = snap.data() as DailySiteLogRecord;
        const currentVersion = oldData.version || 1;
        const history = oldData.editHistory || [];
        
        // Prepare history entry
        const historyEntry = {
          updatedAt: new Date().toISOString(),
          updatedBy: log.supervisorId || 'SYSTEM',
          previousData: { ...oldData, editHistory: undefined }, // Exclude nested history to save space
          changeSummary: `Log amended. Previous status: ${oldData.status}`
        };
        
        finalLog = {
          ...log,
          version: currentVersion + 1,
          editHistory: [...history, historyEntry].slice(-10), // Keep last 10 edits
          status: 'AMENDED',
          createdAt: oldData.createdAt // Preserve original creation date
        };
      } else {
        finalLog.version = 1;
        finalLog.editHistory = [];
      }

      await setDoc(ref, {
        ...finalLog,
        companyId,
        updatedAt: Date.now()
      }, { merge: true });

      // Audit Log with detail on whether it was a new submission or amendment
      const auditAction = snap.exists() ? 'DAILY_LOG_AMENDED' : 'DAILY_LOG_SUBMITTED';
      await this.logAuditEvent(
        companyId,
        log.supervisorId || 'SYSTEM',
        log.supervisorName || 'System',
        auditAction,
        `${log.logType} log ${snap.exists() ? 'amended' : 'submitted'} for ${log.date}. Site: ${log.siteName || log.siteId}. Version: ${finalLog.version}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async saveWorkOrder(companyId: string, workOrder: WorkOrderRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'work_orders', workOrder.id);
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
      const ref = doc(db, 'companies', companyId || '', 'tasks', task.id);
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
      const ref = doc(db, 'companies', companyId || '', 'announcements', ann.id);
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
      const ref = doc(db, 'companies', companyId || '', 'announcements', annId);
      await deleteDoc(ref);
      return true;
    } catch (err) {
      console.error('[FirestoreService] deleteAnnouncement error:', err);
      return false;
    }
  }

  static async saveDocumentRecord(companyId: string, docRec: DocumentRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'documents', docRec.id);
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
      { companyId: '', id: 'DEPT-HR', name: 'HR', code: 'HR', description: 'Human Resources', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { companyId: '', id: 'DEPT-ADMIN', name: 'Administration', code: 'ADMIN', description: 'General Administration', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { companyId: '', id: 'DEPT-SEC', name: 'Security', code: 'SEC', description: 'Physical & Field Security', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { companyId: '', id: 'DEPT-OPS', name: 'Operations', code: 'OPS', description: 'Site Operations', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { companyId: '', id: 'DEPT-FIN', name: 'Finance', code: 'FIN', description: 'Finance & Accounts', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { companyId: '', id: 'DEPT-ACCTS', name: 'Accounts', code: 'ACCTS', description: 'Accounting & Payroll', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { companyId: '', id: 'DEPT-IT', name: 'IT', code: 'IT', description: 'Information Technology', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
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
      const reqRef = doc(db, 'companies', companyId || '', 'approval_requests', requestId);
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
        const empId = reqData.employeeId || reqData.uid;
        const empRef = doc(db, 'companies', companyId || '', 'employees', empId);
        await setDoc(empRef, {
          status: 'ACTIVE',
          role: reqData.requestedRole || 'EMPLOYEE',
          updatedAt: timestamp
        }, { merge: true });
        
        // Also update membership
        const memRef = doc(db, 'users', reqData.uid, 'memberships', companyId);
        await setDoc(memRef, {
          status: 'ACTIVE',
          employeeId: empId,
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
      const reqRef = doc(db, 'companies', companyId || '', 'approval_requests', requestId);
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
        const empId = reqData.employeeId || reqData.uid;
        const empRef = doc(db, 'companies', companyId || '', 'employees', empId);
        await setDoc(empRef, {
          status: 'ACTIVE',
          role: reqData.requestedRole || 'EMPLOYEE',
          updatedAt: timestamp
        }, { merge: true });

        // Also update membership
        const memRef = doc(db, 'users', reqData.uid, 'memberships', companyId);
        await setDoc(memRef, {
          status: 'ACTIVE',
          employeeId: empId,
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
      const reqRef = doc(db, 'companies', companyId || '', 'approval_requests', requestId);
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
      
      const actorInfo = { userId: actorId, role: 'SYSTEM', companyId: companyId || 'GLOBAL', employeeId: actorId };
      const [moduleName, ...rest] = action.split('_');
      await (AuditTrailService as any).recordEvent(
        actorInfo,
        companyId,
        moduleName || 'SYSTEM',
        action,
        'EXECUTE',
        'SystemEvent',
        targetUser || logId,
        true,
        'LOW',
        logId,
        details,
        undefined,
        { originalAction: action, details }
      );

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
   * Fetch all registered companies from Firestore with dual-tier fallback
   */
  static async getAllCompanies(): Promise<CompanyTenant[]> {
    try {
      const colRef = collection(db, 'companies');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const list = snap.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            companyId: docSnap.id,
            companyCode: data.companyCode || data.companyId || docSnap.id,
            companyLegalName: data.companyLegalName || data.brandName || docSnap.id,
            brandName: data.brandName || data.companyLegalName || docSnap.id,
            licenseTier: data.licenseTier || 'ENTERPRISE',
            status: data.status || 'ACTIVE',
            primaryColorHex: data.primaryColorHex || '#4f46e5',
            secondaryColorHex: data.secondaryColorHex || '#06b6d4',
            allowedBranches: data.allowedBranches || ['MAIN'],
            maxEmployeesAllowed: Number(data.maxEmployeesAllowed) || 1000,
            maxSitesAllowed: Number(data.maxSitesAllowed) || 50,
            enabledModules: data.enabledModules || MASTER_APP_MODULES.map(m => m.key),
            logoUrl: data.logoUrl || '',
            websiteUrl: data.websiteUrl || '',
            portalSubdomain: data.portalSubdomain || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            country: data.country || 'India',
            adminName: data.adminName || '',
            adminEmail: data.adminEmail || '',
            adminUid: data.adminUid || '',
            emailDeliveryStatus: data.emailDeliveryStatus || null,
            emailDeliveryError: data.emailDeliveryError || null,
            activationSentAt: data.activationSentAt || null,
            createdAt: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
            updatedAt: data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000).toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString())
          } as CompanyTenant;
        });

        return list.sort((a, b) => {
          const dateA = typeof a.createdAt === 'string' ? a.createdAt : '';
          const dateB = typeof b.createdAt === 'string' ? b.createdAt : '';
          return dateB.localeCompare(dateA);
        });
      }
    } catch (clientErr) {
      console.warn('[FirestoreService] Direct client query for companies notice, trying server endpoint:', clientErr);
    }

    // Direct client query fallback: Query privileged Super Admin API endpoint
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken(false);
        const res = await fetch('/api/admin/companies', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.success && Array.isArray(resData.companies)) {
            return resData.companies as CompanyTenant[];
          }
        }
      }
    } catch (serverErr) {
      console.warn('[FirestoreService] Server fallback for getAllCompanies error:', serverErr);
    }

    return [];
  }

  /**
   * Delete a company tenant securely via privileged Super Admin API endpoint
   */
  static async deleteCompany(companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'Authentication required.' };
      }
      const idToken = await currentUser.getIdToken(false);
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to delete company.' };
    } catch (err: any) {
      console.error('[FirestoreService] deleteCompany error:', err);
      return { success: false, error: err?.message || 'Network error while deleting company.' };
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
          companyLegalName: data.companyLegalName || data.brandName || snap.id,
          brandName: data.brandName || data.companyLegalName || snap.id,
          licenseTier: data.licenseTier || 'ENTERPRISE',
          status: data.status || 'ACTIVE',
          primaryColorHex: data.primaryColorHex || '#4f46e5',
          secondaryColorHex: data.secondaryColorHex || '#06b6d4',
          allowedBranches: data.allowedBranches || ['MAIN'],
          maxEmployeesAllowed: Number(data.maxEmployeesAllowed) || 1000,
          maxSitesAllowed: Number(data.maxSitesAllowed) || 50,
          enabledModules: data.enabledModules || MASTER_APP_MODULES.map(m => m.key),
          logoUrl: data.logoUrl || '',
          websiteUrl: data.websiteUrl || '',
          portalSubdomain: data.portalSubdomain || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'India',
          adminName: data.adminName || '',
          adminEmail: data.adminEmail || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
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
      const cleanId = companyId.trim().toUpperCase();
      const compRef = doc(db, 'companies', cleanId);
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
      const cleanId = companyId.trim().toUpperCase();
      const compRef = doc(db, 'companies', cleanId);
      const timestamp = new Date().toISOString();
      await setDoc(compRef, { ...updates, updatedAt: timestamp }, { merge: true });

      // Keep fast code mappings in sync
      if (updates.status || updates.brandName) {
        const mappingUpdate: any = { updatedAt: timestamp };
        if (updates.status) mappingUpdate.status = updates.status;
        if (updates.brandName) mappingUpdate.brandName = updates.brandName;
        try {
          await setDoc(doc(db, 'company_codes', cleanId), mappingUpdate, { merge: true });
          await setDoc(doc(db, 'companyCodes', cleanId), mappingUpdate, { merge: true });
        } catch (e) {
          // ignore mapping sync warnings
        }
      }
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
  static async getAllApprovalRequests(status?: string): Promise<ApprovalRequestRecord[]> {
    try {
      const reqRef = collection(db, 'approval_requests');
      const q = status ? query(reqRef, where('accountStatus', '==', status)) : reqRef;
      const snap = await getDocs(q);
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
    adminInfo: { fullName: string; email: string; mobileNumber?: string; password?: string };
    enabledModules: string[];
    createdByUid: string;
    createdByName: string;
  }): Promise<{ success: boolean; message: string; companyId: string; emailDelivery?: { status: 'SENT' | 'FAILED'; error?: string } }> {
    try {
      const companyCode = (params.company.companyId || '').trim().toUpperCase();
      if (!companyCode) {
        return { success: false, message: 'Company Code / Tenant ID is required.', companyId: '' };
      }

      // Validate alphanumeric company code format
      if (!/^[A-Z0-9_-]{2,20}$/.test(companyCode)) {
        return { 
          success: false, 
          message: 'Company Code must be 2-20 uppercase alphanumeric characters (hyphens and underscores allowed).', 
          companyId: '' 
        };
      }

      const brandName = (params.company.brandName || '').trim();
      if (!brandName) {
        return { success: false, message: 'Company Brand Name is required.', companyId: '' };
      }

      const adminEmail = (params.adminInfo.email || '').trim().toLowerCase();
      const adminFullName = (params.adminInfo.fullName || '').trim();
      const adminPassword = (params.adminInfo.password || '').trim();

      if (!adminFullName) {
        return { success: false, message: 'Administrator full name is required.', companyId: '' };
      }

      if (!adminEmail || !adminEmail.includes('@') || !adminEmail.includes('.')) {
        return { success: false, message: 'A valid Company Administrator email address is required.', companyId: '' };
      }

      if (!adminPassword || adminPassword.length < 6) {
        return { success: false, message: 'Company Administrator password must be at least 6 characters long.', companyId: '' };
      }

      // Privileged Server-Side Provisioning using Firebase Admin SDK
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, message: 'You must be signed in as Global Super Admin to provision a company.', companyId: '' };
      }

      const idToken = await currentUser.getIdToken(true);
      const response = await fetch('/api/admin/create-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          company: {
            ...params.company,
            companyId: companyCode,
            brandName,
            companyLegalName: params.company.companyLegalName || brandName,
            licenseTier: params.company.licenseTier || 'ENTERPRISE',
            status: 'ACTIVE',
            allowedBranches: params.company.allowedBranches || ['MAIN'],
            maxEmployeesAllowed: Number(params.company.maxEmployeesAllowed) || 1000,
            maxSitesAllowed: Number(params.company.maxSitesAllowed) || 50,
            primaryColorHex: params.company.primaryColorHex || '#4f46e5',
            secondaryColorHex: params.company.secondaryColorHex || '#06b6d4',
            email: params.company.email || adminEmail,
            phone: params.company.phone || params.adminInfo.mobileNumber || '',
            address: params.company.address || '',
            city: params.company.city || '',
            state: params.company.state || '',
            country: params.company.country || 'India',
            logoUrl: params.company.logoUrl || '',
            websiteUrl: params.company.websiteUrl || '',
            portalSubdomain: params.company.portalSubdomain || ''
          },
          adminInfo: {
            ...params.adminInfo,
            email: adminEmail,
            fullName: adminFullName,
            password: adminPassword,
            mobileNumber: params.adminInfo.mobileNumber || ''
          },
          enabledModules: params.enabledModules && params.enabledModules.length > 0 
            ? params.enabledModules 
            : MASTER_APP_MODULES.map(m => m.key),
          createdByUid: params.createdByUid || currentUser.uid,
          createdByName: params.createdByName || currentUser.displayName || 'System Super Admin'
        })
      });

      const responseData = await response.json().catch(() => ({}));

      if (response.ok && responseData.success) {
        return {
          success: true,
          message: responseData.message || `Company "${brandName}" (${companyCode}) and Company Administrator (${adminEmail}) successfully provisioned.`,
          companyId: companyCode,
          emailDelivery: responseData.emailDelivery
        };
      }

      return {
        success: false,
        message: responseData.error || responseData.message || `Provisioning failed (HTTP ${response.status}). Please check details and try again.`,
        companyId: ''
      };
    } catch (err: any) {
      console.error('[FirestoreService] createCompanyWithAdmin error:', err);
      return { 
        success: false, 
        message: err.message || 'Failed to provision tenant and assign admin.', 
        companyId: '' 
      };
    }
  }

  /**
   * Resends real activation / password reset email to a Company Administrator
   */
  static async resendAdminActivationEmail(companyId: string, adminEmail?: string): Promise<{ success: boolean; message: string }> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, message: 'Authentication required. Please sign in as Super Admin.' };
      }
      const token = await currentUser.getIdToken(true);
      const response = await fetch('/api/admin/resend-admin-activation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId,
          adminEmail
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message || `Activation email successfully sent to ${adminEmail || 'Company Admin'}.`
        };
      }

      return {
        success: false,
        message: data.error || data.message || `Failed to resend email (HTTP ${response.status}).`
      };
    } catch (err: any) {
      console.error('[FirestoreService] resendAdminActivationEmail error:', err);
      return {
        success: false,
        message: err.message || 'Failed to resend activation email.'
      };
    }
  }


  // ==========================================
  // LEAVE MANAGEMENT (HRMS) METHODS
  // ==========================================

  /**
   * Subscribe to real-time leave requests for a company
   */
  static subscribeToLeaveBalances(
    session: UserSession,
    companyId: string,
    employeeId: string,
    onData: (data: LeaveBalanceRecord[]) => void
  ): () => void {
    const colRef = collection(db, 'companies', companyId, 'leaveBalances');
    const q = query(colRef, where('employeeId', '==', employeeId));
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveBalanceRecord)));
    }, (err) => {
      console.warn('[Firestore] subscribeToLeaveBalances error:', err);
      onData([]);
    });
  }

  


  
  // REAL LEADS IMPLEMENTATION FOR DEMO INQUIRIES & SUPER ADMIN PIPELINE
  static async createLead(lead: any): Promise<boolean> {
    try {
      const leadId = lead.id || `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const ref = doc(db, 'leads', leadId);
      const timestamp = new Date().toISOString();
      await setDoc(ref, {
        ...lead,
        id: leadId,
        status: lead.status || 'NEW',
        createdAt: lead.createdAt || timestamp,
        updatedAt: timestamp
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] Error creating lead:', err);
      return false;
    }
  }

  static subscribeToLeads(onData: (data: any[]) => void): () => void {
    try {
      const colRef = collection(db, 'leads');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        onData(items);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToLeads fallback to unordered snapshot:', err);
        return onSnapshot(colRef, (snap) => {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          onData(items);
        }, () => onData([]));
      });
    } catch (err) {
      console.error('[FirestoreService] Exception subscribing to leads:', err);
      onData([]);
      return () => {};
    }
  }

  static async getLeads(): Promise<any[]> {
    try {
      const colRef = collection(db, 'leads');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('[FirestoreService] getLeads error:', err);
      return [];
    }
  }

  static async updateLead(leadId: string, updates: any): Promise<boolean> {
    try {
      const ref = doc(db, 'leads', leadId);
      await updateDoc(ref, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.error('[FirestoreService] updateLead error:', err);
      return false;
    }
  }
  static async saveGoodsReceiptNote(companyId: string, grn: any): Promise<boolean> {
    try {
      const id = grn.id || `GRN-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'goods_receipt_notes', id);
      await setDoc(ref, { ...grn, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) { return false; }
  }
  static async saveThreeWayMatch(companyId: string, match: any): Promise<boolean> {
    try {
      const id = match.id || `TWM-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'three_way_matches', id);
      await setDoc(ref, { ...match, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) { return false; }
  }
  static subscribeToServiceTickets(companyId: string, onData: (items: any[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'serviceTickets');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => onData([]));
  }
  static subscribeToTicketComments(companyId: string, ticketId: string, arg3: any, arg4?: any): () => void {
    const onData = typeof arg3 === 'function' ? arg3 : arg4;
    const role = typeof arg3 === 'string' ? arg3 : (typeof arg4 === 'string' ? arg4 : '');
    if (!companyId || !ticketId) {
      if (typeof onData === 'function') onData([]);
      return () => {};
    }
    const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'comments');
    const q = query(colRef, orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (role && !['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'OPS_MANAGER', 'SERVICE_DESK'].includes(role)) {
        list = list.filter((c: any) => !c.isInternalOnly && c.visibility !== 'INTERNAL');
      }
      if (typeof onData === 'function') onData(list);
    }, () => { if (typeof onData === 'function') onData([]); });
  }
  static subscribeToTicketAttachments(companyId: string, ticketId: string, arg3: any, arg4?: any): () => void {
    const onData = typeof arg3 === 'function' ? arg3 : arg4;
    const role = typeof arg3 === 'string' ? arg3 : (typeof arg4 === 'string' ? arg4 : '');
    if (!companyId || !ticketId) {
      if (typeof onData === 'function') onData([]);
      return () => {};
    }
    const colRef = collection(db, 'companies', companyId, 'serviceTickets', ticketId, 'attachments');
    return onSnapshot(colRef, (snap) => {
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (role && !['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'OPS_MANAGER', 'SERVICE_DESK'].includes(role)) {
        list = list.filter((a: any) => a.visibility !== 'INTERNAL');
      }
      if (typeof onData === 'function') onData(list);
    }, () => { if (typeof onData === 'function') onData([]); });
  }

  static subscribeToTasks(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'tasks');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'TASKS'));
      return onSnapshot(q, (snap) => {
        const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        onData(tasks);
      }, (err) => {
        console.warn('[Firestore] subscribeToTasks error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToTasks exception:', e);
      onData([]);
      return () => {};
    }
  }
  static subscribeToAnnouncements(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'announcements');
      
      const authority = RbacService.getAuthorityLevel(session);
      const isGlobal = 
        session.role === 'SUPER_ADMIN' || 
        session.role === 'COMPANY_ADMIN' ||
        session.role === 'HR_ADMIN' ||
        session.role === 'HR' ||
        (authority && ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF'].includes(authority));

      let q;
      if (isGlobal) {
        q = query(colRef);
      } else {
        // Calculate allowed scopes for the current user session
        const scopes = ['COMPANY_ALL'];
        if (session.assignedRegionId) scopes.push(`REGION_${session.assignedRegionId}`);
        if (session.assignedSiteId) scopes.push(`SITE_${session.assignedSiteId}`);
        if (session.branchId) scopes.push(`SITE_${session.branchId}`); // Fallback
        q = query(colRef, where('visibilityScope', 'array-contains-any', scopes));
      }
      
      return onSnapshot(q, (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        onData(items);
      }, (err) => {
        console.warn('[Firestore] subscribeToAnnouncements error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToAnnouncements exception:', e);
      onData([]);
      return () => {};
    }
  }
  static subscribeToDocuments(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const onData = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof onData === 'function') onData([]);
      return () => {};
    }
    const colRef = collection(db, 'companies', companyId, 'documents');
    return onSnapshot(colRef, (snap) => {
      if (typeof onData === 'function') onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof onData === 'function') onData([]); });
  }

  static subscribeToInventoryVendors(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const onData = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof onData === 'function') onData([]);
      return () => {};
    }
    const colRef = collection(db, 'companies', companyId, 'inventoryVendors');
    return onSnapshot(colRef, (snap) => {
      if (typeof onData === 'function') onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof onData === 'function') onData([]); });
  }

  static subscribeToSites(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const onData = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof onData === 'function') onData([]);
      return () => {};
    }
    const colRef = collection(db, 'companies', companyId, 'sites');
    return onSnapshot(colRef, (snap) => {
      if (typeof onData === 'function') onData(snap.docs.map(d => ({ id: d.id, ...d.data() } as SiteRecord)));
    }, () => { if (typeof onData === 'function') onData([]); });
  }

  static subscribeToDepartments(companyId: string, onData: (items: any[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'departments');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => onData([]));
  }

  static subscribeToOvertimePolicies(companyId: string, onData: (items: OvertimePolicyRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'overtimePolicies');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() } as OvertimePolicyRecord)));
    }, () => onData([]));
  }

  static subscribeToOvertimeRequests(companyId: string, onData: (items: any[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'overtimeRequests');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => onData([]));
  }

  static subscribeToOvertimeAdjustments(companyId: string, onData: (items: any[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'overtimeAdjustments');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => onData([]));
  }

  static subscribeToAssets(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const onData = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof onData === 'function') onData([]);
      return () => {};
    }
    const colRef = collection(db, 'companies', companyId, 'assets');
    return onSnapshot(colRef, (snap) => {
      if (typeof onData === 'function') onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof onData === 'function') onData([]); });
  }

  static subscribeToInventoryItems(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const onData = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof onData === 'function') onData([]);
      return () => {};
    }
    const colRef = collection(db, 'companies', companyId, 'inventoryItems');
    return onSnapshot(colRef, (snap) => {
      if (typeof onData === 'function') onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof onData === 'function') onData([]); });
  }

  static subscribeToWorkOrders(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const onData = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof onData === 'function') onData([]);
      return () => {};
    }
    const colRef = collection(db, 'companies', companyId, 'workOrders');
    return onSnapshot(colRef, (snap) => {
      if (typeof onData === 'function') onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof onData === 'function') onData([]); });
  }

  static subscribeToClients(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const onData = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof onData === 'function') onData([]);
      return () => {};
    }
    const colRef = collection(db, 'companies', companyId, 'clients');
    return onSnapshot(colRef, (snap) => {
      if (typeof onData === 'function') onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof onData === 'function') onData([]); });
  }

  static async updateOvertimeRequestStatus(
    companyId: string,
    requestId: string,
    status: string,
    approvedBy?: string | { uid: string; name: string; reason?: string; approvedMinutes?: number }
  ): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'overtimeRequests', requestId);
      const updatePayload: Record<string, any> = {
        status,
        updatedAt: new Date().toISOString()
      };
      if (typeof approvedBy === 'string') {
        updatePayload.approvedBy = approvedBy;
      } else if (approvedBy) {
        updatePayload.approvedBy = approvedBy.uid;
        updatePayload.approvedByName = approvedBy.name;
        if (approvedBy.reason) updatePayload.approvalReason = approvedBy.reason;
        if (approvedBy.approvedMinutes !== undefined) updatePayload.approvedMinutes = approvedBy.approvedMinutes;
      }
      await updateDoc(ref, updatePayload);
      return true;
    } catch (err) {
      return false;
    }
  }

  static async batchRecalculateAttendance(
    companyId: string,
    startDateOrIds: string | string[],
    endDate?: string,
    siteId?: string,
    actorId?: string
  ): Promise<any> {
    const results = { processed: 0, successCount: 0, errorsCount: 0 };
    if (Array.isArray(startDateOrIds)) {
      for (const id of startDateOrIds) {
        const ok = await this.recalculateAttendanceRecord(companyId, id, undefined, actorId);
        results.processed++;
        if (ok) results.successCount++;
        else results.errorsCount++;
      }
    } else {
      // Date range query or scan
      try {
        const attRef = collection(db, 'companies', companyId || '', 'attendance');
        const q = query(attRef, where('attendanceDate', '>=', startDateOrIds), where('attendanceDate', '<=', endDate || startDateOrIds));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          const ok = await this.recalculateAttendanceRecord(companyId, d.id, undefined, actorId);
          results.processed++;
          if (ok) results.successCount++;
          else results.errorsCount++;
        }
      } catch {
        results.errorsCount++;
      }
    }
    return results;
  }

  static async recalculateAttendanceRecord(
    companyId: string,
    attendanceId: string,
    customPolicy?: OvertimePolicyRecord,
    actorId?: string
  ): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'attendance', attendanceId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return false;
      const record = snap.data() as AttendanceRecord;
      if (!record.checkIn || !record.checkOut) return false;

      const shiftSnap = await getDoc(doc(db, 'companies', companyId || '', 'shifts', record.shiftId || ''));
      if (!shiftSnap.exists()) return false;
      const shift = shiftSnap.data() as ShiftRecord;

      const policy = customPolicy || (await this.getOvertimePolicy(companyId, record.siteId || ''));
      const metrics = WfmService.calculateAttendanceMetrics(shift, record.attendanceDate || new Date().toISOString().split('T')[0], record.checkIn, record.checkOut, policy || undefined);

      await updateDoc(ref, {
        status: metrics.status,
        lateMinutes: metrics.lateMinutes,
        earlyDepartureMinutes: metrics.earlyDepartureMinutes,
        workedMinutes: metrics.workedMinutes,
        overtimeMinutes: metrics.overtimeMinutes,
        updatedBy: actorId || record.updatedBy || 'SYSTEM',
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  static async createOvertimeAdjustment(companyId: string, adjustment: any): Promise<boolean> {
    try {
      const id = adjustment.id || `ADJ-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'overtimeAdjustments', id);
      await setDoc(ref, { ...adjustment, id, createdAt: new Date().toISOString() });
      return true;
    } catch (err) {
      return false;
    }
  }

  static async resolveOvertimeAdjustment(
    companyId: string,
    adjustmentId: string,
    statusOrResolvedBy: string,
    approverInfo?: { uid: string; name?: string; reason?: string }
  ): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'overtimeAdjustments', adjustmentId);
      const payload: Record<string, any> = {
        status: approverInfo ? statusOrResolvedBy : 'RESOLVED',
        resolvedBy: approverInfo?.uid || statusOrResolvedBy,
        resolvedByName: approverInfo?.name || '',
        resolvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await updateDoc(ref, payload);
      return true;
    } catch (err) {
      return false;
    }
  }

  static async saveOvertimePolicy(
    companyId: string,
    policy: OvertimePolicyRecord,
    actorId?: string
  ): Promise<boolean> {
    try {
      const id = policy.id || `OTP-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'overtimePolicies', id);
      await setDoc(ref, { ...policy, id, companyId, updatedBy: actorId || policy.updatedBy, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      return false;
    }
  }

  static async updateWorkOrderStatus(companyId: string, orderId: string, status: string): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'workOrders', orderId);
      await updateDoc(ref, { status, updatedAt: new Date().toISOString() });
      return true;
    } catch (err) {
      return false;
    }
  }

  static async updateOvertimeAdjustmentStatus(companyId: string, adjustmentId: string, status: string): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'overtimeAdjustments', adjustmentId);
      await updateDoc(ref, { status, updatedAt: new Date().toISOString() });
      return true;
    } catch (err) {
      return false;
    }
  }

  static async updateSalaryAdvanceStatus(companyId: string, advanceId: string, status: string): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'salaryAdvances', advanceId);
      await updateDoc(ref, { status, updatedAt: new Date().toISOString() });
      return true;
    } catch (err) {
      return false;
    }
  }

  static async getOvertimePolicy(companyId: string, siteId: string): Promise<OvertimePolicyRecord | null> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'overtimePolicies'),
        where('siteId', '==', siteId),
        where('isActive', '==', true),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return snap.docs[0].data() as OvertimePolicyRecord;
    } catch (err) {
      return null;
    }
  }

  static async createOrSyncOvertimeRequest(companyId: string, request: any, transaction?: any): Promise<boolean> {
    try {
      const id = request.id || `OTR-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'overtimeRequests', id);
      if (transaction) { transaction.set(ref, { ...request, id, updatedAt: new Date().toISOString() }, { merge: true }); } else { await setDoc(ref, { ...request, id, updatedAt: new Date().toISOString() }, { merge: true }); }
      return true;
    } catch (err) {
      return false;
    }
  }

  static async saveSelectionRecord(companyId: string, record: any): Promise<boolean> {
    try {
      const id = record.id || `SEL-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'recruitment_selections', id);
      await setDoc(ref, { ...record, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) { return false; }
  }

  static async saveVerificationRecord(companyId: string, record: any): Promise<boolean> {
    try {
      const id = record.id || `VER-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'recruitment_verifications', id);
      await setDoc(ref, { ...record, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) { return false; }
  }

  static async saveJobRequisition(companyId: string, record: any): Promise<boolean> {
    try {
      const id = record.id || `REQ-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'job_requisitions', id);
      await setDoc(ref, { ...record, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) { return false; }
  }

  static async saveScreeningRecord(companyId: string, record: any): Promise<boolean> {
    try {
      const id = record.id || `SCR-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'recruitment_screenings', id);
      await setDoc(ref, { ...record, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) { return false; }
  }

  static async saveInterviewRecord(companyId: string, record: any): Promise<boolean> {
    try {
      const id = record.id || `INT-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'recruitment_interviews', id);
      await setDoc(ref, { ...record, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) { return false; }
  }

  static async saveCandidate(companyId: string, candidate: any): Promise<boolean> {
    try {
      const id = candidate.id || `CAN-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'candidates', id);
      await setDoc(ref, { ...candidate, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) { return false; }
  }

  static async saveCandidateDocument(companyId: string, candidateId: string, docData: any): Promise<boolean> {
    try {
      const id = docData.id || `CDOC-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'candidates', candidateId, 'documents', id);
      await setDoc(ref, { ...docData, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) { return false; }
  }

  static async deleteCandidateDocument(companyId: string, candidateId: string, docId: string): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'candidates', candidateId, 'documents', docId);
      await deleteDoc(ref);
      return true;
    } catch (err) { return false; }
  }

  static async updateTaskStatus(companyId: string, taskId: string, status: string, extraData?: Record<string, any>): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId || '', 'tasks', taskId);
      await updateDoc(ref, { status, ...(extraData || {}), updatedAt: new Date().toISOString() });
      return true;
    } catch (err) { return false; }
  }

  static async saveany(plan: any): Promise<boolean> {
    try {
      const ref = doc(db, 'plans', plan.planId);
      await setDoc(ref, { ...plan, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) { return false; }
  }

  static async savePurchaseOrder(companyId: string, po: any): Promise<boolean> {
    try {
      const id = po.id || `PO-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'purchase_orders', id);
      await setDoc(ref, { ...po, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) { return false; }
  }

  static async saveSafetyChecksheet(companyId: string, checksheet: any, session?: any): Promise<{ success: boolean; interlockResult?: any }> {
    try {
      const id = checksheet.id || `CHK-${Date.now()}`;
      const ref = doc(db, 'companies', companyId || '', 'safety_checksheets', id);
      const record = { ...checksheet, id, companyId, updatedAt: new Date().toISOString() };
      await setDoc(ref, record, { merge: true });

      // Trigger Automated EHS Safety Interlock & Work Order Auto-Halt
      const { SafetyInterlockService } = await import('./safetyInterlockService');
      const interlockResult = await SafetyInterlockService.processSafetyChecksheetInterlock(companyId, record, session);

      return { success: true, interlockResult };
    } catch (err) {
      console.error('[FirestoreService] saveSafetyChecksheet error:', err);
      return { success: false };
    }
  }

  static subscribeToShiftHandovers(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'shift_handovers');
    return onSnapshot(colRef, snap => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => onData([]));
  }

  static async acknowledgeHandover(companyId: string, handoverId: string, actor: any): Promise<boolean> {
    const ref = doc(db, 'companies', companyId || '', 'shift_handovers', handoverId);
    await updateDoc(ref, { acknowledged: true, acknowledgedBy: actor?.userId || actor?.name || 'User', acknowledgedAt: new Date().toISOString() });
    return true;
  }

  static async submitHandover(companyId: string, handover: any): Promise<boolean> {
    const id = handover.id || `HND-${Date.now()}`;
    const ref = doc(db, 'companies', companyId || '', 'shift_handovers', id);
    await setDoc(ref, { ...handover, id, companyId, createdAt: new Date().toISOString() }, { merge: true });
    return true;
  }

  static async cancelPaymentBatch(companyId: string, batchId: string, actorId: string, reason: string): Promise<boolean> {
    const ref = doc(db, 'companies', companyId || '', 'payment_batches', batchId);
    await updateDoc(ref, { status: 'CANCELLED', cancelledById: actorId, cancellationReason: reason, updatedAt: new Date().toISOString() });
    return true;
  }

  static async recordPaymentBatchExport(companyId: string, batchId: string, format: string, actorId: string): Promise<boolean> {
    const ref = doc(db, 'companies', companyId || '', 'payment_batches', batchId);
    await updateDoc(ref, { lastExportedFormat: format, lastExportedAt: new Date().toISOString(), lastExportedBy: actorId });
    return true;
  }

  static async saveCompanyBankAccount(companyId: string, account: any, actor?: any): Promise<boolean> {
    const id = account.id || `ACC-${Date.now()}`;
    const ref = doc(db, 'companies', companyId || '', 'bank_accounts', id);
    await setDoc(ref, { ...account, id, companyId, updatedBy: actor?.userId || actor || 'SYSTEM', updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  }

  static async getSalarySlips(companyId: string, cycleId: string): Promise<any[]> {
    const snap = await getDocs(query(collection(db, 'companies', companyId, 'salary_slips'), where('cycleId', '==', cycleId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async createPaymentBatch(companyId: string, batch: any): Promise<boolean> {
    const id = batch.id || `BAT-${Date.now()}`;
    const ref = doc(db, 'companies', companyId || '', 'payment_batches', id);
    await setDoc(ref, { ...batch, id, companyId, createdAt: new Date().toISOString() }, { merge: true });
    return true;
  }

  static async calculatePayrollCycle(companyId: string, cycleId: string, actor: any): Promise<boolean> {
    const ref = doc(db, 'companies', companyId || '', 'payrollCycles', cycleId);
    await updateDoc(ref, { status: 'CALCULATED', calculatedBy: actor?.userId || 'SYSTEM', calculatedAt: new Date().toISOString() });
    return true;
  }

  static async approvePayrollCycle(companyId: string, cycleId: string, actor: any): Promise<boolean> {
    const ref = doc(db, 'companies', companyId || '', 'payrollCycles', cycleId);
    await updateDoc(ref, { status: 'APPROVED', approvedBy: actor?.userId || 'SYSTEM', approvedAt: new Date().toISOString() });
    return true;
  }

  static subscribeToSalaryAdvances(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : (arg2?.companyId || arg2);
    const onData = typeof arg3 === 'function' ? arg3 : (typeof arg2 === 'function' ? arg2 : () => {});
    if (!companyId) {
      if (typeof onData === 'function') onData([]);
      return () => {};
    }
    const q = query(collection(db, 'companies', companyId, 'salary_advances'));
    return onSnapshot(q, snap => {
      if (typeof onData === 'function') onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {
      if (typeof onData === 'function') onData([]);
    });
  }

  static async verifyBadge(companyId: string, badgeQuery: string, queryType: 'QR' | 'NUMBER'): Promise<any> {
    const colRef = collection(db, 'companies', companyId, 'identity_badges');
    const fieldName = queryType === 'QR' ? 'qrCode' : 'badgeNumber';
    const q = query(colRef, where(fieldName, '==', badgeQuery));
    const snap = await getDocs(q);
    if (snap.empty) {
      return { status: 'NOT_FOUND', badge: null, valid: false };
    }
    const badge = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
    const isValid = badge.status === 'ACTIVE' || badge.status === 'ISSUED';
    return { status: isValid ? 'VALID' : badge.status, badge, valid: isValid };
  }

  static async getBadgeHistory(companyId: string, badgeId: string): Promise<any[]> {
    const colRef = collection(db, 'companies', companyId, 'identity_badges', badgeId, 'history');
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async adjustStock(companyId: string, tx: any, actor: any): Promise<{ success: boolean; newStock: number }> {
    try {
      const itemRef = doc(db, 'companies', companyId || '', 'inventory', tx.itemId);
      let newStockVal = 0;
      await runTransaction(db, async (t) => {
        const itemSnap = await t.get(itemRef);
        if (!itemSnap.exists()) throw new Error('Item not found');
        const itemData = itemSnap.data() as any;
        const currentStock = itemData.currentStock || itemData.quantity || 0;
        const qty = Number(tx.quantity) || 0;
        if (tx.transactionType === 'OUTWARD' || tx.transactionType === 'ISSUE' || tx.transactionType === 'DAMAGE') {
          newStockVal = Math.max(0, currentStock - qty);
        } else {
          newStockVal = currentStock + qty;
        }
        t.update(itemRef, { currentStock: newStockVal, updatedAt: new Date().toISOString() });
        const txDocRef = doc(collection(db, 'companies', companyId, 'inventory_transactions'));
        t.set(txDocRef, { ...tx, id: txDocRef.id, companyId, createdAt: new Date().toISOString(), performedBy: actor?.uid || 'USER' });
      });
      return { success: true, newStock: newStockVal };
    } catch (e) {
      console.error('adjustStock error', e);
      return { success: false, newStock: 0 };
    }
  }


  static subscribeToLeavePolicies(companyId: string, onData: (data: any[]) => void): () => void {
    const q = query(collection(db, 'companies', companyId, 'leavePolicies'));
    return onSnapshot(q, snap => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => {
      console.error('subscribeToLeavePolicies error', err);
      onData([]);
    });
  }

  static subscribeToLeaveRequests(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : (arg2?.companyId || arg2);
    const onData = typeof arg3 === 'function' ? arg3 : (typeof arg2 === 'function' ? arg2 : () => {});
    if (!companyId) {
      if (typeof onData === 'function') onData([]);
      return () => {};
    }
    const q = query(collection(db, 'companies', companyId, 'leaveRequests'));
    return onSnapshot(q, snap => {
      if (typeof onData === 'function') onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => {
      console.error('subscribeToLeaveRequests error', err);
      if (typeof onData === 'function') onData([]);
    });
  }

  static async getHolidays(companyId: string, year: number): Promise<any[]> {
    const q = query(collection(db, 'companies', companyId, 'holidays'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async getLeaveBalance(companyId: string, employeeId: string): Promise<any | null> {
    const q = query(collection(db, 'companies', companyId, 'leaveBalances'), where('employeeId', '==', employeeId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    return null;
  }

  static async getRosters(companyId: string, startDate: string): Promise<any[]> {
    const q = query(collection(db, 'companies', companyId, 'rosters'), where('date', '>=', startDate));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async getAttendanceRecords(companyId: string, startDate: string): Promise<any[]> {
    const q = query(collection(db, 'companies', companyId, 'attendance'), where('date', '>=', startDate));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async createLeaveRequest(companyId: string, data: any): Promise<boolean> {
    const ref = doc(collection(db, 'companies', companyId, 'leaveRequests'));
    await setDoc(ref, {
      ...data,
      id: ref.id,
      createdAt: new Date().toISOString(),
      status: 'PENDING'
    });
    return true;
  }

  static async updateLeaveRequestStatus(companyId: string, requestId: string, status: string, options: any, transaction?: any): Promise<boolean> {
    const ref = doc(db, 'companies', companyId || '', 'leaveRequests', requestId);
    const data = {
      status,
      ...options,
      updatedAt: new Date().toISOString()
    };
    if (transaction) {
      transaction.update(ref, data);
    } else {
      await updateDoc(ref, data);
    }
    return true;
  }

  static async saveLeavePolicy(companyId: string, policy: any): Promise<boolean> {
    const id = policy.id || policy.leaveCode || `POL-${Date.now()}`;
    const ref = doc(db, 'companies', companyId || '', 'leavePolicies', id);
    await setDoc(ref, {
      ...policy,
      id
    }, { merge: true });
    return true;
  }

  static async createAbsenceRegularization(companyId: string, data: any): Promise<boolean> {
    const ref = doc(collection(db, 'companies', companyId, 'absenceRegularizations'));
    await setDoc(ref, {
      ...data,
      id: ref.id,
      createdAt: new Date().toISOString(),
      status: 'PENDING'
    });
    return true;
  }


  static subscribeToSalaryStructures(companyId: string, onData: (data: any[]) => void): () => void {
    const q = query(collection(db, 'companies', companyId, 'salaryStructures'));
    return onSnapshot(q, snap => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => {
      console.error('subscribeToSalaryStructures error', err);
      onData([]);
    });
  }

  static subscribeToSalaryProfiles(companyId: string, onData: (data: any[]) => void): () => void {
    const q = query(collection(db, 'companies', companyId, 'salaryProfiles'));
    return onSnapshot(q, snap => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => {
      console.error('subscribeToSalaryProfiles error', err);
      onData([]);
    });
  }

  static subscribeToPayrollCycles(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : (arg2?.companyId || arg2);
    const onData = typeof arg3 === 'function' ? arg3 : (typeof arg2 === 'function' ? arg2 : () => {});
    if (!companyId) {
      if (typeof onData === 'function') onData([]);
      return () => {};
    }
    const q = query(collection(db, 'companies', companyId, 'payrollCycles'));
    return onSnapshot(q, snap => {
      if (typeof onData === 'function') onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => {
      console.error('subscribeToPayrollCycles error', err);
      if (typeof onData === 'function') onData([]);
    });
  }

  static subscribeToPayrollRecords(companyId: string, cycleId: string, onData: (data: any[]) => void): () => void {
    const q = query(collection(db, 'companies', companyId, 'payrollRecords'), where('cycleId', '==', cycleId));
    return onSnapshot(q, snap => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => {
      console.error('subscribeToPayrollRecords error', err);
      onData([]);
    });
  }

  static async saveSalaryStructure(companyId: string, structure: any): Promise<boolean> {
    const id = structure.id || `STR-${Date.now()}`;
    const ref = doc(db, 'companies', companyId || '', 'salaryStructures', id);
    await setDoc(ref, {
      ...structure,
      id,
      companyId
    }, { merge: true });
    return true;
  }

  static async saveSalaryProfile(companyId: string, profile: any): Promise<boolean> {
    const id = profile.id || `PRF-${Date.now()}`;
    const ref = doc(db, 'companies', companyId || '', 'salaryProfiles', id);
    await setDoc(ref, {
      ...profile,
      id,
      companyId
    }, { merge: true });
    return true;
  }


  static async markNotificationRead(companyId: string, notifId: string, isRead: boolean): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId || '', 'notifications', notifId);
      await updateDoc(docRef, {
        isRead,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('[FirestoreService] Error marking notification read:', error);
      throw error;
    }
  }

  static async markAllNotificationsRead(companyId: string, role: UserRole): Promise<void> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'notifications'),
        where('isRead', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.roleScope || data.roleScope.length === 0 || data.roleScope.includes(role)) {
          batch.update(docSnap.ref, { 
            isRead: true,
            updatedAt: new Date().toISOString()
          });
        }
      });
      
      await batch.commit();
    } catch (error) {
      console.error('[FirestoreService] Error marking all notifications read:', error);
      throw error;
    }
  }

  static async deleteNotification(companyId: string, notifId: string): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId || '', 'notifications', notifId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('[FirestoreService] Error deleting notification:', error);
      throw error;
    }
  }
  static async getDocumentTypes(companyId: string): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'companies', companyId, 'documentTypes'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { return []; }
  }
  static async saveDocumentType(companyId: string, data: any): Promise<boolean> {
    try {
      const id = data.id || `DT-${Date.now()}`;
      await setDoc(doc(db, 'companies', companyId || '', 'documentTypes', id), { ...data, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async getEmployeeDocuments(companyId: string, employeeId: string): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'companies', companyId, 'employees', employeeId, 'documents'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { return []; }
  }
  static async saveEmployeeDocument(companyId: string, data: any, actor: any): Promise<boolean> {
    try {
      const employeeId = data.employeeId;
      if (!employeeId) return false;
      const id = data.id || `ED-${Date.now()}`;
      await setDoc(doc(db, 'companies', companyId || '', 'employees', employeeId, 'documents', id), { 
        ...data, 
        id, 
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id,
        updatedByName: actor.name
      }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async verifyDocument(companyId: string, employeeId: string, docId: string, statusData: any, reviewer: any): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'companies', companyId || '', 'employees', employeeId, 'documents', docId), { 
        ...statusData, 
        verifiedBy: reviewer, 
        verifiedAt: new Date().toISOString() 
      });
      return true;
    } catch { return false; }
  }
  static subscribeToActiveSos(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const onData = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof onData === 'function') onData([]);
      return () => {};
    }
    const q = query(collection(db, 'companies', companyId, 'sos_alerts'), where('status', '==', 'ACTIVE'));
    return onSnapshot(q, (snap) => {
      if (typeof onData === 'function') onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof onData === 'function') onData([]); });
  }
  static async triggerSos(companyId: string, data: any): Promise<boolean> {
    try {
      const id = `SOS-${Date.now()}`;
      await setDoc(doc(db, 'companies', companyId || '', 'sos_alerts', id), { ...data, id, status: 'ACTIVE', createdAt: new Date().toISOString() });
      return true;
    } catch { return false; }
  }
  static async updateSosStatus(companyId: string, sosId: string, status: string, notesOrUpdates?: string | Record<string, any>): Promise<boolean> {
    try {
      const payload: Record<string, any> = { status, updatedAt: new Date().toISOString() };
      if (typeof notesOrUpdates === 'string') {
        payload.resolutionNotes = notesOrUpdates;
      } else if (notesOrUpdates) {
        Object.assign(payload, notesOrUpdates);
      }
      await updateDoc(doc(db, 'companies', companyId || '', 'sos_alerts', sosId), payload);
      return true;
    } catch { return false; }
  }
  static async startTrackingSession(companyId: string, sessionOrEmpId: string | any): Promise<string | boolean> {
    try {
      if (typeof sessionOrEmpId === 'object' && sessionOrEmpId !== null) {
        const id = sessionOrEmpId.id || `GPS-${Date.now()}`;
        await setDoc(doc(db, 'companies', companyId || '', 'gps_sessions', id), { ...sessionOrEmpId, id, status: 'ACTIVE' });
        return true;
      }
      const id = `GPS-${Date.now()}`;
      await setDoc(doc(db, 'companies', companyId || '', 'gps_sessions', id), { employeeId: sessionOrEmpId, startTime: new Date().toISOString(), status: 'ACTIVE' });
      return id;
    } catch { return false; }
  }
  static async endTrackingSession(companyId: string, sessionId: string, endedBy?: string): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'companies', companyId || '', 'gps_sessions', sessionId), { endTime: new Date().toISOString(), status: 'COMPLETED', endedBy: endedBy || 'USER' });
      return true;
    } catch { return false; }
  }
  static async recordGpsEvent(companyId: string, arg2: any, arg3?: any): Promise<boolean> {
    try {
      const sessionId = typeof arg2 === 'string' ? arg2 : (arg2?.trackingSessionId || 'default');
      const data = typeof arg2 === 'object' && arg2 !== null ? arg2 : arg3;
      const id = data?.id || `EV-${Date.now()}`;
      await setDoc(doc(db, 'companies', companyId || '', 'gps_sessions', sessionId, 'events', id), { ...data, id, timestamp: data?.timestamp || new Date().toISOString() });
      return true;
    } catch { return false; }
  }
  static async getSafetyChecksheets(companyId: string): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'companies', companyId, 'safety_checksheets'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { return []; }
  }
  static subscribeToDeployments(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const cb = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof cb === 'function') cb([]);
      return () => {};
    }
    return onSnapshot(collection(db, 'companies', companyId, 'deployments'), (snap) => {
      if (typeof cb === 'function') cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof cb === 'function') cb([]); });
  }
  static async saveDeployment(arg1: any, arg2: any, arg3?: any, arg4?: any): Promise<boolean> {
    try {
      const companyId = typeof arg1 === 'string' ? arg1 : arg2;
      const data = typeof arg2 === 'object' && arg2 !== null ? arg2 : arg3;
      const id = data?.id || `DEP-${Date.now()}`;
      await setDoc(doc(db, 'companies', companyId || '', 'deployments', id), { ...data, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch { return false; }
  }
  static subscribeToBadges(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const cb = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof cb === 'function') cb([]);
      return () => {};
    }
    return onSnapshot(collection(db, 'companies', companyId, 'badges'), (snap) => {
      if (typeof cb === 'function') cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof cb === 'function') cb([]); });
  }
  static async issueBadge(companyId: string, data: any, actor?: any): Promise<boolean> {
    try {
      const id = data.id || `BDG-${Date.now()}`;
      await setDoc(doc(db, 'companies', companyId || '', 'badges', id), {
        ...data,
        id,
        issuedAt: new Date().toISOString(),
        status: data.status || 'ACTIVE',
        issuedBy: actor?.id || actor?.userId || data.issuedBy || 'SYSTEM'
      });
      return true;
    } catch { return false; }
  }
  static async updateBadgeStatus(companyId: string, id: string, status: string, reason?: string, actor?: any): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'companies', companyId || '', 'badges', id), {
        status,
        statusReason: reason || '',
        updatedBy: actor?.id || actor?.userId || actor || 'SYSTEM',
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch { return false; }
  }
  static subscribeToStockTransactions(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const cb = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof cb === 'function') cb([]);
      return () => {};
    }
    const q = query(collection(db, 'companies', companyId, 'inventory_transactions'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, (snap) => {
      if (typeof cb === 'function') cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof cb === 'function') cb([]); });
  }
  static async saveInventoryItem(companyId: string, data: any, actor?: any): Promise<boolean> {
    try {
      const id = data.id || `INV-${Date.now()}`;
      await setDoc(doc(db, 'companies', companyId || '', 'inventoryItems', id), {
        ...data,
        id,
        updatedBy: actor?.uid || actor?.userId || actor || 'SYSTEM',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async deleteInventoryItem(companyId: string, id: string, actor?: any): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'companies', companyId || '', 'inventoryItems', id));
      return true;
    } catch { return false; }
  }
  static async recordStockTransaction(companyId: string, data: any, actor?: any): Promise<{ success: boolean; newStock?: number }> {
    try {
      const id = `STK-${Date.now()}`;
      await setDoc(doc(db, 'companies', companyId || '', 'inventory_transactions', id), {
        ...data,
        id,
        performedBy: actor?.uid || actor?.userId || actor || 'SYSTEM',
        createdAt: new Date().toISOString()
      });
      // Update item current stock if itemId is provided
      let newStock = data.quantity || 0;
      if (data.itemId) {
        const itemRef = doc(db, 'companies', companyId || '', 'inventoryItems', data.itemId);
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
          const itemData = itemSnap.data();
          const curr = Number(itemData.currentStock) || 0;
          const delta = (data.transactionType === 'STOCK_OUT' || data.transactionType === 'DAMAGE' || data.transactionType === 'SCRAP') ? -Number(data.quantity) : Number(data.quantity);
          newStock = Math.max(0, curr + delta);
          await updateDoc(itemRef, { currentStock: newStock, updatedAt: new Date().toISOString() });
        }
      }
      return { success: true, newStock };
    } catch { return { success: false }; }
  }
  static async saveInventoryVendor(companyId: string, data: any, actor?: any): Promise<boolean> {
    try {
      const id = data.id || `VEN-${Date.now()}`;
      await setDoc(doc(db, 'companies', companyId || '', 'inventoryVendors', id), {
        ...data,
        id,
        updatedBy: actor?.uid || actor?.userId || actor || 'SYSTEM',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async deleteInventoryVendor(companyId: string, id: string, actor?: any): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'companies', companyId || '', 'inventoryVendors', id));
      return true;
    } catch { return false; }
  }
  static async getRegions(companyId: string): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'companies', companyId, 'regions'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch { return []; }
  }
  static subscribeToProcurementRequisitions(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const cb = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof cb === 'function') cb([]);
      return () => {};
    }
    return onSnapshot(collection(db, 'companies', companyId, 'procurement_requisitions'), (snap) => {
      if (typeof cb === 'function') cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof cb === 'function') cb([]); });
  }
  static subscribeToPurchaseOrders(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const cb = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof cb === 'function') cb([]);
      return () => {};
    }
    return onSnapshot(collection(db, 'companies', companyId, 'purchase_orders'), (snap) => {
      if (typeof cb === 'function') cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof cb === 'function') cb([]); });
  }
  static subscribeToGoodsReceiptNotes(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const cb = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof cb === 'function') cb([]);
      return () => {};
    }
    return onSnapshot(collection(db, 'companies', companyId, 'goods_receipt_notes'), (snap) => {
      if (typeof cb === 'function') cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof cb === 'function') cb([]); });
  }
  static subscribeToThreeWayMatches(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const cb = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof cb === 'function') cb([]);
      return () => {};
    }
    return onSnapshot(collection(db, 'companies', companyId, 'three_way_matches'), (snap) => {
      if (typeof cb === 'function') cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof cb === 'function') cb([]); });
  }
  static subscribeToVendors(arg1: any, arg2: any, arg3?: any): () => void {
    const companyId = typeof arg1 === 'string' ? arg1 : arg2;
    const cb = typeof arg2 === 'function' ? arg2 : arg3;
    if (!companyId) {
      if (typeof cb === 'function') cb([]);
      return () => {};
    }
    return onSnapshot(collection(db, 'companies', companyId, 'inventoryVendors'), (snap) => {
      if (typeof cb === 'function') cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => { if (typeof cb === 'function') cb([]); });
  }
  static async saveProcurementRequisition(companyId: string, data: any): Promise<boolean> {
    try {
      const id = data.id || `PR-${Date.now()}`;
      await setDoc(doc(db, 'companies', companyId || '', 'procurement_requisitions', id), { ...data, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async resolveLifecycleApproval(companyId: string, id: string, status: string, actor?: any, reason?: string): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'companies', companyId || '', 'lifecycle_approvals', id), {
        status,
        resolvedAt: new Date().toISOString(),
        resolvedBy: actor?.userId || actor?.uid || actor || 'SYSTEM',
        resolutionReason: reason || ''
      });
      return true;
    } catch { return false; }
  }
}

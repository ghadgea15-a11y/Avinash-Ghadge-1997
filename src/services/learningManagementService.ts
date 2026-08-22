import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  UserSession, 
  AppNotification, 
  TrainingProgramRecord, 
  TrainingSessionRecord, 
  TrainingEnrollmentRecord,
  EmployeeRecord,
  MandatoryRefresherConfig,
  EmployeeRefresherStatus
} from '../types';
import { FirestoreService } from './firestoreService';
import { StorageService } from './storageService';
import { AuditTrailService } from './auditTrailService';
import { QueryScopeEngine } from './queryScopeEngine';

export class LearningManagementService {

  // ============================================================================
  // REFRESHERS
  // ============================================================================
  static async getMandatoryRefresherConfigs(session: UserSession, companyId: string): Promise<MandatoryRefresherConfig[]> {
    const constraints = QueryScopeEngine.buildScope(session, 'REFRESHER_CONFIGS');
    const q = query(collection(db, 'companies', companyId, 'refresher_configs'), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as MandatoryRefresherConfig);
  }

  static async getEmployeeRefresherStatuses(session: UserSession, companyId: string): Promise<EmployeeRefresherStatus[]> {
    const constraints = QueryScopeEngine.buildScope(session, 'REFRESHER_STATUSES');
    const q = query(collection(db, 'companies', companyId, 'refresher_statuses'), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as EmployeeRefresherStatus);
  }

  // ============================================================================
  // PROGRAMS
  // ============================================================================

  static async createProgram(session: UserSession, data: Partial<TrainingProgramRecord>): Promise<{ success: boolean; programId?: string; error?: string }> {
    try {
      const companyId = session.companyId;
      const programId = data.id || `TRN-PROG-${Date.now()}`;
      const programCode = data.programCode || `PRG-${Math.floor(Math.random()*10000)}`;

      const program: TrainingProgramRecord = {
        ...data,
        id: programId,
        companyId,
        programCode,
        title: data.title || 'Untitled Program',
        description: data.description || '',
        category: data.category || 'OTHER',
        isMandatoryForPSARA: data.isMandatoryForPSARA || false,
        validityMonths: data.validityMonths || 12,
        durationHours: data.durationHours || 1,
        passScorePercentage: data.passScorePercentage || 0,
        trainerName: data.trainerName || 'TBD',
        location: data.location || 'Online',
        status: data.status || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as TrainingProgramRecord;

      await setDoc(doc(db, 'companies', companyId, 'trainingPrograms', programId), program);

      await AuditTrailService.logAction(
        session,
        'LEARNING_MANAGEMENT',
        'PROGRAM_CREATED',
        'TRAINING_PROGRAM',
        programId,
        true,
        'MEDIUM',
        `Training program ${program.title} created`,
        { programCode }
      );

      return { success: true, programId };
    } catch (err: any) {
      console.error('[LMS] createProgram error:', err);
      return { success: false, error: err.message };
    }
  }

  static async getPrograms(companyId: string): Promise<TrainingProgramRecord[]> {
    try {
      const q = query(collection(db, 'companies', companyId, 'trainingPrograms'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as TrainingProgramRecord);
    } catch (err) {
      console.error('[LMS] getPrograms error:', err);
      return [];
    }
  }

  static async updateProgram(session: UserSession, programId: string, updates: Partial<TrainingProgramRecord>): Promise<{ success: boolean; error?: string }> {
    try {
      const ref = doc(db, 'companies', session.companyId, 'trainingPrograms', programId);
      await updateDoc(ref, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      await AuditTrailService.logAction(
        session,
        'LEARNING_MANAGEMENT',
        'PROGRAM_UPDATED',
        'TRAINING_PROGRAM',
        programId,
        true,
        'LOW',
        `Training program updated`
      );

      return { success: true };
    } catch (err: any) {
      console.error('[LMS] updateProgram error:', err);
      return { success: false, error: err.message };
    }
  }

  // ============================================================================
  // SESSIONS
  // ============================================================================

  static async createSession(session: UserSession, data: Partial<TrainingSessionRecord>): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      const companyId = session.companyId;
      const sessionId = data.id || `TRN-SESS-${Date.now()}`;

      const sessionRecord: TrainingSessionRecord = {
        ...data,
        id: sessionId,
        companyId,
        programId: data.programId!,
        trainerName: data.trainerName || 'TBD',
        scheduledDate: data.scheduledDate || new Date().toISOString().split('T')[0],
        startTime: data.startTime || '09:00',
        endTime: data.endTime || '10:00',
        location: data.location || 'Online',
        maxParticipants: data.maxParticipants || 50,
        status: data.status || 'SCHEDULED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as TrainingSessionRecord;

      await setDoc(doc(db, 'companies', companyId, 'trainingSessions', sessionId), sessionRecord);

      await AuditTrailService.logAction(
        session,
        'LEARNING_MANAGEMENT',
        'SESSION_CREATED',
        'TRAINING_SESSION',
        sessionId,
        true,
        'MEDIUM',
        `Training session scheduled on ${sessionRecord.scheduledDate}`,
        { programId: sessionRecord.programId }
      );

      return { success: true, sessionId };
    } catch (err: any) {
      console.error('[LMS] createSession error:', err);
      return { success: false, error: err.message };
    }
  }

  static async getSessions(companyId: string): Promise<TrainingSessionRecord[]> {
    try {
      const q = query(collection(db, 'companies', companyId, 'trainingSessions'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as TrainingSessionRecord);
    } catch (err) {
      console.error('[LMS] getSessions error:', err);
      return [];
    }
  }

  static async updateSessionStatus(session: UserSession, sessionId: string, status: TrainingSessionRecord['status']): Promise<{ success: boolean; error?: string }> {
    try {
      const ref = doc(db, 'companies', session.companyId, 'trainingSessions', sessionId);
      await updateDoc(ref, {
        status,
        updatedAt: new Date().toISOString()
      });

      await AuditTrailService.logAction(
        session,
        'LEARNING_MANAGEMENT',
        'SESSION_STATUS_UPDATED',
        'TRAINING_SESSION',
        sessionId,
        true,
        'MEDIUM',
        `Training session status updated to ${status}`
      );

      return { success: true };
    } catch (err: any) {
      console.error('[LMS] updateSessionStatus error:', err);
      return { success: false, error: err.message };
    }
  }


  // ============================================================================
  // ENROLLMENTS & ASSIGNMENTS
  // ============================================================================

  static async bulkEnrollEmployees(
    session: UserSession, 
    sessionId: string, 
    employeeIds: string[]
  ): Promise<{ success: boolean; enrolled: number; error?: string }> {
    try {
      const companyId = session.companyId;

      const sessionSnap = await getDoc(doc(db, 'companies', companyId, 'trainingSessions', sessionId));
      if (!sessionSnap.exists()) throw new Error('Session not found');
      const sessionData = sessionSnap.data() as TrainingSessionRecord;

      const programSnap = await getDoc(doc(db, 'companies', companyId, 'trainingPrograms', sessionData.programId));
      if (!programSnap.exists()) throw new Error('Program not found');
      const programData = programSnap.data() as TrainingProgramRecord;

      const enrQuery = query(collection(db, 'companies', companyId, 'trainingEnrollments'), where('sessionId', '==', sessionId));
      const enrSnap = await getDocs(enrQuery);
      const existingEnrollments = enrSnap.docs.map(d => d.data() as TrainingEnrollmentRecord);
      
      const availableSpots = sessionData.maxParticipants - existingEnrollments.length;
      if (employeeIds.length > availableSpots) {
         throw new Error(`Cannot enroll ${employeeIds.length} employees. Only ${availableSpots} spots available.`);
      }

      let enrolledCount = 0;

      await runTransaction(db, async (transaction) => {
        for (const empId of employeeIds) {
           const isAlreadyEnrolled = existingEnrollments.some(e => e.employeeId === empId);
           if (isAlreadyEnrolled) continue;

           const empRef = doc(db, 'companies', companyId, 'employees', empId);
           const empSnap = await transaction.get(empRef);
           if (!empSnap.exists()) continue;
           const empData = empSnap.data() as EmployeeRecord;

           const enrollmentId = `ENR-${Date.now()}-${Math.floor(Math.random()*1000)}`;
           const enrRef = doc(db, 'companies', companyId, 'trainingEnrollments', enrollmentId);

           const record: TrainingEnrollmentRecord = {
             id: enrollmentId,
             companyId,
             programId: sessionData.programId,
             programTitle: programData.title,
             sessionId: sessionId,
             employeeId: empId,
             employeeName: `${empData.firstName} ${empData.lastName}`.trim(),
             siteId: empData.assignedSiteId || 'UNKNOWN',
             enrollmentDate: new Date().toISOString(),
             scheduledDate: sessionData.scheduledDate,
             attendanceStatus: 'SCHEDULED',
             resultStatus: 'ENROLLED',
             createdAt: new Date().toISOString(),
             updatedAt: new Date().toISOString()
           };

           transaction.set(enrRef, record);
           enrolledCount++;
        }
      });

      if (enrolledCount > 0) {
        await AuditTrailService.logAction(
          session,
          'LEARNING_MANAGEMENT',
          'BULK_ENROLLMENT',
          'TRAINING_SESSION',
          sessionId,
          true,
          'MEDIUM',
          `Enrolled ${enrolledCount} employees into session ${sessionId}`
        );
      }

      return { success: true, enrolled: enrolledCount };
    } catch (err: any) {
      console.error('[LMS] bulkEnrollEmployees error:', err);
      return { success: false, error: err.message, enrolled: 0 };
    }
  }

  static async getEnrollments(companyId: string): Promise<TrainingEnrollmentRecord[]> {
    try {
      const q = query(collection(db, 'companies', companyId, 'trainingEnrollments'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as TrainingEnrollmentRecord);
    } catch (err) {
      console.error('[LMS] getEnrollments error:', err);
      return [];
    }
  }

  static async getEnrollmentsBySession(companyId: string, sessionId: string): Promise<TrainingEnrollmentRecord[]> {
    try {
      const q = query(collection(db, 'companies', companyId, 'trainingEnrollments'), where('sessionId', '==', sessionId));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as TrainingEnrollmentRecord);
    } catch (err) {
      console.error('[LMS] getEnrollmentsBySession error:', err);
      return [];
    }
  }

  static async getEnrollmentsByEmployee(companyId: string, employeeId: string): Promise<TrainingEnrollmentRecord[]> {
    try {
      const q = query(collection(db, 'companies', companyId, 'trainingEnrollments'), where('employeeId', '==', employeeId));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as TrainingEnrollmentRecord);
    } catch (err) {
      console.error('[LMS] getEnrollmentsByEmployee error:', err);
      return [];
    }
  }

  // ============================================================================
  // ATTENDANCE & ASSESSMENT
  // ============================================================================

  static async markAttendanceAndAssessment(
    session: UserSession,
    enrollmentId: string,
    attendance: 'PRESENT' | 'ABSENT',
    score?: number,
    certificateFile?: File
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const companyId = session.companyId;
      const enrRef = doc(db, 'companies', companyId, 'trainingEnrollments', enrollmentId);
      
      const enrSnap = await getDoc(enrRef);
      if (!enrSnap.exists()) throw new Error('Enrollment not found');
      const enrollment = enrSnap.data() as TrainingEnrollmentRecord;

      const programSnap = await getDoc(doc(db, 'companies', companyId, 'trainingPrograms', enrollment.programId));
      if (!programSnap.exists()) throw new Error('Program not found');
      const program = programSnap.data() as TrainingProgramRecord;

      let resultStatus: TrainingEnrollmentRecord['resultStatus'] = 'IN_PROGRESS';
      
      if (attendance === 'ABSENT') {
         resultStatus = 'FAILED';
      } else if (attendance === 'PRESENT') {
         if (program.passScorePercentage > 0) {
            if (score !== undefined && score >= program.passScorePercentage) {
               resultStatus = 'PASSED';
            } else if (score !== undefined) {
               resultStatus = 'FAILED';
            }
         } else {
            resultStatus = 'PASSED';
         }
      }

      let certUrl = enrollment.certificateId;
      if (certificateFile && resultStatus === 'PASSED') {
         const path = `companies/${companyId}/training_certificates/${enrollment.employeeId}/${Date.now()}_${certificateFile.name}`;
         certUrl = await StorageService.uploadFile(path, certificateFile);
      }

      const updates: Partial<TrainingEnrollmentRecord> = {
         attendanceStatus: attendance,
         scoreObtained: score,
         resultStatus,
         certificateId: certUrl,
         certificateIssuedDate: resultStatus === 'PASSED' ? new Date().toISOString() : undefined,
         evaluatedByUserId: session.userId,
         updatedAt: new Date().toISOString()
      };

      if (resultStatus === 'PASSED' && program.validityMonths > 0) {
         const expiry = new Date();
         expiry.setMonth(expiry.getMonth() + program.validityMonths);
         updates.certificateExpiryDate = expiry.toISOString();
      }

      await updateDoc(enrRef, updates);

      await AuditTrailService.logAction(
        session,
        'LEARNING_MANAGEMENT',
        'EVALUATION_SUBMITTED',
        'TRAINING_ENROLLMENT',
        enrollmentId,
        true,
        'MEDIUM',
        `Attendance/Assessment marked for ${enrollment.employeeName}. Result: ${resultStatus}`,
        { attendance, score, resultStatus }
      );

      if (resultStatus === 'PASSED' || resultStatus === 'FAILED') {
         const notif: AppNotification = {
           id: `NOTIF-TRN-${Date.now()}`,
           title: `Training ${resultStatus === 'PASSED' ? 'Passed' : 'Failed'}`,
           message: `You have ${resultStatus.toLowerCase()} the training: ${program.title}`,
           type: resultStatus === 'PASSED' ? 'SUCCESS' : 'ALERT',
           roleScope: ['EMPLOYEE'],
           timestamp: new Date().toISOString(),
           isRead: false};
         await FirestoreService.createNotification(companyId, notif);
      }

      return { success: true };
    } catch (err: any) {
      console.error('[LMS] markAttendanceAndAssessment error:', err);
      return { success: false, error: err.message };
    }
  }

}

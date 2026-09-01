import { 
  collection, doc, setDoc, getDoc, getDocs, query, where, writeBatch, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { EmployeeCertificationRecord, UserSession, AppNotification } from '../types';
import { SecurityAuditService } from './securityAuditService';
import { FirestoreService } from './firestoreService';
import { addDays, isBefore, isAfter, parseISO, differenceInDays } from 'date-fns';
function uuidv4() { return crypto.randomUUID(); }

export class CertificationTrackingService {
  
  static async getEmployeeCertifications(companyId: string, employeeId: string): Promise<EmployeeCertificationRecord[]> {
    const q = query(
      collection(db, 'employeeCertifications'),
      where('companyId', '==', companyId),
      where('employeeId', '==', employeeId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as EmployeeCertificationRecord).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async getCompanyCertifications(companyId: string): Promise<EmployeeCertificationRecord[]> {
    const q = query(
      collection(db, 'employeeCertifications'),
      where('companyId', '==', companyId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as EmployeeCertificationRecord).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async saveCertification(session: UserSession, cert: EmployeeCertificationRecord): Promise<void> {
    if (session.companyId !== cert.companyId) throw new Error("Unauthorized: Company ID mismatch");
    
    // Ensure audit
    await SecurityAuditService.logEvent(session.companyId, session.userId, session.role, session.employeeId, 'CREATE_UPDATE_CERTIFICATION', 'CERTIFICATION', cert.id, true, 'LOW');
/*
      certificationId: cert.id,
      employeeId: cert.employeeId,
      status: cert.status
    */

    const docRef = doc(db, 'employeeCertifications', cert.id);
    await setDoc(docRef, {
      ...cert,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  static async evaluateExpiryStatuses(companyId: string): Promise<void> {
    const allCerts = await this.getCompanyCertifications(companyId);
    
    const batch = writeBatch(db);
    const now = new Date();
    
    const notifications: AppNotification[] = [];

    for (const cert of allCerts) {
      if (!cert.expiryDate || cert.status === 'REVOKED' || cert.status === 'RENEWED') continue;

      const expiry = parseISO(cert.expiryDate);
      let newStatus = cert.status;
      const daysUntilExpiry = differenceInDays(expiry, now);
      const dispatchedMilestones: Record<string, string> = (cert as any).remindersDispatched || {};
      let updatedMilestones = false;

      if (isBefore(expiry, now)) {
        newStatus = 'EXPIRED';
        if (!dispatchedMilestones['EXPIRED_0_DAYS']) {
          dispatchedMilestones['EXPIRED_0_DAYS'] = now.toISOString();
          updatedMilestones = true;

          // Milestone 0 (Expired) Critical Alert to Super Admin, Company Admin, Operations Head
          notifications.push({
            id: uuidv4(),
            title: `CRITICAL: ${cert.certificationName} EXPIRED for ${cert.employeeName}`,
            message: `Statutory certification ${cert.certificationName} (Code: ${cert.certificationCode || 'N/A'}) for ${cert.employeeName} expired on ${cert.expiryDate}. Site entry authorization and roster allocation are blocked until renewal.`,
            type: 'ALERT',
            timestamp: now.toISOString(),
            isRead: false,
            roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'DIRECTOR_CEO', 'OPERATIONS_MANAGER'],
            actionRoute: 'CERTIFICATION_TRACKING'
          });
        }
      } else {
        if (daysUntilExpiry <= 90 && daysUntilExpiry >= 0) {
          newStatus = 'EXPIRING_SOON';
        } else {
          newStatus = 'ACTIVE';
        }

        // Tier 3: 30-Day Reminder (Employee + Site Supervisor + HR)
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 15 && !dispatchedMilestones['30_DAYS']) {
          dispatchedMilestones['30_DAYS'] = now.toISOString();
          updatedMilestones = true;
          notifications.push({
            id: uuidv4(),
            title: `Certification Expiring in 30 Days: ${cert.certificationName}`,
            message: `Certification ${cert.certificationName} for ${cert.employeeName} expires in ${daysUntilExpiry} days (${cert.expiryDate}). Please schedule renewal or training.`,
            type: 'WARNING',
            timestamp: now.toISOString(),
            isRead: false,
            roleScope: ['HR_ADMIN', 'SUPERVISOR', 'EMPLOYEE'],
            actionRoute: 'CERTIFICATION_TRACKING'
          });
        }

        // Tier 2: 15-Day Reminder (Employee + Site Supervisor + HR Admin + Operations Manager)
        if (daysUntilExpiry <= 15 && daysUntilExpiry > 7 && !dispatchedMilestones['15_DAYS']) {
          dispatchedMilestones['15_DAYS'] = now.toISOString();
          updatedMilestones = true;
          notifications.push({
            id: uuidv4(),
            title: `URGENT: ${cert.certificationName} Expiring in 15 Days`,
            message: `Certification ${cert.certificationName} for ${cert.employeeName} expires in ${daysUntilExpiry} days (${cert.expiryDate}). Operations Manager and HR please coordinate renewal.`,
            type: 'WARNING',
            timestamp: now.toISOString(),
            isRead: false,
            roleScope: ['HR_ADMIN', 'OPERATIONS_MANAGER', 'SUPERVISOR'],
            actionRoute: 'CERTIFICATION_TRACKING'
          });
        }

        // Tier 1: 7-Day High-Priority Escalated Reminder (A1/A2 General Manager, Director, HR Head, Admin)
        if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0 && !dispatchedMilestones['7_DAYS']) {
          dispatchedMilestones['7_DAYS'] = now.toISOString();
          updatedMilestones = true;
          notifications.push({
            id: uuidv4(),
            title: `ESCALATION: ${cert.certificationName} Expiring in ${daysUntilExpiry} Days`,
            message: `Statutory Alert: ${cert.certificationName} for ${cert.employeeName} expires on ${cert.expiryDate} (${daysUntilExpiry} days remaining). Risk of statutory non-compliance and roster disqualification. Escalated to General Management.`,
            type: 'ALERT',
            timestamp: now.toISOString(),
            isRead: false,
            roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPERATIONS_MANAGER', 'DIRECTOR_CEO'],
            actionRoute: 'CERTIFICATION_TRACKING'
          });
        }
      }

      if (newStatus !== cert.status || updatedMilestones) {
        const ref = doc(db, 'employeeCertifications', cert.id);
        batch.update(ref, { 
          status: newStatus,
          remindersDispatched: dispatchedMilestones,
          updatedAt: now.toISOString()
        });
      }
    }

    if (notifications.length > 0) {
      for (const n of notifications) {
         const notifRef = doc(db, 'notifications', n.id);
         batch.set(notifRef, { ...n, companyId });
      }
    }

    await batch.commit();
  }

  /**
   * Checks if an employee has any expired mandatory certifications (e.g. PSARA, Fire Safety, First Aid, Gun License)
   */
  static async checkEmployeeComplianceStatus(companyId: string, employeeId: string): Promise<{
    isCompliant: boolean;
    expiredCerts: EmployeeCertificationRecord[];
    expiringSoonCerts: EmployeeCertificationRecord[];
    blockingReason?: string;
  }> {
    try {
      const certs = await this.getEmployeeCertifications(companyId, employeeId);
      const now = new Date();
      const expiredCerts = certs.filter(c => {
        if (c.status === 'REVOKED' || c.status === 'RENEWED') return false;
        if (c.status === 'EXPIRED') return true;
        if (c.expiryDate && isBefore(parseISO(c.expiryDate), now)) return true;
        return false;
      });

      const expiringSoonCerts = certs.filter(c => {
        if (c.status === 'REVOKED' || c.status === 'RENEWED' || c.status === 'EXPIRED') return false;
        if (c.expiryDate) {
          const days = differenceInDays(parseISO(c.expiryDate), now);
          return days >= 0 && days <= 15;
        }
        return false;
      });

      const isCompliant = expiredCerts.length === 0;
      const blockingReason = !isCompliant 
        ? `Mandatory statutory certification (${expiredCerts.map(c => c.certificationName).join(', ')}) has expired.`
        : undefined;

      return {
        isCompliant,
        expiredCerts,
        expiringSoonCerts,
        blockingReason
      };
    } catch (err) {
      console.warn('[CertificationTrackingService] checkEmployeeComplianceStatus error:', err);
      return { isCompliant: true, expiredCerts: [], expiringSoonCerts: [] };
    }
  }

  static async renewCertification(session: UserSession, oldCertId: string, newCertData: Partial<EmployeeCertificationRecord>): Promise<EmployeeCertificationRecord> {
    // 1. Get old cert
    const oldRef = doc(db, 'employeeCertifications', oldCertId);
    const oldSnap = await getDoc(oldRef);
    if (!oldSnap.exists()) throw new Error("Old certification not found");
    const oldCert = oldSnap.data() as EmployeeCertificationRecord;

    if (oldCert.companyId !== session.companyId) throw new Error("Unauthorized");

    // 2. Create new cert
    const newCert: EmployeeCertificationRecord = {
      ...oldCert,
      ...newCertData,
      id: uuidv4(),
      status: 'ACTIVE',
      previousCertificationId: oldCert.id,
      renewedByCertificationId: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'employeeCertifications', newCert.id), newCert);

    // 3. Mark old cert as renewed
    batch.update(oldRef, {
      status: 'RENEWED',
      renewedByCertificationId: newCert.id,
      updatedAt: new Date().toISOString()
    });

    await batch.commit();
    
    await SecurityAuditService.logEvent(session.companyId, session.userId, session.role, session.employeeId, 'RENEW_CERTIFICATION', 'CERTIFICATION', newCert.id, true, 'LOW');
/*
      oldCertificationId: oldCert.id,
      newCertificationId: newCert.id,
      employeeId: newCert.employeeId
    */

    return newCert;
  }
}

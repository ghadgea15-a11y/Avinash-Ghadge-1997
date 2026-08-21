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
    // In a real scheduled cloud function, this would run nightly.
    // For now, we simulate it or run it on dashboard load.
    const allCerts = await this.getCompanyCertifications(companyId);
    
    const batch = writeBatch(db);
    const now = new Date();
    
    const notifications: AppNotification[] = [];

    for (const cert of allCerts) {
      if (!cert.expiryDate || cert.status === 'REVOKED' || cert.status === 'RENEWED') continue;

      const expiry = parseISO(cert.expiryDate);
      let newStatus = cert.status;

      if (isBefore(expiry, now)) {
        newStatus = 'EXPIRED';
      } else {
        const daysUntilExpiry = differenceInDays(expiry, now);
        if (daysUntilExpiry <= 90 && daysUntilExpiry >= 0) {
          newStatus = 'EXPIRING_SOON';
        } else {
          newStatus = 'ACTIVE';
        }
      }

      if (newStatus !== cert.status) {
        const ref = doc(db, 'employeeCertifications', cert.id);
        batch.update(ref, { 
          status: newStatus,
          updatedAt: now.toISOString()
        });

        // Notify if it just expired or is expiring soon (we should avoid spamming, but for demo we create notification)
        if (newStatus === 'EXPIRED') {
          notifications.push({
            id: uuidv4(),
            title: 'Certification Expired',
            message: `Certification ${cert.certificationName} for ${cert.employeeName} has expired.`,
            type: 'ALERT',
            timestamp: now.toISOString(),
            isRead: false,
            roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN'],
            actionRoute: 'CERTIFICATION_TRACKING'
          });
        } else if (newStatus === 'EXPIRING_SOON' && cert.status === 'ACTIVE') {
          notifications.push({
            id: uuidv4(),
            title: 'Certification Expiring Soon',
            message: `Certification ${cert.certificationName} for ${cert.employeeName} will expire on ${cert.expiryDate}.`,
            type: 'WARNING',
            timestamp: now.toISOString(),
            isRead: false,
            roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN'],
            actionRoute: 'CERTIFICATION_TRACKING'
          });
        }
      }
    }

    if (notifications.length > 0) {
      for (const n of notifications) {
         // Fire and forget or use a batch limit
         const notifRef = doc(db, 'notifications', n.id);
         batch.set(notifRef, { ...n, companyId });
      }
    }

    await batch.commit();
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

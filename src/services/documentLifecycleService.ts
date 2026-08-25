import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, getDoc, query, where, updateDoc, writeBatch } from 'firebase/firestore';
import { UserSession, AppNotification } from '../types';
import { LifecycleDocument, DocumentVersion, RenewalRequest, DocLifecycleStatus } from '../types/documentLifecycle';
import { AuditTrailService } from './auditTrailService';
import { BpmService } from './bpmService';

export class DocumentLifecycleService {

  static async registerDocument(session: UserSession, docData: Partial<LifecycleDocument>, fileUrl: string) {
    const docId = `DOC_LF_${Date.now()}`;
    const versionId = `VER_${Date.now()}`;
    const now = new Date().toISOString();

    const newDoc: LifecycleDocument = {
      ...docData as LifecycleDocument,
      id: docId,
      companyId: session.companyId,
      status: 'VALID',
      currentVersionId: versionId,
      createdAt: now,
      updatedAt: now
    };

    const newVer: DocumentVersion = {
      id: versionId,
      documentId: docId,
      companyId: session.companyId,
      versionNumber: 1,
      fileUrl,
      uploadedBy: session.userId,
      uploadedAt: now,
      status: 'ACTIVE'
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'companies', session.companyId, 'lifecycle_documents', docId), newDoc);
    batch.set(doc(db, 'companies', session.companyId, 'lifecycle_versions', versionId), newVer);
    await batch.commit();

    await AuditTrailService.logAction(session, 'COMPLIANCE', 'REGISTER_DOCUMENT', 'lifecycle_documents', docId, true, 'MEDIUM', undefined, { docId });
    return docId;
  }

  static async initiateRenewal(session: UserSession, documentId: string, newIssueDate: string, newExpiryDate: string, newFileUrl: string) {
    const reqId = `REN_${Date.now()}`;
    const now = new Date().toISOString();

    // Change status to RENEWAL_PENDING
    await updateDoc(doc(db, 'companies', session.companyId, 'lifecycle_documents', documentId), {
      status: 'RENEWAL_PENDING',
      updatedAt: now
    });

    // Optionally integrate with BPM (Skipping real BPM submit here to avoid complex mock data mapping if not needed, but can be added)
    const renewalReq: RenewalRequest = {
      id: reqId,
      documentId,
      companyId: session.companyId,
      requestedBy: session.userId,
      newIssueDate,
      newExpiryDate,
      newFileUrl,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    };

    await setDoc(doc(db, 'companies', session.companyId, 'lifecycle_renewals', reqId), renewalReq);
    await AuditTrailService.logAction(session, 'COMPLIANCE', 'INITIATE_RENEWAL', 'lifecycle_renewals', reqId, true, 'MEDIUM', undefined, { documentId, reqId });
    
    return reqId;
  }

  static async approveRenewal(session: UserSession, renewalId: string) {
    const renewalSnap = await getDoc(doc(db, 'companies', session.companyId, 'lifecycle_renewals', renewalId));
    if (!renewalSnap.exists()) throw new Error("Renewal request not found");
    const renewal = renewalSnap.data() as RenewalRequest;

    const docSnap = await getDoc(doc(db, 'companies', session.companyId, 'lifecycle_documents', renewal.documentId));
    const document = docSnap.data() as LifecycleDocument;

    const newVersionId = `VER_${Date.now()}`;
    const now = new Date().toISOString();

    const batch = writeBatch(db);

    // 1. Mark renewal as approved
    batch.update(renewalSnap.ref, { status: 'APPROVED', updatedAt: now });

    // 2. Archive old version
    batch.update(doc(db, 'companies', session.companyId, 'lifecycle_versions', document.currentVersionId), {
      status: 'ARCHIVED'
    });

    // 3. Create new version
    const newVer: DocumentVersion = {
      id: newVersionId,
      documentId: document.id,
      companyId: session.companyId,
      versionNumber: (await this.getVersions(session, document.id)).length + 1,
      fileUrl: renewal.newFileUrl,
      uploadedBy: renewal.requestedBy,
      uploadedAt: now,
      approvedBy: session.userId,
      status: 'ACTIVE'
    };
    batch.set(doc(db, 'companies', session.companyId, 'lifecycle_versions', newVersionId), newVer);

    // 4. Update Document
    batch.update(docSnap.ref, {
      issueDate: renewal.newIssueDate,
      expiryDate: renewal.newExpiryDate,
      currentVersionId: newVersionId,
      status: 'VALID',
      lastReminderLevel: null, // reset reminders
      updatedAt: now
    });

    await batch.commit();
    await AuditTrailService.logApproval(session, 'COMPLIANCE', 'lifecycle_renewals', renewalId, undefined, "Approved Document Renewal");
  }

  static async evaluateExpiries(companyId: string) {
    const docsRef = collection(db, 'companies', companyId, 'lifecycle_documents');
    const activeDocs = await getDocs(query(docsRef, where('status', 'in', ['VALID', 'EXPIRING_SOON', 'EXPIRED'])));
    
    const nowMs = new Date().getTime();
    let updates = 0;
    const batch = writeBatch(db);

    for (const d of activeDocs.docs) {
      const document = d.data() as LifecycleDocument;
      const expiryMs = new Date(document.expiryDate).getTime();
      const diffDays = Math.ceil((expiryMs - nowMs) / (1000 * 60 * 60 * 24));

      let targetStatus: DocLifecycleStatus = document.status;
      if (diffDays <= 0) targetStatus = 'EXPIRED';
      else if (diffDays <= 30) targetStatus = 'EXPIRING_SOON'; // Hardcoded fallback bounds if needed
      
      // Determine reminder to send
      // We look for the smallest reminder day that is >= diffDays and hasn't been triggered yet.
      // (Assuming reminderScheduleDays is sorted descending, e.g. [90, 60, 30, 7, 0, -7])
      let reminderToTrigger = null;
      for (const day of document.reminderScheduleDays) {
        if (diffDays <= day) {
           if (document.lastReminderLevel == null || document.lastReminderLevel > day) {
              reminderToTrigger = day;
           }
        }
      }

      if (targetStatus !== document.status || reminderToTrigger !== null) {
        const updateData: any = { updatedAt: new Date().toISOString() };
        if (targetStatus !== document.status) updateData.status = targetStatus;
        if (reminderToTrigger !== null) updateData.lastReminderLevel = reminderToTrigger;

        batch.update(d.ref, updateData);
        updates++;

        if (reminderToTrigger !== null) {
           // Send notification
           const notifId = `NOTIF_LF_${document.id}_${reminderToTrigger}`;
           const notif: AppNotification = {
             id: notifId,
             title: diffDays <= 0 ? `DOCUMENT EXPIRED: ${document.title}` : `Document Expiring in ${diffDays} Days: ${document.title}`,
             message: `Document ${document.title} (${document.docType}) is due for renewal.`,
             type: diffDays <= 0 ? 'ALERT' : (diffDays <= 30 ? 'WARNING' : 'INFO'),
             timestamp: new Date().toISOString(),
             isRead: false
           };
           batch.set(doc(db, 'companies', companyId, 'notifications', notifId), notif);
        }
      }
    }
    
    if (updates > 0) {
      await batch.commit();
    }
    return updates;
  }

  static async getDashboardData(session: UserSession) {
    const docsSnap = await getDocs(collection(db, 'companies', session.companyId, 'lifecycle_documents'));
    const documents = docsSnap.docs.map(d => d.data() as LifecycleDocument);
    const renewalsSnap = await getDocs(query(collection(db, 'companies', session.companyId, 'lifecycle_renewals'), where('status', '==', 'PENDING')));
    const pendingRenewals = renewalsSnap.docs.map(d => d.data() as RenewalRequest);

    return { documents, pendingRenewals };
  }

  static async getVersions(session: UserSession, documentId: string) {
    const vSnap = await getDocs(query(collection(db, 'companies', session.companyId, 'lifecycle_versions'), where('documentId', '==', documentId)));
    return vSnap.docs.map(d => d.data() as DocumentVersion).sort((a,b) => b.versionNumber - a.versionNumber);
  }
}

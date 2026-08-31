import { getAdminDb } from './firebaseAdmin';
import { Request, Response } from 'express';
import crypto from 'crypto';

export interface DocumentHashRecord {
  documentId: string;
  companyId: string;
  employeeId: string;
  documentType: 'DEGREE' | 'CERTIFICATION' | 'ID_PROOF' | 'CONTRACT';
  originalFileName: string;
  storageUrl: string;
  sha256Hash: string;
  fileSizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
  isTampered: boolean;
  lastVerifiedAt: string;
  tamperDetectedAt?: string;
}

/**
 * Cryptographic Tamper-Evident Document Engine
 * Generates and validates SHA-256 fingerprints for critical HR documents
 * to ensure they have not been altered in storage.
 */
export class CryptographicDocumentEngine {
  
  /**
   * Generates a SHA-256 hash for a document buffer and stores it in the immutable ledger.
   */
  public static async registerDocumentFingerprint(
    companyId: string, 
    employeeId: string, 
    documentId: string, 
    documentType: DocumentHashRecord['documentType'],
    originalFileName: string,
    storageUrl: string,
    fileBuffer: Buffer,
    uploadedBy: string
  ): Promise<string> {
    const db = getAdminDb();
    if (!db) throw new Error('Database connection unavailable');

    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const timestamp = new Date().toISOString();

    const record: DocumentHashRecord = {
      documentId,
      companyId,
      employeeId,
      documentType,
      originalFileName,
      storageUrl,
      sha256Hash,
      fileSizeBytes: fileBuffer.length,
      uploadedAt: timestamp,
      uploadedBy,
      isTampered: false,
      lastVerifiedAt: timestamp
    };

    // Store in an immutable isolated collection
    await db.collection('companies').doc(companyId).collection('document_ledger').doc(documentId).set(record);

    // Audit log
    await db.collection('companies').doc(companyId).collection('audit_logs').add({
      companyId,
      action: 'DOCUMENT_FINGERPRINT_REGISTERED',
      entityId: documentId,
      entityType: 'DOCUMENT',
      details: `Generated SHA-256 hash for ${originalFileName}`,
      timestamp,
      userId: uploadedBy,
      userName: 'System'
    });

    return sha256Hash;
  }

  /**
   * Verifies if a document currently in storage matches its original registered hash.
   */
  public static async verifyDocumentAuthenticity(
    companyId: string,
    documentId: string,
    currentFileBuffer: Buffer
  ): Promise<{ isAuthentic: boolean; expectedHash: string; actualHash: string }> {
    const db = getAdminDb();
    if (!db) throw new Error('Database connection unavailable');

    const docSnap = await db.collection('companies').doc(companyId).collection('document_ledger').doc(documentId).get();
    
    if (!docSnap.exists) {
      throw new Error('Document fingerprint not found in ledger');
    }

    const record = docSnap.data() as DocumentHashRecord;
    const actualHash = crypto.createHash('sha256').update(currentFileBuffer).digest('hex');
    
    const isAuthentic = record.sha256Hash === actualHash;
    const timestamp = new Date().toISOString();

    // Update verification status
    if (!isAuthentic && !record.isTampered) {
      await docSnap.ref.update({
        isTampered: true,
        tamperDetectedAt: timestamp,
        lastVerifiedAt: timestamp
      });

      // Raise high-priority security alert
      await db.collection('companies').doc(companyId).collection('security_alerts').add({
        companyId,
        alertType: 'DOCUMENT_TAMPERING_DETECTED',
        severity: 'CRITICAL',
        documentId,
        employeeId: record.employeeId,
        details: `Document ${record.originalFileName} hash mismatch. The file in storage has been altered.`,
        timestamp,
        status: 'UNRESOLVED'
      });
    } else {
      await docSnap.ref.update({ lastVerifiedAt: timestamp });
    }

    return {
      isAuthentic,
      expectedHash: record.sha256Hash,
      actualHash
    };
  }
}

// --- API Handlers ---

export const registerDocumentHashHandler = async (req: Request, res: Response) => {
  try {
    const { companyId, employeeId, documentId, documentType, originalFileName, storageUrl, base64File, uploadedBy } = req.body;
    
    if (!companyId || !documentId || !base64File) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const fileBuffer = Buffer.from(base64File, 'base64');
    const hash = await CryptographicDocumentEngine.registerDocumentFingerprint(
      companyId, employeeId, documentId, documentType, originalFileName, storageUrl, fileBuffer, uploadedBy
    );

    return res.json({ success: true, hash });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const verifyDocumentHashHandler = async (req: Request, res: Response) => {
  try {
    const { companyId, documentId, base64File } = req.body;
    
    if (!companyId || !documentId || !base64File) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const fileBuffer = Buffer.from(base64File, 'base64');
    const result = await CryptographicDocumentEngine.verifyDocumentAuthenticity(companyId, documentId, fileBuffer);

    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

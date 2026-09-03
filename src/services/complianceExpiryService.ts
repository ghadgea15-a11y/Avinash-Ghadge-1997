import { 
  ComplianceDocType, 
  DocRenewalStatus, 
  GuardComplianceDocument, 
  ExpiryNotificationAlert, 
  ShiftComplianceValidationResult 
} from '../types/complianceExpiry';

const STORAGE_KEY_DOCS = 'security_guard_compliance_docs';

export class ComplianceExpiryService {
  // Calculate status and days remaining
  static evaluateDocStatus(expiryDateStr: string): { 
    status: DocRenewalStatus; 
    daysRemaining: number;
    urgencyLevel: 'INFO' | 'WARNING' | 'CRITICAL';
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      return { status: 'EXPIRED', daysRemaining, urgencyLevel: 'CRITICAL' };
    } else if (daysRemaining <= 7) {
      return { status: 'EXPIRING_7', daysRemaining, urgencyLevel: 'CRITICAL' };
    } else if (daysRemaining <= 15) {
      return { status: 'EXPIRING_15', daysRemaining, urgencyLevel: 'WARNING' };
    } else if (daysRemaining <= 30) {
      return { status: 'EXPIRING_30', daysRemaining, urgencyLevel: 'INFO' };
    }
    return { status: 'ACTIVE', daysRemaining, urgencyLevel: 'INFO' };
  }

  // Load all guard documents for a company
  static getGuardDocuments(companyId: string, employeeId?: string): GuardComplianceDocument[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DOCS);
      if (raw) {
        const all: GuardComplianceDocument[] = JSON.parse(raw);
        const filtered = all.filter(d => d.companyId === companyId && (!employeeId || d.employeeId === employeeId));
        if (filtered.length > 0) {
          // Re-evaluate dynamic status based on current date
          return filtered.map(d => {
            const evaluated = this.evaluateDocStatus(d.expiryDate);
            return {
              ...d,
              renewalStatus: d.renewalStatus === 'IN_RENEWAL' ? 'IN_RENEWAL' : evaluated.status
            };
          });
        }
      }
    } catch (e) {
      console.error('Error reading compliance documents:', e);
    }

    // Default enterprise seed data
    const defaults: GuardComplianceDocument[] = [
      {
        id: 'DOC-101',
        documentId: 'DOC-101',
        companyId,
        employeeId: 'EMP-001',
        employeeName: 'Ramesh Kumar',
        documentType: 'PSARA_LICENSE',
        documentNumber: 'PSARA/MH/2023/88219',
        issuingAuthority: 'Controlling Authority (Home Dept, Maharashtra)',
        issueDate: '2023-08-15',
        expiryDate: '2026-08-14', // Expired
        renewalStatus: 'EXPIRED',
        isMandatoryForDeployment: true,
        verificationStatus: 'VERIFIED',
        verifiedBy: 'HR Operations Lead',
        createdAt: Date.now() - 86400000 * 60,
        updatedAt: Date.now()
      },
      {
        id: 'DOC-102',
        documentId: 'DOC-102',
        companyId,
        employeeId: 'EMP-001',
        employeeName: 'Ramesh Kumar',
        documentType: 'POLICE_VERIFICATION',
        documentNumber: 'PV-MUM-89211',
        issuingAuthority: 'Mumbai City Police Commissionerate',
        issueDate: '2024-01-10',
        expiryDate: '2027-01-10',
        renewalStatus: 'ACTIVE',
        isMandatoryForDeployment: true,
        verificationStatus: 'VERIFIED',
        createdAt: Date.now() - 86400000 * 60,
        updatedAt: Date.now()
      },
      {
        id: 'DOC-103',
        documentId: 'DOC-103',
        companyId,
        employeeId: 'EMP-002',
        employeeName: 'Suresh Patil',
        documentType: 'PSARA_LICENSE',
        documentNumber: 'PSARA/MH/2025/11094',
        issuingAuthority: 'Controlling Authority (Home Dept, Maharashtra)',
        issueDate: '2025-01-01',
        expiryDate: '2028-01-01',
        renewalStatus: 'ACTIVE',
        isMandatoryForDeployment: true,
        verificationStatus: 'VERIFIED',
        createdAt: Date.now() - 86400000 * 30,
        updatedAt: Date.now()
      },
      {
        id: 'DOC-104',
        documentId: 'DOC-104',
        companyId,
        employeeId: 'EMP-002',
        employeeName: 'Suresh Patil',
        documentType: 'ARMS_LICENSE',
        documentNumber: 'ARM-LIC-3329-P',
        issuingAuthority: 'District Magistrate & Police Collector',
        issueDate: '2023-09-10',
        expiryDate: '2026-09-08', // Expiring in 5 days (CRITICAL EXPIRING_7)
        renewalStatus: 'EXPIRING_7',
        isMandatoryForDeployment: true,
        verificationStatus: 'VERIFIED',
        createdAt: Date.now() - 86400000 * 30,
        updatedAt: Date.now()
      },
      {
        id: 'DOC-105',
        documentId: 'DOC-105',
        companyId,
        employeeId: 'EMP-003',
        employeeName: 'Vikram Singh',
        documentType: 'MEDICAL_FITNESS',
        documentNumber: 'MED-FIT-8821',
        issuingAuthority: 'Civil Hospital CMO',
        issueDate: '2025-09-20',
        expiryDate: '2026-09-20', // Expiring in ~17 days (EXPIRING_30)
        renewalStatus: 'EXPIRING_30',
        isMandatoryForDeployment: false,
        verificationStatus: 'VERIFIED',
        createdAt: Date.now() - 86400000 * 30,
        updatedAt: Date.now()
      }
    ];

    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(defaults));
    } catch {
      // Ignore
    }

    return defaults;
  }

  // Save or update document
  static saveDocument(doc: GuardComplianceDocument): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DOCS);
      const all: GuardComplianceDocument[] = raw ? JSON.parse(raw) : [];
      const evaluated = this.evaluateDocStatus(doc.expiryDate);
      doc.renewalStatus = doc.renewalStatus === 'IN_RENEWAL' ? 'IN_RENEWAL' : evaluated.status;
      doc.updatedAt = Date.now();

      const idx = all.findIndex(d => d.documentId === doc.documentId);
      if (idx >= 0) {
        all[idx] = doc;
      } else {
        all.push(doc);
      }
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(all));
    } catch (e) {
      console.error('Error saving compliance document:', e);
    }
  }

  // Shift Scheduling Pre-Validation: STOPS non-compliant guards from being deployed
  static validateGuardShiftEligibility(
    companyId: string,
    employeeId: string,
    isArmedPost: boolean = false
  ): ShiftComplianceValidationResult {
    const docs = this.getGuardDocuments(companyId, employeeId);
    
    // Check PSARA
    const psaraDoc = docs.find(d => d.documentType === 'PSARA_LICENSE');
    if (!psaraDoc) {
      return {
        allowed: false,
        blockReason: 'Deployment Blocked: Mandatory PSARA License not on file for this guard.',
        expiredDocumentType: 'PSARA_LICENSE'
      };
    }

    const psaraEval = this.evaluateDocStatus(psaraDoc.expiryDate);
    if (psaraEval.status === 'EXPIRED') {
      return {
        allowed: false,
        blockReason: `Deployment Blocked: PSARA License ${psaraDoc.documentNumber} EXPIRED on ${psaraDoc.expiryDate}. Scheduling blocked under State Private Security Agencies Regulation Act.`,
        expiredDocumentType: 'PSARA_LICENSE',
        expiryDate: psaraDoc.expiryDate,
        details: 'Guard cannot be placed on active duty until renewal certification is uploaded and verified.'
      };
    }

    // Check Arms License if armed post
    if (isArmedPost) {
      const armsDoc = docs.find(d => d.documentType === 'ARMS_LICENSE');
      if (!armsDoc) {
        return {
          allowed: false,
          blockReason: 'Deployment Blocked: Armed post requires valid Arms License, but none is recorded for this guard.',
          expiredDocumentType: 'ARMS_LICENSE'
        };
      }
      const armsEval = this.evaluateDocStatus(armsDoc.expiryDate);
      if (armsEval.status === 'EXPIRED') {
        return {
          allowed: false,
          blockReason: `Deployment Blocked: Arms License ${armsDoc.documentNumber} EXPIRED on ${armsDoc.expiryDate}. Cannot be deployed with firearm.`,
          expiredDocumentType: 'ARMS_LICENSE',
          expiryDate: armsDoc.expiryDate
        };
      }
    }

    return {
      allowed: true
    };
  }

  // Get active notification alerts for expiring certifications (30 / 15 / 7 / expired)
  static getExpiryAlerts(companyId: string): ExpiryNotificationAlert[] {
    const docs = this.getGuardDocuments(companyId);
    const alerts: ExpiryNotificationAlert[] = [];

    for (const d of docs) {
      const { status, daysRemaining, urgencyLevel } = this.evaluateDocStatus(d.expiryDate);
      if (status !== 'ACTIVE' && status !== 'IN_RENEWAL') {
        alerts.push({
          id: `ALERT-${d.documentId}-${status}`,
          companyId,
          employeeId: d.employeeId,
          employeeName: d.employeeName,
          documentType: d.documentType,
          expiryDate: d.expiryDate,
          daysRemaining,
          urgencyLevel,
          notifiedRoles: daysRemaining <= 7 ? ['EMPLOYEE', 'SUPERVISOR', 'HR_ADMIN', 'OPERATIONS_MANAGER'] : ['EMPLOYEE', 'SUPERVISOR'],
          timestamp: Date.now(),
          acknowledged: false
        });
      }
    }

    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }
}

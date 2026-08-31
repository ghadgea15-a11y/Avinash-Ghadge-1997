import { getAdminDb } from './firebaseAdmin';
import { Request, Response } from 'express';

// --- Types ---
export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodesAffected: number;
}

export interface A11yScanReport {
  scanId: string;
  companyId: string;
  scannedUrl: string;
  timestamp: string;
  environment: 'CI' | 'STAGING' | 'PRODUCTION';
  standard: 'WCAG2.1AA' | 'WCAG2.2AA';
  passesCount: number;
  violationsCount: number;
  violations: AxeViolation[];
  complianceScore: number; // 0 to 100
}

export interface A11yComplianceMetrics {
  targetStandard: string;
  overallComplianceScore: number; // e.g., 98%
  criticalViolations: number;
  seriousViolations: number;
  lastScanTimestamp: string | null;
  isCompliant: boolean; // True if no critical/serious violations and score > 95
}

/**
 * Enterprise Accessibility (A11y) Governance Engine
 * Tracks WCAG 2.1 AA Compliance across the platform by ingesting automated
 * accessibility scans (e.g., from Axe-Core CI pipelines or Lighthouse).
 */
export class AccessibilityGovernanceEngine {
  private static TARGET_STANDARD = 'WCAG 2.1 AA';
  private static MIN_COMPLIANCE_SCORE = 95;

  /**
   * Ingests an automated accessibility scan report (e.g., from CI/CD Axe-core).
   */
  public static async ingestScanReport(companyId: string, payload: Omit<A11yScanReport, 'scanId' | 'timestamp' | 'companyId'>): Promise<A11yScanReport> {
    const db = getAdminDb();
    if (!db) throw new Error('Database connection unavailable');

    const scanId = `A11Y-SCAN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const report: A11yScanReport = {
      scanId,
      companyId,
      timestamp,
      ...payload
    };

    const batch = db.batch();
    const scanRef = db.collection('companies').doc(companyId).collection('a11y_scans').doc(scanId);
    batch.set(scanRef, report);

    // Update ongoing compliance posture
    const postureRef = db.collection('companies').doc(companyId).collection('compliance_posture').doc('accessibility');
    
    let criticalCount = 0;
    let seriousCount = 0;
    
    payload.violations.forEach(v => {
      if (v.impact === 'critical') criticalCount++;
      if (v.impact === 'serious') seriousCount++;
    });

    const isCompliant = criticalCount === 0 && seriousCount === 0 && payload.complianceScore >= this.MIN_COMPLIANCE_SCORE;

    batch.set(postureRef, {
      lastScanId: scanId,
      lastScanTimestamp: timestamp,
      currentScore: payload.complianceScore,
      criticalViolations: criticalCount,
      seriousViolations: seriousCount,
      isCompliant,
      standard: payload.standard
    }, { merge: true });

    // Audit log
    const auditRef = db.collection('companies').doc(companyId).collection('audit_logs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      companyId,
      action: 'A11Y_SCAN_INGESTED',
      entityId: scanId,
      entityType: 'A11Y_SCAN',
      details: `WCAG 2.1 AA Scan ingested for ${payload.scannedUrl}. Score: ${payload.complianceScore}%`,
      timestamp,
      userId: 'SYSTEM_CI',
      userName: 'CI/CD Pipeline'
    });

    await batch.commit();
    return report;
  }

  /**
   * Retrieves the current WCAG Accessibility Compliance Metrics for the company.
   */
  public static async getComplianceMetrics(companyId: string): Promise<A11yComplianceMetrics> {
    const db = getAdminDb();
    if (!db) throw new Error('Database connection unavailable');

    const postureSnap = await db.collection('companies').doc(companyId).collection('compliance_posture').doc('accessibility').get();
    
    if (!postureSnap.exists) {
      return {
        targetStandard: this.TARGET_STANDARD,
        overallComplianceScore: 0,
        criticalViolations: 0,
        seriousViolations: 0,
        lastScanTimestamp: null,
        isCompliant: false
      };
    }

    const data = postureSnap.data() as any;

    return {
      targetStandard: this.TARGET_STANDARD,
      overallComplianceScore: data.currentScore || 0,
      criticalViolations: data.criticalViolations || 0,
      seriousViolations: data.seriousViolations || 0,
      lastScanTimestamp: data.lastScanTimestamp || null,
      isCompliant: data.isCompliant || false
    };
  }
}

// --- Express API Handlers ---

export const ingestA11yScanHandler = async (req: Request, res: Response) => {
  try {
    const { companyId, payload } = req.body;
    if (!companyId || !payload) return res.status(400).json({ success: false, error: 'companyId and payload are required' });

    const result = await AccessibilityGovernanceEngine.ingestScanReport(companyId, payload);
    return res.json({ success: true, report: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getA11yMetricsHandler = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const metrics = await AccessibilityGovernanceEngine.getComplianceMetrics(companyId);
    return res.json({ success: true, metrics });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

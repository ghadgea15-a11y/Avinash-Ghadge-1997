import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { 
  BulkAndExportAlertRecord, 
  SecurityGovernanceConfig, 
  SensitiveDataClassification, 
  BulkOperationType, 
  ExportDataFormat, 
  SecuritySeverity, 
  UserSession,
  AppNotification
} from '../types';
import { SecurityAuditService } from './securityAuditService';
import { AuditTrailService } from './auditTrailService';
import { FirestoreService } from './firestoreService';

const DEFAULT_CONFIG: SecurityGovernanceConfig = {
  companyId: '',
  businessHoursStart: 8, // 08:00 AM
  businessHoursEnd: 20,   // 08:00 PM
  bulkWarningThreshold: 25,
  exportWarningThreshold: 100,
  sensitiveExportNotificationThreshold: 'MEDIUM',
  repeatedDownloadWindowMinutes: 10,
  repeatedDownloadMaxCount: 3
};

export class BulkExportGovernanceService {
  /**
   * Fetch company-specific governance configuration with fallback defaults
   */
  static async getGovernanceConfig(companyId: string): Promise<SecurityGovernanceConfig> {
    if (!companyId) return { ...DEFAULT_CONFIG, companyId };
    try {
      const docRef = doc(db, 'companies', companyId, 'system_settings', 'security_governance');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...DEFAULT_CONFIG, ...snap.data(), companyId };
      }
    } catch (err) {
      console.warn('[BulkExportGovernanceService] Failed to load config, using defaults:', err);
    }
    return { ...DEFAULT_CONFIG, companyId };
  }

  /**
   * Update company-specific governance configuration
   */
  static async updateGovernanceConfig(
    session: UserSession,
    companyId: string,
    updates: Partial<SecurityGovernanceConfig>
  ): Promise<boolean> {
    if (!companyId) return false;
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'COMPANY_ADMIN') {
      await SecurityAuditService.logUnauthorizedAttempt(session, 'Unauthorized bulk export governance config update attempt', 'security_governance');
      console.warn('[BulkExportGovernanceService] Unauthorized config update attempt');
      return false;
    }
    try {
      const current = await this.getGovernanceConfig(companyId);
      const updatedConfig: SecurityGovernanceConfig = {
        ...current,
        ...updates,
        companyId,
        updatedAt: new Date().toISOString(),
        updatedBy: session.userId
      };

      const docRef = doc(db, 'companies', companyId, 'system_settings', 'security_governance');
      await setDoc(docRef, updatedConfig, { merge: true });

      await SecurityAuditService.logEvent(
        session.companyId,
        session.userId,
        session.role,
        session.employeeId,
        'CONFIG_UPDATE',
        'security_governance',
        companyId,
        true,
        'HIGH',
        'Bulk Export Governance Configuration Updated'
      ).catch(() => {});

      // Audit Trail
      const actorInfo = { userId: session.userId, employeeId: session.employeeId, role: session.role, companyId } as any;
      await AuditTrailService.logUpdate(
        actorInfo,
        'GRC_GOVERNANCE',
        'SecurityGovernanceConfig',
        'security_governance',
        `Updated security governance policy (Business Hours: ${updatedConfig.businessHoursStart}:00-${updatedConfig.businessHoursEnd}:00, Bulk Threshold: ${updatedConfig.bulkWarningThreshold}, Export Threshold: ${updatedConfig.exportWarningThreshold})`
      );

      return true;
    } catch (err) {
      console.error('[BulkExportGovernanceService] updateGovernanceConfig error:', err);
      return false;
    }
  }

  /**
   * Evaluate and record a Bulk Operation (Updates, Status Changes, Assignments, Deletions, Publishing)
   */
  static async evaluateAndRecordBulkOperation(params: {
    session: UserSession;
    companyId: string;
    module: string;
    entityType: string;
    operation: BulkOperationType;
    affectedRecordCount: number;
    affectedRecordIds?: string[];
    source?: string;
    reason?: string;
    correlationId?: string;
    metadata?: Record<string, any>;
  }): Promise<BulkAndExportAlertRecord | null> {
    const { session, companyId, module, entityType, operation, affectedRecordCount, affectedRecordIds, source, reason, metadata } = params;
    if (!companyId) return null;

    try {
      const config = await this.getGovernanceConfig(companyId);
      const now = new Date();
      const currentHour = now.getHours();
      const isAfterHours = currentHour < config.businessHoursStart || currentHour >= config.businessHoursEnd;
      const isLateNight = currentHour < 6 || currentHour >= 22;

      const rulesTriggered: string[] = [];
      const evidenceParts: string[] = [];
      let riskScore = 0;

      // Rule 1: Large Bulk Volume
      if (affectedRecordCount >= config.bulkWarningThreshold) {
        rulesTriggered.push('LARGE_BULK_OPERATION');
        const pts = affectedRecordCount >= 100 ? 45 : 30;
        riskScore += pts;
        evidenceParts.push(`Modified ${affectedRecordCount} records (Threshold: ${config.bulkWarningThreshold})`);
      }

      // Rule 2: After-Hours Bulk Activity
      if (isAfterHours) {
        rulesTriggered.push('AFTER_HOURS_BULK_EDIT');
        const pts = isLateNight ? 50 : 35;
        riskScore += pts;
        evidenceParts.push(`Executed at ${now.toLocaleTimeString()} outside configured business hours (${config.businessHoursStart}:00-${config.businessHoursEnd}:00)`);
      }

      // Rule 3: Bulk Deletion or Critical Mass Unpublish
      if (operation === 'BULK_DELETE' || operation === 'BULK_UNPUBLISH') {
        rulesTriggered.push('BULK_DELETE_ATTEMPT');
        riskScore += 50;
        evidenceParts.push(`Destructive or revert bulk operation (${operation}) attempted on ${affectedRecordCount} items`);
      }

      // Rule 4: Cross-Site / Broad Scope Bulk Edit
      if (metadata?.isCrossSite || (metadata?.siteCount && metadata.siteCount > 1)) {
        rulesTriggered.push('CROSS_SITE_BULK_EDIT');
        riskScore += 25;
        evidenceParts.push(`Impacted multiple sites simultaneously (${metadata.siteCount} sites)`);
      }

      // Rule 5: Repeated Bulk Operations in Short Window
      try {
        const recentWindow = new Date(now.getTime() - config.repeatedDownloadWindowMinutes * 60000);
        const alertsRef = collection(db, 'companies', companyId, 'bulk_export_alerts');
        const q = query(
          alertsRef,
          where('userId', '==', session.userId),
          where('eventType', '==', 'BULK_OPERATION'),
          limit(10)
        );
        const snap = await getDocs(q);
        const recentCount = snap.docs.filter(d => new Date(d.data().timestamp) >= recentWindow).length;
        if (recentCount >= 2) {
          rulesTriggered.push('REPEATED_BULK_OPERATIONS');
          riskScore += 35;
          evidenceParts.push(`User performed ${recentCount + 1} bulk operations in the last ${config.repeatedDownloadWindowMinutes} minutes`);
        }
      } catch (e) {
        // Non-blocking query failure
      }

      // Calculate Severity
      let severity: SecuritySeverity = 'LOW';
      if (riskScore >= 80) severity = 'CRITICAL';
      else if (riskScore >= 55) severity = 'HIGH';
      else if (riskScore >= 30) severity = 'MEDIUM';

      const correlationId = params.correlationId || `BULK-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const alertId = `ALERT-${correlationId}`;
      const evidence = evidenceParts.length > 0 ? evidenceParts.join(' | ') : `Standard bulk ${operation} of ${affectedRecordCount} records.`;

      // Log to Immutable Audit Trail
      const actorInfo = { userId: session.userId, employeeId: session.employeeId, role: session.role, companyId } as any;
      await AuditTrailService.logAction(
        actorInfo,
        module,
        operation,
        entityType,
        correlationId,
        true,
        severity,
        `Bulk operation ${operation} on ${affectedRecordCount} ${entityType} records. Severity: ${severity}`,
        { affectedCount: affectedRecordCount, rules: rulesTriggered, riskScore, isAfterHours }
      );

      // Only create high-level Governance Alert & Anomaly if risk score >= 25 or rules triggered
      if (rulesTriggered.length > 0 || riskScore >= 25) {
        const alertRecord: BulkAndExportAlertRecord = {
          id: alertId,
          companyId,
          category: isAfterHours ? 'AFTER_HOURS_DOWNLOAD' : 'BULK_EDIT',
          eventType: 'BULK_OPERATION',
          userId: session.userId,
          userRole: session.role,
          userEmployeeId: session.employeeId,
          userName: session.fullName || session.email || session.userId,
          module,
          entityType,
          operation,
          affectedRecordCount,
          isAfterHours,
          localTimeHour: currentHour,
          riskScore,
          severity,
          rulesTriggered,
          evidence,
          timestamp: now.toISOString(),
          status: 'DETECTED',
          correlationId,
          affectedRecordIds: affectedRecordIds?.slice(0, 50),
          metadata: { ...metadata, source: source || 'WEB_APP', reason }
        };

        const alertDocRef = doc(db, 'companies', companyId, 'bulk_export_alerts', alertId);
        await setDoc(alertDocRef, alertRecord);

        // Security Audit Anomaly integration
        if (severity === 'HIGH' || severity === 'CRITICAL') {
          await SecurityAuditService.logEvent(
            companyId,
            session.userId,
            session.role,
            session.employeeId,
            `BULK_${operation}`,
            entityType,
            correlationId,
            true,
            severity,
            evidence
          );

          // Dispatch Notification to Admins
          await this.notifyAdmins(companyId, alertRecord);
        }

        return alertRecord;
      }

      return null;
    } catch (err) {
      console.error('[BulkExportGovernanceService] evaluateAndRecordBulkOperation error:', err);
      return null;
    }
  }

  /**
   * Evaluate and record a Data Download / Export event (CSV, Excel, PDF, Bank Files, Documents)
   */
  static async evaluateAndRecordExport(params: {
    session: UserSession;
    companyId: string;
    module: string;
    entityType: string;
    exportFormat: ExportDataFormat;
    dataClassification: SensitiveDataClassification;
    recordCount: number;
    exportName: string;
    source?: string;
    reason?: string;
    correlationId?: string;
    metadata?: Record<string, any>;
  }): Promise<BulkAndExportAlertRecord | null> {
    const { session, companyId, module, entityType, exportFormat, dataClassification, recordCount, exportName, source, reason, metadata } = params;
    if (!companyId) return null;

    try {
      const config = await this.getGovernanceConfig(companyId);
      const now = new Date();
      const currentHour = now.getHours();
      const isAfterHours = currentHour < config.businessHoursStart || currentHour >= config.businessHoursEnd;
      const isLateNight = currentHour < 6 || currentHour >= 22;

      const rulesTriggered: string[] = [];
      const evidenceParts: string[] = [];
      let riskScore = 0;

      // Rule 1: After-Hours Data Export
      if (isAfterHours) {
        rulesTriggered.push('AFTER_HOURS_DOWNLOAD');
        const pts = isLateNight ? 55 : 40;
        riskScore += pts;
        evidenceParts.push(`Exported at ${now.toLocaleTimeString()} outside business hours (${config.businessHoursStart}:00-${config.businessHoursEnd}:00)`);
      }

      // Rule 2: Sensitive Data Classification
      if (dataClassification === 'PAYROLL_SALARY' || dataClassification === 'BANK_DISBURSEMENT') {
        rulesTriggered.push('SENSITIVE_DATA_EXPORT');
        riskScore += 40;
        evidenceParts.push(`High sensitivity financial/payroll dataset export (${exportName})`);
      } else if (dataClassification === 'EMPLOYEE_PII') {
        rulesTriggered.push('SENSITIVE_DATA_EXPORT');
        riskScore += 30;
        evidenceParts.push(`Export of employee personal identifiable information (PII)`);
      } else if (dataClassification === 'STATUTORY_COMPLIANCE' || dataClassification === 'CLIENT_CONTRACT') {
        rulesTriggered.push('SENSITIVE_DATA_EXPORT');
        riskScore += 25;
        evidenceParts.push(`Export of statutory compliance / contractual register`);
      }

      // Rule 3: High Volume Export
      if (recordCount >= config.exportWarningThreshold) {
        rulesTriggered.push('HIGH_VOLUME_EXPORT');
        const pts = recordCount >= 500 ? 40 : 25;
        riskScore += pts;
        evidenceParts.push(`Exported ${recordCount} records (Threshold: ${config.exportWarningThreshold})`);
      }

      // Rule 4: Repeated Rapid Downloads in Short Window
      try {
        const recentWindow = new Date(now.getTime() - config.repeatedDownloadWindowMinutes * 60000);
        const alertsRef = collection(db, 'companies', companyId, 'bulk_export_alerts');
        const q = query(
          alertsRef,
          where('userId', '==', session.userId),
          where('eventType', '==', 'DATA_EXPORT'),
          limit(10)
        );
        const snap = await getDocs(q);
        const recentCount = snap.docs.filter(d => new Date(d.data().timestamp) >= recentWindow).length;
        if (recentCount >= (config.repeatedDownloadMaxCount - 1)) {
          rulesTriggered.push('REPEATED_EXPORT_ACTIVITY');
          riskScore += 35;
          evidenceParts.push(`User triggered ${recentCount + 1} export requests within ${config.repeatedDownloadWindowMinutes} minutes`);
        }
      } catch (e) {
        // Non-blocking query failure
      }

      // Rule 5: Role Authorization Scope Evaluation
      const isAdmin = session.role === 'SUPER_ADMIN' || session.role === 'COMPANY_ADMIN' || session.role === 'HR_ADMIN';
      if (!isAdmin && (dataClassification === 'PAYROLL_SALARY' || dataClassification === 'BANK_DISBURSEMENT' || dataClassification === 'EMPLOYEE_PII')) {
        rulesTriggered.push('UNAUTHORIZED_EXPORT');
        riskScore += 60;
        evidenceParts.push(`Non-administrative role (${session.role}) accessed restricted ${dataClassification} export`);
      }

      // Calculate Severity
      let severity: SecuritySeverity = 'LOW';
      if (riskScore >= 80) severity = 'CRITICAL';
      else if (riskScore >= 55) severity = 'HIGH';
      else if (riskScore >= 30) severity = 'MEDIUM';

      const correlationId = params.correlationId || `EXP-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const alertId = `ALERT-${correlationId}`;
      const evidence = evidenceParts.length > 0 ? evidenceParts.join(' | ') : `Standard export of ${recordCount} ${entityType} records (${exportFormat}).`;

      // Log to Immutable Audit Trail
      const actorInfo = { userId: session.userId, employeeId: session.employeeId, role: session.role, companyId } as any;
      await AuditTrailService.logAction(
        actorInfo,
        module,
        'DATA_EXPORT',
        entityType,
        correlationId,
        true,
        severity,
        `Exported ${recordCount} ${entityType} records [${exportFormat}]. Sensitivity: ${dataClassification}. Severity: ${severity}`,
        { exportFormat, dataClassification, recordCount, exportName, rules: rulesTriggered, riskScore, isAfterHours }
      );

      // Create Alert record if rules triggered, after-hours, or sensitive data involved
      const shouldCreateAlert = isAfterHours || dataClassification !== 'GENERAL' || recordCount >= config.exportWarningThreshold || rulesTriggered.length > 0;

      if (shouldCreateAlert) {
        let category: BulkAndExportAlertRecord['category'] = 'AFTER_HOURS_DOWNLOAD';
        if (isAfterHours) category = 'AFTER_HOURS_DOWNLOAD';
        else if (dataClassification === 'PAYROLL_SALARY' || dataClassification === 'EMPLOYEE_PII' || dataClassification === 'BANK_DISBURSEMENT') category = 'SENSITIVE_EXPORT';
        else if (recordCount >= config.exportWarningThreshold) category = 'HIGH_VOLUME_EXPORT';
        else if (rulesTriggered.includes('REPEATED_EXPORT_ACTIVITY')) category = 'REPEATED_ACTIVITY';

        const alertRecord: BulkAndExportAlertRecord = {
          id: alertId,
          companyId,
          category,
          eventType: 'DATA_EXPORT',
          userId: session.userId,
          userRole: session.role,
          userEmployeeId: session.employeeId,
          userName: session.fullName || session.email || session.userId,
          module,
          entityType,
          operation: `EXPORT_${exportFormat}`,
          affectedRecordCount: recordCount,
          exportFormat,
          dataClassification,
          isAfterHours,
          localTimeHour: currentHour,
          riskScore,
          severity,
          rulesTriggered,
          evidence,
          timestamp: now.toISOString(),
          status: 'DETECTED',
          correlationId,
          metadata: { ...metadata, exportName, source: source || 'WEB_APP', reason }
        };

        const alertDocRef = doc(db, 'companies', companyId, 'bulk_export_alerts', alertId);
        await setDoc(alertDocRef, alertRecord);

        // Security Audit Anomaly integration
        if (severity === 'HIGH' || severity === 'CRITICAL') {
          await SecurityAuditService.logEvent(
            companyId,
            session.userId,
            session.role,
            session.employeeId,
            `DATA_EXPORT_${exportFormat}`,
            entityType,
            correlationId,
            true,
            severity,
            evidence
          );

          // Dispatch Notification to Admins
          await this.notifyAdmins(companyId, alertRecord);
        }

        // Module 10 / Point 5: Compliance Policy Evaluation
        try {
          const { CompliancePolicyEngine } = await import('./compliancePolicyEngine');
          await CompliancePolicyEngine.evaluateTransaction({
            companyId,
            module: 'SECURITY',
            transactionType: `DATA_EXPORT_${exportFormat}`,
            transactionId: alertId,
            subjectId: session.userId,
            subjectName: session.fullName || session.email,
            data: {
              isAfterHoursExport: isAfterHours,
              recordCount,
              exportFormat,
              dataClassification,
              riskScore,
              severity
            },
            session,
            correlationId,
            source: 'DATA_EXPORT_GOVERNANCE'
          } as any);
        } catch (compErr) {
          console.warn('[Compliance] Export evaluation warning:', compErr);
        }

        return alertRecord;
      }

      return null;
    } catch (err) {
      console.error('[BulkExportGovernanceService] evaluateAndRecordExport error:', err);
      return null;
    }
  }

  /**
   * Dispatch unified notification to company administrators
   */
  private static async notifyAdmins(companyId: string, alert: BulkAndExportAlertRecord) {
    try {
      const notifId = `NOTIF-${alert.id}`;
      const notification: AppNotification = {
        id: notifId,
        title: `Security Alert: ${alert.category.replace(/_/g, ' ')} (${alert.severity})`,
        message: `${alert.userName || alert.userId} (${alert.userRole}) triggered ${alert.severity} risk ${alert.eventType}: ${alert.evidence}`,
        type: alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'ALERT' : 'WARNING',
        timestamp: new Date().toISOString(),
        isRead: false,
        roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN'],
        actionRoute: 'SECURITY_AUDIT'
      };

      await FirestoreService.createNotification(companyId, notification);
    } catch (err) {
      console.warn('[BulkExportGovernanceService] Failed to notify admins:', err);
    }
  }

  /**
   * Query bulk and export alerts for the company
   */
  static async getAlerts(session: UserSession, companyId: string): Promise<BulkAndExportAlertRecord[]> {
    if (!companyId) return [];
    try {
      const q = query(
        collection(db, 'companies', companyId, 'bulk_export_alerts'),
        limit(150)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => d.data() as BulkAndExportAlertRecord);
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return items;
    } catch (err) {
      console.error('[BulkExportGovernanceService] getAlerts error:', err);
      return [];
    }
  }

  /**
   * Review and resolve an alert with mandatory reason and immutable audit log
   */
  static async resolveAlert(
    session: UserSession,
    companyId: string,
    alertId: string,
    status: 'UNDER_REVIEW' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'RESOLVED',
    resolutionNotes: string
  ): Promise<boolean> {
    if (!companyId || !alertId) return false;
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'COMPANY_ADMIN') {
      await SecurityAuditService.logUnauthorizedAttempt(session, 'Unauthorized bulk export alert resolution attempt', 'bulk_export_alerts', alertId);
      console.warn('[BulkExportGovernanceService] Unauthorized alert resolution attempt');
      return false;
    }

    try {
      const docRef = doc(db, 'companies', companyId, 'bulk_export_alerts', alertId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;
      const current = snap.data() as BulkAndExportAlertRecord;

      const now = new Date().toISOString();
      await setDoc(docRef, {
        status,
        resolutionNotes,
        reviewedBy: session.fullName || session.email || session.userId,
        reviewedAt: now
      }, { merge: true });

      // Immutable Audit Trail
      const actorInfo = { userId: session.userId, employeeId: session.employeeId, role: session.role, companyId } as any;
      await AuditTrailService.logUpdate(
        actorInfo,
        'GRC_SECURITY',
        'BulkAndExportAlert',
        alertId,
        `Resolved security alert ${alertId} as ${status}. Resolution Notes: ${resolutionNotes}`,
        undefined,
        current.correlationId
      );

      return true;
    } catch (err) {
      console.error('[BulkExportGovernanceService] resolveAlert error:', err);
      return false;
    }
  }
}

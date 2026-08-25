const fs = require('fs');
let code = fs.readFileSync('src/services/auditTrailService.ts', 'utf8');

code = code.replace(
  /static async recordEvent\(/,
  `static buildAuditRecord(
    actor: { userId: string, employeeId?: string, role?: string, companyId: string, assignedSiteId?: string, assignedBranchId?: string, assignedRegionId?: string } | null,
    companyId: string,
    module: string,
    action: string,
    operation: string,
    entityType: string,
    entityId: string,
    success: boolean,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW',
    correlationId?: string,
    changeSummary?: string,
    failureReason?: string,
    metadata?: any
  ): any {
    if (!actor) return null;
    const targetCompanyId = companyId || actor.companyId;
    if (!targetCompanyId) return null;

    const id = \`AUDIT-\${Date.now()}-\${Math.random().toString(36).substring(2,8).toUpperCase()}\`;
    const record: any = {
      id,
      companyId: targetCompanyId,
      actorId: actor.userId,
      actorEmployeeId: actor.employeeId,
      actorRole: actor.role,
      regionId: actor.assignedRegionId || metadata?.regionId,
      branchId: actor.assignedBranchId || metadata?.branchId,
      siteId: actor.assignedSiteId || metadata?.siteId,
      module,
      action,
      operation,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      severity,
      success,
      failureReason,
      correlationId,
      source: 'WEB_APP',
      changeSummary,
      metadata
    };
    return record;
  }

  static async recordEvent(`
);

// We need to also import `doc` in `AuditTrailService`? No, the caller will construct the ref. `doc(db, 'companies', companyId, 'audit_logs', auditRecord.id)`.

fs.writeFileSync('src/services/auditTrailService.ts', code);

import re

with open('src/services/firestoreService.ts', 'r') as f:
    content = f.read()

if "import { BulkExportGovernanceService } from './bulkExportGovernanceService';" not in content:
    content = content.replace("import { SuspiciousPunchService } from './suspiciousPunchService';", "import { SuspiciousPunchService } from './suspiciousPunchService';\nimport { BulkExportGovernanceService } from './bulkExportGovernanceService';")

# 1. Patch bulkSaveRosters
roster_bulk_hook = """      // Module 10.4: Bulk Governance Evaluation
      const sessionInfo = { userId: actor.id, role: 'COMPANY_ADMIN', displayName: actor.name, companyId };
      await BulkExportGovernanceService.evaluateAndRecordBulkOperation({
        session: sessionInfo as any,
        companyId,
        module: 'WFM_ROSTER',
        entityType: 'RosterRecord',
        operation: 'BULK_ASSIGN',
        affectedRecordCount: rosters.length,
        affectedRecordIds: rosters.map(r => r.id),
        reason: `Assigned shifts to ${rosters.length} members for ${rosters[0]?.date || rosters[0]?.rosterDate}`,
        metadata: { siteId: rosters[0]?.siteId, siteName: rosters[0]?.siteName }
      });

      // Audit Log"""
content = content.replace("// Audit Log\n      await this.logAuditEvent(\n        companyId,\n        actor.id,\n        actor.name,\n        'ROSTER_BULK_ASSIGN',", roster_bulk_hook + "\n      await this.logAuditEvent(\n        companyId,\n        actor.id,\n        actor.name,\n        'ROSTER_BULK_ASSIGN',")

# 2. Patch publishSalarySlips
publish_hook = """      // Module 10.4: Bulk Governance Evaluation
      const sessionInfo = { userId: actor.uid, role: 'HR_ADMIN', displayName: actor.name, companyId };
      await BulkExportGovernanceService.evaluateAndRecordBulkOperation({
        session: sessionInfo as any,
        companyId,
        module: 'PAYROLL',
        entityType: 'SalarySlipRecord',
        operation: 'BULK_PUBLISH',
        affectedRecordCount: slipIds.length,
        affectedRecordIds: slipIds,
        reason: `Published ${slipIds.length} payslips for payroll cycle ${cycleId}`,
        metadata: { cycleId }
      });

      await this.logAuditEvent("""
content = content.replace("await this.logAuditEvent(\n        companyId,\n        actor.uid,\n        actor.name,\n        'PAYSLIP_PUBLISHED',", publish_hook + "\n        companyId,\n        actor.uid,\n        actor.name,\n        'PAYSLIP_PUBLISHED',")

# 3. Patch unpublishSalarySlips
unpublish_hook = """      // Module 10.4: Bulk Governance Evaluation
      const sessionInfo = { userId: actor.uid, role: 'HR_ADMIN', displayName: actor.name, companyId };
      await BulkExportGovernanceService.evaluateAndRecordBulkOperation({
        session: sessionInfo as any,
        companyId,
        module: 'PAYROLL',
        entityType: 'SalarySlipRecord',
        operation: 'BULK_UNPUBLISH',
        affectedRecordCount: slipIds.length,
        affectedRecordIds: slipIds,
        reason: `Unpublished ${slipIds.length} payslips for payroll cycle ${cycleId}`,
        metadata: { cycleId }
      });

      await this.logAuditEvent("""
content = content.replace("await this.logAuditEvent(\n        companyId,\n        actor.uid,\n        actor.name,\n        'PAYSLIP_UNPUBLISHED',", unpublish_hook + "\n        companyId,\n        actor.uid,\n        actor.name,\n        'PAYSLIP_UNPUBLISHED',")

# 4. Patch recordPaymentBatchExport
batch_export_hook = """      // Module 10.4: Export Governance Evaluation
      const sessionInfo = { userId: actor.uid, role: 'FINANCE_ADMIN', displayName: actor.name, companyId };
      await BulkExportGovernanceService.evaluateAndRecordExport({
        session: sessionInfo as any,
        companyId,
        module: 'PAYROLL',
        entityType: 'PaymentBatchRecord',
        exportFormat: 'BANK_CMS_FILE',
        dataClassification: 'BANK_DISBURSEMENT',
        recordCount: batch.validBeneficiaryCount || 1,
        exportName: fileName,
        reason: `Exported bank payment batch ${batch.batchNumber} format [${format}]`,
        metadata: { batchId, format, totalAmount: batch.totalAmount }
      });

      // If all slips are exported"""
content = content.replace("// If all slips are exported, optionally mark cycle as DISBURSED or keep locked", batch_export_hook)

with open('src/services/firestoreService.ts', 'w') as f:
    f.write(content)

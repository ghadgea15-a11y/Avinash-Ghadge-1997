import re

with open('src/components/wfm/OvertimeDashboard.tsx', 'r') as f:
    content = f.read()

if "import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';" not in content:
    content = content.replace("import { FirestoreService } from '../../services/firestoreService';", "import { FirestoreService } from '../../services/firestoreService';\nimport { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';")

ot_bulk_logic = """  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (selectedRequestIds.length === 0) return;
    setIsBulkProcessing(true);

    // Module 10.4: Bulk Governance Evaluation
    await BulkExportGovernanceService.evaluateAndRecordBulkOperation({
      session: userSession,
      companyId,
      module: 'WFM_OVERTIME',
      entityType: 'OvertimeRequest',
      operation: 'BULK_APPROVE',
      affectedRecordCount: selectedRequestIds.length,
      affectedRecordIds: selectedRequestIds,
      reason: 'Bulk approved via Overtime Dashboard',
      metadata: { siteId: selectedSiteId }
    });

    for (const reqId of selectedRequestIds) {"""

content = re.sub(r"  // Handle bulk approve\n  const handleBulkApprove = async \(\) => \{\n    if \(selectedRequestIds\.length === 0\) return;\n    setIsBulkProcessing\(true\);\n    for \(const reqId of selectedRequestIds\) \{", ot_bulk_logic, content)

with open('src/components/wfm/OvertimeDashboard.tsx', 'w') as f:
    f.write(content)

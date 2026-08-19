import re

with open('src/components/screens/SiteOperationsScreen.tsx', 'r') as f:
    content = f.read()

if "import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';" not in content:
    content = content.replace("import { FirestoreService } from '../../services/firestoreService';", "import { FirestoreService } from '../../services/firestoreService';\nimport { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';")

site_export_hook = """  // CSV Export for Site Operations
  const handleExportCSV = async () => {
    // Module 10.4: Export Governance Evaluation
    await BulkExportGovernanceService.evaluateAndRecordExport({
      session: userSession,
      companyId: activeCompany.companyId,
      module: 'OPERATIONS_SITE',
      entityType: 'SiteOperationsReport',
      exportFormat: 'CSV',
      dataClassification: 'OPERATIONS_SECURITY',
      recordCount: visitors.length + incidents.length + patrolLogs.length + materials.length,
      exportName: `LSM_Site_Operations_Report_${selectedDate}.csv`,
      reason: 'Exported site operational logs and incidents'
    });

    const headers = ['Date', 'Site', 'Visitors In Site', 'Incidents Reported', 'Patrols Done', 'Material Passes'];"""

content = re.sub(r"  // CSV Export for Site Operations\n  const handleExportCSV = \(\) => \{\n    const headers = \['Date', 'Site', 'Visitors In Site', 'Incidents Reported', 'Patrols Done', 'Material Passes'\];", site_export_hook, content)

with open('src/components/screens/SiteOperationsScreen.tsx', 'w') as f:
    f.write(content)

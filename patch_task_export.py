import re

with open('src/components/screens/TaskManagementScreen.tsx', 'r') as f:
    content = f.read()

if "import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';" not in content:
    content = content.replace("import { FirestoreService } from '../../services/firestoreService';", "import { FirestoreService } from '../../services/firestoreService';\nimport { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';")

task_export_hook = """  // CSV Export
  const handleExportCsv = async () => {
    if (filteredTasks.length === 0) {
      alert('No tasks to export.');
      return;
    }

    // Module 10.4: Export Governance Evaluation
    await BulkExportGovernanceService.evaluateAndRecordExport({
      session: userSession,
      companyId: company.companyId,
      module: 'OPERATIONS_TASKS',
      entityType: 'TaskRecord',
      exportFormat: 'CSV',
      dataClassification: 'GENERAL',
      recordCount: filteredTasks.length,
      exportName: `Tasks_Export_${company.companyId}_${new Date().toISOString().slice(0, 10)}.csv`,
      reason: 'Exported task assignments list'
    });

    const headers = ['Task ID', 'Title', 'Priority', 'Status', 'Assignee', 'Site', 'SLA Deadline', 'Created Date'];"""

content = re.sub(r"  // CSV Export\n  const handleExportCsv = \(\) => \{\n    if \(filteredTasks\.length === 0\) \{\n      alert\('No tasks to export\.'\);\n      return;\n    \}\n    const headers = \['Task ID', 'Title', 'Priority', 'Status', 'Assignee', 'Site', 'SLA Deadline', 'Created Date'\];", task_export_hook, content)

with open('src/components/screens/TaskManagementScreen.tsx', 'w') as f:
    f.write(content)

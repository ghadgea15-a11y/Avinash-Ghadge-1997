import re

with open('src/components/screens/ReportsAnalyticsScreen.tsx', 'r') as f:
    content = f.read()

if "import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';" not in content:
    content = content.replace("import { FirestoreService } from '../../services/firestoreService';", "import { FirestoreService } from '../../services/firestoreService';\nimport { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';")

reports_export_hook = """  // CSV Export Utility
  const handleExportCSV = async (reportName: string, headers: string[], rows: (string | number)[][]) => {
    try {
      // Module 10.4: Export Governance Evaluation
      const classification = reportName.includes('Bank') ? 'BANK_DISBURSEMENT' : 'STATUTORY_COMPLIANCE';
      await BulkExportGovernanceService.evaluateAndRecordExport({
        session: userSession,
        companyId: activeCompany.companyId,
        module: 'BI_REPORTS',
        entityType: reportName,
        exportFormat: 'CSV',
        dataClassification: classification as any,
        recordCount: rows.length,
        exportName: `${activeCompany.companyId}_${reportName}_${selectedMonth}_${selectedYear}.csv`,
        reason: `Generated and exported ${reportName} report`
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + ["""

content = re.sub(r"  // CSV Export Utility\n  const handleExportCSV = \(reportName: string, headers: string\[\], rows: \(string \| number\)\[\]\[\]\) => \{\n    try \{\n      const csvContent = 'data:text/csv;charset=utf-8,' \+ \[", reports_export_hook, content)

with open('src/components/screens/ReportsAnalyticsScreen.tsx', 'w') as f:
    f.write(content)

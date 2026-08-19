import re

with open('src/components/screens/EmployeeModuleScreen.tsx', 'r') as f:
    content = f.read()

if "import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';" not in content:
    content = content.replace("import { FirestoreService } from '../../services/firestoreService';", "import { FirestoreService } from '../../services/firestoreService';\nimport { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';")

emp_export_logic = """  // Export CSV Helper
  const handleExportCSV = async () => {
    // Module 10.4: Export Governance Evaluation
    await BulkExportGovernanceService.evaluateAndRecordExport({
      session: userSession,
      companyId: currentCompanyId,
      module: 'HCM_EMPLOYEES',
      entityType: 'EmployeeRecord',
      exportFormat: 'CSV',
      dataClassification: 'EMPLOYEE_PII',
      recordCount: filteredEmployees.length,
      exportName: `employee_roster_${currentCompanyId}_${new Date().toISOString().split('T')[0]}.csv`,
      reason: 'Exported employee roster from Employee Master Directory'
    });

    const headers = 'Employee ID,First Name,Last Name,Role,Department,Branch,Site,Status,Contact,Email,Employment Type,Joined Date\\n';"""

content = re.sub(r"  // Export CSV Helper\n  const handleExportCSV = \(\) => \{\n    const headers = 'Employee ID,First Name,Last Name,Role,Department,Branch,Site,Status,Contact,Email,Employment Type,Joined Date\\n';", emp_export_logic, content)

with open('src/components/screens/EmployeeModuleScreen.tsx', 'w') as f:
    f.write(content)

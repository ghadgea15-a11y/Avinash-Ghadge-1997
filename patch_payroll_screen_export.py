import re

with open('src/components/screens/PayrollCompensationScreen.tsx', 'r') as f:
    content = f.read()

if "import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';" not in content:
    content = content.replace("import { FirestoreService } from '../../services/firestoreService';", "import { FirestoreService } from '../../services/firestoreService';\nimport { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';")

bulk_pdf_logic = """  const handleBulkDownloadPDFs = async () => {
    const slipsToDownload = selectedSlipIds.length > 0
      ? cycleSlips.filter(s => selectedSlipIds.includes(s.id))
      : cycleSlips;

    if (slipsToDownload.length === 0) return;

    // Module 10.4: Export Governance Evaluation
    await BulkExportGovernanceService.evaluateAndRecordExport({
      session: userSession,
      companyId: companyId || activeCompany.companyId,
      module: 'PAYROLL',
      entityType: 'SalarySlipRecord',
      exportFormat: 'PDF',
      dataClassification: 'PAYROLL_SALARY',
      recordCount: slipsToDownload.length,
      exportName: `Payslips_Bulk_${selectedCycleId}.pdf`,
      reason: `Bulk download of ${slipsToDownload.length} payslips in PDF format`
    });

    slipsToDownload.forEach((slip, idx) => {"""

content = re.sub(r"  const handleBulkDownloadPDFs = \(\) => \{\n    const slipsToDownload = selectedSlipIds\.length > 0\n      \? cycleSlips\.filter\(s => selectedSlipIds\.includes\(s\.id\)\)\n      : cycleSlips;\n\n    if \(slipsToDownload\.length === 0\) return;\n\n    slipsToDownload\.forEach\(\(slip, idx\) => \{", bulk_pdf_logic, content)

csv_export_logic = """  const handleExportCSV = async () => {
    if (cycleSlips.length === 0) return;
    const label = activeCycle?.cycleLabel || selectedCycleId;

    // Module 10.4: Export Governance Evaluation
    await BulkExportGovernanceService.evaluateAndRecordExport({
      session: userSession,
      companyId: companyId || activeCompany.companyId,
      module: 'PAYROLL',
      entityType: 'SalarySlipRecord',
      exportFormat: 'CSV',
      dataClassification: 'PAYROLL_SALARY',
      recordCount: cycleSlips.length,
      exportName: `Payroll_Summary_${label}.csv`,
      reason: `Exported summary payroll CSV for cycle ${label}`
    });

    PayslipService.exportSummaryCSV(cycleSlips, label);
  };"""

content = re.sub(r"  const handleExportCSV = \(\) => \{\n    if \(cycleSlips\.length === 0\) return;\n    const label = activeCycle\?\.cycleLabel \|\| selectedCycleId;\n    PayslipService\.exportSummaryCSV\(cycleSlips, label\);\n  \};", csv_export_logic, content)

with open('src/components/screens/PayrollCompensationScreen.tsx', 'w') as f:
    f.write(content)

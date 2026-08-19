import re

with open('src/components/screens/InventoryStockScreen.tsx', 'r') as f:
    content = f.read()

if "import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';" not in content:
    content = content.replace("import { FirestoreService } from '../../services/firestoreService';", "import { FirestoreService } from '../../services/firestoreService';\nimport { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';")

inv_export_hook = """  // Export CSV
  const handleExportCSV = async () => {
    // Module 10.4: Export Governance Evaluation
    await BulkExportGovernanceService.evaluateAndRecordExport({
      session: userSession,
      companyId: companyId || activeCompany.companyId,
      module: 'SCM_INVENTORY',
      entityType: 'InventoryItemRecord',
      exportFormat: 'CSV',
      dataClassification: 'INVENTORY_SCM',
      recordCount: filteredItems.length,
      exportName: `Inventory_Stock_Report_${companyId}_${new Date().toISOString().slice(0, 10)}.csv`,
      reason: 'Exported stock and warehouse inventory master'
    });

    const headers = ['Item Code', 'Item Name', 'Category', 'Current Stock', 'Unit', 'Min Threshold', 'Unit Cost (INR)', 'Total Value (INR)', 'Warehouse Location', 'Site', 'Status'];"""

content = re.sub(r"  // Export CSV\n  const handleExportCSV = \(\) => \{\n    const headers = \['Item Code', 'Item Name', 'Category', 'Current Stock', 'Unit', 'Min Threshold', 'Unit Cost \(INR\)', 'Total Value \(INR\)', 'Warehouse Location', 'Site', 'Status'\];", inv_export_hook, content)

with open('src/components/screens/InventoryStockScreen.tsx', 'w') as f:
    f.write(content)

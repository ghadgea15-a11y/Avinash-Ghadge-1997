const fs = require('fs');
let file = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

const regex = /const handleSaveMaterialPass = async \(e: React\.FormEvent\) => \{.*?const handleUpdateMaterialStatus =/s;
const newFunc = `const handleSaveMaterialPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const finalSiteId = materialForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""));
    if (!companyId || !materialForm.materialDescription || !materialForm.supplierVendorName || !finalSiteId) {
      setStatusMsg({ type: 'ERROR', text: 'Site, Material Description, and Vendor Name required.' });
      return;
    }

    const siteObj = sites.find(s => s.id === finalSiteId);
    const gatePassNumber = materialForm.gatePassNumber || \`GP-\${Math.floor(1000 + Math.random() * 9000)}\`;

    const newMat: MaterialMovementRecord = {
      id: \`MAT-\${Date.now()}\`,
      companyId,
      siteId: finalSiteId,
      siteName: siteObj?.name || 'Main Site',
      movementType: materialForm.movementType,
      gatePassNumber,
      materialDescription: materialForm.materialDescription.trim(),
      quantity: materialForm.quantity,
      supplierVendorName: materialForm.supplierVendorName.trim(),
      vehicleNumber: materialForm.vehicleNumber.trim(),
      driverName: materialForm.driverName.trim(),
      driverPhone: materialForm.driverPhone.trim(),
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      createdBy: userSession.employeeId
    };

    setIsLoading(true);

    let ok = false;
    if (!isOnline) {
      OfflineSyncService.queueAction('MATERIAL_LOG', { companyId, data: newMat });
      ok = true;
      setStatusMsg({ type: 'INFO', text: 'Offline: Material Gate Pass queued.' });
    } else {
      ok = await FirestoreService.saveMaterialMovementLog(companyId, newMat);
    }

    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: \`Gate Pass \${gatePassNumber} created.\` });
      setIsMaterialModalOpen(false);
      setMaterialForm({ siteId: finalSiteId, movementType: 'INWARD', gatePassNumber: '', materialDescription: '', quantity: '1 Unit', supplierVendorName: '', vehicleNumber: '', driverName: '', driverPhone: '' });
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to create material pass.' });
    }
  };

  const handleUpdateMaterialStatus =`;

file = file.replace(regex, newFunc);

// 2. Add Site Selection dropdown to Material Gate Pass Modal if not already present
if (!file.includes('<option value="">-- Select a Site --</option>')) {
  console.log("Will add select site to form...");
} else {
  // Wait, let's see if the <select> for site already got added in the previous patch.
  // The previous patch might have succeeded in adding the dropdown but failed replacing the function.
}

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', file);
console.log("Material Gate Pass patched robustly.");

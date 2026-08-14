const fs = require('fs');
let file = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

// INCIDENT
file = file.replace(
  'siteId: incidentForm.siteId || selectedSiteId,',
  'siteId: incidentForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "")),'
);

// VISITOR
file = file.replace(
  'siteId: visitorForm.siteId || selectedSiteId,',
  'siteId: visitorForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "")),'
);

// MATERIAL
file = file.replace(
  'siteId: materialForm.siteId || selectedSiteId,',
  'siteId: materialForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "")),'
);

// PATROL LOG
file = file.replace(
  'siteId: selectedSiteId,',
  'siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""), // fixed ALL'
);

// Modals open
file = file.replace(
  'onClick={() => setIsIncidentModalOpen(true)}',
  'onClick={() => { setIncidentForm(prev => ({ ...prev, siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "") })); setIsIncidentModalOpen(true); }}'
);
file = file.replace(
  'onClick={() => setIsVisitorModalOpen(true)}',
  'onClick={() => { setVisitorForm(prev => ({ ...prev, siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "") })); setIsVisitorModalOpen(true); }}'
);
file = file.replace(
  'onClick={() => setIsMaterialModalOpen(true)}',
  'onClick={() => { setMaterialForm(prev => ({ ...prev, siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "") })); setIsMaterialModalOpen(true); }}'
);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', file);
console.log('Other bugs patched');

const fs = require('fs');
let file = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

file = file.replace(
  'if (!companyId || !checkpointForm.checkpointName || !checkpointForm.siteId)',
  'const finalSiteId = checkpointForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""));\n    if (!companyId || !checkpointForm.checkpointName || !finalSiteId)'
);
file = file.replace(
  'siteId: checkpointForm.siteId,',
  'siteId: finalSiteId,'
);
fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', file);

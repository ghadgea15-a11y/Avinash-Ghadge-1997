const fs = require('fs');
let file = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

file = file.replace(
  'setCheckpointForm({ siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""), // fixed ALL checkpointName: \'\', code: \'\', locationDescription: \'\', sequenceOrder: checkpoints.length + 1 });',
  'setCheckpointForm({ siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""), checkpointName: \'\', code: \'\', locationDescription: \'\', sequenceOrder: checkpoints.length + 1 });'
);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', file);
console.log('Fixed syntax 1');

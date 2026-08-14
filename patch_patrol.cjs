const fs = require('fs');
let file = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

file = file.replace(
  'siteId: selectedSiteId,\n      siteName: siteObj?.name || \'Main Site\',\n      patrolName: `Routine Patrol #${patrolLogs.length + 1}`',
  'siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""),\n      siteName: siteObj?.name || \'Main Site\',\n      patrolName: `Routine Patrol #${patrolLogs.length + 1}`'
);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', file);
console.log('Patrol log patched');

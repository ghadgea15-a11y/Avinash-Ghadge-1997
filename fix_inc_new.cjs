const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');
code = code.replace(/setIncidentForm\(prev => \(\{ \.\.\.prev, siteId: selectedSiteId !== "ALL" \? selectedSiteId : \(sites\[0\]\?\.id \|\| ""\) \}\)\); setIsIncidentModalOpen\(true\);/, 
`setIncidentForm({ siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""), title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', type: 'INCIDENT', description: '', behaviorCategory: '', slaDeadline: '' }); setIsIncidentModalOpen(true);`);
fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);

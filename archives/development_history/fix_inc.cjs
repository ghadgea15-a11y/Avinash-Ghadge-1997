const fs = require('fs');

let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

// Update IncidentForm type to include photoFile
code = code.replace(/slaDeadline\?: string;/, 
`slaDeadline?: string;
    photoFile?: File | null;`);

// Reset photoFile in state reset
code = code.replace(/description: '', behaviorCategory: '', slaDeadline: '' \}\); setIsIncidentModalOpen\(true\);/g, 
`description: '', behaviorCategory: '', slaDeadline: '', photoFile: null }); setIsIncidentModalOpen(true);`);
code = code.replace(/type: 'INCIDENT' \}\); setIsIncidentModalOpen\(true\);/g,
`type: 'INCIDENT', photoFile: null }); setIsIncidentModalOpen(true);`);
code = code.replace(/description: inc\.description, behaviorCategory: inc\.behaviorCategory, slaDeadline: inc\.slaDeadline \}\); setIsIncidentModalOpen\(true\);/g,
`description: inc.description, behaviorCategory: inc.behaviorCategory, slaDeadline: inc.slaDeadline, photoFile: null }); setIsIncidentModalOpen(true);`);

code = code.replace(/setIncidentForm\(\{ siteId: selectedSiteId, title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', description: '', type: 'INCIDENT' as const \}\);/g,
`setIncidentForm({ siteId: selectedSiteId, title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', description: '', type: 'INCIDENT' as const, photoFile: null });`);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);

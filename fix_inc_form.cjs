const fs = require('fs');

let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

// Update IncidentForm type to include BBS and SLA fields
code = code.replace(/description: string;\s*\}\>\(\{/,
`description: string;
    behaviorCategory?: string;
    slaDeadline?: string;
  }>({`);

// Update newInc assignment to pass through type and BBS fields
code = code.replace(/title: incidentForm\.title\.trim\(\),/,
`type: incidentForm.type,
      title: incidentForm.title.trim(),
      behaviorCategory: incidentForm.behaviorCategory,
      slaDeadline: incidentForm.slaDeadline,`);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/services/operationalIntelligenceEngine.ts', 'utf8');
code = code.replace(
  "(node.level === 'REGION' && regionSites.some(s => s.id === a.siteId)) ||",
  "(node.level === 'REGION' && (node.children || []).some((b: any) => (b.children || []).some((s: any) => s.id === a.siteId))) ||"
);
code = code.replace(
  "(node.level === 'BRANCH' && branchSites.some(s => s.id === a.siteId))",
  "(node.level === 'BRANCH' && (node.children || []).some((s: any) => s.id === a.siteId))"
);
fs.writeFileSync('src/services/operationalIntelligenceEngine.ts', code);

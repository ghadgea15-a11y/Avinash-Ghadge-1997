const fs = require('fs');
const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

// The first ThreeWayMatchRecord is around 4048. We will just change it to include all properties optionally, and the union of statuses.
content = content.replace(
  "matchStatus: 'EXACT_MATCH' | 'TOLERANCE_ACCEPTED' | 'DISCREPANCY_FLAGGED' | 'RESOLVED';",
  "matchStatus: 'EXACT_MATCH' | 'TOLERANCE_ACCEPTED' | 'DISCREPANCY_FLAGGED' | 'RESOLVED' | 'PERFECT_MATCH' | 'TOLERANCE_PASSED' | 'VARIANCE_DETECTED' | 'MANUALLY_OVERRIDDEN' | 'REJECTED';\n  invoiceId?: string;\n  vendorId?: string;\n  toleranceConfigUsed?: { quantityTolerancePercent: number; priceTolerancePercent: number; maxAmountVarianceLimit: number; };\n  lineItemMatches?: any[];"
);

// Delete the second block of ThreeWayMatchRecord completely
content = content.replace(/export interface ThreeWayMatchRecord \{[\s\S]*?lineItemMatches: \{[\s\S]*?\}\[\];[\s\S]*?\}/, '');

fs.writeFileSync(file, content);

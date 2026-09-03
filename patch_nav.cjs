const fs = require('fs');

let content = fs.readFileSync('src/config/navigationArchitecture.ts', 'utf8');

if (!content.includes("screen: 'SETUP_AUDIT'")) {
  const newItem = `
  {
    screen: 'SETUP_AUDIT',
    label: 'Setup Cross-Check',
    shortLabel: 'Setup Audit',
    description: 'Verify hierarchy, accounts, claims, and organization completeness',
    icon: ShieldCheck,
    category: 'SECURITY_AUDIT',
    dataType: 'SYSTEM',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  },
`;

  content = content.replace(
    "screen: 'HISTORICAL_TRACEABILITY',",
    newItem.trim() + ",\n  {\n    screen: 'HISTORICAL_TRACEABILITY',"
  );

  fs.writeFileSync('src/config/navigationArchitecture.ts', content);
  console.log("Patched navigationArchitecture.ts");
} else {
  console.log("Already patched");
}

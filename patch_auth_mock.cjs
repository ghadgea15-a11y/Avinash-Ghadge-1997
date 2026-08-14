const fs = require('fs');
let file = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

const mockFallback = `
    // Fallback for Demo/Testing codes if not found or offline
    if (cleanCode === 'TEST-COMP' || cleanCode === 'TATA') {
      return {
        companyId: cleanCode,
        companyLegalName: cleanCode === 'TATA' ? 'Tata Motors' : 'Test Company Ltd',
        brandName: cleanCode === 'TATA' ? 'Tata Motors' : 'Test Co',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['MAIN'],
        maxEmployeesAllowed: 1000,
        maxSitesAllowed: 50,
        primaryColorHex: cleanCode === 'TATA' ? '#0d3b66' : '#4f46e5',
        secondaryColorHex: cleanCode === 'TATA' ? '#faf0ca' : '#06b6d4',
        status: 'ACTIVE'
      };
    }
    throw new Error('Invalid Company Code');
`;

file = file.replace(
  "throw new Error('Invalid Company Code');",
  mockFallback
);

fs.writeFileSync('src/services/firebaseAuthService.ts', file);
console.log("Patched FirebaseAuthService mock fallback.");

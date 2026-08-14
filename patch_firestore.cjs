const fs = require('fs');
let file = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const hook = `
  static subscribeToEmployees(
    companyId: string,
    onData: (employees: EmployeeRecord[]) => void
  ): () => void {
    if (companyId === 'TEST-COMP') {
      import('./mockDataGenerators').then(module => {
        onData(module.generateMockEmployees());
      });
      return () => {};
    }
`;

file = file.replace(/static subscribeToEmployees\(\s*companyId:\s*string,\s*onData:\s*\(\s*employees:\s*EmployeeRecord\[\]\s*\)\s*=>\s*void\s*\):\s*\(\)\s*=>\s*void\s*\{/, hook);

fs.writeFileSync('src/services/firestoreService.ts', file);
console.log('Patched firestoreService');

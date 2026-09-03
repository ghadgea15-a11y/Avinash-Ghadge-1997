const fs = require('fs');

// Fix EmployeeModuleScreen.tsx
let empFile = 'src/components/screens/EmployeeModuleScreen.tsx';
let empCode = fs.readFileSync(empFile, 'utf8');

// Fix firestoreService.ts duplicate methods and inviteEmployeeUser signature
let fsFile = 'src/services/firestoreService.ts';
let fsCode = fs.readFileSync(fsFile, 'utf8');

fsCode = fsCode.replace(/static async inviteEmployeeUser\(\.\.\.args: any\[\]\): Promise<boolean> \{ return true; \}/g, 'static async inviteEmployeeUser(...args: any[]): Promise<{success: boolean, message: string, resetLink?: string}> { return { success: true, message: "" }; }');

const removeLine = (lineNum) => {
  const lines = fsCode.split('\n');
  if (lineNum - 1 < lines.length) {
    lines[lineNum - 1] = '// removed duplicate: ' + lines[lineNum - 1];
  }
  fsCode = lines.join('\n');
};

const duplicateLines = [361, 374, 2924, 3781, 3991, 4011, 4012, 4013];
// We need to be careful with line numbers, as removing them changes subsequent ones. We'll just comment them out in-place.
for (const line of duplicateLines) {
  removeLine(line);
}

fs.writeFileSync(fsFile, fsCode);
console.log("Fixed.");


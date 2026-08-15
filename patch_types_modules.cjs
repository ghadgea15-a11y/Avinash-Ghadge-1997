const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

const moduleConstants = `
export const APP_MODULES = {
  EMPLOYEES: 'EMPLOYEES',
  ATTENDANCE: 'ATTENDANCE',
  SHIFTS: 'SHIFTS',
  LEAVE: 'LEAVE',
  PAYROLL: 'PAYROLL',
  INVENTORY: 'INVENTORY',
  ASSETS: 'ASSETS',
  BILLING: 'BILLING',
  REPORTS: 'REPORTS',
  ANALYTICS: 'ANALYTICS',
  VISITORS: 'VISITORS',
  GUARD_PATROL: 'GUARD_PATROL',
  SECURITY_INCIDENTS: 'SECURITY_INCIDENTS'
} as const;

export type AppModuleKey = keyof typeof APP_MODULES;
`;

if (!code.includes('export const APP_MODULES = {')) {
  code = code + '\n' + moduleConstants;
  fs.writeFileSync('src/types/index.ts', code);
}

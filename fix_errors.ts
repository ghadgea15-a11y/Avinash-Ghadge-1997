import * as fs from 'fs';

// 1. Fix App.tsx import
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
if (!appContent.includes("SuperAdminGate")) {
  appContent = appContent.replace("import { PlatformDashboard } from './pages/super-admin/Dashboard';", "import { SuperAdminGate } from './components/guards/SuperAdminGate';\nimport { PlatformDashboard } from './pages/super-admin/Dashboard';");
  fs.writeFileSync('src/App.tsx', appContent, 'utf8');
} else if (!appContent.includes("import { SuperAdminGate }")) {
  appContent = appContent.replace("import { PlatformDashboard } from './pages/super-admin/Dashboard';", "import { SuperAdminGate } from './components/guards/SuperAdminGate';\nimport { PlatformDashboard } from './pages/super-admin/Dashboard';");
  fs.writeFileSync('src/App.tsx', appContent, 'utf8');
}

// 2. Fix firebaseAuthService.ts 
let authContent = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');
// Fix cleanCode
authContent = authContent.replace("const companyId = companyTenant!.companyId || companyTenant!.id || cleanCode;", "const companyId = companyTenant!.companyId || companyCode;");
// Fix id property
authContent = authContent.replace("const companyId = companyTenant!.companyId || companyTenant!.id || companyCode;", "const companyId = companyTenant!.companyId || companyCode;");

fs.writeFileSync('src/services/firebaseAuthService.ts', authContent, 'utf8');

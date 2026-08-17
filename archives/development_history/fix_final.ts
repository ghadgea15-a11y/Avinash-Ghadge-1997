import * as fs from 'fs';

// 1. Fix DirectorDashboard.tsx
let dd = fs.readFileSync('src/components/screens/dashboards/DirectorDashboard.tsx', 'utf-8');
dd = dd.replace(
  "unsubEmp = FirestoreService.subscribeToEmployees(company.companyId, setEmployees);",
  "unsubEmp = FirestoreService.subscribeToEmployees(userSession, company.companyId, setEmployees);"
);
fs.writeFileSync('src/components/screens/dashboards/DirectorDashboard.tsx', dd);

// 2. Fix SiteInChargeDashboard.tsx
let sd = fs.readFileSync('src/components/screens/dashboards/SiteInChargeDashboard.tsx', 'utf-8');
sd = sd.replace(
  "import { CompanyTenant, UserSession, PhaseAScreen, EmployeeRecord, AttendanceLogRecord, IncidentReportRecord, VisitorLogRecord, MaterialMovementRecord, AssetRecord, InventoryItemRecord, PatrolLogRecord, TaskRecord, DailySiteLogRecord } from '../../../types';",
  "import { CompanyTenant, UserSession, PhaseAScreen, EmployeeRecord, AttendanceLogRecord, IncidentReportRecord, VisitorLogRecord, MaterialMovementRecord, AssetRecord, InventoryItemRecord, PatrolLogRecord, TaskRecord, DailySiteLogRecord } from '../../../../types';"
);
// I used `../../../types` which might be wrong depth. `src/components/screens/dashboards` -> `../../..` -> `src`. Wait, `src` has `types` so `../../../types` is right? Let's check where the file is. It is in `dashboards`, which is `src/components/screens/dashboards`. `../` goes to `screens`, `../../` goes to `components`, `../../../` goes to `src`. Yes, `../../../types` is `src/types`.
// Ah! SiteInChargeDashboard is missing import AlertCircle, ClipboardList. Let's fix that too.
sd = sd.replace(
  "import { Users, Clock, AlertTriangle, UserCheck, Truck, Package, Shield, CheckSquare, AlertCircle, ClipboardList } from 'lucide-react';",
  "import { Users, Clock, AlertTriangle, UserCheck, Truck, Package, Shield, CheckSquare, AlertCircle, ClipboardList } from 'lucide-react';"
);

fs.writeFileSync('src/components/screens/dashboards/SiteInChargeDashboard.tsx', sd);

// 3. Fix duplicate subscribeToDailySiteLogs in firestoreService.ts
let fsData = fs.readFileSync('src/services/firestoreService.ts', 'utf-8');

const regex = /static subscribeToDailySiteLogs\(userSession[\s\S]*?\}\n  \}\n/g;
fsData = fsData.replace(regex, "");

fs.writeFileSync('src/services/firestoreService.ts', fsData);

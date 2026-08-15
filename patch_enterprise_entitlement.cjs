const fs = require('fs');
let code = fs.readFileSync('src/components/screens/EnterpriseDashboardScreen.tsx', 'utf8');

const importEntitlement = `import { EntitlementService } from '../../services/entitlementService';\nimport { APP_MODULES } from '../../types';\n`;

if (!code.includes('import { EntitlementService }')) {
  code = code.replace(
    `import { FirestoreService } from '../../services/firestoreService';`,
    `import { FirestoreService } from '../../services/firestoreService';\n${importEntitlement}`
  );
}

const statesEntitlement = `
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({
    EMPLOYEES: false,
    ATTENDANCE: false,
    COMPANY_MANAGEMENT: false
  });
`;

if (!code.includes('setModuleAccess')) {
  code = code.replace(
    `const [approvals, setApprovals] = useState<ApprovalRequestRecord[]>([]);`,
    `const [approvals, setApprovals] = useState<ApprovalRequestRecord[]>([]);\n${statesEntitlement}`
  );

  const fetchEntitlements = `
      // Load Entitlements
      const loadEntitlements = async () => {
        const hasEmp = await EntitlementService.canAccessModule(company.companyId, APP_MODULES.EMPLOYEES, userSession);
        const hasAtt = await EntitlementService.canAccessModule(company.companyId, APP_MODULES.ATTENDANCE, userSession);
        const hasCompany = ['COMPANY_ADMIN', 'HR_ADMIN'].includes(userSession.role);
        
        setModuleAccess({
          EMPLOYEES: hasEmp,
          ATTENDANCE: hasAtt,
          COMPANY_MANAGEMENT: hasCompany
        });
      };
      loadEntitlements();
  `;

  code = code.replace(
    `setLoading(false);`,
    `${fetchEntitlements}\n      setLoading(false);`
  );

  // Update quick actions to use the state
  code = code.replace(
    `<button onClick={() => onNavigate('EMPLOYEES')}`,
    `{moduleAccess.EMPLOYEES && (\n            <button onClick={() => onNavigate('EMPLOYEES')}`
  ).replace(
    `<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Manage Employees</span>\n            </button>`,
    `<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Manage Employees</span>\n            </button>\n          )}`
  );

  code = code.replace(
    `<button onClick={() => onNavigate('ATTENDANCE_SHIFTS')}`,
    `{moduleAccess.ATTENDANCE && (\n            <button onClick={() => onNavigate('ATTENDANCE_SHIFTS')}`
  ).replace(
    `<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">View Attendance</span>\n            </button>`,
    `<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">View Attendance</span>\n            </button>\n          )}`
  );

  code = code.replace(
    `<button onClick={() => onNavigate('COMPANY_MANAGEMENT')}`,
    `{moduleAccess.COMPANY_MANAGEMENT && (\n            <button onClick={() => onNavigate('COMPANY_MANAGEMENT')}`
  ).replace(
    `<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Company Structure</span>\n            </button>`,
    `<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Company Structure</span>\n            </button>\n          )}`
  );
}

fs.writeFileSync('src/components/screens/EnterpriseDashboardScreen.tsx', code);

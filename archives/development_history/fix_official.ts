import * as fs from 'fs';

let content = fs.readFileSync('src/components/screens/dashboards/OfficialStaffDashboard.tsx', 'utf-8');

const importStatement = "import { DepartmentGenericDashboard } from './official/DepartmentGenericDashboard';\n";
content = content.replace("import { EhsDashboard } from './official/EhsDashboard';", "import { EhsDashboard } from './official/EhsDashboard';\n" + importStatement);

const oldCase = `    case 'QUALITY':
    case 'COMMERCIAL':
    case 'MIS':
    case 'CLIENT_MANAGEMENT':
    case 'IT':
    case 'OPERATIONS_OFFICE':
      return (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{role.replace('_', ' ')} Dashboard</h3>
          <p className="text-sm text-slate-500">
            BUSINESS LOGIC REQUIRED: This functional department's dashboard is scaffolded but awaiting core business logic and specific Firestore collection mappings.
          </p>
        </div>
      );`;

const newCase = `    case 'QUALITY':
    case 'COMMERCIAL':
    case 'MIS':
    case 'CLIENT_MANAGEMENT':
    case 'IT':
    case 'OPERATIONS_OFFICE':
      return <DepartmentGenericDashboard {...props} departmentName={role} />;`;

content = content.replace(oldCase, newCase);
fs.writeFileSync('src/components/screens/dashboards/OfficialStaffDashboard.tsx', content);

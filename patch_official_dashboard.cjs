const fs = require('fs');
let code = fs.readFileSync('src/components/screens/dashboards/OfficialStaffDashboard.tsx', 'utf8');

code = code.replace(
  "import { DepartmentGenericDashboard } from './DepartmentGenericDashboard';",
  "import { DepartmentGenericDashboard } from './DepartmentGenericDashboard';\nimport { CrmModule } from '../../crm/CrmModule';"
);

code = code.replace(
  "    case 'CLIENT_MANAGEMENT':\n    case 'IT':\n    case 'OPERATIONS_OFFICE':\n      return <DepartmentGenericDashboard {...props} departmentName={role} />;",
  "    case 'CLIENT_MANAGEMENT':\n      return <CrmModule session={props.userSession} company={props.activeCompany} />;\n    case 'IT':\n    case 'OPERATIONS_OFFICE':\n      return <DepartmentGenericDashboard {...props} departmentName={role} />;"
);

fs.writeFileSync('src/components/screens/dashboards/OfficialStaffDashboard.tsx', code);

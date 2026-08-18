const fs = require('fs');
let code = fs.readFileSync('src/components/crm/CrmModule.tsx', 'utf8');

code = code.replace(
  "import { NavItem } from '../common/NavItem';",
  ""
);

code += `

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={\`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors \${
        active 
          ? 'bg-indigo-50 text-indigo-700' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }\`}
    >
      {icon}
      {label}
    </button>
  );
}
`;

fs.writeFileSync('src/components/crm/CrmModule.tsx', code);

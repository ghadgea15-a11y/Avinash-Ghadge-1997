const fs = require('fs');
let content = fs.readFileSync('src/components/crm/CrmModule.tsx', 'utf8');

content = content.replace("import { ContractRegisterTab } from './ContractRegisterTab';", "import { ContractRegisterTab } from './ContractRegisterTab';\nimport { SlaScorecardTab } from './SlaScorecardTab';\nimport { Target } from 'lucide-react';");

content = content.replace("const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CLIENTS' | 'CONTRACTS'>('DASHBOARD');", "const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CLIENTS' | 'CONTRACTS' | 'SLA'>('DASHBOARD');");

content = content.replace(`            <NavItem \n               active={activeTab === 'CONTRACTS'}\n               onClick={() => setActiveTab('CONTRACTS')}\n               icon={<FileText className="h-4 w-4" />}\n               label="Contracts Register" \n             />`, `            <NavItem \n               active={activeTab === 'CONTRACTS'}\n               onClick={() => setActiveTab('CONTRACTS')}\n               icon={<FileText className="h-4 w-4" />}\n               label="Contracts Register" \n             />\n            <NavItem \n               active={activeTab === 'SLA'}\n               onClick={() => setActiveTab('SLA')}\n               icon={<Target className="h-4 w-4" />}\n               label="SLA Scorecards" \n             />`);

content = content.replace("{activeTab === 'CONTRACTS' && <ContractRegisterTab session={session} company={company} />}", "{activeTab === 'CONTRACTS' && <ContractRegisterTab session={session} company={company} />}\n          {activeTab === 'SLA' && <SlaScorecardTab session={session} company={company} />}");

fs.writeFileSync('src/components/crm/CrmModule.tsx', content);

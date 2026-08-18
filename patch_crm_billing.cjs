const fs = require('fs');
let content = fs.readFileSync('src/components/crm/CrmModule.tsx', 'utf8');

content = content.replace("import { SlaScorecardTab } from './SlaScorecardTab';", "import { SlaScorecardTab } from './SlaScorecardTab';\nimport { BillingRatesTab } from './BillingRatesTab';\nimport { Receipt } from 'lucide-react';");

content = content.replace("const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CLIENTS' | 'CONTRACTS' | 'SLA'>('DASHBOARD');", "const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CLIENTS' | 'CONTRACTS' | 'SLA' | 'BILLING'>('DASHBOARD');");

content = content.replace(`            <NavItem \n               active={activeTab === 'SLA'}\n               onClick={() => setActiveTab('SLA')}\n               icon={<Target className="h-4 w-4" />}\n               label="SLA Scorecards" \n             />`, `            <NavItem \n               active={activeTab === 'SLA'}\n               onClick={() => setActiveTab('SLA')}\n               icon={<Target className="h-4 w-4" />}\n               label="SLA Scorecards" \n             />\n            <NavItem \n               active={activeTab === 'BILLING'}\n               onClick={() => setActiveTab('BILLING')}\n               icon={<Receipt className="h-4 w-4" />}\n               label="Billing Rates" \n             />`);

content = content.replace("{activeTab === 'SLA' && <SlaScorecardTab session={session} company={company} />}", "{activeTab === 'SLA' && <SlaScorecardTab session={session} company={company} />}\n          {activeTab === 'BILLING' && <BillingRatesTab session={session} company={company} />}");

fs.writeFileSync('src/components/crm/CrmModule.tsx', content);

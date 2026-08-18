const fs = require('fs');
let code = fs.readFileSync('src/components/scm/ScmModule.tsx', 'utf8');

code = code.replace(
  "import { StockLocationTab } from './StockLocationTab';",
  "import { StockLocationTab } from './StockLocationTab';\nimport { InventoryDashboardTab } from './InventoryDashboardTab';\nimport { LayoutDashboard } from 'lucide-react';"
);

code = code.replace(
  "const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ITEMS' | 'LOCATIONS' | 'LEDGER' | 'GATE_PASS' | 'GATE_VERIFY'>('ITEMS');",
  "const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ITEMS' | 'LOCATIONS' | 'LEDGER' | 'GATE_PASS' | 'GATE_VERIFY'>('DASHBOARD');"
);

code = code.replace(
  "<nav className=\"flex flex-col gap-1\">\n            <NavItem \n              active={activeTab === 'ITEMS'}",
  `<nav className="flex flex-col gap-1">
            <NavItem 
              active={activeTab === 'DASHBOARD'} 
              onClick={() => setActiveTab('DASHBOARD')} 
              icon={<LayoutDashboard className="h-4 w-4" />} 
              label="Dashboard & Alerts" 
            />
            <NavItem 
              active={activeTab === 'ITEMS'}`
);

code = code.replace(
  "{activeTab === 'ITEMS' && <ItemMasterTab session={session} company={company} />}",
  "{activeTab === 'DASHBOARD' && <InventoryDashboardTab session={session} company={company} />}\n          {activeTab === 'ITEMS' && <ItemMasterTab session={session} company={company} />}"
);

fs.writeFileSync('src/components/scm/ScmModule.tsx', code);

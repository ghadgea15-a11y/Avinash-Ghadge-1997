const fs = require('fs');
let code = fs.readFileSync('src/components/scm/ScmModule.tsx', 'utf8');

code = code.replace(
  "import { InventoryDashboardTab } from './InventoryDashboardTab';",
  "import { InventoryDashboardTab } from './InventoryDashboardTab';\nimport { TransferOrderTab } from './TransferOrderTab';\nimport { ArrowRightLeft } from 'lucide-react';"
);

code = code.replace(
  "const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ITEMS' | 'LOCATIONS' | 'LEDGER' | 'GATE_PASS' | 'GATE_VERIFY'>('DASHBOARD');",
  "const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ITEMS' | 'LOCATIONS' | 'LEDGER' | 'TRANSFER_ORDERS' | 'GATE_PASS' | 'GATE_VERIFY'>('DASHBOARD');"
);

code = code.replace(
  `active={activeTab === 'GATE_VERIFY'} 
              onClick={() => setActiveTab('GATE_VERIFY')} 
              icon={<ShieldCheck className="h-4 w-4" />} 
              label="Gate Verification" 
            />
          </nav>`,
  `active={activeTab === 'GATE_VERIFY'} 
              onClick={() => setActiveTab('GATE_VERIFY')} 
              icon={<ShieldCheck className="h-4 w-4" />} 
              label="Gate Verification" 
            />
            <NavItem 
              active={activeTab === 'TRANSFER_ORDERS'} 
              onClick={() => setActiveTab('TRANSFER_ORDERS')} 
              icon={<ArrowRightLeft className="h-4 w-4" />} 
              label="Transfer Orders" 
            />
          </nav>`
);

code = code.replace(
  "{activeTab === 'GATE_VERIFY' && <GateVerificationTab session={session} company={company} />}",
  "{activeTab === 'GATE_VERIFY' && <GateVerificationTab session={session} company={company} />}\n          {activeTab === 'TRANSFER_ORDERS' && <TransferOrderTab session={session} company={company} />}"
);

fs.writeFileSync('src/components/scm/ScmModule.tsx', code);

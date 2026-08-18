const fs = require('fs');
let content = fs.readFileSync('src/components/crm/ContractRegisterTab.tsx', 'utf8');

content = content.replace(
  "const [search, setSearch] = useState('');",
  "const [search, setSearch] = useState('');\n  const [statusFilter, setStatusFilter] = useState<string>('ALL');\n  const [calculating, setCalculating] = useState(false);\n"
);

content = content.replace(
  "import { Search, Plus, FileText, AlertCircle, Edit, CheckCircle } from 'lucide-react';",
  "import { Search, Plus, FileText, AlertCircle, Edit, CheckCircle, Clock } from 'lucide-react';\nimport { contractExpiryEngine } from '../../services/contractExpiryEngine';"
);

// We want to add a button to run the expiry engine check manually (since we don't have a true cron)
const runCheckHtml = `
          <button 
            onClick={runExpiryCheck} 
            disabled={calculating}
            className="btn-secondary py-1.5 text-sm flex items-center gap-1"
          >
            {calculating ? 'Checking...' : <><Clock className="w-4 h-4" /> Run Expiry Check</>}
          </button>
          <button 
            onClick={() => { setEditingContract(null); setShowModal(true); }}
`;

content = content.replace(
  "          <button \n            onClick={() => { setEditingContract(null); setShowModal(true); }}",
  runCheckHtml
);

const runExpiryCheckFunc = `
  const runExpiryCheck = async () => {
    setCalculating(true);
    try {
      await contractExpiryEngine.generateExpiryAlerts(company.companyId, contracts);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setCalculating(false);
    }
  };
`;

content = content.replace(
  "  const loadData = async () => {",
  runExpiryCheckFunc + "\n  const loadData = async () => {"
);

// Filters
const filterHtml = `
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search contracts..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRING">Expiring Soon</option>
          <option value="RENEWAL_PENDING">Renewal Pending</option>
          <option value="EXPIRED">Expired</option>
          <option value="TERMINATED">Terminated</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>
`;

content = content.replace(
  /<div className="relative mb-6">[\s\S]*?<\/div>/m,
  filterHtml
);

// Search filtering logic
const searchFilterLogic = `
  const filteredContracts = contracts.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = c.contractTitle.toLowerCase().includes(s) || c.contractNumber.toLowerCase().includes(s);
    if (!matchSearch) return false;
    
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    
    return true;
  });
`;

content = content.replace(
  "  const filteredContracts = contracts.filter(c => ",
  searchFilterLogic + "\n  // old filter "
);
content = content.replace("  // old filter \n    c.contractTitle.toLowerCase().includes(search.toLowerCase()) ||\n    c.contractNumber.toLowerCase().includes(search.toLowerCase())\n  );", "");

fs.writeFileSync('src/components/crm/ContractRegisterTab.tsx', content);

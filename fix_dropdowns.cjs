const fs = require('fs');
let code = fs.readFileSync('src/components/bi/EnterpriseIntelligenceDashboard.tsx', 'utf-8');

code = code.replace(
  "<div>\n            <label className=\"block text-xs font-medium text-slate-500 mb-1\">Site</label>",
  `<div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Branch</label>
            <select 
              value={filters.branchId || 'ALL'} 
              onChange={e => handleFilterChange('branchId', e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
            >
              <option value="ALL">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Site</label>`
);

fs.writeFileSync('src/components/bi/EnterpriseIntelligenceDashboard.tsx', code);

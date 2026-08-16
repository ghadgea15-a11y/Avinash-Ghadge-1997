import * as fs from 'fs';

let content = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf-8');

const materialsTab = `        <button
          onClick={() => setActiveTab('MATERIALS')}
          className={\`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap \${
            activeTab === 'MATERIALS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }\`}
        >
          <Truck className="w-4 h-4 text-amber-500" />
          <span>Material Pass Register ({materials.length})</span>
        </button>`;

const newTab = `
        <button
          onClick={() => setActiveTab('DAILY_LOGS')}
          className={\`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap \${
            activeTab === 'DAILY_LOGS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }\`}
        >
          <FileText className="w-4 h-4 text-emerald-500" />
          <span>Daily Logs & Handovers</span>
        </button>`;

content = content.replace(materialsTab, materialsTab + newTab);
fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', content);

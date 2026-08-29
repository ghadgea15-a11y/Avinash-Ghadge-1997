const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminDashboard.tsx', 'utf8');

const regex = /      \{[\s\S]*?\/\* Action Shortcut Pills \*\/\n      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">/;
const replacement = `      {/* Action Shortcut Pills */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">`;
text = text.replace(regex, replacement);

const buttonRegex = /        <button\n          onClick=\{.*?SUPER_ADMIN_LEADS.*?\n          className=\{.*?\}\n        >\n          <div className="flex items-center gap-2\.5">\n            <Users className="w-4 h-4 text-emerald-400" \/>\n            <span className="text-xs font-semibold">Leads CRM<\/span>\n          <\/div>\n          <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" \/>\n        <\/button>/;

const newButton = `        <button
          onClick={() => onNavigate('SUPER_ADMIN_LEADS')}
          className={\`p-3 rounded-xl border text-left transition flex items-center justify-between \${
            isDark ? 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800' : 'bg-white hover:bg-slate-100 border-slate-200 shadow-sm'
          }\`}
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold">Leads CRM</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>

        <button
          onClick={() => onNavigate('SUPER_ADMIN_MANAGEMENT')}
          className={\`p-3 rounded-xl border text-left transition flex items-center justify-between \${
            isDark ? 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800' : 'bg-white hover:bg-slate-100 border-slate-200 shadow-sm'
          }\`}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold">Admins</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>`;

text = text.replace(buttonRegex, newButton);

fs.writeFileSync('src/components/screens/SuperAdminDashboard.tsx', text);

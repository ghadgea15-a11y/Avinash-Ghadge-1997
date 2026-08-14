const fs = require('fs');
let file = fs.readFileSync('src/components/common/NavigationDrawer.tsx', 'utf8');

const hook = `              <button
                onClick={() => { onNavigate('EMPLOYEES'); onClose(); }}`;

const replacer = `              {(userSession?.role !== 'GUARD' && userSession?.role !== 'FIELD_OFFICER') && (
              <button
                onClick={() => { onNavigate('EMPLOYEES'); onClose(); }}`;

const endHook = `<span>Employee Management</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>`;

const endReplacer = `<span>Employee Management</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
              )}`;

file = file.replace(hook, replacer);
file = file.replace(endHook, endReplacer);

// We need to also remove ROLE_DASHBOARD from NavigationDrawer
const dashboardBlock = `              <button
                onClick={() => { onNavigate('ROLE_DASHBOARD'); onClose(); }}
                className={\`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition \${
                  currentScreen === 'ROLE_DASHBOARD'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : isDark 
                       ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                       : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                }\`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>`;
file = file.replace(dashboardBlock, "");


fs.writeFileSync('src/components/common/NavigationDrawer.tsx', file);
console.log('Nav drawer patched');

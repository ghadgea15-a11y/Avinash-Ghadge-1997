const fs = require('fs');
let code = fs.readFileSync('src/components/common/NavigationDrawer.tsx', 'utf8');

const navItems = `
                  {RbacService.hasModuleAccess(userSession, 'CLIENTS') && (
                    <button
                      onClick={() => { onNavigate('CLIENT_MANAGEMENT'); onClose(); }}
                      className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 \${
                        currentScreen === 'CLIENT_MANAGEMENT'
                          ? 'bg-indigo-600/10 text-indigo-700 dark:text-indigo-400 font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                      }\`}
                    >
                      <Building2 className={\`w-5 h-5 \${currentScreen === 'CLIENT_MANAGEMENT' ? 'text-indigo-600 dark:text-indigo-400' : ''}\`} />
                      Clients
                    </button>
                  )}
                  {RbacService.hasModuleAccess(userSession, 'DEPLOYMENTS') && (
                    <button
                      onClick={() => { onNavigate('DEPLOYMENT_MANAGEMENT'); onClose(); }}
                      className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 \${
                        currentScreen === 'DEPLOYMENT_MANAGEMENT'
                          ? 'bg-indigo-600/10 text-indigo-700 dark:text-indigo-400 font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                      }\`}
                    >
                      <Layers className={\`w-5 h-5 \${currentScreen === 'DEPLOYMENT_MANAGEMENT' ? 'text-indigo-600 dark:text-indigo-400' : ''}\`} />
                      Deployments
                    </button>
                  )}
                  {RbacService.hasModuleAccess(userSession, 'SHIFT_ROSTER') && (
                    <button
                      onClick={() => { onNavigate('SHIFT_ROSTER'); onClose(); }}
                      className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 \${
                        currentScreen === 'SHIFT_ROSTER'
                          ? 'bg-indigo-600/10 text-indigo-700 dark:text-indigo-400 font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                      }\`}
                    >
                      <CalendarDays className={\`w-5 h-5 \${currentScreen === 'SHIFT_ROSTER' ? 'text-indigo-600 dark:text-indigo-400' : ''}\`} />
                      Shift Roster
                    </button>
                  )}
`;
code = code.replace("{RbacService.hasModuleAccess(userSession, 'EMPLOYEES') && (", navItems + "\n                  {RbacService.hasModuleAccess(userSession, 'EMPLOYEES') && (");

fs.writeFileSync('src/components/common/NavigationDrawer.tsx', code);

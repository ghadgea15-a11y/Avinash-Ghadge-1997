import * as fs from 'fs';

const extraNavItems = `
                {RbacService.hasModuleAccess(userSession, 'ATTENDANCE_SHIFTS') && (
                  <button
                    onClick={() => { onNavigate('TASK_MANAGEMENT'); onClose(); }}
                    className={\`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition \${
                      currentScreen === 'TASK_MANAGEMENT'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : isDark 
                          ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                    }\`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                      <span>Task Management</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                )}

                <button
                  onClick={() => { onNavigate('MY_TASKS'); onClose(); }}
                  className={\`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition \${
                    currentScreen === 'MY_TASKS'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                  }\`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    <span>My Tasks</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  onClick={() => { onNavigate('ANNOUNCEMENTS'); onClose(); }}
                  className={\`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition \${
                    currentScreen === 'ANNOUNCEMENTS'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                  }\`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span>Announcements</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
`;

let drawer = fs.readFileSync('src/components/common/NavigationDrawer.tsx', 'utf-8');
drawer = drawer.replace(
  "{RbacService.hasModuleAccess(userSession, 'COMPANY_MANAGEMENT') && (",
  extraNavItems + "\n                {RbacService.hasModuleAccess(userSession, 'COMPANY_MANAGEMENT') && ("
);
fs.writeFileSync('src/components/common/NavigationDrawer.tsx', drawer);


// For TabletNavigationRail
const extraRailItems = `
        {RbacService.hasModuleAccess(userSession, 'ATTENDANCE_SHIFTS') && (
          <button
            onClick={() => onNavigate('TASK_MANAGEMENT')}
            className={\`p-3 rounded-xl flex items-center justify-center transition group relative \${
              currentScreen === 'TASK_MANAGEMENT'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isDark
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
            }\`}
            title="Task Management"
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => onNavigate('MY_TASKS')}
          className={\`p-3 rounded-xl flex items-center justify-center transition group relative \${
            currentScreen === 'MY_TASKS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : isDark
                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
          }\`}
          title="My Tasks"
        >
          <UserCheck className="w-5 h-5" />
        </button>
        <button
          onClick={() => onNavigate('ANNOUNCEMENTS')}
          className={\`p-3 rounded-xl flex items-center justify-center transition group relative \${
            currentScreen === 'ANNOUNCEMENTS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : isDark
                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
          }\`}
          title="Announcements"
        >
          <Bell className="w-5 h-5" />
        </button>
`;

let rail = fs.readFileSync('src/components/common/TabletNavigationRail.tsx', 'utf-8');
rail = rail.replace(
  "{RbacService.hasModuleAccess(userSession, 'COMPANY_MANAGEMENT') && (",
  extraRailItems + "\n        {RbacService.hasModuleAccess(userSession, 'COMPANY_MANAGEMENT') && ("
);
fs.writeFileSync('src/components/common/TabletNavigationRail.tsx', rail);


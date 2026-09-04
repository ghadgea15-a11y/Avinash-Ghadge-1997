const fs = require('fs');
let f = fs.readFileSync('src/components/screens/LeaveManagementScreen.tsx', 'utf8');

f = f.replace(/(\s*)\{activeTab === 'POLICIES' && isAdmin && \(\s*<LeavePolicyMaster[\s\S]*?\/\>\s*\)\}/, 
`$1{activeTab === 'POLICIES' && isAdmin && (
                <LeavePolicyMaster 
                  userSession={userSession}
                  company={activeCompany!}
                  policies={policies}
                  onSavePolicy={handleSavePolicy}
                  isLoading={isRefreshing}
                />
              )}
              {activeTab === 'HOLIDAYS' && (
                <HolidayCalendarMaster
                  userSession={userSession}
                  company={activeCompany!}
                  holidays={holidays}
                  isLoading={isRefreshing}
                />
              )}`);

fs.writeFileSync('src/components/screens/LeaveManagementScreen.tsx', f);

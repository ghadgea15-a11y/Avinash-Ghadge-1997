import * as fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf-8');

const additionalRenders = `
                    {currentScreen === 'TASK_MANAGEMENT' && activeCompany && (
                      <TaskManagementScreen
                        userSession={userSession}
                        company={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'ANNOUNCEMENTS' && activeCompany && (
                      <AnnouncementsScreen
                        userSession={userSession}
                        company={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}

                    {currentScreen === 'MY_TASKS' && activeCompany && (
                      <MyTasksScreen
                        userSession={userSession}
                        company={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}
`;

app = app.replace(
  "{currentScreen === 'ASSET_TRACKING' && (",
  additionalRenders + "\n                    {currentScreen === 'ASSET_TRACKING' && ("
);

fs.writeFileSync('src/App.tsx', app);

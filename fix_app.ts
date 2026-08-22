import * as fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix 1: Wrap setCurrentScreen to match (screen: string) => void
content = content.replace(
  "<SuperAdminGate userSession={userSession} onNavigate={setCurrentScreen}>",
  "<SuperAdminGate userSession={userSession} onNavigate={(s) => setCurrentScreen(s as any)}>"
);

// Fix 2: Wrap setCurrentScreen for SuperAdminCreateCompany
content = content.replace(
  "onNavigate={setCurrentScreen}",
  "onNavigate={(s) => setCurrentScreen(s as any)}"
);

fs.writeFileSync('src/App.tsx', content, 'utf8');

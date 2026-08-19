import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add import
if "SecurityDashboard" not in content:
    content = content.replace("import { ShiftRosterApp } from './components/wfm/ShiftRosterApp';", "import { ShiftRosterApp } from './components/wfm/ShiftRosterApp';\nimport { SecurityDashboard } from './components/security/SecurityDashboard';")

# Add to Main render content
render_code = """                    {currentScreen === 'SECURITY_AUDIT' && (
                      <SecurityDashboard userSession={userSession!} onNavigate={setCurrentScreen} />
                    )}
"""
if "currentScreen === 'SECURITY_AUDIT'" not in content:
    content = content.replace("                    {currentScreen === 'REPORTS_ANALYTICS' && (", render_code + "                    {currentScreen === 'REPORTS_ANALYTICS' && (")

with open('src/App.tsx', 'w') as f:
    f.write(content)

import re

with open('src/components/security/SecurityDashboard.tsx', 'r') as f:
    content = f.read()

if "import { SuspiciousPunchDashboard } from './SuspiciousPunchDashboard';" not in content:
    content = content.replace("import { AuditViewer } from './AuditViewer';", "import { AuditViewer } from './AuditViewer';\nimport { SuspiciousPunchDashboard } from './SuspiciousPunchDashboard';")

tab_headers = """          <button
            onClick={() => setActiveTab('PUNCHES')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'PUNCHES' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Suspicious Punches
          </button>
"""
content = content.replace("          <button\n            onClick={() => setActiveTab('EVENTS')", tab_headers + "          <button\n            onClick={() => setActiveTab('EVENTS')")

tab_content = """          {activeTab === 'PUNCHES' && (
            <SuspiciousPunchDashboard userSession={userSession} />
          )}
"""
content = content.replace("          {activeTab === 'EVENTS' && (", tab_content + "          {activeTab === 'EVENTS' && (")

with open('src/components/security/SecurityDashboard.tsx', 'w') as f:
    f.write(content)

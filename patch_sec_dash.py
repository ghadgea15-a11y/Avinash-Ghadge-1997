import re

with open('src/components/security/SecurityDashboard.tsx', 'r') as f:
    content = f.read()

if "import { AuditViewer } from './AuditViewer';" not in content:
    content = content.replace("import { motion } from 'motion/react';", "import { motion } from 'motion/react';\nimport { AuditViewer } from './AuditViewer';")

if "<AuditViewer userSession={userSession} />" not in content:
    content = content.replace("          {activeTab === 'EVENTS' && (", "          {activeTab === 'EVENTS' && (\n            <AuditViewer userSession={userSession} />\n          )}\n          {activeTab === 'OLD_EVENTS' && (")

with open('src/components/security/SecurityDashboard.tsx', 'w') as f:
    f.write(content)

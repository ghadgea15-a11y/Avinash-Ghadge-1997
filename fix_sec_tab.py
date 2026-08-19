with open('src/components/security/SecurityDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace("{activeTab === 'OLD_EVENTS' && (", "")

with open('src/components/security/SecurityDashboard.tsx', 'w') as f:
    f.write(content)

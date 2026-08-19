import re

with open('src/components/security/SecurityDashboard.tsx', 'r') as f:
    content = f.read()
content = content.replace("const [activeTab, setActiveTab] = useState<'ANOMALIES' | 'EVENTS'>('ANOMALIES');", "const [activeTab, setActiveTab] = useState<'ANOMALIES' | 'EVENTS' | 'PUNCHES'>('ANOMALIES');")
with open('src/components/security/SecurityDashboard.tsx', 'w') as f:
    f.write(content)

with open('src/services/suspiciousPunchService.ts', 'r') as f:
    content = f.read()
content = content.replace("!geoResult.isWithinGeofence && !geoResult.isWithinAccuracyBuffer", "geoResult.result === 'REJECTED'")
with open('src/services/suspiciousPunchService.ts', 'w') as f:
    f.write(content)

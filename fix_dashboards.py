import re

dashboards = ['src/components/screens/dashboards/DirectorDashboard.tsx', 'src/components/screens/dashboards/GeneralManagerDashboard.tsx']

for path in dashboards:
    with open(path, 'r') as f:
        content = f.read()
    
    # fix missing onNavigate
    content = content.replace("({ userSession, company })", "({ userSession, company, onNavigate })")
    
    # fix missing ShieldCheck import
    if "ShieldCheck" not in content[:500]: # check imports
        content = content.replace("import { Users, Building, Activity } from 'lucide-react';", "import { Users, Building, Activity, ShieldCheck } from 'lucide-react';")
        content = content.replace("import { Activity, Clock } from 'lucide-react';", "import { Activity, Clock, ShieldCheck } from 'lucide-react';")

    with open(path, 'w') as f:
        f.write(content)

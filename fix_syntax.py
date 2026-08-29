with open('src/components/common/TabletNavigationRail.tsx', 'r') as f:
    content = f.read()

content = content.replace("const isSuperAdmin = userSession,\n  activeCompany?.role === 'SUPER_ADMIN';", "const isSuperAdmin = userSession?.role === 'SUPER_ADMIN';")

content = content.replace("userSession,\n  activeCompany?.role", "userSession?.role")
content = content.replace("userSession,\n  activeCompany &&", "userSession && activeCompany &&")
content = content.replace("userSession,\n  activeCompany.fullName", "userSession?.fullName")
content = content.replace("userSession,\n  activeCompany.role", "userSession?.role")
content = content.replace("userSession,\n  activeCompany.avatarUrl", "userSession?.avatarUrl")

with open('src/components/common/TabletNavigationRail.tsx', 'w') as f:
    f.write(content)

with open('src/components/screens/LoginScreen.tsx', 'r') as f:
    content = f.read()

# LoginScreen.tsx has an extra `>>` on line 374
import re
content = re.sub(r'>>\s*$', '', content, flags=re.MULTILINE)

with open('src/components/screens/LoginScreen.tsx', 'w') as f:
    f.write(content)


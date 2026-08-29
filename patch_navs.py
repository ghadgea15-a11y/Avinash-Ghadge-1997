import re
import os

# TabletNavigationRail
if os.path.exists('src/components/common/TabletNavigationRail.tsx'):
    with open('src/components/common/TabletNavigationRail.tsx', 'r') as f:
        content = f.read()
    
    # Add activeCompany to interface
    if "activeCompany?: import('../../types').CompanyTenant | null;" not in content:
        content = content.replace("userSession: UserSession | null;", "userSession: UserSession | null;\n  activeCompany?: import('../../types').CompanyTenant | null;")
    
    # Add activeCompany to props destructuring
    if "activeCompany," not in content:
        content = content.replace("userSession", "userSession,\n  activeCompany")
    
    # Add isSuperAdmin
    if "const isSuperAdmin = userSession?.role === 'SUPER_ADMIN';" not in content:
        content = content.replace("const { isDark } = useTheme();", "const { isDark } = useTheme();\n  const isSuperAdmin = userSession?.role === 'SUPER_ADMIN';")

    with open('src/components/common/TabletNavigationRail.tsx', 'w') as f:
        f.write(content)

# MobileTopHeader
if os.path.exists('src/components/common/MobileTopHeader.tsx'):
    with open('src/components/common/MobileTopHeader.tsx', 'r') as f:
        content = f.read()
    
    if "activeCompany?: import('../../types').CompanyTenant | null;" not in content:
        content = content.replace("onNavigateNotifications: () => void;", "onNavigateNotifications: () => void;\n  activeCompany?: import('../../types').CompanyTenant | null;")
        content = content.replace("onNavigateNotifications\n})", "onNavigateNotifications,\n  activeCompany\n})")
    
    logo_pattern = r'(<AppLogo size="sm" showSubtitle=\{false\} />)'
    new_logo = r'''{activeCompany?.logoUrl ? (
          <img src={activeCompany.logoUrl} alt={activeCompany.brandName} className="h-8 object-contain" />
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white" style={{ backgroundColor: activeCompany?.primaryColorHex || '#4f46e5' }}>
              {activeCompany?.brandName?.[0] || 'L'}
            </div>
            <span className="font-bold text-sm" style={{ color: activeCompany?.primaryColorHex || undefined }}>
              {activeCompany?.brandName || 'Log Sheet Muster'}
            </span>
          </div>
        )}'''
    content = re.sub(logo_pattern, new_logo, content)

    with open('src/components/common/MobileTopHeader.tsx', 'w') as f:
        f.write(content)

# App.tsx
with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("<TabletNavigationRail\n                  currentScreen={currentScreen}", "<TabletNavigationRail\n                  activeCompany={activeCompany}\n                  currentScreen={currentScreen}")
content = content.replace("<MobileTopHeader\n                  onOpenDrawer", "<MobileTopHeader\n                  activeCompany={activeCompany}\n                  onOpenDrawer")

with open('src/App.tsx', 'w') as f:
    f.write(content)


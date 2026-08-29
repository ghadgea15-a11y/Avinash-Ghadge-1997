import re
import os

if os.path.exists('src/components/common/Header.tsx'):
    with open('src/components/common/Header.tsx', 'r') as f:
        content = f.read()

    logo_pattern = r'(<AppLogo size="sm" showSubtitle=\{false\} />)'
    new_logo = r'''{activeCompany?.logoUrl ? (
            <img src={activeCompany.logoUrl} alt={activeCompany.brandName} className="h-8 object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white" style={{ backgroundColor: activeCompany?.primaryColorHex || '#4f46e5' }}>
                {activeCompany?.brandName?.[0] || 'L'}
              </div>
              <span className="font-bold text-sm hidden md:inline-block" style={{ color: activeCompany?.primaryColorHex || undefined }}>
                {activeCompany?.brandName || 'Log Sheet Muster'}
              </span>
            </div>
          )}'''
    content = re.sub(logo_pattern, new_logo, content)

    with open('src/components/common/Header.tsx', 'w') as f:
        f.write(content)


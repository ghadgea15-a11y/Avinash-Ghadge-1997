import re
import os

if not os.path.exists('src/components/common/TabletNavigationRail.tsx'):
    exit(0)

with open('src/components/common/TabletNavigationRail.tsx', 'r') as f:
    content = f.read()

header_pattern = r'(<div className="flex-1 w-full flex items-center justify-center pt-2">)\s*(<div className=\{`w-10 h-10.*?</div>)'

new_header = r'''\1
          {!isSuperAdmin && activeCompany?.logoUrl ? (
            <img src={activeCompany.logoUrl} alt={activeCompany.brandName} className="w-10 h-10 rounded-xl object-contain bg-white p-1 shadow-sm" />
          ) : (
            <div 
              style={!isSuperAdmin && activeCompany?.primaryColorHex ? { backgroundColor: activeCompany.primaryColorHex } : undefined}
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
              isSuperAdmin ? 'bg-amber-600 shadow-amber-600/30' : (!activeCompany?.primaryColorHex ? 'bg-indigo-600 shadow-indigo-600/30' : '')
            }`}>
              {isSuperAdmin ? 'SA' : (activeCompany?.brandName?.[0] || 'L')}
            </div>
          )}'''

content = re.sub(header_pattern, new_header, content, flags=re.DOTALL)

with open('src/components/common/TabletNavigationRail.tsx', 'w') as f:
    f.write(content)

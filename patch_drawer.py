import re

with open('src/components/common/NavigationDrawer.tsx', 'r') as f:
    content = f.read()

header_pattern = r'(<div className="flex items-center gap-2">)\s*(<div className=\{`w-8 h-8.*?</div>)\s*(<div className="overflow-hidden">)\s*(<h2.*?</h2>)'

new_header = r'''\1
              {!isSuperAdmin && activeCompany?.logoUrl ? (
                <img src={activeCompany.logoUrl} alt={activeCompany.brandName} className="w-8 h-8 rounded object-contain bg-white p-0.5" />
              ) : (
                <div 
                  style={!isSuperAdmin && activeCompany?.primaryColorHex ? { backgroundColor: activeCompany.primaryColorHex } : undefined}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
                  isSuperAdmin ? 'bg-amber-600 shadow-amber-600/30' : (!activeCompany?.primaryColorHex ? 'bg-indigo-600 shadow-indigo-600/30' : '')
                }`}>
                  {isSuperAdmin ? 'SA' : (activeCompany?.brandName?.[0] || 'L')}
                </div>
              )}
              \3
                <h2 className="font-bold text-sm leading-tight truncate" style={!isSuperAdmin && activeCompany?.primaryColorHex ? { color: activeCompany.primaryColorHex } : undefined}>
                  {isSuperAdmin ? 'Platform Super Admin' : (activeCompany?.brandName || 'Log Sheet Muster')}
                </h2>'''

content = re.sub(header_pattern, new_header, content, flags=re.DOTALL)

with open('src/components/common/NavigationDrawer.tsx', 'w') as f:
    f.write(content)

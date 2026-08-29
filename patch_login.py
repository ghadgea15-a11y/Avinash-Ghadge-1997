import re

with open('src/components/screens/LoginScreen.tsx', 'r') as f:
    content = f.read()

# Replace the "Sign In" header with Logo and Tagline
header_pattern = r'(<div className="text-center mb-6 space-y-1">)\s*(<h2.*?h2>)'
new_header = r'''\1
               {validatedCompany?.logoUrl ? (
                 <img src={validatedCompany.logoUrl} alt={validatedCompany.brandName} className="h-12 mx-auto mb-4 object-contain" />
               ) : (
                 <h2 className="text-xl font-bold">{validatedCompany?.brandName || 'Sign In'}</h2>
               )}
               {validatedCompany?.tagline && (
                 <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-2">{validatedCompany.tagline}</p>
               )}'''
content = re.sub(header_pattern, new_header, content)

# Change the Sign In button color
btn_pattern = r'(className=\{`w-full font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition text-sm mt-4 bg-)indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30( disabled:opacity-50`\})'
new_btn = r'''style={{ backgroundColor: validatedCompany?.primaryColorHex || undefined }}
              className={`w-full font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition text-sm mt-4 text-white disabled:opacity-50 ${!validatedCompany?.primaryColorHex ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30' : ''}`}'''
content = re.sub(btn_pattern, new_btn, content)

with open('src/components/screens/LoginScreen.tsx', 'w') as f:
    f.write(content)

import re

with open('src/components/common/AppLogo.tsx', 'r') as f:
    content = f.read()

# Add company prop to interface
if "company?: import('../../types').CompanyTenant | null;" not in content:
    content = content.replace("interface AppLogoProps {", "interface AppLogoProps {\n  company?: import('../../types').CompanyTenant | null;")

if "company = null" not in content:
    content = content.replace("variant = 'full'", "variant = 'full',\n  company = null")

logo_render = r'''<img 
           src={company?.logoUrl || "/logo.png"}
           alt={company?.brandName || "Log Sheet Muster Logo"}
           className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />'''

content = re.sub(r'<img\s+src="/logo\.png"\s+alt="Log Sheet Muster Logo".*?/>', logo_render, content, flags=re.DOTALL)

title_pattern = r'(<span className=\{`font-extrabold tracking-tight \$\{dimensions\.text\} text-black dark:text-white`\}>)\s*Log Sheet <span className="text-emerald-500">Muster</span>\s*(</span>)'
new_title = r'''\1
              {company?.brandName ? (
                <span style={{ color: company?.primaryColorHex || undefined }}>{company.brandName}</span>
              ) : (
                <>Log Sheet <span className="text-emerald-500">Muster</span></>
              )}
            \2'''
content = re.sub(title_pattern, new_title, content, flags=re.DOTALL)

subtitle_pattern = r'(<span className="text-\[10px\] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0\.5">)\s*YOUR WORKFORCE, OUR PRIORITY\s*(</span>)'
new_subtitle = r'''\1
              {company?.tagline || "YOUR WORKFORCE, OUR PRIORITY"}
            \2'''
content = re.sub(subtitle_pattern, new_subtitle, content, flags=re.DOTALL)

with open('src/components/common/AppLogo.tsx', 'w') as f:
    f.write(content)

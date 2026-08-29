import re

with open('src/components/screens/LoginScreen.tsx', 'r') as f:
    content = f.read()

bg_pattern = r'(<div className=\{`flex-1 transition-colors duration-300 \$\{isDark \? \'bg-slate-950 text-slate-100\' : \'bg-white text-black\'\} flex flex-col justify-center px-6`\})'

new_bg = r'''<div 
      style={validatedCompany?.loginBackgroundUrl ? { backgroundImage: `url(${validatedCompany.loginBackgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      className={`flex-1 transition-colors duration-300 ${validatedCompany?.loginBackgroundUrl ? (isDark ? 'bg-slate-950/80 backdrop-blur-md text-slate-100' : 'bg-white/80 backdrop-blur-md text-black') : (isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-black')} flex flex-col justify-center px-6`}
    >'''

content = re.sub(bg_pattern, new_bg, content)

with open('src/components/screens/LoginScreen.tsx', 'w') as f:
    f.write(content)

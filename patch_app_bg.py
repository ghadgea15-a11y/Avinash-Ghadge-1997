import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

pattern = r'(<div className="min-h-screen w-full flex flex-col justify-center items-center font-sans bg-white dark:bg-slate-950 transition-colors duration-200 p-4")'
new_bg = r'''<div 
          style={activeCompany?.loginBackgroundUrl ? { backgroundImage: `url(${activeCompany.loginBackgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          className={`min-h-screen w-full flex flex-col justify-center items-center font-sans transition-colors duration-200 p-4 ${!activeCompany?.loginBackgroundUrl ? 'bg-white dark:bg-slate-950' : ''}`}'''

content = re.sub(pattern, new_bg, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

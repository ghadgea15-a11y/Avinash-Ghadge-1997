import re

with open('src/components/screens/LoginScreen.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'px-6`\}\s*<div className="w-full', r'px-6`}>\n        <div className="w-full', content)

with open('src/components/screens/LoginScreen.tsx', 'w') as f:
    f.write(content)


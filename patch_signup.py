with open('src/components/screens/SignUpScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace('<AppLogo size="sm" showSubtitle={false} />', '<AppLogo size="sm" showSubtitle={false} company={initialCompany} />')

with open('src/components/screens/SignUpScreen.tsx', 'w') as f:
    f.write(content)

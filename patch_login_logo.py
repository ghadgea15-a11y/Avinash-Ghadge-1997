with open('src/components/screens/LoginScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace('<AppLogo size="xl" showSubtitle={true} variant="full" />', '<AppLogo size="xl" showSubtitle={true} variant="full" company={validatedCompany} />')

with open('src/components/screens/LoginScreen.tsx', 'w') as f:
    f.write(content)

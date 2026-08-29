with open('src/components/screens/SplashScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace('<AppLogo size="xl" showSubtitle={true} />', '<AppLogo size="xl" showSubtitle={true} company={activeCompany} />')

with open('src/components/screens/SplashScreen.tsx', 'w') as f:
    f.write(content)

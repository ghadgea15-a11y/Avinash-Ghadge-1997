import re

with open('src/components/public/PremiumLandingPage.tsx', 'r') as f:
    content = f.read()

# Delete header
content = re.sub(r'// --- HEADER ---\n.*?// --- HERO SECTION ---', '// --- HERO SECTION ---', content, flags=re.DOTALL)

# Delete footer
content = re.sub(r'// --- FOOTER ---\n.*?export const PremiumLandingPage', 'export const PremiumLandingPage', content, flags=re.DOTALL)

with open('src/components/public/PremiumLandingPage.tsx', 'w') as f:
    f.write(content)


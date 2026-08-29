import re

with open('src/components/public/PremiumLandingPage.tsx', 'r') as f:
    content = f.read()

content = content.replace('<Header onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} />', '<PremiumHeader onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} />')
content = content.replace('<Footer onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} />', '<PremiumFooter onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} />')

with open('src/components/public/PremiumLandingPage.tsx', 'w') as f:
    f.write(content)


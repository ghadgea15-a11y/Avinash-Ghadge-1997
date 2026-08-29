import re

with open('src/components/public/PremiumLandingPage.tsx', 'r') as f:
    content = f.read()

# Add imports
content = content.replace(
    "import { PhaseAScreen } from '../../types';",
    "import { PhaseAScreen } from '../../types';\nimport { PremiumHeader } from './PremiumHeader';\nimport { PremiumFooter } from './PremiumFooter';"
)

# Remove the inline Header component
header_pattern = re.compile(r'// --- HEADER ---\n.*?// --- HERO ---', re.DOTALL)
content = header_pattern.sub('// --- HERO ---', content)

# Remove the inline Footer component
footer_pattern = re.compile(r'// --- FOOTER ---\n.*?// --- PAGE COMPONENT ---', re.DOTALL)
content = footer_pattern.sub('// --- PAGE COMPONENT ---', content)

# Replace <Header ... /> with <PremiumHeader ... />
content = content.replace('<Header onNavigate={onNavigate} onOpenDemo={() => setShowDemoModal(true)} />', '<PremiumHeader onNavigate={onNavigate} onOpenDemo={() => setShowDemoModal(true)} />')

# Replace <Footer ... /> with <PremiumFooter ... />
content = content.replace('<Footer onNavigate={onNavigate} onOpenDemo={() => setShowDemoModal(true)} />', '<PremiumFooter onNavigate={onNavigate} onOpenDemo={() => setShowDemoModal(true)} />')

with open('src/components/public/PremiumLandingPage.tsx', 'w') as f:
    f.write(content)


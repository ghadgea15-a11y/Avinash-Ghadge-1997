const fs = require('fs');
const content = fs.readFileSync('src/components/public/PremiumLandingPage.tsx', 'utf8');

// Replace exports to include RequestDemoModal
let patched = content.replace(
    "import { PhaseAScreen } from '../../types';",
    "import { PhaseAScreen } from '../../types';\nimport { RequestDemoModal } from './RequestDemoModal';"
);

// Add state to PremiumLandingPage
patched = patched.replace(
    "export const PremiumLandingPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {",
    "export const PremiumLandingPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {\n  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);\n"
);

// Add the modal component and pass setter to sections
patched = patched.replace(
    "<HeroSection onNavigate={onNavigate} />",
    "<HeroSection onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} />"
);
patched = patched.replace(
    "<ContactDemoSection onNavigate={onNavigate} />",
    "<ContactDemoSection onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} />"
);
patched = patched.replace(
    "<Footer onNavigate={onNavigate} />",
    "<Footer onNavigate={onNavigate} />\n      <RequestDemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />"
);

// Update HeroSection props
patched = patched.replace(
    "const HeroSection: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {",
    "const HeroSection: React.FC<{ onNavigate: (screen: PhaseAScreen) => void; onOpenDemo: () => void }> = ({ onNavigate, onOpenDemo }) => {"
);

// Update HeroSection Button
patched = patched.replace(
    `<a \n            href="#contact"\n            className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 rounded-full font-bold text-lg transition-all shadow-sm flex items-center justify-center gap-2"\n          >\n            Get 3 Months Free Demo\n          </a>`,
    `<button \n            onClick={onOpenDemo}\n            className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 rounded-full font-bold text-lg transition-all shadow-sm flex items-center justify-center gap-2"\n          >\n            Get 3 Months Free Demo\n          </button>`
);

// Update Header to have Demo Button trigger modal? The header doesn't have it explicitly right now, it has "Request Demo" as a hash link.
patched = patched.replace(
    `const Header: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {`,
    `const Header: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {`
); // Nothing to do here if we only want to change the main buttons, or we can change href="#contact" to trigger it? The user only specified the "Get 3 month demo" button.

fs.writeFileSync('src/components/public/PremiumLandingPage.tsx', patched);

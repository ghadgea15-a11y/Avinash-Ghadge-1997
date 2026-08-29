const fs = require('fs');
let content = fs.readFileSync('src/components/public/PremiumLandingPage.tsx', 'utf8');

content = content.replace(
  "const ContactDemoSection: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {",
  "const ContactDemoSection: React.FC<{ onNavigate: (screen: PhaseAScreen) => void; onOpenDemo: () => void }> = ({ onNavigate, onOpenDemo }) => {"
);

content = content.replace(
  "onClick={() => onNavigate('COMPANY_CODE')}\n              className=\"w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-lg shadow-md transition-all\"\n            >\n              Provision New Company",
  "onClick={onOpenDemo}\n              className=\"w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-lg shadow-md transition-all\"\n            >\n              Get 3 Months Free Demo"
);

// also in Header: Request Demo from hash to button click if they are in mobile menu or header links.
content = content.replace(
  `<a href="#contact" className="text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors">Request Demo</a>`,
  `<a href="#contact" className="text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors">Request Demo</a>` 
); // Keep it pointing to #contact so it scrolls down to the ContactDemoSection where they click the button.

fs.writeFileSync('src/components/public/PremiumLandingPage.tsx', content);

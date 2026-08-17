import React from 'react';
import { PhaseAScreen } from '../../types';
import { PublicHeader } from '../public/PublicHeader';
import { HeroSection } from '../public/HeroSection';
import { TrustValueStrip } from '../public/TrustValueStrip';
import { PlatformOverview } from '../public/PlatformOverview';
import { FeaturesSection } from '../public/FeaturesSection';
import { ModuleExplorer } from '../public/ModuleExplorer';
import { WebAndAndroidSection } from '../public/WebAndAndroidSection';
import { SecurityArchitectureSection } from '../public/SecurityArchitectureSection';
import { HowItWorksSection } from '../public/HowItWorksSection';
import { InteractiveDemoSection } from '../public/InteractiveDemoSection';
import { UseCasesSection } from '../public/UseCasesSection';
import { FaqSection } from '../public/FaqSection';
import { AboutSection } from '../public/AboutSection';
import { ContactDemoSection } from '../public/ContactDemoSection';
import { PublicFooter } from '../public/PublicFooter';

interface LandingPageScreenProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const LandingPageScreen: React.FC<LandingPageScreenProps> = ({ onNavigate }) => {
  const handleRequestDemoClick = () => {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#0A0D14] font-body selection:bg-[#0A0D14] selection:text-white antialiased">
      
      {/* 1. Website Navbar */}
      <PublicHeader 
        onNavigate={onNavigate} 
        onRequestDemoClick={handleRequestDemoClick}
      />

      {/* 2. Editorial Hero (Headline: RUN EVERY SITE. CONNECT EVERY OPERATION. + Abstract Visual) */}
      <HeroSection 
        onNavigate={onNavigate} 
        onRequestDemoClick={handleRequestDemoClick}
      />

      {/* 3. Section 1 — Brand Statement: ONE PLATFORM. EVERY OPERATION. */}
      <TrustValueStrip />

      {/* 4. Section 2 — The Operating System For Your Sites & Section 3 — Platform Architecture */}
      <PlatformOverview />

      {/* 5. Section 4 — Capabilities (Alternating Editorial Sections: Workforce, Security, Operations, Assets, Intelligence) */}
      <FeaturesSection />

      {/* 6. Section 5 — 14 Enterprise Domains (Vertical Module Explorer) */}
      <ModuleExplorer />

      {/* 7. Section 6 — Web + Android Multi-Platform Cohesion */}
      <WebAndAndroidSection />

      {/* 8. Section 7 — Security (Deep Dark Forest Section: CONTROL WITHOUT COMPLEXITY.) */}
      <SecurityArchitectureSection />

      {/* 9. Section 8 — How Operations Flow (6-Stage Horizontal Pipeline) */}
      <HowItWorksSection />

      {/* 10. Section 9 — Product Demo (The ONLY section with application UI mockups) */}
      <InteractiveDemoSection />

      {/* 11. Section 10 — Industry Use Cases (Selectable Categories) */}
      <UseCasesSection />

      {/* 12. Section 11 — FAQ Accordion */}
      <FaqSection />

      {/* 13. Section 12 — About & Corporate Ownership (Shourya Enterprises Pvt. Ltd.) */}
      <AboutSection />

      {/* 14. Section 13 — Final CTA & Executive Demo Request */}
      <ContactDemoSection onNavigate={onNavigate} />

      {/* 15. Section 14 — Website Footer */}
      <PublicFooter onNavigate={onNavigate} />

    </div>
  );
};

import React, { useState } from 'react';
import { PhaseAScreen } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Layers, 
  ShieldCheck, 
  Lightbulb, 
  HelpCircle, 
  Mail,
  ChevronRight,
  MonitorSmartphone,
  Menu,
  X
} from 'lucide-react';

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

type TabType = 'OVERVIEW' | 'PLATFORM' | 'SECURITY' | 'USE_CASES' | 'ABOUT' | 'CONTACT';

export const LandingPageScreen: React.FC<LandingPageScreenProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'OVERVIEW', label: 'Overview', icon: Home },
    { id: 'PLATFORM', label: 'Platform & Features', icon: Layers },
    { id: 'SECURITY', label: 'Security & Arch', icon: ShieldCheck },
    { id: 'USE_CASES', label: 'Use Cases & Demo', icon: Lightbulb },
    { id: 'ABOUT', label: 'About & FAQ', icon: HelpCircle },
    { id: 'CONTACT', label: 'Contact & Demo', icon: Mail },
  ] as const;

  const handleRequestDemoClick = () => {
    setActiveTab('CONTACT');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'OVERVIEW':
        return (
          <div className="flex flex-col">
            <HeroSection onNavigate={onNavigate} onRequestDemoClick={handleRequestDemoClick} />
            <TrustValueStrip />
            <FeaturesSection />
            <WebAndAndroidSection />
          </div>
        );
      case 'PLATFORM':
        return (
          <div className="flex flex-col">
            <PlatformOverview />
            <ModuleExplorer />
          </div>
        );
      case 'SECURITY':
        return (
          <div className="flex flex-col">
            <SecurityArchitectureSection />
          </div>
        );
      case 'USE_CASES':
        return (
          <div className="flex flex-col">
            <UseCasesSection />
            <HowItWorksSection />
            <InteractiveDemoSection />
          </div>
        );
      case 'ABOUT':
        return (
          <div className="flex flex-col">
            <AboutSection />
            <FaqSection />
          </div>
        );
      case 'CONTACT':
        return (
          <div className="flex flex-col">
            <ContactDemoSection onNavigate={onNavigate} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col md:flex-row text-[#0A0D14] font-body selection:bg-[#0A0D14] selection:text-white antialiased">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-[#E8E7E3] sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2" onClick={() => onNavigate('LANDING')}>
          <div className="w-8 h-8 rounded-lg bg-[#0A0D14] flex items-center justify-center">
            <MonitorSmartphone className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold tracking-tight text-lg">Log Sheet Muster</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-[#F4F3EF] rounded-md">
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Left Sidebar (Option Bar) */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-[#E8E7E3] shadow-lg flex flex-col transition-transform duration-300 md:translate-x-0 md:static md:w-80 lg:w-80
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 hidden md:flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('LANDING')}>
          <div className="w-10 h-10 rounded-xl bg-[#0A0D14] flex items-center justify-center shadow-md">
            <MonitorSmartphone className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold tracking-tight text-xl leading-none">Log Sheet</span>
            <span className="font-display font-medium text-emerald-600 tracking-widest text-sm uppercase">Muster</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-2 mt-4 md:mt-0">
          <div className="px-3 mb-4 text-xs font-bold text-[#71717A] uppercase tracking-widest">
            Explore Platform
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-[#0A0D14] text-white shadow-md scale-[1.02]' 
                    : 'bg-transparent text-[#52525B] hover:bg-[#F4F3EF] hover:text-[#0A0D14]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-[#71717A]'}`} />
                  <span className="font-bold text-sm tracking-wide">{tab.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-emerald-400" />}
              </button>
            );
          })}
        </div>

        <div className="p-6 border-t border-[#E8E7E3] bg-[#FBFBFA]">
          <button 
            onClick={() => onNavigate('LOGIN')}
            className="w-full py-3 rounded-xl bg-white border border-[#D4D4D8] hover:border-[#0A0D14] text-[#0A0D14] font-bold text-sm transition-colors shadow-sm mb-3"
          >
            System Login
          </button>
          <button 
            onClick={() => onNavigate('SIGN_UP')}
            className="w-full py-3 rounded-xl bg-[#0A0D14] hover:bg-emerald-600 text-white font-bold text-sm transition-colors shadow-md"
          >
            Create Company
          </button>
        </div>
      </div>

      {/* Main Content Area with Sliding Animation */}
      <div className="flex-1 overflow-x-hidden relative flex flex-col">
        <main className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute inset-0 overflow-y-auto"
            >
              <div className="min-h-full pb-24">
                {renderContent()}
              </div>
              <PublicFooter onNavigate={onNavigate} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

    </div>
  );
};

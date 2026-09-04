import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, MonitorSmartphone, Shield, Building2, Layers, Monitor } from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { LandingPageConfig, DEFAULT_LANDING_PAGE_CONFIG } from '../../types/landingPageEditor';

interface PremiumHeaderProps {
  onNavigate: (screen: PhaseAScreen) => void;
  onOpenDemo: () => void;
  config?: LandingPageConfig;
}

export const PremiumHeader: React.FC<PremiumHeaderProps> = ({ onNavigate, onOpenDemo, config = DEFAULT_LANDING_PAGE_CONFIG }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const headerCfg = config.header;
  const themeCfg = config.theme;

  const getIcon = () => {
    switch(headerCfg.logoIconType) {
      case 'shield': return <Shield className="w-5 h-5 text-white" />;
      case 'building': return <Building2 className="w-5 h-5 text-white" />;
      case 'layers': return <Layers className="w-5 h-5 text-white" />;
      case 'monitor':
      default: return <MonitorSmartphone className="w-5 h-5 text-white" />;
    }
  };

  const headerBgClass = () => {
    if (isScrolled) return 'bg-[#060B19]/80 backdrop-blur-xl border-b border-white/5 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.1)]';
    switch (themeCfg.headerBackground) {
      case 'solid-dark': return 'bg-[#060B19] py-5 border-b border-slate-800';
      case 'transparent': return 'bg-transparent py-5 border-transparent';
      case 'blur-dark':
      default: return 'bg-[#060B19]/90 backdrop-blur-md py-5 border-b border-slate-800/60';
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    setActiveDropdown(null);
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks = [
    { 
      label: 'Product', 
      path: '/workforce-management',
      subLinks: [
        { label: 'Workforce', path: '/workforce-management' },
        { label: 'Attendance', path: '/attendance-management' },
        { label: 'Operations', path: '/facility-management' },
        { label: 'Assets', path: '/assets' },
        { label: 'Inventory', path: '/inventory' },
        { label: 'Payroll', path: '/payroll' },
        { label: 'Compliance', path: '/compliance' },
        { label: 'Analytics', path: '/reports-analytics' }
      ]
    },
    { 
      label: 'Solutions', 
      path: '/solutions/security-operations',
      subLinks: [
        { label: 'Security', path: '/solutions/security-operations' },
        { label: 'Facility Management', path: '/solutions/facility-management' },
        { label: 'Multi-Site Operations', path: '/solutions/multi-site' },
        { label: 'Industrial', path: '/solutions/industrial' },
        { label: 'Corporate', path: '/solutions/corporate' },
        { label: 'Contractors', path: '/solutions/contractors' }
      ]
    },
    { label: 'Features', path: '/features' },
    { label: 'Security', path: '/security' },
    { 
      label: 'Resources', 
      path: '/support',
      subLinks: [
        { label: 'FAQ', path: '/faq' },
        { label: 'Support', path: '/support' },
        { label: 'Documentation', path: '/documentation' },
        { label: 'Release Notes', path: '/release-notes' }
      ]
    },
    { 
      label: 'Company', 
      path: '/about',
      subLinks: [
        { label: 'About', path: '/about' },
        { label: 'Careers', path: '/careers' },
        { label: 'Contact', path: '/contact' },
        { label: 'Partners', path: '/partners' }
      ]
    },
    { label: 'Pricing', path: '/pricing' }
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${headerBgClass()}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <a href="/" onClick={(e) => handleLinkClick(e, '/')} className="flex items-center gap-3 cursor-pointer group focus:outline-none">
            {headerCfg.customLogoUrl ? (
              <img src={headerCfg.customLogoUrl} alt="Logo" className="h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:scale-105 transition-transform" style={{ backgroundImage: `linear-gradient(to bottom right, ${themeCfg.primaryColor}, ${themeCfg.secondaryColor})` }}>
                {getIcon()}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tight text-white leading-tight">
                {headerCfg.logoTitle}
              </span>
              <span className="font-bold text-sm tracking-widest text-blue-400 leading-tight" style={{ color: themeCfg.accentColor }}>
                {headerCfg.logoSubtitle}
              </span>
            </div>
          </a>

          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              link.subLinks ? (
                <div 
                  key={link.label} 
                  className="relative group"
                  onMouseEnter={() => setActiveDropdown(link.label)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <a 
                    href={link.path}
                    onClick={(e) => handleLinkClick(e, link.path)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {link.label}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === link.label ? 'rotate-180 text-white' : 'text-slate-500'}`} />
                  </a>
                  <AnimatePresence>
                    {activeDropdown === link.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 pt-2 w-56"
                      >
                        <div className="bg-[#0A1128] border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-1 backdrop-blur-xl">
                          {link.subLinks.map(sub => (
                            <a 
                              key={sub.label} 
                              href={sub.path}
                              onClick={(e) => handleLinkClick(e, sub.path)}
                              className="px-3 py-2 rounded-lg text-[13px] font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              {sub.label}
                            </a>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <a 
                  key={link.label} 
                  href={link.path}
                  onClick={(e) => handleLinkClick(e, link.path)}
                  className="px-3 py-2 rounded-lg text-[13px] font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {link.label}
                </a>
              )
            ))}
          </div>

          <div className="hidden lg:flex items-center space-x-3">
            <button 
              onClick={() => onNavigate('LOGIN')}
              className="text-[13px] font-bold text-slate-300 hover:text-white transition-colors px-4 py-2 border border-slate-700 hover:border-slate-500 rounded-lg hover:bg-white/5"
            >
              {headerCfg.loginButtonText}
            </button>
            <button 
              onClick={onOpenDemo}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[13px] font-bold px-5 py-2.5 rounded-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
              style={{ backgroundImage: `linear-gradient(to right, ${themeCfg.primaryColor}, ${themeCfg.secondaryColor})` }}
            >
              {headerCfg.ctaButtonText}
            </button>
          </div>

          <div className="lg:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-400 hover:text-white p-2">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: '100vh' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#060B19] fixed top-[60px] left-0 right-0 overflow-y-auto pb-24 border-t border-white/5"
          >
            <div className="px-4 py-6 flex flex-col gap-2">
              {navLinks.map(link => (
                <div key={link.label}>
                  {link.subLinks ? (
                    <div className="py-2">
                      <div className="font-bold text-slate-300 mb-2 px-2 uppercase text-xs tracking-wider text-blue-400">{link.label}</div>
                      <div className="pl-4 flex flex-col gap-1 border-l border-white/10 ml-2">
                        {link.subLinks.map(sub => (
                          <a 
                            key={sub.label} 
                            href={sub.path} 
                            onClick={(e) => handleLinkClick(e, sub.path)} 
                            className="text-sm font-medium text-slate-300 hover:text-white py-2"
                          >
                            {sub.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <a 
                      href={link.path} 
                      onClick={(e) => handleLinkClick(e, link.path)} 
                      className="block font-bold text-slate-300 hover:text-white py-3 px-2 uppercase text-xs tracking-wider text-blue-400"
                    >
                      {link.label}
                    </a>
                  )}
                </div>
              ))}
              
              <hr className="border-white/10 my-4" />
              
              <button 
                onClick={() => { setMobileMenuOpen(false); onNavigate('LOGIN'); }} 
                className="text-center font-bold text-white px-2 py-3 border border-slate-700 rounded-lg bg-white/5"
              >
                {headerCfg.loginButtonText}
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); onOpenDemo(); }} 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center font-bold px-6 py-3.5 rounded-lg w-full mt-2 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                style={{ backgroundImage: `linear-gradient(to right, ${themeCfg.primaryColor}, ${themeCfg.secondaryColor})` }}
              >
                {headerCfg.ctaButtonText}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

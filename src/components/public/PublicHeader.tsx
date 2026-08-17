import React, { useState, useEffect } from 'react';
import { ShieldCheck, Menu, X, ArrowRight, Sparkles, Building2, User } from 'lucide-react';
import { PhaseAScreen } from '../../types';

interface PublicHeaderProps {
  onNavigate: (screen: PhaseAScreen) => void;
  onRequestDemoClick: () => void;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  onNavigate,
  onRequestDemoClick
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Platform', href: '#platform' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'Domains', href: '#domains' },
    { label: 'Technology', href: '#technology' },
    { label: 'Security', href: '#security' },
    { label: 'Demo', href: '#demo' },
    { label: 'Use Cases', href: '#solutions' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' }
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#FBFBFA]/90 backdrop-blur-md border-b border-[#E8E7E3] py-3.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]' 
          : 'bg-[#FBFBFA]/70 backdrop-blur-sm border-b border-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo: Clean Editorial Monogram */}
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#0A0D14] flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
              <span className="font-display font-bold text-sm tracking-wider text-emerald-400">LM</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-base tracking-tight text-[#0A0D14] leading-none">
                LOG SHEET MUSTER
              </span>
              <span className="text-[10px] font-body font-medium text-[#71717A] tracking-wider uppercase mt-1">
                Enterprise Operations OS
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleScrollTo(e, item.href)}
                className="font-body text-xs font-semibold text-[#52525B] hover:text-[#0A0D14] transition-colors py-1 relative group tracking-wide"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#0A0D14] transition-all duration-200 group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => onNavigate('LOGIN')}
              className="px-4 py-2 text-xs font-semibold font-body text-[#0A0D14] hover:text-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>

            <button
              onClick={onRequestDemoClick}
              className="px-4 py-2 rounded-lg bg-[#0A0D14] hover:bg-[#18221E] text-white text-xs font-bold font-body transition-all duration-200 shadow-xs flex items-center gap-2 cursor-pointer group"
            >
              <span>Request Demo</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={() => onNavigate('LOGIN')}
              className="px-3 py-1.5 text-xs font-semibold font-body text-[#0A0D14] border border-[#E8E7E3] rounded-lg"
            >
              Login
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#0A0D14] hover:bg-[#F4F3EF] transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FBFBFA] border-b border-[#E8E7E3] px-6 py-6 space-y-4 shadow-xl">
          <div className="grid grid-cols-2 gap-3 pb-4 border-b border-[#E8E7E3]">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleScrollTo(e, item.href)}
                className="font-body text-xs font-semibold text-[#52525B] hover:text-[#0A0D14] py-1.5 block"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => { setMobileMenuOpen(false); onNavigate('LOGIN'); }}
              className="w-full py-2.5 rounded-lg border border-[#E8E7E3] text-xs font-bold font-body text-[#0A0D14] text-center"
            >
              Sign In to Workstation
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onRequestDemoClick(); }}
              className="w-full py-2.5 rounded-lg bg-[#0A0D14] text-white text-xs font-bold font-body text-center flex items-center justify-center gap-2"
            >
              <span>Request a Demo</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

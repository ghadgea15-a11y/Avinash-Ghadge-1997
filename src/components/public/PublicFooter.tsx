import React from 'react';
import { ShieldCheck, ArrowUp, Mail, Phone, MapPin, Globe2 } from 'lucide-react';
import { PhaseAScreen } from '../../types';

interface PublicFooterProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onNavigate }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0A0D14] text-white border-t border-[#18181B] pt-16 pb-12 font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Main Footer Links Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 pb-12 border-b border-[#1F2937]">
          
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <span className="font-display font-bold text-xs">LM</span>
              </div>
              <span className="font-display font-bold text-base tracking-tight text-white">
                LOG SHEET MUSTER
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              The unified operational operating system connecting enterprise workforce management, facility log sheets, security patrol muster, and statutory compliance.
            </p>
            <div className="pt-2 text-xs text-slate-400 font-mono">
              <span>A product by </span>
              <strong className="text-white">Shourya Enterprises Pvt. Ltd.</strong>
            </div>
          </div>

          {/* Col 1: Platform */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase font-bold text-emerald-400 tracking-wider">
              PLATFORM
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#platform" className="hover:text-white transition-colors">Operating System</a></li>
              <li><a href="#architecture" className="hover:text-white transition-colors">Architecture</a></li>
              <li><a href="#capabilities" className="hover:text-white transition-colors">Core Disciplines</a></li>
              <li><a href="#domains" className="hover:text-white transition-colors">14 Enterprise Domains</a></li>
              <li><a href="#technology" className="hover:text-white transition-colors">Web + Android</a></li>
            </ul>
          </div>

          {/* Col 2: Solutions */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase font-bold text-emerald-400 tracking-wider">
              SOLUTIONS
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#solutions" className="hover:text-white transition-colors">Facility Management</a></li>
              <li><a href="#solutions" className="hover:text-white transition-colors">Security Agencies</a></li>
              <li><a href="#solutions" className="hover:text-white transition-colors">Industrial Plants</a></li>
              <li><a href="#solutions" className="hover:text-white transition-colors">Corporate Campuses</a></li>
              <li><a href="#solutions" className="hover:text-white transition-colors">Warehousing</a></li>
            </ul>
          </div>

          {/* Col 3: Security & Governance */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase font-bold text-emerald-400 tracking-wider">
              GOVERNANCE
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#security" className="hover:text-white transition-colors">Security Architecture</a></li>
              <li><a href="#security" className="hover:text-white transition-colors">Tenant Isolation</a></li>
              <li><a href="#security" className="hover:text-white transition-colors">Form II Statutory Muster</a></li>
              <li><a href="#security" className="hover:text-white transition-colors">Audit Ledgers</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Col 4: Portals */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase font-bold text-emerald-400 tracking-wider">
              PORTALS
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button 
                  onClick={() => onNavigate('LOGIN')} 
                  className="hover:text-emerald-400 transition-colors text-left cursor-pointer font-bold text-white"
                >
                  Workstation Login &rarr;
                </button>
              </li>
              <li><a href="#demo" className="hover:text-white transition-colors">Interactive Sandbox</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Schedule Demo</a></li>
              <li><a href="#about" className="hover:text-white transition-colors">Company Story</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <div>
            &copy; {new Date().getFullYear()} Log Sheet Muster &bull; Shourya Enterprises Pvt. Ltd. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>PUNE, MAHARASHTRA</span>
            <button
              onClick={scrollToTop}
              className="p-2 rounded-lg bg-[#1F2937] hover:bg-[#374151] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Scroll to top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

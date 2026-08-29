import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { MonitorSmartphone, ArrowRight } from 'lucide-react';

interface PremiumFooterProps {
  onNavigate: (screen: PhaseAScreen) => void;
  onOpenDemo: () => void;
}

export const PremiumFooter: React.FC<PremiumFooterProps> = ({ onNavigate, onOpenDemo }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#060B19] border-t border-white/5 pt-24 pb-12 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[800px] h-[300px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-8 gap-y-12 pb-16">
          
          {/* Brand & Contact */}
          <div className="col-span-2 lg:col-span-2 space-y-6">
            <a href="/" onClick={(e) => handleLinkClick(e, '/')} className="flex items-center gap-3 cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <MonitorSmartphone className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight text-white leading-tight">LOG SHEET</span>
                <span className="font-bold text-sm tracking-widest text-blue-400 leading-tight">MUSTER</span>
              </div>
            </a>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              The unified operational operating system connecting enterprise workforce management, facility log sheets, security patrol muster, and statutory labor compliance.
            </p>
            <div className="space-y-2 text-sm text-slate-400">
              <p>Developed by <strong className="text-white">Shourya Enterprises Pvt. Ltd.</strong></p>
              <p>Founder: <span className="text-slate-300">Avinash Shivaji Ghadge</span></p>
              <p>HQ: <span className="text-slate-300">Ajanthanagar, Chinchwad, Pune, MH 411019</span></p>
              <p>Email: <a href="mailto:ghadgea162@gmail.com" className="text-blue-400 hover:text-blue-300 transition-colors">ghadgea162@gmail.com</a></p>
              <p>Phone: <a href="tel:+919096345456" className="text-blue-400 hover:text-blue-300 transition-colors">+91-9096345456</a></p>
            </div>
            <button 
              onClick={onOpenDemo}
              className="inline-flex items-center gap-2 text-sm font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-lg transition-colors mt-4"
            >
              Request Live Demo
              <ArrowRight className="w-4 h-4 text-blue-400" />
            </button>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-black tracking-widest text-white uppercase">Product</h4>
            <ul className="space-y-3">
              {['Workforce', 'Attendance', 'Operations', 'Assets', 'Inventory', 'Payroll', 'Compliance', 'Analytics'].map(item => (
                <li key={item}>
                  <a href={`/${item.toLowerCase().replace(' ', '-')}`} onClick={(e) => handleLinkClick(e, `/${item.toLowerCase().replace(' ', '-')}`)} className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-black tracking-widest text-white uppercase">Solutions</h4>
            <ul className="space-y-3">
              {[
                { label: 'Security', path: '/solutions/security' },
                { label: 'Facility Management', path: '/solutions/facility-management' },
                { label: 'Multi-Site Operations', path: '/solutions/multi-site' },
                { label: 'Industrial', path: '/solutions/industrial' },
                { label: 'Corporate', path: '/solutions/corporate' },
                { label: 'Contractors', path: '/solutions/contractors' }
              ].map(item => (
                <li key={item.label}>
                  <a href={item.path} onClick={(e) => handleLinkClick(e, item.path)} className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-black tracking-widest text-white uppercase">Company</h4>
            <ul className="space-y-3">
              {['About', 'Careers', 'Contact', 'Partners'].map(item => (
                <li key={item}>
                  <a href={`/${item.toLowerCase()}`} onClick={(e) => handleLinkClick(e, `/${item.toLowerCase()}`)} className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources & Legal */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black tracking-widest text-white uppercase">Resources</h4>
              <ul className="space-y-3">
                {['FAQ', 'Support', 'Documentation', 'Release Notes'].map(item => (
                  <li key={item}>
                    <a href={`/${item.toLowerCase().replace(' ', '-')}`} onClick={(e) => handleLinkClick(e, `/${item.toLowerCase().replace(' ', '-')}`)} className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Log Sheet Muster &bull; Shourya Enterprises Pvt. Ltd. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {[
              { label: 'Privacy', path: '/legal/privacy' },
              { label: 'Terms', path: '/legal/terms' },
              { label: 'Cookies', path: '/legal/cookies' },
              { label: 'Acceptable Use', path: '/legal/acceptable-use' },
              { label: 'Data Protection', path: '/legal/data-protection' },
              { label: 'Demo Terms', path: '/legal/demo-terms' },
            ].map(item => (
              <a key={item.label} href={item.path} onClick={(e) => handleLinkClick(e, item.path)} className="text-xs text-slate-500 hover:text-white transition-colors">
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

import React, { useState } from 'react';
import { 
  MonitorSmartphone, 
  Menu, 
  X, 
  ChevronRight, 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  Clock, 
  Building2, 
  BarChart3, 
  Lock, 
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { SEO_REGISTRY, PageBreadcrumb, COMPANY_INFO } from '../../utils/seo';

interface PublicPageLayoutProps {
  currentPath: string;
  onNavigate: (screen: PhaseAScreen) => void;
  children: React.ReactNode;
  breadcrumbs?: PageBreadcrumb[];
  primaryH1?: string;
  categoryBadge?: string;
}

export const PublicPageLayout: React.FC<PublicPageLayoutProps> = ({
  currentPath,
  onNavigate,
  children,
  breadcrumbs,
  primaryH1,
  categoryBadge
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks = [
    { label: 'Overview', path: '/' },
    { 
      label: 'HRMS Suite', 
      path: '/hrms',
      subLinks: [
        { label: 'HRMS Overview', path: '/hrms' },
        { label: 'Employee Master & KYC', path: '/employee-management' },
        { label: 'Form II Attendance Muster', path: '/attendance-management' },
        { label: 'Leave Administration', path: '/leave-management' },
        { label: 'Statutory Payroll Engine', path: '/payroll' },
        { label: '24/7 Shift Rosters', path: '/shift-management' },
        { label: 'Employee Self-Service (ESS)', path: '/employee-self-service' }
      ]
    },
    { 
      label: 'Operations', 
      path: '/workforce-management',
      subLinks: [
        { label: 'Workforce Management (WFM)', path: '/workforce-management' },
        { label: 'Facility Log Sheets & Work Orders', path: '/facility-management' },
        { label: 'Guard Patrols & QR Checkpoints', path: '/security-management' },
        { label: 'Compliance & Audit Registers', path: '/compliance' },
        { label: 'Reports & Analytics', path: '/reports-analytics' }
      ]
    },
    { label: 'Features', path: '/features' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Security', path: '/security' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col text-[#0A0D14] font-body selection:bg-[#0A0D14] selection:text-white antialiased">
      
      {/* Top Announcement & Compliance Strip */}
      <aside aria-label="Announcement" className="bg-[#0A0D14] text-slate-300 text-xs py-2 px-4 border-b border-[#18181B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-white font-medium">Log Sheet Muster Enterprise:</span>
            <span>Automated Form II Muster, QR Patrols & Statutory Payroll Engine</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-slate-400">Pune, Maharashtra</span>
            <a 
              href="/contact" 
              onClick={(e) => handleLinkClick(e, '/contact')}
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2"
            >
              Request Enterprise Demo &rarr;
            </a>
          </div>
        </div>
      </aside>

      {/* Semantic Global Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#E8E7E3] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo & Title */}
          <a 
            href="/" 
            onClick={(e) => handleLinkClick(e, '/')}
            className="flex items-center gap-3 group focus:outline-none"
            aria-label="Log Sheet Muster Home"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0A0D14] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <MonitorSmartphone className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-xl tracking-tight text-[#0A0D14] leading-none">
                  Log Sheet
                </span>
                <span className="font-display font-bold text-xl tracking-tight text-emerald-600 leading-none">
                  Muster
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
                by Shourya Enterprises
              </span>
            </div>
          </a>

          {/* Desktop Navigation Menu */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const isCurrent = currentPath === link.path || (link.subLinks && link.subLinks.some(s => s.path === currentPath));
              
              if (link.subLinks) {
                return (
                  <div 
                    key={link.path}
                    className="relative group"
                    onMouseEnter={() => setActiveDropdown(link.label)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <a
                      href={link.path}
                      onClick={(e) => handleLinkClick(e, link.path)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                        isCurrent ? 'text-emerald-700 bg-emerald-50/60 font-semibold' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/60'
                      }`}
                    >
                      {link.label}
                      <ChevronRight className="w-3.5 h-3.5 rotate-90 text-slate-400 group-hover:text-slate-600 transition-transform" />
                    </a>

                    {/* Dropdown Menu */}
                    <div className="absolute top-full left-0 w-64 pt-2 hidden group-hover:block z-50">
                      <div className="bg-white border border-[#E8E7E3] rounded-xl shadow-xl p-2 space-y-1">
                        {link.subLinks.map((sub) => (
                          <a
                            key={sub.path}
                            href={sub.path}
                            onClick={(e) => handleLinkClick(e, sub.path)}
                            className={`block px-3 py-2 text-xs rounded-lg transition-colors ${
                              currentPath === sub.path 
                                ? 'bg-emerald-50 text-emerald-800 font-bold' 
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            {sub.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <a
                  key={link.path}
                  href={link.path}
                  onClick={(e) => handleLinkClick(e, link.path)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent ? 'text-emerald-700 bg-emerald-50/60 font-semibold' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/60'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => onNavigate('LOGIN')}
              className="px-4 py-2 text-xs font-bold font-mono tracking-wider uppercase rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            >
              Sign In
            </button>
            <a
              href="/contact"
              onClick={(e) => handleLinkClick(e, '/contact')}
              className="px-4 py-2 text-xs font-bold font-mono tracking-wider uppercase rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              Request Demo
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <nav aria-label="Mobile Navigation" className="lg:hidden bg-white border-b border-[#E8E7E3] px-4 pt-2 pb-6 space-y-2 shadow-lg">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <div key={link.path}>
                  <a
                    href={link.path}
                    onClick={(e) => handleLinkClick(e, link.path)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                      currentPath === link.path ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {link.label}
                  </a>
                  {link.subLinks && (
                    <div className="pl-4 space-y-1 mt-1 border-l-2 border-slate-100 ml-3">
                      {link.subLinks.map((sub) => (
                        <a
                          key={sub.path}
                          href={sub.path}
                          onClick={(e) => handleLinkClick(e, sub.path)}
                          className={`block px-2.5 py-1.5 rounded text-xs ${
                            currentPath === sub.path ? 'text-emerald-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {sub.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigate('LOGIN');
                }}
                className="w-full py-2.5 text-center text-xs font-bold font-mono uppercase rounded-xl border border-slate-300 bg-white text-slate-800"
              >
                Workstation Sign In
              </button>
              <a
                href="/contact"
                onClick={(e) => handleLinkClick(e, '/contact')}
                className="w-full py-2.5 text-center text-xs font-bold font-mono uppercase rounded-xl bg-[#0A0D14] text-white flex items-center justify-center gap-2"
              >
                Schedule Live Demo
              </a>
            </div>
          </nav>
        )}
      </header>

      {/* Semantic Breadcrumbs Bar */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="bg-[#F4F3EF] border-b border-[#E8E7E3] py-2.5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center flex-wrap gap-2 text-xs text-slate-600 font-mono">
            {breadcrumbs.map((bc, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={bc.item}>
                  {idx > 0 && <span className="text-slate-400">/</span>}
                  {isLast ? (
                    <span className="text-slate-900 font-bold" aria-current="page">
                      {bc.name}
                    </span>
                  ) : (
                    <a
                      href={bc.item.replace('https://logsheetmuster.online', '') || '/'}
                      onClick={(e) => handleLinkClick(e, bc.item.replace('https://logsheetmuster.online', '') || '/')}
                      className="hover:text-emerald-700 hover:underline"
                    >
                      {bc.name}
                    </a>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main Page Content */}
      <main id="main-content" className="flex-1 w-full">
        {children}
      </main>

      {/* Reusable Topic Cluster Navigation Strip */}
      <section aria-labelledby="topic-cluster-heading" className="bg-[#F4F3EF] border-t border-[#E8E7E3] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E0DED7] pb-4">
            <div>
              <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-widest">
                INTERNAL PLATFORM ECOSYSTEM
              </span>
              <h2 id="topic-cluster-heading" className="text-xl font-display font-bold text-[#0A0D14] mt-1">
                Explore Connected Operational Capabilities
              </h2>
            </div>
            <p className="text-xs text-slate-600 max-w-md">
              Log Sheet Muster is architected as an integrated single source of truth across workforce, security, and facility disciplines.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { title: 'HRMS Software', path: '/hrms', desc: 'Human Capital & KYC' },
              { title: 'Employee Directory', path: '/employee-management', desc: 'Master KYC & IDs' },
              { title: 'Form II Attendance', path: '/attendance-management', desc: 'Statutory Muster' },
              { title: 'Leave Approvals', path: '/leave-management', desc: 'Multi-Tier Chains' },
              { title: 'Statutory Payroll', path: '/payroll', desc: 'PF, ESI & PT Engine' },
              { title: 'Shift Rosters', path: '/shift-management', desc: '24/7 Scheduling' },
              { title: 'Workforce (WFM)', path: '/workforce-management', desc: 'Deployment & Roster' },
              { title: 'Facility Logs', path: '/facility-management', desc: 'PPM & Work Orders' },
              { title: 'Guard Patrols', path: '/security-management', desc: 'QR Checkpoints' },
              { title: 'Self-Service ESS', path: '/employee-self-service', desc: 'Mobile Employee App' },
              { title: 'Reports & MIS', path: '/reports-analytics', desc: 'Executive Analytics' },
              { title: 'Labor Compliance', path: '/compliance', desc: 'Form II Registers' },
            ].map((topic) => (
              <a
                key={topic.path}
                href={topic.path}
                onClick={(e) => handleLinkClick(e, topic.path)}
                className={`p-3.5 rounded-xl border transition-all ${
                  currentPath === topic.path 
                    ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500' 
                    : 'bg-white/80 border-[#E8E7E3] hover:border-slate-400 hover:bg-white'
                }`}
              >
                <div className="text-xs font-bold text-[#0A0D14] flex items-center justify-between">
                  <span>{topic.title}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">{topic.desc}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Semantic Global Footer */}
      <footer className="bg-[#0A0D14] text-white border-t border-[#18181B] pt-16 pb-12 font-body">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 pb-12 border-b border-[#1F2937]">
            
            {/* Col 1 & 2: Brand Story & Company Details */}
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
                The unified operational operating system connecting enterprise workforce management, facility log sheets, security patrol muster, and statutory labor compliance.
              </p>
              
              <div className="pt-2 text-xs text-slate-400 font-mono space-y-1">
                <div>Developed by <strong className="text-white">Shourya Enterprises Pvt. Ltd.</strong></div>
                <div>Founder: <span className="text-slate-300">Avinash Shivaji Ghadge</span></div>
                <div>Headquarters: <span className="text-slate-300">Ajanthanagar, Chinchwad, Pune, MH 411019</span></div>
                <div>Email: <a href="mailto:ghadgea162@gmail.com" className="text-emerald-400 hover:underline">ghadgea162@gmail.com</a></div>
                <div>Contact: <a href="tel:+919096345456" className="text-emerald-400 hover:underline">+91-9096345456</a></div>
              </div>
            </div>

            {/* Col 3: HRMS & Workforce */}
            <div className="space-y-3">
              <h3 className="font-mono text-[11px] uppercase font-bold text-emerald-400 tracking-wider">
                HRMS SUITE
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="/hrms" onClick={(e) => handleLinkClick(e, '/hrms')} className="hover:text-white transition-colors">HRMS Overview</a></li>
                <li><a href="/employee-management" onClick={(e) => handleLinkClick(e, '/employee-management')} className="hover:text-white transition-colors">Employee Master</a></li>
                <li><a href="/attendance-management" onClick={(e) => handleLinkClick(e, '/attendance-management')} className="hover:text-white transition-colors">Attendance Muster</a></li>
                <li><a href="/leave-management" onClick={(e) => handleLinkClick(e, '/leave-management')} className="hover:text-white transition-colors">Leave Management</a></li>
                <li><a href="/payroll" onClick={(e) => handleLinkClick(e, '/payroll')} className="hover:text-white transition-colors">Statutory Payroll</a></li>
                <li><a href="/shift-management" onClick={(e) => handleLinkClick(e, '/shift-management')} className="hover:text-white transition-colors">24/7 Shift Rosters</a></li>
              </ul>
            </div>

            {/* Col 4: Operations & Security */}
            <div className="space-y-3">
              <h3 className="font-mono text-[11px] uppercase font-bold text-emerald-400 tracking-wider">
                OPERATIONS
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="/workforce-management" onClick={(e) => handleLinkClick(e, '/workforce-management')} className="hover:text-white transition-colors">Workforce Management</a></li>
                <li><a href="/facility-management" onClick={(e) => handleLinkClick(e, '/facility-management')} className="hover:text-white transition-colors">Facility Log Sheets</a></li>
                <li><a href="/security-management" onClick={(e) => handleLinkClick(e, '/security-management')} className="hover:text-white transition-colors">Guard Patrol Muster</a></li>
                <li><a href="/employee-self-service" onClick={(e) => handleLinkClick(e, '/employee-self-service')} className="hover:text-white transition-colors">Self-Service ESS</a></li>
                <li><a href="/compliance" onClick={(e) => handleLinkClick(e, '/compliance')} className="hover:text-white transition-colors">Form II Compliance</a></li>
                <li><a href="/reports-analytics" onClick={(e) => handleLinkClick(e, '/reports-analytics')} className="hover:text-white transition-colors">Reports & Analytics</a></li>
              </ul>
            </div>

            {/* Col 5: Governance & Trust */}
            <div className="space-y-3">
              <h3 className="font-mono text-[11px] uppercase font-bold text-emerald-400 tracking-wider">
                GOVERNANCE
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="/security" onClick={(e) => handleLinkClick(e, '/security')} className="hover:text-white transition-colors">Security Architecture</a></li>
                <li><a href="/privacy" onClick={(e) => handleLinkClick(e, '/privacy')} className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" onClick={(e) => handleLinkClick(e, '/terms')} className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/pricing" onClick={(e) => handleLinkClick(e, '/pricing')} className="hover:text-white transition-colors">Pricing & Plans</a></li>
                <li><a href="/about" onClick={(e) => handleLinkClick(e, '/about')} className="hover:text-white transition-colors">About Shourya</a></li>
                <li><a href="/contact" onClick={(e) => handleLinkClick(e, '/contact')} className="hover:text-white transition-colors">Contact Support</a></li>
              </ul>
            </div>

            {/* Col 6: Workstation Portal */}
            <div className="space-y-3">
              <h3 className="font-mono text-[11px] uppercase font-bold text-emerald-400 tracking-wider">
                PORTAL ACCESS
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <button 
                    onClick={() => onNavigate('LOGIN')} 
                    className="hover:text-emerald-400 transition-colors text-left cursor-pointer font-bold text-white flex items-center gap-1"
                  >
                    Enterprise Login &rarr;
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onNavigate('COMPANY_CODE')} 
                    className="hover:text-emerald-400 transition-colors text-left cursor-pointer text-slate-300"
                  >
                    Company Verification
                  </button>
                </li>
                <li><a href="/contact" onClick={(e) => handleLinkClick(e, '/contact')} className="hover:text-white transition-colors">Schedule Live Demo</a></li>
                <li><a href="/features" onClick={(e) => handleLinkClick(e, '/features')} className="hover:text-white transition-colors">Architecture Guide</a></li>
              </ul>
            </div>

          </div>

          {/* Bottom Bar: Copyright & Location */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
            <div>
              &copy; {new Date().getFullYear()} Log Sheet Muster &bull; Shourya Enterprises Pvt. Ltd. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>PUNE, MAHARASHTRA, INDIA</span>
              <a 
                href="/privacy" 
                onClick={(e) => handleLinkClick(e, '/privacy')} 
                className="hover:text-slate-300 transition-colors"
              >
                Privacy
              </a>
              <span>&bull;</span>
              <a 
                href="/terms" 
                onClick={(e) => handleLinkClick(e, '/terms')} 
                className="hover:text-slate-300 transition-colors"
              >
                Terms
              </a>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

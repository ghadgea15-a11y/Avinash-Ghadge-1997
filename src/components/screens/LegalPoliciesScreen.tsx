import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Lock, 
  Cookie, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Download, 
  ExternalLink,
  ChevronRight,
  Building,
  Mail,
  MapPin,
  Scale
} from 'lucide-react';
import { AppLogo } from '../common/AppLogo';
import { useTheme } from '../../context/ThemeContext';
import { PhaseAScreen } from '../../types';

export type LegalPolicyTab = 
  | 'PRIVACY' 
  | 'DPA' 
  | 'COOKIE' 
  | 'REFUND' 
  | 'AUP' 
  | 'GOVERNANCE';

interface LegalPoliciesScreenProps {
  onNavigate: (screen: PhaseAScreen) => void;
  initialTab?: LegalPolicyTab;
}

export const LegalPoliciesScreen: React.FC<LegalPoliciesScreenProps> = ({ 
  onNavigate, 
  initialTab = 'PRIVACY' 
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<LegalPolicyTab>(initialTab);

  const policySections: { id: LegalPolicyTab; title: string; subtitle: string; icon: any }[] = [
    { id: 'PRIVACY', title: 'Privacy Policy', subtitle: 'User personal data & compliance', icon: ShieldCheck },
    { id: 'DPA', title: 'Data Processing Agreement', subtitle: 'Customer & enterprise contract terms', icon: FileText },
    { id: 'COOKIE', title: 'Cookie & Analytics Policy', subtitle: 'Session cookies & web analytics', icon: Cookie },
    { id: 'REFUND', title: 'Refund & Subscriptions', subtitle: 'Commercial tiers, billing & refunds', icon: CreditCard },
    { id: 'AUP', title: 'Acceptable Use Policy', subtitle: 'Prohibited actions, GPS & abuse rules', icon: Lock },
    { id: 'GOVERNANCE', title: 'Legal Governance', subtitle: 'Indian jurisdiction & severability', icon: Scale },
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans transition-colors duration-300`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-30 border-b ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'} backdrop-blur px-4 lg:px-8 py-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('LANDING')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700' 
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-200'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Portal</span>
          </button>
          
          <div className="h-4 w-px bg-slate-700/50 hidden sm:block" />
          
          <div className="flex items-center gap-2.5">
            <AppLogo size="sm" showSubtitle={false} />
            <div className="hidden sm:block">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 font-mono">Legal Center</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="hidden md:inline-block text-slate-500 font-mono text-[11px]">
            Platform: Log Sheet Muster (LSM)
          </span>
          <button
            onClick={() => onNavigate('SIGN_UP')}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-sm"
          >
            Register / Login
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-80 shrink-0 space-y-2">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} mb-4`}>
            <div className="flex items-center gap-2.5 text-indigo-500 mb-1">
              <Scale className="w-5 h-5" />
              <h2 className="text-sm font-bold tracking-tight">Compliance & Legal Pack</h2>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Shourya Enterprises Pvt. Ltd. regulatory compliance framework for Log Sheet Muster enterprise deployment.
            </p>
          </div>

          <nav className="space-y-1.5">
            {policySections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveTab(sec.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? isDark
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-300 font-semibold shadow-sm'
                        : 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold shadow-sm'
                      : isDark
                        ? 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-indigo-600 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs truncate">{sec.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{sec.subtitle}</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-indigo-500 translate-x-0.5' : 'text-slate-600 opacity-50'}`} />
                </button>
              );
            })}
          </nav>

          {/* Company Details Box */}
          <div className={`mt-6 p-4 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100 border-slate-200'} text-xs space-y-2.5`}>
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-[11px] uppercase tracking-wider font-mono">
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              <span>Service Provider</span>
            </div>
            <p className="font-semibold text-slate-200">Shourya Enterprises Pvt. Ltd.</p>
            <div className="space-y-1 text-[11px] text-slate-400 font-mono">
              <p className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500 mt-0.5" />
                <span>Ajanthanagar, Chinchwad, Pune, Maharashtra - 411019, India</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                <span>ghadgea162@gmail.com</span>
              </p>
            </div>
          </div>
        </div>

        {/* Content View */}
        <div className={`flex-1 p-6 sm:p-8 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'} overflow-y-auto leading-relaxed`}>
          
          {/* Top Metadata */}
          <div className="border-b border-slate-800/80 pb-4 mb-6 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
            <div>
              <span className="text-indigo-400 font-semibold">Entity:</span> Shourya Enterprises Pvt. Ltd. &bull; <span className="text-indigo-400 font-semibold">Platform:</span> Log Sheet Muster (LSM)
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Ver 2026.1</span>
              <span>Effective Date: 01/01/2026</span>
            </div>
          </div>

          {/* ================= PART 1: PRIVACY POLICY ================= */}
          {activeTab === 'PRIVACY' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">Part 1</span>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Privacy Policy</h1>
                <p className="text-xs text-slate-400">How personal and operational workforce information is collected, processed, and protected.</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">1. Introduction</h3>
                  <p>
                    <strong>Shourya Enterprises Pvt. Ltd.</strong> (“Company”, “we”, “us”, “our”) operates <strong>Log Sheet Muster (“LSM”)</strong>, an enterprise workforce, attendance, security, and workforce-management platform.
                  </p>
                  <p>
                    This Privacy Policy explains how personal information is collected, used, stored, protected, and disclosed when users access or use LSM. By using LSM, you acknowledge and agree to this Privacy Policy.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">2. Information We May Process</h3>
                  <p>Depending on the modules enabled by the Customer, LSM may process:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li><strong>Account Information:</strong> Name, Email address, Phone number, User ID, Employee ID, Authentication credentials, Role & permissions.</li>
                    <li><strong>Employment Information:</strong> Employee code, Department, Designation, Joining date, Employment status, Branch/site, Shift timings, Supervisor/manager hierarchy, Muster and attendance records.</li>
                    <li><strong>Identity / KYC Information:</strong> Government identification information, Masked identification numbers, PAN-related documents, KYC files, Profile photos (where collected for legitimate workforce purposes).</li>
                    <li><strong>Location Information:</strong> GPS coordinates for punch verification, Site geofences, Patrol checkpoint scans, Timestamps.</li>
                    <li><strong>Visitor Information:</strong> Visitor name, Host employee, Purpose of visit, Vehicle number, In/Out timestamp, Badge number.</li>
                    <li><strong>Security & Material Information:</strong> Incident reports, QR checkpoint activity, Gate-pass records, Material inward/outward records, System audit logs.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">3. Why We Process Information</h3>
                  <p>Information is processed solely to:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li>Authenticate authorized users and maintain tenant isolation.</li>
                    <li>Record real-time attendance, biometric/GPS punches, and shift rosters.</li>
                    <li>Manage security patrols, incident registers, and gate passes.</li>
                    <li>Generate tamper-proof reports, approval workflows, and audit trails.</li>
                    <li>Detect security anomalies, maintain platform reliability, and meet applicable statutory obligations.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">4. Customer-Controlled Data</h3>
                  <p>
                    For enterprise customers, employee, visitor, and operational data is supplied and controlled by the Customer. The Customer is responsible for obtaining required notices/consents, verifying data accuracy, and managing employee access delegation.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">5. Location Privacy</h3>
                  <p>
                    Device location is used strictly for attendance verification, geofencing, patrol route verification, and site security operations. Location collection operates only during duty/punch triggers and can be controlled via device settings.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">6. Firebase & Cloud Infrastructure</h3>
                  <p>
                    LSM leverages Google Firebase and enterprise Cloud infrastructure for Authentication, Firestore database storage, Cloud Storage for documents, and secure notification broadcasting under strict security rules.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">7. Data Security & Tenant Isolation</h3>
                  <p>
                    We employ Role-Based Access Control (RBAC), logical tenant isolation, encrypted transmission, immutable audit trails, and strict Firestore security rules. No customer or user is permitted access to another customer's data.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">8. Privacy Contact</h3>
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                    <p className="font-semibold text-white">Shourya Enterprises Pvt. Ltd.</p>
                    <p>Product: Log Sheet Muster (LSM)</p>
                    <p>Privacy Email: ghadgea162@gmail.com | Phone: +91 9096345456</p>
                    <p>Address: Ajanthanagar, Chinchwad, Pune, Maharashtra - 411019</p>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ================= PART 2: DPA ================= */}
          {activeTab === 'DPA' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">Part 2</span>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Data Processing & Customer Agreement</h1>
                <p className="text-xs text-slate-400">Enterprise data governance between Shourya Enterprises Pvt. Ltd. and Subscribing Customers.</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">1. Parties & Scope</h3>
                  <p>
                    This Agreement is between <strong>Shourya Enterprises Pvt. Ltd.</strong> (as the LSM Service Provider) and the organization subscribing to or using LSM (“Customer”).
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">2. Customer Data Ownership</h3>
                  <p>
                    The Customer retains full ownership of and intellectual property rights to all information submitted to LSM. The Customer authorizes Shourya Enterprises Pvt. Ltd. to process such information strictly as necessary to provide, maintain, support, and secure the Service.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">3. Customer Responsibilities</h3>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li>Obtain necessary employee/worker consents for attendance and location logging.</li>
                    <li>Maintain lawful processing practices and accurate staff records.</li>
                    <li>Promptly deactivate former employees and revoke administrative credentials upon role transitions.</li>
                    <li>Prevent sharing of master passwords or company secret keys.</li>
                    <li>Immediately notify Shourya Enterprises of any suspected credential compromises.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">4. Processor Safeguards</h3>
                  <p>
                    Shourya Enterprises Pvt. Ltd. commits to maintaining logical isolation across all company tenants, applying security patches, maintaining backup recovery protocols, and assisting with security inquiries.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">5. Subprocessors</h3>
                  <p>
                    LSM utilizes trusted infrastructure subprocessors including Google Cloud / Firebase (Hosting, Auth, Firestore, Storage) adhering to industry standard data integrity guidelines.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* ================= PART 3: COOKIE & ANALYTICS ================= */}
          {activeTab === 'COOKIE' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">Part 3</span>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Cookie & Analytics Policy</h1>
                <p className="text-xs text-slate-400">Technical details regarding browser storage, tokens, and telemetry.</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">1. Technologies Used</h3>
                  <p>
                    LSM uses browser local storage, session storage, and essential secure cookies to maintain active authentication sessions, theme preferences (Dark/Light mode), and tenant routing.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">2. Essential Technologies</h3>
                  <p>
                    Essential tokens are necessary for:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li>Session authorization & Firebase token renewal.</li>
                    <li>Offline-ready client caching for field punch logging.</li>
                    <li>Security timeout and PIN lock states on unattended terminals.</li>
                  </ul>
                  <p className="text-slate-400 text-xs">
                    Disabling essential local storage or cookies in your browser will prevent the application from maintaining authentication state.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">3. Operational Analytics</h3>
                  <p>
                    Diagnostic error logs and crash diagnostics may be captured to maintain server uptime, patch UI bugs, and preserve zero-downtime reliability across desktop and Android client apps.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* ================= PART 4: REFUND & SUBSCRIPTION ================= */}
          {activeTab === 'REFUND' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">Part 4</span>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Refund & Subscription Policy</h1>
                <p className="text-xs text-slate-400">Commercial billing tiers, renewals, cancellations, and refund guidelines.</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">1. Subscription Tiers</h3>
                  <p>LSM is made available under:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li><strong>Trial / Demo Tier:</strong> Restricted duration evaluation environment for new enterprise prospects.</li>
                    <li><strong>Starter Tier:</strong> Dedicated for small guard agencies or branch sites with core attendance and muster features.</li>
                    <li><strong>Professional Tier:</strong> Includes multi-site guard patrol, QR scanning, and shift management.</li>
                    <li><strong>Enterprise Tier:</strong> Custom module suites, unlimited branches, dedicated Super Admin provisioning, and SLA support.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">2. Billing & Taxes</h3>
                  <p>
                    Enterprise subscriptions are billed in advance (monthly or annually). Invoices include statutory Indian taxes including Goods and Services Tax (GST) where applicable.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">3. Cancellation & Refunds</h3>
                  <p>
                    Subscriptions may be cancelled prior to the next billing cycle. Because software licensing resources and database capacity are provisioned immediately upon account activation, fees for elapsed billing cycles are non-refundable unless expressly specified in a separate signed SLA.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">4. Billing Support Contact</h3>
                  <p>
                    For billing inquiries, tax invoices, or subscription adjustments, contact: <span className="font-mono text-indigo-400">ghadgea162@gmail.com</span> / <span className="font-mono text-indigo-400">+91 9096345456</span>.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* ================= PART 5: ACCEPTABLE USE ================= */}
          {activeTab === 'AUP' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">Part 5</span>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Acceptable Use Policy (AUP)</h1>
                <p className="text-xs text-slate-400">Mandatory security rules and strictly prohibited activities across the LSM platform.</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">1. Prohibited Security Activities</h3>
                  <p>Users, administrators, and field staff are strictly prohibited from:</p>
                  <ul className="list-disc pl-5 space-y-1 text-rose-300">
                    <li>Attempting unauthorized access, privilege escalation, or role spoofing.</li>
                    <li>Manipulating companyId, tenant identifiers, or Firestore tokens.</li>
                    <li>Attacking Firebase database endpoints, deploying bots, or initiating denial-of-service attempts.</li>
                    <li>Sharing administrative passwords or master PIN codes across multiple personnel.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">2. Attendance & GPS Integrity</h3>
                  <p>Field officers, supervisors, and guards must not:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li>Submit simulated, spoofed, or mocked GPS coordinates.</li>
                    <li>Falsify muster headcounts, QR patrol checkpoints, or gate logs.</li>
                    <li>Punch attendance on behalf of another individual (proxy punching).</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">3. Responsible Vulnerability Disclosure</h3>
                  <p>
                    If you discover a potential vulnerability or security flaw, please notify our security response team immediately at <span className="font-mono text-indigo-400">ghadgea162@gmail.com</span> before disclosing publicly.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">4. Enforcement & Termination</h3>
                  <p>
                    Violations of this Acceptable Use Policy may result in immediate credential revocation, account suspension, enterprise audit notification, and legal action where statutory fraud is detected.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* ================= PART 6: LEGAL GOVERNANCE ================= */}
          {activeTab === 'GOVERNANCE' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">Part 6</span>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Legal Governance & Jurisdiction</h1>
                <p className="text-xs text-slate-400">Governing law, jurisdiction, and legal enforceability.</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">1. Governing Law</h3>
                  <p>
                    These policies and all interactions with the Log Sheet Muster platform are governed by the substantive laws of <strong>India</strong>, including the Information Technology Act, 2000 and applicable digital privacy regulations.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">2. Jurisdiction</h3>
                  <p>
                    Any disputes, actions, or claims arising under these policies shall be subject to the exclusive jurisdiction of the competent courts in <strong>Pune, Maharashtra, India</strong>.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">3. Severability & Precedence</h3>
                  <p>
                    If any provision of this Policy Pack is found invalid or unenforceable by a court of competent jurisdiction, the remaining provisions shall remain in full force and effect. A separately executed enterprise contract between Shourya Enterprises Pvt. Ltd. and the Customer will prevail over conflicting online terms to the extent expressly stated.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">4. Registered Office & Communications</h3>
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs space-y-1.5 font-mono">
                    <p className="font-bold text-white font-sans text-sm">Shourya Enterprises Pvt. Ltd.</p>
                    <p>Log Sheet Muster &bull; Smart Workforce & Security Platform</p>
                    <p>Address: Ajanthanagar, Chinchwad, Pune, Maharashtra - 411019, India</p>
                    <p>Official Website: https://logsheetmuster.online</p>
                    <p>Contact: +91 9096345456 / +91 8793619611 | Email: ghadgea162@gmail.com</p>
                  </div>
                </section>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Footer */}
      <footer className={`border-t ${isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-500'} py-6 px-4 text-center text-xs font-mono`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Shourya Enterprises Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveTab('PRIVACY')} className="hover:text-indigo-400 transition">Privacy</button>
            <button onClick={() => setActiveTab('DPA')} className="hover:text-indigo-400 transition">DPA</button>
            <button onClick={() => setActiveTab('COOKIE')} className="hover:text-indigo-400 transition">Cookies</button>
            <button onClick={() => setActiveTab('REFUND')} className="hover:text-indigo-400 transition">Refunds</button>
            <button onClick={() => setActiveTab('AUP')} className="hover:text-indigo-400 transition">Acceptable Use</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

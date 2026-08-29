const fs = require('fs');

const content = `
const AnimatedProductShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    { title: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { title: 'Workforce', icon: <Users className="w-4 h-4" /> },
    { title: 'Security Patrol', icon: <ShieldCheck className="w-4 h-4" /> }
  ];

  return (
    <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-4 text-white">Experience the Interface</h2>
          <p className="text-slate-400 text-lg">Clean, responsive, and designed for operational speed.</p>
        </div>

        <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden max-w-5xl mx-auto">
          {/* Mock Browser/App Header */}
          <div className="flex border-b border-slate-800 bg-slate-900 px-4">
            {tabs.map((tab, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={\`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative \${activeTab === idx ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}\`}
              >
                {tab.icon}
                {tab.title}
                {activeTab === idx && (
                  <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6 h-[400px] overflow-hidden bg-slate-950 relative">
            <AnimatePresence mode="wait">
              {activeTab === 0 && (
                <motion.div
                  key="tab0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium">Overview</h4>
                    <div className="bg-slate-800 rounded px-3 py-1 text-xs text-slate-300">Today</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { l: 'Total Headcount', v: '142', c: 'text-blue-400' },
                      { l: 'Active Incidents', v: '3', c: 'text-amber-400' },
                      { l: 'Pending Approvals', v: '12', c: 'text-emerald-400' }
                    ].map((stat, i) => (
                      <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="text-sm text-slate-400 mb-2">{stat.l}</div>
                        <div className={\`text-3xl font-bold \${stat.c}\`}>{stat.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-40 flex items-center justify-center">
                    <span className="text-slate-600 text-sm">Activity Chart Visualization</span>
                  </div>
                </motion.div>
              )}

              {activeTab === 1 && (
                <motion.div
                  key="tab1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                   <div className="flex justify-between items-center mb-6">
                    <h4 className="text-lg font-medium">Workforce Roster</h4>
                    <div className="bg-slate-800 rounded px-3 py-1 text-xs text-slate-300">Site A</div>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">U{i}</div>
                          <div>
                            <div className="text-sm font-medium">Employee Name {i}</div>
                            <div className="text-xs text-slate-400">Security Guard • Morning Shift</div>
                          </div>
                        </div>
                        <div className="px-2 py-1 rounded bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-xs">Present</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 2 && (
                <motion.div
                  key="tab2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                   <div className="flex justify-between items-center mb-6">
                    <h4 className="text-lg font-medium">Active Patrols</h4>
                    <div className="bg-emerald-900/30 text-emerald-400 rounded px-3 py-1 text-xs border border-emerald-800 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live Sync
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="text-sm font-medium mb-4">North Wing Patrol</div>
                        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent hidden"></div>
                        <div className="space-y-3 relative">
                          <div className="absolute top-0 bottom-0 left-2 w-px bg-slate-800"></div>
                          <div className="flex items-center gap-3 relative z-10">
                            <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900"></div>
                            <div className="text-sm text-slate-300">Checkpoint 1 cleared</div>
                          </div>
                          <div className="flex items-center gap-3 relative z-10">
                            <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900"></div>
                            <div className="text-sm text-slate-300">Checkpoint 2 cleared</div>
                          </div>
                           <div className="flex items-center gap-3 relative z-10">
                            <div className="w-4 h-4 rounded-full bg-slate-700 border-2 border-slate-900"></div>
                            <div className="text-sm text-slate-500">Checkpoint 3 pending</div>
                          </div>
                        </div>
                     </div>
                     <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center opacity-50">
                        <QrCodeIcon className="w-8 h-8 mb-2 text-slate-600" />
                        <span className="text-sm">Scan QR at location to verify presence.</span>
                     </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

const CoreCapabilities: React.FC = () => {
  const capabilities = [
    {
      title: 'Company & Tenant Logic',
      desc: 'Robust multi-tenancy separating data by company, region, and site.',
      icon: <Building className="w-5 h-5 text-indigo-600" />,
      color: 'bg-indigo-50 border-indigo-100'
    },
    {
      title: 'Workforce Management',
      desc: 'Manage employee lifecycles, assignments, roles, and shift rosters.',
      icon: <Users className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-50 border-blue-100'
    },
    {
      title: 'Time & Attendance',
      desc: 'Location-aware punch logic with offline queuing and discrepancy approval.',
      icon: <Clock className="w-5 h-5 text-emerald-600" />,
      color: 'bg-emerald-50 border-emerald-100'
    },
    {
      title: 'HR & Payroll Engine',
      desc: 'Leave tracking, complex shift allowances, and payroll calculations.',
      icon: <Briefcase className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-50 border-amber-100'
    },
    {
      title: 'Asset & Inventory',
      desc: 'Track custody, movement, and maintenance lifecycle of equipment.',
      icon: <LayoutDashboard className="w-5 h-5 text-purple-600" />,
      color: 'bg-purple-50 border-purple-100'
    },
    {
      title: 'Security Operations',
      desc: 'Guard patrols, incident logging, and visitor gate pass management.',
      icon: <Shield className="w-5 h-5 text-rose-600" />,
      color: 'bg-rose-50 border-rose-100'
    }
  ];

  return (
    <section id="capabilities" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold tracking-wider text-emerald-600 uppercase mb-3">Core Capabilities</h2>
          <h3 className="text-3xl font-bold text-slate-900 mb-4">Everything You Need to Run Operations</h3>
          <p className="text-lg text-slate-600">Deep, production-ready modules designed for the realities of multi-site management.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, i) => (
            <div key={i} className={\`p-6 rounded-2xl border \${cap.color} bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4\`}>
              <div className={\`w-12 h-12 rounded-xl flex items-center justify-center \${cap.color}\`}>
                {cap.icon}
              </div>
              <h4 className="text-xl font-semibold text-slate-900">{cap.title}</h4>
              <p className="text-slate-600 text-sm leading-relaxed">{cap.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const EnterpriseArchitecture: React.FC = () => {
  return (
    <section className="py-24 bg-slate-50 border-y border-slate-200">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2 space-y-6">
              <h2 className="text-sm font-bold tracking-wider text-emerald-600 uppercase mb-2">Enterprise Architecture</h2>
              <h3 className="text-3xl font-bold text-slate-900 leading-tight">
                Built on a Modern, Scalable Foundation
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed">
                Log Sheet Muster isn't a prototype. It's built on a secure, multi-tenant architecture designed to scale with your organization.
              </p>
              
              <div className="space-y-4 mt-8">
                {[
                  { title: 'Offline-First Capability', desc: 'Critical operations continue even when network connectivity drops. Data synchronizes automatically when reconnected.' },
                  { title: 'Workflow & BPM', desc: 'Complex multi-level approval chains for leaves, regularization, and incident escalation.' },
                  { title: 'Live Synchronization', desc: 'Real-time database ensures dashboards and reports reflect exact ground-truth instantly.' }
                ].map((feature, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-1">{feature.title}</h4>
                    <p className="text-sm text-slate-600">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="lg:w-1/2 w-full">
              <div className="bg-slate-900 rounded-2xl p-8 shadow-xl relative overflow-hidden">
                 <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20"></div>
                 
                 <div className="flex flex-col gap-6 relative z-10">
                    <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-lg flex items-center justify-between">
                      <span className="text-slate-300 font-medium">UI / Presentation Layer</span>
                      <div className="flex gap-2">
                         <span className="px-2 py-1 rounded bg-slate-700 text-xs text-white">Web</span>
                         <span className="px-2 py-1 rounded bg-slate-700 text-xs text-white">Mobile</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-center -my-3 z-0"><ArrowRight className="w-5 h-5 text-slate-600 rotate-90" /></div>
                    
                    <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-lg flex items-center justify-between">
                      <span className="text-slate-300 font-medium">Identity & RBAC</span>
                      <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    
                    <div className="flex justify-center -my-3 z-0"><ArrowRight className="w-5 h-5 text-slate-600 rotate-90" /></div>
                    
                    <div className="bg-emerald-900/30 border border-emerald-800 p-4 rounded-lg flex items-center justify-between">
                      <span className="text-emerald-100 font-medium">Business Logic & Workflows</span>
                      <Settings className="w-5 h-5 text-emerald-400" />
                    </div>
                    
                    <div className="flex justify-center -my-3 z-0"><ArrowRight className="w-5 h-5 text-slate-600 rotate-90" /></div>
                    
                    <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-lg flex items-center justify-between">
                      <span className="text-slate-300 font-medium">Cloud Database & Storage</span>
                      <Server className="w-5 h-5 text-blue-400" />
                    </div>
                 </div>
              </div>
            </div>
          </div>
       </div>
    </section>
  );
};

const SecuritySection: React.FC = () => {
  return (
    <section id="security" className="py-24 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Enterprise-Grade Security</h2>
          <p className="text-lg text-slate-400">Your operational data is protected by rigorous access controls and robust isolation.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <Lock className="w-6 h-6"/>, title: "Tenant Isolation", desc: "Data is strictly segregated by company. No cross-tenant spillage." },
            { icon: <Fingerprint className="w-6 h-6"/>, title: "Custom Claims", desc: "Server-side role verification prevents client-side tampering." },
            { icon: <Globe className="w-6 h-6"/>, title: "Site Scoping", desc: "Supervisors only access data for their explicitly assigned regions and sites." },
            { icon: <BookOpen className="w-6 h-6"/>, title: "Audit Trails", desc: "Critical mutations are permanently logged with actor and timestamp." }
          ].map((item, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl hover:bg-slate-800 transition-colors">
              <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center text-emerald-400 mb-4">
                {item.icon}
              </div>
              <h4 className="text-lg font-semibold mb-2">{item.title}</h4>
              <p className="text-slate-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const HowItWorks: React.FC = () => {
  const steps = [
    { num: "01", title: "Provision Platform", desc: "Register your company and configure sites, departments, and roles." },
    { num: "02", title: "Onboard Workforce", desc: "Add employees, assign shifts, and allocate assets." },
    { num: "03", title: "Execute Operations", desc: "Staff punches in, security performs patrols, and supervisors approve leaves." },
    { num: "04", title: "Analyze & Export", desc: "Generate payroll reports, audit compliance, and monitor dashboards." }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-16">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, idx) => (
            <div key={idx} className="relative">
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 left-1/2 w-full h-px bg-slate-200"></div>
              )}
              <div className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white shadow-md flex items-center justify-center text-emerald-600 font-bold text-lg mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  {step.num}
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">{step.title}</h4>
                <p className="text-sm text-slate-600">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const TargetAudience: React.FC = () => {
  return (
    <section className="py-24 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-16">Who Uses Log Sheet Muster?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <HardHat className="w-10 h-10 text-amber-500 mb-4" />
            <h4 className="text-xl font-bold text-slate-900 mb-2">Facility Management</h4>
            <p className="text-slate-600 text-sm">Managing maintenance staff, cleaning crews, and hard services across multiple client locations.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <Shield className="w-10 h-10 text-emerald-500 mb-4" />
            <h4 className="text-xl font-bold text-slate-900 mb-2">Security Agencies</h4>
            <p className="text-slate-600 text-sm">Deploying guards, enforcing patrol routes, and maintaining digital incident registers.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <Briefcase className="w-10 h-10 text-blue-500 mb-4" />
            <h4 className="text-xl font-bold text-slate-900 mb-2">Manpower Providers</h4>
            <p className="text-slate-600 text-sm">Tracking attendance, managing payroll, and fulfilling statutory compliance for outsourced labor.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const BenefitsSection: React.FC = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 relative">
             <div className="aspect-square bg-slate-100 rounded-full absolute -top-10 -left-10 w-full h-full -z-10 blur-3xl opacity-50"></div>
             <img 
               src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2940&auto=format&fit=crop" 
               alt="Team working" 
               className="rounded-2xl shadow-xl object-cover h-[400px] w-full"
             />
             <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-xl shadow-lg border border-slate-100 flex items-center gap-4">
               <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                 <CheckCircle2 className="w-6 h-6 text-emerald-600" />
               </div>
               <div>
                 <div className="text-2xl font-bold text-slate-900">40%</div>
                 <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Reduced Admin Time</div>
               </div>
             </div>
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <h2 className="text-3xl font-bold text-slate-900">Transform Operational Efficiency</h2>
            <p className="text-lg text-slate-600">Stop wasting time consolidating spreadsheets and chasing approvals. Focus on service delivery and business growth.</p>
            <ul className="space-y-4 pt-4">
               <li className="flex gap-3">
                 <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                 <span className="text-slate-700"><strong>Eliminate Data Entry:</strong> Direct punch-ins and automated payroll logic reduce manual HR work.</span>
               </li>
               <li className="flex gap-3">
                 <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                 <span className="text-slate-700"><strong>Real-time Compliance:</strong> Instant visibility into who is on site and whether protocols are met.</span>
               </li>
               <li className="flex gap-3">
                 <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                 <span className="text-slate-700"><strong>Faster Billing:</strong> Accurate attendance records speed up client invoicing and dispute resolution.</span>
               </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

const AboutUs: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
        <h2 className="text-sm font-bold tracking-wider text-emerald-400 uppercase mb-3">About Us</h2>
        <h3 className="text-3xl font-bold mb-6">Shourya Enterprises Pvt. Ltd.</h3>
        <p className="text-lg text-slate-400 leading-relaxed mb-8">
          We understand the complexities of managing distributed workforces and facility operations because we've lived them. Log Sheet Muster was built to solve the real, messy problems of multi-site enterprise management with clean, robust software.
        </p>
        <div className="inline-flex items-center gap-2 text-emerald-400 font-medium">
          Learn more about our mission <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </section>
  );
};

const FaqSection: React.FC = () => {
  const faqs = [
    { q: "Is this suitable for small agencies?", a: "Yes, while built for enterprise scale, the modular nature allows smaller agencies to use core features like attendance and shift rostering efficiently." },
    { q: "How does it handle offline sites?", a: "The mobile app supports an offline-first architecture. Guards can punch in and log patrols without internet. Data syncs automatically when a connection is restored." },
    { q: "Can we restrict who sees what?", a: "Absolutely. Our strict Role-Based Access Control (RBAC) ensures supervisors only see data for their assigned sites, and employees only see their own records." },
    { q: "Is payroll fully automated?", a: "The system automates the calculation based on attendance, leave, and shift rules, providing a clean export ready for your finance team or direct banking integration." }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <details key={idx} className="group border border-slate-200 rounded-xl bg-slate-50 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between p-6 cursor-pointer font-medium text-slate-900">
                {faq.q}
                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-6 pb-6 text-slate-600 text-sm">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

const CtaSection: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <section className="py-24 bg-emerald-600 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-white rotate-12 blur-3xl"></div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-4xl font-bold mb-6">Ready to Modernize Your Operations?</h2>
        <p className="text-xl text-emerald-100 mb-10 max-w-2xl mx-auto">
          Join leading enterprises unifying their workforce, security, and facility management on Log Sheet Muster.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
           <button 
             onClick={() => onNavigate('COMPANY_CODE')}
             className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-medium text-lg transition-all shadow-xl"
           >
             Start Your Deployment
           </button>
           <button 
             className="px-8 py-4 bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-500 rounded-full font-medium text-lg transition-all"
           >
             Contact Sales
           </button>
        </div>
      </div>
    </section>
  );
};

const PremiumFooter: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                LM
              </div>
              <span className="font-bold text-lg text-white">Log Sheet Muster</span>
            </div>
            <p className="text-sm text-slate-500">
              Enterprise Facility & Security Operations Platform.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Integrations</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-slate-800 text-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Shourya Enterprises Pvt. Ltd. All rights reserved.</p>
          <div className="flex gap-4">
             <button onClick={() => onNavigate('LOGIN')} className="hover:text-white transition-colors">Employee Login</button>
             <button onClick={() => onNavigate('COMPANY_CODE')} className="hover:text-white transition-colors">Admin Portal</button>
          </div>
        </div>
      </div>
    </footer>
  );
};
`;

fs.appendFileSync('./src/components/public/PremiumLandingPage.tsx', content);

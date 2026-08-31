import React, { useState } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  Building2, 
  ShieldCheck, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  CheckSquare, 
  Square, 
  Sparkles, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Palette, 
  Layers, 
  SlidersHorizontal,
  Globe,
  Image as ImageIcon,
  UploadCloud,
  Link
} from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, MASTER_APP_MODULES, AppModule } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminCreateCompanyProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
  onCompanyCreated?: (companyId: string) => void;
}

export const SuperAdminCreateCompany: React.FC<SuperAdminCreateCompanyProps> = ({
  currentSession,
  onNavigate,
  onCompanyCreated
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError } = useFeedback();

  // Company Details
  const [companyCode, setCompanyCode] = useState('');
  const [legalName, setLegalName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [licenseTier, setLicenseTier] = useState<'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'>('ENTERPRISE');
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [secondaryColor, setSecondaryColor] = useState('#06b6d4');
  const [maxEmployees, setMaxEmployees] = useState('1000');
  const [maxSites, setMaxSites] = useState('50');

  // Contact & Address
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');

  // Company Admin
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('TempP@ssw0rd123!');
  const [adminPhone, setAdminPhone] = useState('');

  // Branding & Portal
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [portalSubdomain, setPortalSubdomain] = useState('');

  // Module Entitlements (Default all enabled)
  const [selectedModules, setSelectedModules] = useState<string[]>(MASTER_APP_MODULES.map(m => m.key));
  useBackNavigation(!!selectedModules, () => setSelectedModules(null as any), 'selectedModules');

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [emailDeliveryInfo, setEmailDeliveryInfo] = useState<{ status: 'SENT' | 'FAILED'; error?: string } | null>(null);

  // Toggle Module Selection
  const toggleModule = (moduleKey: string) => {
    if (selectedModules.includes(moduleKey)) {
      setSelectedModules(selectedModules.filter(k => k !== moduleKey));
    } else {
      setSelectedModules([...selectedModules, moduleKey]);
    }
  };

  const selectAllModules = () => setSelectedModules(MASTER_APP_MODULES.map(m => m.key));
  const deselectAllModules = () => setSelectedModules([]);
  const selectCategoryModules = (category: string) => {
    const categoryKeys = MASTER_APP_MODULES.filter(m => m.category === category).map(m => m.key);
    const combined = Array.from(new Set([...selectedModules, ...categoryKeys]));
    setSelectedModules(combined);
  };

  // Generate Auto Company Code from Brand Name
  const handleAutoGenerateCode = () => {
    if (!brandName.trim()) return;
    const clean = brandName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    const randomNum = Math.floor(100 + Math.random() * 900);
    setCompanyCode(`${clean}-${randomNum}`);
  };

  const handleCancel = () => {
    showCancelled('🚫 Cancelled');
    onNavigate('SUPER_ADMIN_DASHBOARD');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanCode = companyCode.trim().toUpperCase();
    if (!cleanCode) {
      showValidationFailed('Company Code / Tenant ID is required (e.g. APEX-SEC-101).');
      setError('Company Code / Tenant ID is required (e.g. APEX-SEC-101).');
      return;
    }
    if (!brandName.trim()) {
      showValidationFailed('Company Brand Name is required.');
      setError('Company Brand Name is required.');
      return;
    }
    if (!adminFullName.trim() || !adminEmail.trim() || !adminEmail.includes('@')) {
      showValidationFailed('Please provide valid Company Administrator Full Name and Email address.');
      setError('Please provide valid Company Administrator Full Name and Email address.');
      return;
    }
    if (selectedModules.length === 0) {
      showValidationFailed('Please enable at least one module entitlement for this company.');
      setError('Please enable at least one module entitlement for this company.');
      return;
    }

    setLoading(true);
    const dismiss = showLoading('Creating company and provisioning administrator...');

    try {
      const companyPayload: CompanyTenant = {
        companyId: cleanCode,
        companyLegalName: legalName.trim() || brandName.trim(),
        brandName: brandName.trim(),
        licenseTier,
        status: 'ACTIVE',
        primaryColorHex: primaryColor,
        secondaryColorHex: secondaryColor,
        allowedBranches: ['MAIN', 'NORTH', 'SOUTH'],
        maxEmployeesAllowed: parseInt(maxEmployees) || 1000,
        maxSitesAllowed: parseInt(maxSites) || 50,
        enabledModules: selectedModules,
        logoUrl: logoUrl.trim(),
        websiteUrl: websiteUrl.trim(),
        portalSubdomain: portalSubdomain.trim().toLowerCase(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        adminName: adminFullName.trim(),
        adminEmail: adminEmail.trim().toLowerCase()
      };

      const result = await FirestoreService.createCompanyWithAdmin({
        company: companyPayload,
        adminInfo: {
          fullName: adminFullName.trim(),
          email: adminEmail.trim().toLowerCase(),
          mobileNumber: adminPhone.trim(),
          password: adminPassword
        },
        enabledModules: selectedModules,
        createdByUid: currentSession.userId,
        createdByName: currentSession.fullName || 'System Super Admin'
      });

      dismiss();
      if (!result.success) {
        showError(result.message || '✕ Creation Failed');
        setError(result.message);
        return;
      }

      showSuccess(`✓ Successfully Created: Company ${cleanCode}`);
      setSuccessMsg(result.message);
      if (result.emailDelivery) {
        setEmailDeliveryInfo(result.emailDelivery);
      }
      if (onCompanyCreated) {
        onCompanyCreated(cleanCode);
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Creation Failed');
      setError(err.message || 'Failed to register company.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-black'} p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full`}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('SUPER_ADMIN_DASHBOARD')}
            className={`p-2 rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              <span>Register New Company Tenant</span>
            </h1>
            <p className="text-xs text-slate-400">Onboard a new organization, assign admin credentials, and configure module entitlements.</p>
          </div>
        </div>
      </div>

      {successMsg ? (
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-emerald-950/60 border-emerald-800' : 'bg-emerald-50 border-emerald-200'} space-y-4 animate-in fade-in`}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-base font-bold text-emerald-300">Company Tenant Successfully Provisioned</h2>
              <p className="text-xs text-emerald-200/80 leading-relaxed">{successMsg}</p>
              
              {emailDeliveryInfo && (
                <div className={`mt-2 p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  emailDeliveryInfo.status === 'SENT' 
                    ? (isDark ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-200' : 'bg-emerald-100/70 border-emerald-300 text-emerald-900')
                    : (isDark ? 'bg-amber-950/50 border-amber-800/50 text-amber-200' : 'bg-amber-100/70 border-amber-300 text-amber-900')
                }`}>
                  <span className="font-semibold">Email Delivery Status:</span>
                  {emailDeliveryInfo.status === 'SENT' ? (
                    <span>Real activation link has been dispatched to {adminEmail || 'Company Admin'}.</span>
                  ) : (
                    <span>Notice: {emailDeliveryInfo.error || 'Delivery pending or delayed'}. You can resend from the Companies dashboard.</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onNavigate('SUPER_ADMIN_DASHBOARD')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/30"
            >
              Return to Control Center
            </button>
            <button
              onClick={() => {
                setSuccessMsg(null);
                setEmailDeliveryInfo(null);
                setCompanyCode('');
                setBrandName('');
                setLegalName('');
                setAdminEmail('');
                setAdminFullName('');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700"
            >
              Register Another Organization
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Section 1: Tenant Identity */}
          <div className={`p-5 rounded-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              <span>1. Company Tenant Identity & License</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Company Code / Code ID *</label>
                  <button 
                    type="button" 
                    onClick={handleAutoGenerateCode}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    <Sparkles className="w-3 h-3" /> Auto
                  </button>
                </div>
                <input
                  type="text"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                  placeholder="e.g. APEX-SEC-101"
                  className={`w-full px-3 py-2 text-xs font-mono rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-white border-slate-200 text-black'
                  } focus:outline-none focus:border-amber-500 uppercase font-bold`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Brand / Display Name *</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Apex Security Services"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                  } focus:outline-none focus:border-amber-500`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Legal Registered Entity Name</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. Apex Security Services Pvt Ltd"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                  } focus:outline-none focus:border-amber-500`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">License Tier</label>
                <select
                  value={licenseTier}
                  onChange={(e) => setLicenseTier(e.target.value as any)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                  } focus:outline-none focus:border-amber-500`}
                >
                  <option value="STARTER">Starter Tier</option>
                  <option value="PROFESSIONAL">Professional Tier</option>
                  <option value="ENTERPRISE">Enterprise Tier (Unrestricted)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Max Employees Limit</label>
                <input
                  type="number"
                  value={maxEmployees}
                  onChange={(e) => setMaxEmployees(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                  } focus:outline-none focus:border-amber-500 font-mono`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Max Sites Limit</label>
                <input
                  type="number"
                  value={maxSites}
                  onChange={(e) => setMaxSites(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                  } focus:outline-none focus:border-amber-500 font-mono`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Brand Theme Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className={`flex-1 px-3 py-1.5 text-xs font-mono rounded-xl border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Branding & Portal Configuration */}
          <div className={`p-5 rounded-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              <span>2. Branding & Web Portal</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Company Logo URL</label>
                <div className="flex gap-2">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className={`flex-1 px-3 py-2 text-xs rounded-xl border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                    } focus:outline-none focus:border-amber-500 font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Corporate Website</label>
                <div className="relative">
                  <Link className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://www.apexsecurity.com"
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                    } focus:outline-none focus:border-amber-500 font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Dedicated Portal Subdomain</label>
                <div className="flex items-center relative">
                  <input
                    type="text"
                    value={portalSubdomain}
                    onChange={(e) => setPortalSubdomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                    placeholder="apex"
                    className={`w-full pr-32 pl-3 py-2 text-xs rounded-xl border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                    } focus:outline-none focus:border-amber-500 font-mono`}
                  />
                  <span className="absolute right-3 text-[10px] text-slate-400 pointer-events-none">
                    .logsheetmuster.online
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Primary Company Admin */}
          <div className={`p-5 rounded-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              <span>3. Assign Primary Company Administrator</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Admin Full Name *</label>
                <input
                  type="text"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                  } focus:outline-none focus:border-amber-500`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Admin Email Address *</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="e.g. admin@apexsecurity.com"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                  } focus:outline-none focus:border-amber-500 font-mono`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Admin Temporary Password *</label>
                <input
                  type="text"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="e.g. TempP@ssw0rd123!"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                  } focus:outline-none focus:border-amber-500 font-mono`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Admin Contact Mobile</label>
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                  } focus:outline-none focus:border-amber-500 font-mono`}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Module Access & Entitlements */}
          <div className={`p-5 rounded-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>4. Module Access Entitlements ({selectedModules.length} / {MASTER_APP_MODULES.length} Enabled)</span>
                </h2>
                <p className="text-xs text-slate-400">Select which operational modules this company tenant is allowed to access.</p>
              </div>

              <div className="flex gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={selectAllModules}
                  className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={deselectAllModules}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Modules Checkbox Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2">
              {MASTER_APP_MODULES.map((mod) => {
                const isChecked = selectedModules.includes(mod.key);
                return (
                  <div
                    key={mod.key}
                    onClick={() => toggleModule(mod.key)}
                    className={`p-3 rounded-xl border cursor-pointer transition select-none flex items-start gap-2.5 ${
                      isChecked
                        ? isDark 
                          ? 'bg-amber-950/40 border-amber-600/80 text-amber-200' 
                          : 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm'
                        : isDark
                          ? 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">{mod.name}</div>
                      <div className="text-[10px] opacity-75 mt-0.5 line-clamp-2">{mod.description}</div>
                      <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase bg-slate-800/60 text-slate-300">
                        {mod.category}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-amber-600/30 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Provisioning Tenant...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Provision Tenant & Assign Admin</span>
                </>
              )}
            </button>
          </div>

        </form>
      )}

    </div>
  );
};

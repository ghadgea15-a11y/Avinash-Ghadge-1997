import React, { useState } from 'react';
import { Save, Building2, Globe, Mail, Phone, MapPin, Palette, Image as ImageIcon } from 'lucide-react';
import { CompanyTenant } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { SessionManager } from '../../services/sessionManager';

interface CompanyProfileTabProps {
  tenantInfo: CompanyTenant | null;
  setTenantInfo: React.Dispatch<React.SetStateAction<CompanyTenant | null>>;
  onCompanyUpdated?: (updated: CompanyTenant) => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  isDark: boolean;
}

export const CompanyProfileTab: React.FC<CompanyProfileTabProps> = ({
  tenantInfo,
  setTenantInfo,
  onCompanyUpdated,
  onSuccess,
  onError,
  isDark
}) => {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantInfo) return;

    if (!tenantInfo.brandName?.trim()) {
      onError('Company Brand Name is required.');
      return;
    }

    try {
      setSaving(true);
      const updatedTenant: CompanyTenant = {
        ...tenantInfo,
        brandName: tenantInfo.brandName.trim(),
        companyLegalName: (tenantInfo.companyLegalName || tenantInfo.brandName).trim(),
        updatedAt: new Date().toISOString()
      };

      const success = await FirestoreService.updateCompanyTenantDetails(updatedTenant);
      if (success) {
        SessionManager.setActiveCompany(updatedTenant as any);
        if (onCompanyUpdated) onCompanyUpdated(updatedTenant);
        setTenantInfo(updatedTenant);
        onSuccess('Company profile and branding updated successfully.');
      } else {
        onError('Failed to save company profile to Firestore.');
      }
    } catch (err: any) {
      console.error('[CompanyProfileTab] Save error:', err);
      onError(err?.message || 'An error occurred while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!tenantInfo) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        No company tenant profile loaded.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span>Company Profile & Branding</span>
          </h3>
          <p className="text-xs text-slate-400">Manage legal entity details, contact information, logos, and white-label theme colors.</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-indigo-600/20"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Basic Entity Info */}
      <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Legal & Organizational Identity</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Brand Name *</label>
            <input
              type="text"
              required
              value={tenantInfo.brandName || ''}
              onChange={(e) => setTenantInfo({ ...tenantInfo, brandName: e.target.value })}
              className={`w-full p-2.5 rounded-xl border font-medium ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
              placeholder="e.g. Acme Security Corp"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Legal Registered Name</label>
            <input
              type="text"
              value={tenantInfo.companyLegalName || ''}
              onChange={(e) => setTenantInfo({ ...tenantInfo, companyLegalName: e.target.value })}
              className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
              placeholder="e.g. Acme Security Private Limited"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Company Code</label>
            <input
              type="text"
              value={tenantInfo.companyCode || ''}
              onChange={(e) => setTenantInfo({ ...tenantInfo, companyCode: e.target.value.toUpperCase() })}
              className={`w-full p-2.5 rounded-xl border font-mono uppercase ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
              placeholder="e.g. ACME"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">License Tier</label>
            <input
              type="text"
              readOnly
              value={tenantInfo.licenseTier || 'ENTERPRISE'}
              className={`w-full p-2.5 rounded-xl border font-semibold opacity-75 cursor-not-allowed ${isDark ? 'bg-slate-950/60 border-slate-800 text-indigo-400' : 'bg-slate-100 border-slate-200 text-indigo-600'}`}
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Status</label>
            <span className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-full">
              {tenantInfo.status || 'ACTIVE'}
            </span>
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Brand Tagline</label>
            <input
              type="text"
              value={tenantInfo.tagline || ''}
              onChange={(e) => setTenantInfo({ ...tenantInfo, tagline: e.target.value })}
              placeholder="e.g. Protecting Assets & People Worldwide"
              className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>
        </div>
      </div>

      {/* Visual Identity & Colors */}
      <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" />
          <span>Brand Visual Identity</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Primary Brand Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={tenantInfo.primaryColorHex || '#4f46e5'}
                onChange={(e) => setTenantInfo({ ...tenantInfo, primaryColorHex: e.target.value })}
                className="h-10 w-12 rounded cursor-pointer border-0 p-0"
              />
              <input
                type="text"
                value={tenantInfo.primaryColorHex || '#4f46e5'}
                onChange={(e) => setTenantInfo({ ...tenantInfo, primaryColorHex: e.target.value })}
                className={`flex-1 p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                placeholder="#4f46e5"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Secondary Brand Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={tenantInfo.secondaryColorHex || '#06b6d4'}
                onChange={(e) => setTenantInfo({ ...tenantInfo, secondaryColorHex: e.target.value })}
                className="h-10 w-12 rounded cursor-pointer border-0 p-0"
              />
              <input
                type="text"
                value={tenantInfo.secondaryColorHex || '#06b6d4'}
                onChange={(e) => setTenantInfo({ ...tenantInfo, secondaryColorHex: e.target.value })}
                className={`flex-1 p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                placeholder="#06b6d4"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs pt-2">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Brand Logo URL</label>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={tenantInfo.logoUrl || ''}
                onChange={(e) => setTenantInfo({ ...tenantInfo, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className={`flex-1 p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
              />
              {tenantInfo.logoUrl ? (
                <div className="w-12 h-10 rounded-lg border flex items-center justify-center p-1 bg-slate-950/20 overflow-hidden shrink-0">
                  <img src={tenantInfo.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg border border-dashed flex items-center justify-center text-slate-500 shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Login Background URL</label>
            <input
              type="text"
              value={tenantInfo.loginBackgroundUrl || ''}
              onChange={(e) => setTenantInfo({ ...tenantInfo, loginBackgroundUrl: e.target.value })}
              placeholder="https://example.com/login-bg.jpg"
              className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>
        </div>
      </div>

      {/* Contact & Location Details */}
      <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span>Contact & Operating Headquarters</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <span>Admin / Support Email</span>
            </label>
            <input
              type="email"
              value={tenantInfo.adminEmail || tenantInfo.email || ''}
              onChange={(e) => setTenantInfo({ ...tenantInfo, adminEmail: e.target.value, email: e.target.value })}
              placeholder="admin@company.com"
              className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span>Primary Phone</span>
            </label>
            <input
              type="tel"
              value={tenantInfo.phone || ''}
              onChange={(e) => setTenantInfo({ ...tenantInfo, phone: e.target.value })}
              placeholder="+91 22 1234 5678"
              className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>Website URL</span>
            </label>
            <input
              type="text"
              value={tenantInfo.websiteUrl || ''}
              onChange={(e) => setTenantInfo({ ...tenantInfo, websiteUrl: e.target.value })}
              placeholder="https://company.com"
              className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="md:col-span-2">
            <label className="block text-slate-400 mb-1 font-medium">Headquarters Address</label>
            <input
              type="text"
              value={tenantInfo.address || ''}
              onChange={(e) => setTenantInfo({ ...tenantInfo, address: e.target.value })}
              placeholder="Building 4, Sector 7, Corporate Tech Park"
              className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium">City</label>
            <input
              type="text"
              value={tenantInfo.city || ''}
              onChange={(e) => setTenantInfo({ ...tenantInfo, city: e.target.value })}
              placeholder="Mumbai"
              className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Country</label>
            <input
              type="text"
              value={tenantInfo.country || 'India'}
              onChange={(e) => setTenantInfo({ ...tenantInfo, country: e.target.value })}
              placeholder="India"
              className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
            />
          </div>
        </div>
      </div>
    </form>
  );
};

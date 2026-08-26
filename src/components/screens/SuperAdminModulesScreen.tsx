import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Sliders, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Search,
  Filter
} from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, MASTER_APP_MODULES, AppModule } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminModulesScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SuperAdminModulesScreen: React.FC<SuperAdminModulesScreenProps> = ({
  currentSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError, showLoading, handleError } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<CompanyTenant[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const list = await FirestoreService.getAllCompanies();
      setCompanies(list);
      if (list.length > 0) {
        setSelectedCompanyId(list[0].companyId);
        setEnabledModules(list[0].enabledModules || MASTER_APP_MODULES.map(m => m.key));
      }
    } catch (err) {
      console.error('[SuperAdminModulesScreen] Error loading companies:', err);
      handleError(err, 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (code: string) => {
    setSelectedCompanyId(code);
    const comp = companies.find(c => c.companyId === code);
    if (comp) {
      setEnabledModules(comp.enabledModules || MASTER_APP_MODULES.map(m => m.key));
    }
  };

  const toggleModule = (moduleKey: string) => {
    if (enabledModules.includes(moduleKey)) {
      setEnabledModules(enabledModules.filter(k => k !== moduleKey));
    } else {
      setEnabledModules([...enabledModules, moduleKey]);
    }
  };

  const selectAll = () => setEnabledModules(MASTER_APP_MODULES.map(m => m.key));
  const deselectAll = () => setEnabledModules([]);

  const handleSaveModules = async () => {
    if (!selectedCompanyId || saving) return;
    setSaving(true);
    const dismiss = showLoading('Saving module entitlements...');

    try {
      const ok = await FirestoreService.updateCompanyModules(selectedCompanyId, enabledModules);
      dismiss();
      if (ok) {
        // Update local state list
        setCompanies(companies.map(c => c.companyId === selectedCompanyId ? { ...c, enabledModules } : c));
        showSuccess(`✓ Successfully Saved module entitlements for tenant ${selectedCompanyId}`);
      } else {
        showError('✕ Save Failed: Could not update company module entitlements');
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const selectedCompany = companies.find(c => c.companyId === selectedCompanyId);

  const categories = ['ALL', 'CORE', 'HRMS', 'SECURITY', 'FINANCE', 'SYSTEM'];

  const filteredModules = MASTER_APP_MODULES.filter(m => {
    const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;
    const matchesSearch = m.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          m.key.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          m.description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} p-4 md:p-6 space-y-6 max-w-6xl mx-auto w-full`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              <Sliders className="w-5 h-5 text-cyan-500" />
              <span>Tenant Module Access & Entitlements</span>
            </h1>
            <p className="text-xs text-slate-400">Enable or disable specific features per registered company tenant.</p>
          </div>
        </div>

        <button
          onClick={handleSaveModules}
          disabled={saving || !selectedCompanyId}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-600/30 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Module Configuration</span>
        </button>
      </div>

      {/* Tenant Company Selector Bar */}
      <div className={`p-4 rounded-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-amber-500 block mb-1">
              Select Tenant Company
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => handleSelectCompany(e.target.value)}
              disabled={loading}
              className={`w-full md:w-96 px-3 py-2 text-xs font-semibold rounded-xl border ${
                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              } focus:outline-none focus:border-cyan-500`}
            >
              {companies.map((c) => (
                <option key={c.companyId} value={c.companyId}>
                  {c.brandName} ({c.companyId}) - {c.status}
                </option>
              ))}
            </select>
          </div>

          {selectedCompany && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-200">{selectedCompany.brandName}</p>
                <p className="text-[10px] text-slate-400 font-mono">Tier: {selectedCompany.licenseTier}</p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-bold font-mono">
                {enabledModules.length} / {MASTER_APP_MODULES.length} Enabled
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                categoryFilter === cat
                  ? 'bg-cyan-600 text-white shadow-md'
                  : isDark
                    ? 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quick Select Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800"
          >
            Enable All
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            Disable All
          </button>
        </div>
      </div>

      {/* Modules Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-500 mx-auto" />
          <p className="text-xs">Loading companies and module permissions...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredModules.map((mod) => {
            const isEnabled = enabledModules.includes(mod.key);
            return (
              <div
                key={mod.key}
                onClick={() => toggleModule(mod.key)}
                className={`p-4 rounded-2xl border cursor-pointer transition select-none flex items-start justify-between gap-3 ${
                  isEnabled
                    ? isDark 
                      ? 'bg-cyan-950/40 border-cyan-700/80 text-cyan-200 shadow-sm' 
                      : 'bg-cyan-50 border-cyan-300 text-cyan-950 shadow-sm'
                    : isDark
                      ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{mod.name}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase bg-slate-800 text-slate-300 font-mono">
                      {mod.category}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80">{mod.description}</p>
                  <p className="text-[9px] font-mono opacity-60">KEY: {mod.key}</p>
                </div>

                <div className="shrink-0 mt-0.5">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    isEnabled 
                      ? 'bg-cyan-500 text-slate-950 shadow-md' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isEnabled ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

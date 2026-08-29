import re

with open('src/components/screens/CompanyManagementScreen.tsx', 'r') as f:
    content = f.read()

profile_tab_code = r'''{activeTab === 'PROFILE' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Company Profile & Branding</h3>
              <p className="text-xs text-slate-400">Manage white-label settings, logos, and brand colors.</p>
            </div>
            <button
              onClick={() => {
                onCompanyUpdated && onCompanyUpdated(tenantInfo as any);
                alert("Branding saved to session for demo.");
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-indigo-600/20"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
          
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-6 text-sm`}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-400 mb-1 text-xs">Company Brand Name *</label>
                  <input
                    type="text"
                    value={tenantInfo?.brandName || ''}
                    onChange={(e) => setTenantInfo(prev => prev ? {...prev, brandName: e.target.value} : null)}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-xs">Tagline</label>
                  <input
                    type="text"
                    value={tenantInfo?.tagline || ''}
                    onChange={(e) => setTenantInfo(prev => prev ? {...prev, tagline: e.target.value} : null)}
                    placeholder="e.g. Empowering Workforce"
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-slate-400 mb-1 text-xs">Primary Brand Color (Hex) *</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={tenantInfo?.primaryColorHex || '#4f46e5'}
                      onChange={(e) => setTenantInfo(prev => prev ? {...prev, primaryColorHex: e.target.value} : null)}
                      className={`h-10 w-10 rounded cursor-pointer border-0 p-0`}
                    />
                    <input
                      type="text"
                      value={tenantInfo?.primaryColorHex || '#4f46e5'}
                      onChange={(e) => setTenantInfo(prev => prev ? {...prev, primaryColorHex: e.target.value} : null)}
                      className={`flex-1 p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-xs">Logo URL</label>
                  <input
                    type="text"
                    value={tenantInfo?.logoUrl || ''}
                    onChange={(e) => setTenantInfo(prev => prev ? {...prev, logoUrl: e.target.value} : null)}
                    placeholder="https://example.com/logo.png"
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
             </div>
             
             <div>
                <label className="block text-slate-400 mb-1 text-xs">Login Background Image URL</label>
                <input
                  type="text"
                  value={tenantInfo?.loginBackgroundUrl || ''}
                  onChange={(e) => setTenantInfo(prev => prev ? {...prev, loginBackgroundUrl: e.target.value} : null)}
                  placeholder="https://example.com/bg.jpg"
                  className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
             </div>
          </div>
        </div>
      )}

      {activeTab === 'SITES' && ('''

content = content.replace("{activeTab === 'SITES' && (", profile_tab_code)

with open('src/components/screens/CompanyManagementScreen.tsx', 'w') as f:
    f.write(content)

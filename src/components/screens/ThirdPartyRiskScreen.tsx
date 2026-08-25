import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant } from '../../types';
import { VendorRiskService } from '../../services/vendorRiskService';
import { ShieldAlert, Users, CheckCircle, XCircle, AlertTriangle, FileText, Ban } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  session: UserSession;
  activeCompany: CompanyTenant;
}

export const ThirdPartyRiskScreen: React.FC<Props> = ({ session, activeCompany }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeCompany.companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const risks = await VendorRiskService.getVendorRiskDashboard(session);
      setData(risks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateRisks = async () => {
    try {
      const violations = await VendorRiskService.evaluateVendorRisks(activeCompany.companyId);
      alert(`Evaluation complete. Found and addressed ${violations} risk violations.`);
      loadData();
    } catch (err: any) {
      alert("Evaluation failed: " + err.message);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await VendorRiskService.revokePersonnelAccess(session, id);
      alert("Access Revoked");
      loadData();
    } catch (err: any) {
      alert("Failed to revoke: " + err.message);
    }
  };

  const runE2ETest = async () => {
    try {
      alert("Starting Third-Party Risk Lifecycle E2E Test...");
      const vendorId = await VendorRiskService.registerVendor(session, {
        businessName: 'Acme Corp (Test)',
        legalEntityName: 'Acme Corp Ltd',
        tier: 'TIER_2_APPROVED'
      });
      
      console.log('1. Vendor Registered:', vendorId);
      
      const contractId = await VendorRiskService.submitContract(session, vendorId, {
        title: 'Security Services 2026',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // EXPIRED 1 day ago
        assignedServices: ['SECURITY'],
        authorizedSites: ['SITE_HQ']
      });
      
      console.log('2. Contract Added (Expired):', contractId);
      
      const docId = await VendorRiskService.addComplianceDoc(session, vendorId, {
        docType: 'ISO_27001',
        issueDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // EXPIRED 2 days ago
      });
      
      console.log('3. Compliance Doc Added (Expired):', docId);
      
      let bypassPrevented = false;
      try {
        await VendorRiskService.addExternalPersonnel(session, vendorId, {
          name: 'John Doe (Contractor)',
          role: 'GUARD',
          authorizedSites: ['SITE_HQ'],
          accessExpiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          internalPermissionsGranted: true // INVALID
        });
      } catch (err: any) {
        if (err.message.includes('SECURITY EXCEPTION')) {
          bypassPrevented = true;
          console.log('4. Boundary Enforced. Internal permissions blocked.');
        } else {
          throw err;
        }
      }
      
      if (!bypassPrevented) {
        throw new Error("Boundary test failed! External personnel granted internal permissions.");
      }

      // Add valid personnel but with expired access
      const pId = await VendorRiskService.addExternalPersonnel(session, vendorId, {
        name: 'Jane Smith (Contractor)',
        role: 'GUARD',
        authorizedSites: ['SITE_HQ'],
        accessExpiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // EXPIRED
        internalPermissionsGranted: false
      });
      console.log('5. Expired Personnel Added:', pId);
      
      console.log('6. Running Automated Risk Evaluator...');
      const violations = await VendorRiskService.evaluateVendorRisks(activeCompany.companyId);
      
      alert(`E2E Passed! Prevented bypass. Evaluator found ${violations} violations. Check console and dashboard.`);
      loadData();
    } catch (err: any) {
      alert("E2E Failed: " + err.message);
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Third-Party Risks...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load data</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-600" />
            Third-Party Risk Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Vendor lifecycle, automated compliance, and external personnel control.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={runE2ETest}
            className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-medium hover:bg-rose-100 transition-colors"
          >
            Run E2E Test
          </button>
          <button 
            onClick={handleEvaluateRisks}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Evaluate Risks
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Vendors</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{data.vendors.length}</h3>
            </div>
            <Users className="w-8 h-8 text-indigo-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Contracts</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {data.contracts.filter((c: any) => c.status === 'ACTIVE').length}
              </h3>
            </div>
            <FileText className="w-8 h-8 text-emerald-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-rose-800">Expired Docs/Contracts</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                {data.contracts.filter((c: any) => c.status === 'EXPIRED').length + data.compliance.filter((c: any) => c.status === 'EXPIRED').length}
              </h3>
            </div>
            <AlertTriangle className="w-8 h-8 text-rose-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-amber-800">Unauthorized/Expired Access</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {data.personnel.filter((p: any) => p.status === 'EXPIRED' || p.status === 'REVOKED').length}
              </h3>
            </div>
            <Ban className="w-8 h-8 text-amber-500 opacity-20" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-bold text-slate-900">External Personnel Access</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {data.personnel.map((p: any) => (
              <div key={p.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900">{p.name}</h3>
                  <p className="text-xs text-slate-500">Role: {p.role} | Sites: {p.authorizedSites.join(', ')}</p>
                  <p className="text-xs text-slate-500">Expires: {format(new Date(p.accessExpiryDate), 'PP')}</p>
                </div>
                <div className="text-right">
                  {p.status === 'ACTIVE' ? (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg mb-2 inline-block">ACTIVE</span>
                  ) : (
                    <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg mb-2 inline-block">{p.status}</span>
                  )}
                  {p.status === 'ACTIVE' && (
                    <button onClick={() => handleRevoke(p.id)} className="block text-xs text-rose-600 hover:underline">Revoke Access</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-bold text-slate-900">Compliance & Contracts</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Contracts</h3>
            {data.contracts.map((c: any) => (
              <div key={c.id} className="p-3 border border-slate-100 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-500">Expires: {format(new Date(c.endDate), 'PP')}</p>
                </div>
                <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {c.status}
                </span>
              </div>
            ))}
            <h3 className="text-xs font-bold text-slate-500 uppercase mt-4">Documents</h3>
            {data.compliance.map((d: any) => (
              <div key={d.id} className="p-3 border border-slate-100 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm text-slate-900">{d.docType}</p>
                  <p className="text-xs text-slate-500">Expires: {format(new Date(d.expiryDate), 'PP')}</p>
                </div>
                <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${d.status === 'VALID' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

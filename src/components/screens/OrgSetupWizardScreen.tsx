import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Building, MapPin, Map, Users, User, Shield, Briefcase, ChevronRight, ChevronLeft, 
  CheckCircle, AlertCircle, Plus, Search, Info
} from 'lucide-react';
import { CompanyTenant, UserSession } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useFeedback } from '../../context/ActionFeedbackContext';
import { collection, onSnapshot, query, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// Helper types
type RegionRecord = any;
type SiteRecord = any;
type DepartmentRecord = any;
type EmployeeRecord = any;
const REQUIRED_DEPTS_GLOBAL = ['HR', 'FINANCE', 'ADMIN', 'PROCUREMENT', 'EHS', 'QUALITY'];

interface OrgSetupWizardScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  onClose: () => void;
}

export const OrgSetupWizardScreen: React.FC<OrgSetupWizardScreenProps> = ({
  userSession,
  activeCompany,
  onClose
}) => {
  const { showSuccess, showError, showLoading } = useFeedback();

  // Dashboard Data State
  const [regions, setRegions] = useState<RegionRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);

  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);

  // Subscriptions
  useEffect(() => {
    if (!activeCompany?.companyId) return;

    const unsubs: (() => void)[] = [];
    const cId = activeCompany.companyId;

    const regQ = query(collection(db, 'companies', cId, 'regions'));
    unsubs.push(onSnapshot(regQ, (snap) => setRegions(snap.docs.map(d => ({ id: d.id, ...d.data() })))));

    const siteQ = query(collection(db, 'companies', cId, 'sites'));
    unsubs.push(onSnapshot(siteQ, (snap) => setSites(snap.docs.map(d => ({ id: d.id, ...d.data() })))));

    const deptQ = query(collection(db, 'companies', cId, 'departments'));
    unsubs.push(onSnapshot(deptQ, (snap) => setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() })))));

    const empQ = query(collection(db, 'companies', cId, 'employees'));
    unsubs.push(onSnapshot(empQ, (snap) => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })))));

    return () => unsubs.forEach(u => u());
  }, [activeCompany?.companyId]);

  // Derived Completeness
  const REQUIRED_DEPTS_GLOBAL = ['HR', 'FINANCE', 'ADMIN', 'PROCUREMENT', 'EHS', 'QUALITY'];
  const missingA3 = REQUIRED_DEPTS_GLOBAL.filter(dName => {
    const dId = departments.find(d => d.name.toUpperCase() === dName)?.id;
    if (!dId) return true;
    return !employees.some(e => e.authorityLevel === 'A3_DEPARTMENT_HEAD' && e.departmentId === dId);
  });
  const dashboardCounts = {
    A2: employees.filter((e:any) => e.authorityLevel === 'A2_GENERAL_MANAGER').length,
    A3: employees.filter((e:any) => e.authorityLevel === 'A3_DEPARTMENT_HEAD').length,
    A4: employees.filter((e:any) => e.authorityLevel === 'A4_REGIONAL_MANAGER').length,
    A5: employees.filter((e:any) => e.authorityLevel === 'A5_SITE_INCHARGE').length,
    A6: employees.filter((e:any) => e.authorityLevel === 'A6_SECURITY_SUPERVISOR').length,
    A7_A9: employees.filter((e:any) => ['A7_GUARD', 'A8_RELIEVER', 'A9_SUPPORT_STAFF'].includes(e.authorityLevel)).length,
  };
  const missingA4 = regions.filter(r => !employees.some(e => e.authorityLevel === 'A4_REGIONAL_MANAGER' && e.assignedRegionId === r.id));
  const missingA5 = sites.filter(s => !employees.some(e => e.authorityLevel === 'A5_SITE_INCHARGE' && e.assignedSiteId === s.id));
  const missingA6 = sites.filter(s => !employees.some(e => e.authorityLevel === 'A6_SECURITY_SUPERVISOR' && e.assignedSiteId === s.id));
  
  const workforceCount = employees.filter(e => ['A7_GUARD', 'A8_RELIEVER', 'A9_SUPPORT_STAFF'].includes(e.authorityLevel || '')).length;

  const steps = [
    { id: 1, title: 'Company Setup', desc: 'Confirm basic company profile' },
    { id: 2, title: 'Regions', desc: 'Define geographical regions' },
    { id: 3, title: 'Sites', desc: 'Create operational sites' },
    { id: 4, title: 'Departments', desc: 'Set up administrative departments' },
    { id: 5, title: 'A2 (Gen. Manager)', desc: 'Operations Head (Optional)' },
    { id: 6, title: 'A3 (Officials)', desc: 'Department heads' },
    { id: 7, title: 'A4 (Regional Mgr)', desc: 'Assign one per region' },
    { id: 8, title: 'A5 (Site In-Charge)', desc: 'Assign one per site' },
    { id: 9, title: 'A6 (Supervisor)', desc: 'Assign per site' },
    { id: 10, title: 'Workforce', desc: 'Guards & Support Staff' },
  ];

  // Validation logic for proceeding
  const canProceed = () => {
    switch (currentStep) {
      case 1: return true;
      case 2: return regions.length > 0;
      case 3: return sites.length > 0 && regions.every(r => sites.some(s => s.regionId === r.id));
      case 4: return REQUIRED_DEPTS_GLOBAL.every(dName => departments.some(d => d.name.toUpperCase() === dName));
      case 5: return true; // Optional
      case 6: return missingA3.length === 0;
      case 7: return regions.length > 0 && missingA4.length === 0;
      case 8: return sites.length > 0 && missingA5.length === 0;
      case 9: return sites.length > 0 && missingA6.length === 0;
      case 10: return workforceCount > 0;
      default: return false;
    }
  };

  const renderDashboard = () => {
    return (
      <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-white font-bold mb-1">Completeness Dashboard</h3>
          <p className="text-xs text-slate-400">Live validation of organizational setup.</p>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="bg-slate-900 rounded-lg p-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Core Entities</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Regions</span>
                <span className={`font-bold ${regions.length > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{regions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Sites</span>
                <span className={`font-bold ${sites.length > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{sites.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Departments</span>
                <span className={`font-bold ${missingA3.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{departments.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Workforce Counts</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">A2 (Gen Mgr)</span>
                <span className={`font-bold ${dashboardCounts.A2 > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>{dashboardCounts.A2}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">A3 (Dept Head)</span>
                <span className={`font-bold ${missingA3.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{dashboardCounts.A3}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">A4 (Reg Mgr)</span>
                <span className={`font-bold ${missingA4.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{dashboardCounts.A4}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">A5 (Site In-Charge)</span>
                <span className={`font-bold ${missingA5.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{dashboardCounts.A5}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">A6 (Supervisor)</span>
                <span className={`font-bold ${missingA6.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{dashboardCounts.A6}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
                <span className="text-slate-400">Guards/Staff</span>
                <span className="font-bold text-emerald-400">{dashboardCounts.A7_A9}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Site Readiness Matrix</h4>
            <div className="space-y-3">
              {sites.map(site => {
                const hasA4 = employees.some(e => e.authorityLevel === 'A4_REGIONAL_MANAGER' && e.regionId === site.regionId);
                const hasA5 = employees.some(e => e.authorityLevel === 'A5_SITE_INCHARGE' && e.assignedSiteId === site.id);
                const hasA6 = employees.some(e => e.authorityLevel === 'A6_SECURITY_SUPERVISOR' && e.assignedSiteId === site.id);
                const isReady = hasA4 && hasA5 && hasA6;
                const region = regions.find(r => r.id === site.regionId)?.name || 'Unknown Region';
                return (
                  <div key={site.id} className="text-xs border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-slate-300 truncate mr-2" title={site.name}>{site.name}</span>
                      <span className={isReady ? 'text-emerald-400' : 'text-rose-400'}>{isReady ? 'READY' : 'INCOMPLETE'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mb-1">{region}</div>
                    <div className="flex gap-2">
                      <span className={`px-1.5 py-0.5 rounded ${hasA4 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>A4</span>
                      <span className={`px-1.5 py-0.5 rounded ${hasA5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>A5</span>
                      <span className={`px-1.5 py-0.5 rounded ${hasA6 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>A6</span>
                    </div>
                  </div>
                );
              })}
              {sites.length === 0 && <div className="text-xs text-slate-500">No sites created yet.</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col">
      <div className="h-14 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-800">
        <h1 className="text-white font-bold text-lg flex items-center gap-2">
          <Building className="w-5 h-5 text-indigo-400" />
          Organization Setup Wizard
        </h1>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
        >
          Close Wizard
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {renderDashboard()}
        
        <div className="flex-1 flex flex-col bg-slate-900 relative">
          
          {/* Progress Bar Header */}
          <div className="px-8 pt-6 pb-4">
            <div className="flex justify-between mb-2">
              {steps.map((s, idx) => (
                <div key={s.id} className={`text-[10px] font-bold uppercase tracking-wider ${currentStep >= s.id ? 'text-indigo-400' : 'text-slate-600'}`}>
                  Step {s.id}
                </div>
              ))}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full flex gap-1">
              {steps.map((s) => (
                <div 
                  key={s.id} 
                  className={`h-full flex-1 rounded-full ${currentStep >= s.id ? 'bg-indigo-500' : 'bg-slate-700'}`}
                />
              ))}
            </div>
            <div className="mt-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                <span className="text-indigo-400 font-bold text-lg">{currentStep}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{steps[currentStep-1].title}</h2>
                <p className="text-slate-400 text-sm mt-1">{steps[currentStep-1].desc}</p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto px-8 pb-24">
            <WizardStepContent 
              step={currentStep} 
              activeCompany={activeCompany} 
              userSession={userSession}
              regions={regions}
              sites={sites}
              departments={departments}
              employees={employees}
              missingA3={missingA3}
              missingA4={missingA4}
              missingA5={missingA5}
              missingA6={missingA6}
            />
          </div>

          {/* Footer Navigation */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-800/90 backdrop-blur-sm flex justify-between">
            <button 
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {currentStep < 10 ? (
              <button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
                className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-400"
              >
                Next Step
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={() => {
                  if (canProceed()) {
                    showSuccess('Organization Setup Complete!');
                    onClose();
                  }
                }}
                disabled={!canProceed()}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Finish Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STEP CONTENT COMPONENTS
// ============================================================================

const WizardStepContent: React.FC<any> = ({ 
  step, activeCompany, userSession, regions, sites, departments, employees, 
  missingA3, missingA4, missingA5, missingA6 
}) => {
  switch (step) {
    case 1:
      return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-2xl">
          <h3 className="text-white font-bold mb-4">Company Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Company Code</label>
              <div className="bg-slate-900/50 px-3 py-2 rounded text-white font-mono">{activeCompany.companyCode}</div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Brand Name</label>
              <div className="bg-slate-900/50 px-3 py-2 rounded text-white">{activeCompany.brandName}</div>
            </div>
          </div>
          <div className="mt-6 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg flex gap-3">
            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
            <p className="text-sm text-indigo-300/80">
              Please verify the company details. The setup wizard will enforce a strict top-down hierarchy. You cannot proceed to the next tier without fulfilling the requirements of the current one.
            </p>
          </div>
        </div>
      );
    case 2:
      return <GenericListManager collectionName="regions" title="Regions" activeCompany={activeCompany} items={regions} itemName="Region" icon={<Map className="w-4 h-4" />} />
    case 3:
      return <GenericListManager collectionName="sites" title="Sites" activeCompany={activeCompany} items={sites} itemName="Site" requiresRegion regions={regions} icon={<MapPin className="w-4 h-4" />} />
    case 4:
        return (
          <div>
            <div className="mb-6 bg-slate-700/50 p-4 rounded-lg">
              <h4 className="text-sm font-bold text-slate-200">Required Departments</h4>
              <p className="text-xs text-slate-400 mt-1 mb-3">Please ensure the following departments are created:</p>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_DEPTS_GLOBAL.map(dName => {
                  const exists = departments.some(d => d.name.toUpperCase() === dName);
                  return (
                    <div key={dName} className={`px-3 py-1 rounded text-xs font-medium border ${exists ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                      {dName} {exists && '✓'}
                    </div>
                  );
                })}
              </div>
            </div>
            <GenericListManager collectionName="departments" title="Departments" activeCompany={activeCompany} items={departments} itemName="Department" icon={<Briefcase className="w-4 h-4" />} />
          </div>
        );
    case 5:
      return <EmployeeCreationForm title="A2 General Manager" aLvl="A2_GENERAL_MANAGER" role="MANAGEMENT" activeCompany={activeCompany} />
    case 6:
        return (
          <div>
            {missingA3.length > 0 && (
               <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-lg flex gap-3">
                 <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                 <div>
                   <h4 className="text-sm font-bold text-rose-400">Action Required</h4>
                   <p className="text-xs text-rose-300/80 mt-1">You must assign at least one A3 Official for every required department.</p>
                   <ul className="list-disc list-inside mt-2 text-xs text-rose-300">
                     {missingA3.map((dName: any) => <li key={dName}>{dName}</li>)}
                   </ul>
                 </div>
               </div>
            )}
            <EmployeeCreationForm title="A3 Officials" aLvl="A3_DEPARTMENT_HEAD" role="STAFF" activeCompany={activeCompany} requiresDepartment departments={departments} />
          </div>
        );
    case 7:
      return (
        <div>
          {missingA4.length > 0 && (
             <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-lg flex gap-3">
               <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
               <div>
                 <h4 className="text-sm font-bold text-rose-400">Action Required</h4>
                 <p className="text-xs text-rose-300/80 mt-1">You must assign at least one A4 Regional Manager to every region before proceeding.</p>
                 <ul className="list-disc list-inside mt-2 text-xs text-rose-300">
                   {missingA4.map((r: any) => <li key={r.id}>{r.name}</li>)}
                 </ul>
               </div>
             </div>
          )}
          <EmployeeCreationForm title="A4 Regional Manager" aLvl="A4_REGIONAL_MANAGER" role="MANAGEMENT" activeCompany={activeCompany} requiresRegion regions={regions} />
        </div>
      );
    case 8:
      return (
        <div>
          {missingA5.length > 0 && (
             <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-lg flex gap-3">
               <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
               <div>
                 <h4 className="text-sm font-bold text-rose-400">Action Required</h4>
                 <p className="text-xs text-rose-300/80 mt-1">You must assign at least one A5 Site In-Charge to every site before proceeding.</p>
               </div>
             </div>
          )}
          <EmployeeCreationForm title="A5 Site In-Charge" aLvl="A5_SITE_INCHARGE" role="MANAGEMENT" activeCompany={activeCompany} requiresRegion regions={regions} requiresSite sites={sites} />
        </div>
      );
    case 9:
      return (
        <div>
          {missingA6.length > 0 && (
             <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-lg flex gap-3">
               <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
               <div>
                 <h4 className="text-sm font-bold text-rose-400">Action Required</h4>
                 <p className="text-xs text-rose-300/80 mt-1">You must assign at least one A6 Supervisor to every site before proceeding.</p>
               </div>
             </div>
          )}
          <EmployeeCreationForm title="A6 Security Supervisor" aLvl="A6_SECURITY_SUPERVISOR" role="SUPERVISOR" activeCompany={activeCompany} requiresRegion regions={regions} requiresSite sites={sites} />
        </div>
      );
    case 10:
      return <WorkforceBulkCreation activeCompany={activeCompany} sites={sites} employees={employees} />
    default:
      return <div>Step not implemented</div>
  }
};

// ============================================================================
// GENERIC LIST MANAGER (for Regions, Sites, Depts)
// ============================================================================

const GenericListManager = ({ collectionName, title, activeCompany, items, itemName, requiresRegion = false, regions = [], icon }: any) => {
  const [name, setName] = useState('');
  const [regionId, setRegionId] = useState('');
  const { showSuccess, showError, showLoading } = useFeedback();

  const handleAdd = async () => {
    if (!name.trim()) return;
    if (requiresRegion && !regionId) {
      showError('Please select a region');
      return;
    }
    const hide = showLoading(`Creating ${itemName}...`);
    try {
      const colRef = collection(db, 'companies', activeCompany.companyId, collectionName);
      const newRef = doc(colRef);
      const payload: any = {
        id: newRef.id,
        name: name.trim(),
        companyId: activeCompany.companyId,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (requiresRegion) {
        payload.regionId = regionId;
      }
      await setDoc(newRef, payload);
      setName('');
      showSuccess(`${itemName} created successfully`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      hide();
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">{itemName} Name</label>
          <input 
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white" 
            placeholder={`Enter ${itemName.toLowerCase()} name...`}
          />
        </div>
        {requiresRegion && (
          <div className="w-64">
            <label className="block text-xs text-slate-400 mb-1">Region</label>
            <select
              value={regionId}
              onChange={e => setRegionId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Select Region...</option>
              {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}
        <button onClick={handleAdd} className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2 h-10">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 border-b border-slate-700">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{itemName} Name</th>
              {requiresRegion && <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Region</th>}
              <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {items.map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-700/20">
                <td className="px-6 py-4 text-sm text-white font-medium flex items-center gap-2">
                  {icon}
                  {item.name}
                </td>
                {requiresRegion && (
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {regions.find((r:any) => r.id === item.regionId)?.name || 'Unknown'}
                  </td>
                )}
                <td className="px-6 py-4 text-sm">
                  <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-medium">Active</span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-500 text-sm">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// SINGLE EMPLOYEE CREATION
// ============================================================================

const EmployeeCreationForm = ({ title, aLvl, role, activeCompany, requiresRegion, regions, requiresSite, sites, requiresDepartment, departments }: any) => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', contactNumber: '', email: '', 
    assignedRegionId: '', assignedSiteId: '', departmentId: ''
  });
  const [createdRecords, setCreatedRecords] = useState<any[]>([]);
  const { showSuccess, showError, showLoading } = useFeedback();
  
  const token = localStorage.getItem('token');

  const filteredSites = requiresSite && formData.assignedRegionId 
    ? sites.filter((s:any) => s.regionId === formData.assignedRegionId)
    : sites || [];

  const handleCreate = async () => {
    if (!formData.firstName || !formData.contactNumber) {
      return showError('First Name and Mobile are required.');
    }
    if (requiresRegion && !formData.assignedRegionId) return showError('Region is required.');
    if (requiresSite && !formData.assignedSiteId) return showError('Site is required.');
    if (requiresDepartment && !formData.departmentId) return showError('Department is required.');

    const hide = showLoading(`Creating ${title}...`);
    try {
      const res = await fetch('/api/admin/setup-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          companyId: activeCompany.companyId,
          employeeData: { ...formData, role, aLvl, designation: title }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');
      
      showSuccess('Account created! Write down the PIN.');
      setCreatedRecords([data, ...createdRecords]);
      setFormData({ ...formData, firstName: '', lastName: '', contactNumber: '', email: '' });
    } catch (e: any) {
      showError(e.message);
    } finally {
      hide();
    }
  };

  return (
    <div className="max-w-4xl flex gap-6">
      <div className="flex-1 bg-slate-800 rounded-xl p-6 border border-slate-700 shrink-0">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-indigo-400" /> Create {title}</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">First Name *</label>
            <input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Last Name</label>
            <input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Mobile / Username *</label>
            <input value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email (Optional)</label>
            <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-slate-700/50">
          {requiresRegion && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Assign Region *</label>
              <select value={formData.assignedRegionId} onChange={e => setFormData({...formData, assignedRegionId: e.target.value, assignedSiteId: ''})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                <option value="">Select...</option>
                {regions.map((r:any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          {requiresSite && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Assign Site *</label>
              <select value={formData.assignedSiteId} onChange={e => setFormData({...formData, assignedSiteId: e.target.value})} disabled={!formData.assignedRegionId} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white disabled:opacity-50">
                <option value="">Select...</option>
                {filteredSites.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {requiresDepartment && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Assign Department *</label>
              <select value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                <option value="">Select...</option>
                {departments.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <button onClick={handleCreate} className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold">
          Create Account & Generate PIN
        </button>
      </div>

      <div className="w-80 shrink-0">
        <h4 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">Generated Credentials</h4>
        <div className="space-y-3">
          {createdRecords.length === 0 && (
            <div className="text-sm text-slate-500 italic p-4 bg-slate-800/50 rounded-lg border border-dashed border-slate-700 text-center">
              No accounts created yet.
            </div>
          )}
          {createdRecords.map((rec, i) => (
            <div key={i} className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded-lg">
              <div className="text-white font-bold text-sm mb-2">{rec.employeeName}</div>
              <div className="flex justify-between items-center bg-slate-900 rounded p-2 border border-slate-700">
                <span className="text-xs text-slate-400">PIN CODE</span>
                <span className="text-lg font-mono font-bold text-emerald-400 tracking-widest">{rec.pin}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// WORKFORCE BULK CREATION
// ============================================================================

const WorkforceBulkCreation = ({ activeCompany, sites, employees }: any) => {
  const [rows, setRows] = useState<any[]>([]);
  const { showSuccess, showError, showLoading } = useFeedback();
  const token = localStorage.getItem('token');

  const addRow = () => {
    setRows([...rows, { tempId: Date.now(), firstName: '', lastName: '', contactNumber: '', aLvl: 'A7_GUARD', assignedSiteId: '', supervisorId: '', pin: null, error: null }]);
  };

  useEffect(() => {
    if (rows.length === 0) addRow();
  }, []);

  const updateRow = (id: number, field: string, value: any) => {
    setRows(rows.map(r => r.tempId === id ? { ...r, [field]: value } : r));
  };

  const removeRow = (id: number) => {
    setRows(rows.filter(r => r.tempId !== id));
  };

  const handleSubmit = async () => {
    const validRows = rows.filter(r => !r.pin && r.firstName && r.contactNumber && r.assignedSiteId && r.supervisorId);
    if (validRows.length === 0) return showError('No valid pending rows to submit.');

    const hide = showLoading(`Processing ${validRows.length} accounts...`);
    try {
      const payload = validRows.map(r => {
        const site = sites.find((s:any) => s.id === r.assignedSiteId);
        return {
          ...r,
          role: 'GUARD',
          designation: r.aLvl === 'A7_GUARD' ? 'Security Guard' : 'Support Staff',
          assignedRegionId: site?.regionId
        };
      });

      const res = await fetch('/api/admin/setup-employee-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ companyId: activeCompany.companyId, employees: payload })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Bulk setup failed');
      
      // Merge results
      setRows(current => current.map(r => {
        const result = data.results.find((res: any) => res.tempId === r.tempId);
        if (result) {
          if (result.success) {
            return { ...r, pin: result.pin, error: null };
          } else {
            return { ...r, error: result.error };
          }
        }
        return r;
      }));
      
      showSuccess(`Processed ${data.results.length} accounts.`);
    } catch (e: any) {
      showError(e.message);
    } finally {
      hide();
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-full max-h-[600px]">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          Bulk Workforce Onboarding
        </h3>
        <button onClick={addRow} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-medium flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add Row
        </button>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr>
              <th className="p-2 text-xs font-bold text-slate-400">First Name *</th>
              <th className="p-2 text-xs font-bold text-slate-400">Last Name</th>
              <th className="p-2 text-xs font-bold text-slate-400">Mobile *</th>
              <th className="p-2 text-xs font-bold text-slate-400">Level *</th>
              <th className="p-2 text-xs font-bold text-slate-400">Site *</th>
              <th className="p-2 text-xs font-bold text-slate-400">Supervisor *</th>
              <th className="p-2 text-xs font-bold text-slate-400 w-32">Status / PIN</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const supervisors = employees.filter((e:any) => e.authorityLevel === 'A6_SECURITY_SUPERVISOR' && e.assignedSiteId === row.assignedSiteId);
              
              return (
                <tr key={row.tempId} className="border-b border-slate-700/50">
                  <td className="p-2"><input disabled={!!row.pin} value={row.firstName} onChange={e => updateRow(row.tempId, 'firstName', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white disabled:opacity-50" placeholder="First" /></td>
                  <td className="p-2"><input disabled={!!row.pin} value={row.lastName} onChange={e => updateRow(row.tempId, 'lastName', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white disabled:opacity-50" placeholder="Last" /></td>
                  <td className="p-2"><input disabled={!!row.pin} value={row.contactNumber} onChange={e => updateRow(row.tempId, 'contactNumber', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white disabled:opacity-50" placeholder="Mobile" /></td>
                  <td className="p-2">
                    <select disabled={!!row.pin} value={row.aLvl} onChange={e => updateRow(row.tempId, 'aLvl', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white disabled:opacity-50">
                      <option value="A7_GUARD">A7 (Guard)</option>
                      <option value="A8_RELIEVER">A8 (Reliever)</option>
                      <option value="A9_SUPPORT_STAFF">A9 (Support)</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <select disabled={!!row.pin} value={row.assignedSiteId} onChange={e => { updateRow(row.tempId, 'assignedSiteId', e.target.value); updateRow(row.tempId, 'supervisorId', ''); }} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white disabled:opacity-50">
                      <option value="">Select...</option>
                      {sites.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select disabled={!!row.pin || !row.assignedSiteId} value={row.supervisorId} onChange={e => updateRow(row.tempId, 'supervisorId', e.target.value)} className={`w-full bg-slate-900 border ${!row.supervisorId && row.assignedSiteId && supervisors.length === 0 ? 'border-rose-500' : 'border-slate-700'} rounded px-2 py-1.5 text-sm text-white disabled:opacity-50`}>
                      <option value="">{supervisors.length === 0 ? 'No Supervisor Available!' : 'Select A6...'}</option>
                      {supervisors.map((s:any) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    {row.pin ? (
                      <span className="inline-flex px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-mono font-bold rounded text-xs">
                        {row.pin}
                      </span>
                    ) : row.error ? (
                      <span className="text-xs text-rose-400" title={row.error}>Failed</span>
                    ) : (
                      <span className="text-xs text-slate-500">Pending</span>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {!row.pin && (
                      <button onClick={() => removeRow(row.tempId)} className="text-slate-500 hover:text-rose-400">
                        &times;
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-end">
        <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2">
          Submit Pending Rows
        </button>
      </div>
    </div>
  )
};

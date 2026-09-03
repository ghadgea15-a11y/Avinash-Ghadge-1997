import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  Download, 
  Check, 
  X, 
  Printer, 
  Eye, 
  ChevronRight,
  ClipboardCheck,
  Building2,
  Image as ImageIcon,
  MoreVertical,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { 
  UserSession, 
  CompanyTenant, 
  SiteRecord
} from '../../types';
import { 
  SafetyChecksheetRecord, 
  SafetyChecksheetTemplate, 
  SafetyChecksheetItem,
  SafetyInterlockResult 
} from '../../types/ops';
import { FirestoreService } from '../../services/firestoreService';
import { motion, AnimatePresence } from 'motion/react';

interface SafetyChecksheetModuleProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  sites: SiteRecord[];
}

const TEMPLATES: { type: SafetyChecksheetTemplate; title: string; category: string }[] = [
  { type: 'FIRE_SAFETY_INSPECTION', title: 'Fire Safety Inspection', category: 'Compliance' },
  { type: 'PPE_COMPLIANCE_AUDIT', title: 'PPE Compliance Audit', category: 'Health & Safety' },
  { type: 'ELECTRICAL_SAFETY_CHECK', title: 'Electrical Safety Check', category: 'Infrastructure' },
  { type: 'SITE_HAZARD_INSPECTION', title: 'Site Hazard Inspection', category: 'Environment' },
  { type: 'GENERAL_SAFETY_WALK', title: 'General Safety Walk', category: 'Audit' }
];

const DEFAULT_QUESTIONS: Record<SafetyChecksheetTemplate, { category: string; question: string }[]> = {
  FIRE_SAFETY_INSPECTION: [
    { category: 'Fire Extinguishers', question: 'All fire extinguishers are in their designated locations?' },
    { category: 'Fire Extinguishers', question: 'Extinguishers are pressurized and within valid service date?' },
    { category: 'Exits & Escape Routes', question: 'Emergency exits are unobstructed and unlocked?' },
    { category: 'Exits & Escape Routes', question: 'Emergency lighting and exit signs are functional?' },
    { category: 'Alarms', question: 'Fire alarm panel is in "Normal" status with no faults?' },
    { category: 'Storage', question: 'Flammable materials are stored in approved containers/areas?' }
  ],
  PPE_COMPLIANCE_AUDIT: [
    { category: 'Head Protection', question: 'All personnel in mandatory zones are wearing safety helmets?' },
    { category: 'Foot Protection', question: 'Safety shoes/boots are being worn correctly by all staff?' },
    { category: 'Visibility', question: 'Reflective jackets/high-visibility vests are clean and visible?' },
    { category: 'Eye/Face', question: 'Safety goggles/shields are used during welding or grinding?' },
    { category: 'Hand Protection', question: 'Appropriate gloves are used for handling chemicals/rough items?' }
  ],
  ELECTRICAL_SAFETY_CHECK: [
    { category: 'Panels', question: 'Electrical panels are kept closed and have no exposed wiring?' },
    { category: 'Cables', question: 'Extension cords and cables are free from cuts or splices?' },
    { category: 'Grounding', question: 'Equipment grounding/earthing is properly connected?' },
    { category: 'Access', question: 'Access to main switchboards is clear of any storage/blockage?' }
  ],
  SITE_HAZARD_INSPECTION: [
    { category: 'Walkways', question: 'Walkways are clear of trip hazards like cables or debris?' },
    { category: 'Lighting', question: 'All areas are sufficiently lit for safe working?' },
    { category: 'Height Safety', question: 'Ladders and scaffolding are in good condition and secure?' },
    { category: 'Signage', question: 'Appropriate hazard warning signs are displayed where needed?' }
  ],
  GENERAL_SAFETY_WALK: [
    { category: 'General', question: 'First aid kits are fully stocked and easily accessible?' },
    { category: 'General', question: 'Housekeeping is maintained and no waste is accumulated?' },
    { category: 'General', question: 'Staff are aware of emergency assembly points?' }
  ]
};

export const SafetyChecksheetModule: React.FC<SafetyChecksheetModuleProps> = ({
  userSession,
  activeCompany,
  sites
}) => {
  const [view, setView] = useState<'LIST' | 'CREATE' | 'DETAIL'>('LIST');
  const [records, setRecords] = useState<SafetyChecksheetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Form State
  const [selectedTemplate, setSelectedTemplate] = useState<SafetyChecksheetTemplate | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [formItems, setFormItems] = useState<SafetyChecksheetItem[]>([]);
  const [summaryRemarks, setSummaryRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Detail State
  const [selectedRecord, setSelectedRecord] = useState<SafetyChecksheetRecord | null>(null);

  // EHS Interlock Emergency Modal State
  const [interlockModalData, setInterlockModalData] = useState<SafetyInterlockResult | null>(null);

  useEffect(() => {
    loadRecords();
  }, [userSession.companyId]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await FirestoreService.getSafetyChecksheets(userSession.companyId);
      setRecords(data);
    } catch (err) {
      console.error('Error loading safety records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = (template: SafetyChecksheetTemplate) => {
    setSelectedTemplate(template);
    const questions = DEFAULT_QUESTIONS[template];
    const initialItems: SafetyChecksheetItem[] = questions.map((q, idx) => ({
      id: `item_${idx}`,
      category: q.category,
      question: q.question,
      response: 'YES'
    }));
    setFormItems(initialItems);
    setSummaryRemarks('');
    setSelectedSiteId(sites.length > 0 ? sites[0].id : '');
    setView('CREATE');
  };

  const handleSave = async () => {
    if (!selectedTemplate || !selectedSiteId) return;

    setIsSaving(true);
    try {
      const siteName = sites.find(s => s.id === selectedSiteId)?.siteName || 'Unknown Site';
      const templateTitle = TEMPLATES.find(t => t.type === selectedTemplate)?.title || selectedTemplate;
      const isFailedInspection = formItems.some(i => i.response === 'NO');
      
      const newRecord: SafetyChecksheetRecord = {
        id: `SAFETY_${Date.now()}`,
        companyId: userSession.companyId,
        siteId: selectedSiteId,
        siteName,
        templateType: selectedTemplate,
        title: templateTitle,
        performedByUserId: userSession.userId,
        performedByUserName: userSession.fullName,
        items: formItems,
        overallStatus: isFailedInspection ? 'FAIL' : 'PASS',
        summaryRemarks,
        branding: {
          companyName: activeCompany?.companyLegalName || activeCompany?.name || 'My Company',
          logoUrl: activeCompany?.logoUrl
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await FirestoreService.saveSafetyChecksheet(userSession.companyId, newRecord, userSession);
      if (result.success) {
        await loadRecords();
        if (result.interlockResult?.interlockTriggered) {
          setInterlockModalData(result.interlockResult);
        }
        setView('LIST');
      } else {
        alert('Failed to save checksheet');
      }
    } catch (err) {
      console.error('Error saving checksheet:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const renderBrandingHeader = (branding: { companyName: string, logoUrl?: string }) => (
    <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
      <div className="flex items-center gap-4">
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt="Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
        ) : (
          <div className="h-12 w-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            {branding.companyName.charAt(0)}
          </div>
        )}
        <div>
          <h2 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">{branding.companyName}</h2>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Official Safety Compliance Document</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-bold text-slate-400">Document ID</div>
        <div className="text-sm font-mono font-bold text-black dark:text-white">SF-CHK-{Date.now().toString().slice(-6)}</div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {view !== 'LIST' && (
            <button onClick={() => setView('LIST')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition">
              <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              Safety Check Sheets
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Compliance & Audit Module</p>
          </div>
        </div>
        {view === 'LIST' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search audits..."
                className="pl-9 pr-4 py-1.5 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs w-48"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-5xl mx-auto">
          {view === 'LIST' && (
            <div className="space-y-6">
              {/* Templates Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TEMPLATES.map(temp => (
                  <button
                    key={temp.type}
                    onClick={() => handleStartNew(temp.type)}
                    className="p-4 bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all text-left shadow-sm hover:shadow-md group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ClipboardCheck className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{temp.category}</span>
                    </div>
                    <h3 className="font-bold text-black dark:text-white mb-1">{temp.title}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Create a new inspection report for this category.</p>
                  </button>
                ))}
              </div>

              {/* History Table */}
              <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-black dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Recent Inspection Reports
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white dark:bg-slate-950 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-bold">Report Title / Site</th>
                        <th className="px-6 py-4 font-bold">Performed By</th>
                        <th className="px-6 py-4 font-bold text-center">Status</th>
                        <th className="px-6 py-4 font-bold">Date</th>
                        <th className="px-6 py-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading reports...</td>
                        </tr>
                      ) : records.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No inspection records found</td>
                        </tr>
                      ) : (
                        records.map(rec => (
                          <tr key={rec.id} className="hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-black dark:text-white">{rec.title}</span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {rec.siteName}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                              <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5" />
                                <span className="text-xs">{rec.performedByUserName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-[11px] font-black border ${
                                rec.overallStatus === 'PASS' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : 'bg-rose-50 text-rose-600 border-rose-100'
                              }`}>
                                {rec.overallStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                              {new Date(rec.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => { setSelectedRecord(rec); setView('DETAIL'); }}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-indigo-600 transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === 'CREATE' && (
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Branding Section */}
              <div className="p-8 border-b border-slate-100 dark:border-slate-700">
                {renderBrandingHeader({ 
                  companyName: activeCompany?.companyLegalName || activeCompany?.name || 'My Company',
                  logoUrl: activeCompany?.logoUrl
                })}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
                  <div className="flex-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Audit Site / Location</label>
                    <select
                      value={selectedSiteId}
                      onChange={(e) => setSelectedSiteId(e.target.value)}
                      className="w-full p-3 rounded-xl bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                    >
                      {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
                    </select>
                  </div>
                  <div className="w-full md:w-48 text-right">
                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Inspection Date</div>
                    <div className="p-3 bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold flex items-center justify-end gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  {formItems.map((item, idx) => (
                    <div key={item.id} className="p-4 bg-white dark:bg-slate-950 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">{item.category}</span>
                        <p className="text-sm font-bold text-black dark:text-white mt-1">{item.question}</p>
                      </div>
                      <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <button 
                          onClick={() => {
                            const newItems = [...formItems];
                            newItems[idx].response = 'YES';
                            setFormItems(newItems);
                          }}
                          className={`px-4 py-2 rounded-lg text-[11px] font-black transition ${
                            item.response === 'YES' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          YES
                        </button>
                        <button 
                          onClick={() => {
                            const newItems = [...formItems];
                            newItems[idx].response = 'NO';
                            setFormItems(newItems);
                          }}
                          className={`px-4 py-2 rounded-lg text-[11px] font-black transition ${
                            item.response === 'NO' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          NO
                        </button>
                        <button 
                          onClick={() => {
                            const newItems = [...formItems];
                            newItems[idx].response = 'NA';
                            setFormItems(newItems);
                          }}
                          className={`px-4 py-2 rounded-lg text-[11px] font-black transition ${
                            item.response === 'NA' ? 'bg-white0 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          N/A
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Overall Summary & Corrective Actions</label>
                  <textarea
                    rows={4}
                    placeholder="Enter inspection summary, identified risks, or required corrective actions..."
                    className="w-full p-4 rounded-2xl bg-white dark:bg-slate-950 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={summaryRemarks}
                    onChange={(e) => setSummaryRemarks(e.target.value)}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 bg-white dark:bg-slate-950 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Digital Sign: {userSession.fullName}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setView('LIST')} className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    Discard
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                    Submit Final Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === 'DETAIL' && selectedRecord && (
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden print:shadow-none print:border-none">
              <div className="p-8 border-b border-slate-100 dark:border-slate-700">
                {renderBrandingHeader(selectedRecord.branding)}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-8">
                  <div className="space-y-4 flex-1">
                    <h2 className="text-2xl font-black text-black dark:text-white uppercase leading-tight">{selectedRecord.title}</h2>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-[11px] font-bold text-slate-900 dark:text-slate-300 uppercase">{selectedRecord.siteName}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-[11px] font-bold text-slate-900 dark:text-slate-300 uppercase">{selectedRecord.performedByUserName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Overall Result</div>
                    <div className={`text-3xl font-black ${selectedRecord.overallStatus === 'PASS' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {selectedRecord.overallStatus}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="space-y-4">
                  {selectedRecord.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between py-3 border-b border-slate-50 dark:border-slate-700 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-black dark:text-slate-200">{item.question}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{item.category}</span>
                      </div>
                      <div className={`px-4 py-1 rounded-md text-[11px] font-black border ${
                        item.response === 'YES' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : item.response === 'NO'
                          ? 'bg-rose-50 text-rose-600 border-rose-100'
                          : 'bg-white text-slate-600 border-slate-100'
                      }`}>
                        {item.response}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedRecord.summaryRemarks && (
                  <div className="mt-8 p-6 bg-white dark:bg-slate-950 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" />
                      Auditor Remarks & Corrective Actions
                    </h4>
                    <p className="text-sm text-slate-900 dark:text-slate-300 leading-relaxed italic">
                      "{selectedRecord.summaryRemarks}"
                    </p>
                  </div>
                )}

                <div className="mt-12 pt-8 border-t-2 border-slate-100 dark:border-slate-700 flex justify-between items-end">
                  <div className="space-y-1">
                    <div className="h-10 w-48 border-b-2 border-slate-900 dark:border-slate-200 font-mono text-xs flex items-end pb-1 italic opacity-50">
                      Digital Signature Verified
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Authorized Safety Officer Signature</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Report Generated</div>
                    <div className="text-xs font-bold text-black dark:text-white">
                      {new Date(selectedRecord.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white dark:bg-slate-950 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between print:hidden">
                <button onClick={() => setView('LIST')} className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-300 flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back to History
                </button>
                <div className="flex items-center gap-3">
                  <button onClick={() => window.print()} className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Print PDF
                  </button>
                  <button className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition flex items-center gap-2">
                    <Download className="w-4 h-4" /> Export Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🚨 EHS SAFETY INTERLOCK EMERGENCY MODAL */}
      <AnimatePresence>
        {interlockModalData && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-rose-500 max-w-xl w-full shadow-2xl overflow-hidden"
            >
              <div className="bg-rose-500 text-white p-6 flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl animate-pulse">
                  <ShieldAlert className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-wide uppercase">Automated Safety Interlock Triggered</h3>
                  <p className="text-xs text-rose-100 font-medium">Critical non-compliance detected. Site safety hold enacted.</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400 mb-2">
                    <span>Target Site: {interlockModalData.siteName || interlockModalData.siteId}</span>
                    <span className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-[11px] font-black">AUTO-HALTED</span>
                  </div>
                  <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed font-semibold">
                    {interlockModalData.message}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Work Orders Halted</span>
                    <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                      {interlockModalData.haltedWorkOrdersCount}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Field Tasks Frozen</span>
                    <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                      {interlockModalData.haltedTasksCount}
                    </span>
                  </div>
                </div>

                {interlockModalData.failedHazards.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Failed Hazards Requiring Clearance:
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {interlockModalData.failedHazards.map((h, i) => (
                        <div key={i} className="p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs flex items-start gap-2 border border-slate-200 dark:border-slate-700">
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">[{h.category}]</span> {h.question}
                            {h.remarks && <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">{h.remarks}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => setInterlockModalData(null)}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-md"
                  >
                    Acknowledge & View Records
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

import React, { useState } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { Download, Filter, FileText, Plus, CheckCircle2, ChevronRight, Activity, Calendar } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { UserSession, CompanyTenant } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';

interface CustomReportsViewProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
}

export const CustomReportsView: React.FC<CustomReportsViewProps> = ({ userSession, activeCompany }) => {
  const { isDark } = useTheme();
  const [selectedModule, setSelectedModule] = useState<string>('ATTENDANCE');
  useBackNavigation(!!selectedModule, () => setSelectedModule(null as any), 'selectedModule');
  const [reportName, setReportName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleGeneratePreview = async () => {
    if (!activeCompany) return;
    setIsGenerating(true);
    try {
      let q;
      if (selectedModule === 'ATTENDANCE') {
        q = query(collection(db, 'companies', activeCompany.companyId, 'attendance'));
      } else if (selectedModule === 'EMPLOYEES') {
        q = query(collection(db, 'companies', activeCompany.companyId, 'employees'));
      } else if (selectedModule === 'ASSETS') {
        q = query(collection(db, 'companies', activeCompany.companyId, 'assets'));
      } else {
        q = query(collection(db, 'companies', activeCompany.companyId, 'attendance'));
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Record<string, any>) })).slice(0, 10);
      setPreviewData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = async () => {
    if (!activeCompany || previewData.length === 0) return;
    try {
      await BulkExportGovernanceService.evaluateAndRecordExport({
        session: userSession!,
        companyId: activeCompany.companyId,
        module: 'BI_CUSTOM_REPORT',
        entityType: 'CustomReportRecord',
        exportFormat: 'CSV',
        dataClassification: 'INTERNAL_SENSITIVE',
        recordCount: previewData.length,
        exportName: `${activeCompany.companyId}_Custom_${selectedModule}.csv`,
        reason: 'Custom Report Export'
      });

      const headers = Object.keys(previewData[0]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [
        headers.join(','),
        ...previewData.map(row => headers.map(h => `"${String(row[h] || '')}"`).join(','))
      ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Custom_${selectedModule}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('CSV Export error:', e);
      alert('Failed to export CSV. Permission denied or error.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className={`lg:col-span-1 p-4 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-rose-500" />
            Report Builder
          </h3>
          
          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Module</label>
              <select 
                value={selectedModule}
                onChange={e => setSelectedModule(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'}`}
              >
                <option value="ATTENDANCE">Attendance & Timesheets</option>
                <option value="EMPLOYEES">Employee Directory</option>
                <option value="ASSETS">Assets & Inventory</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Date Range</label>
              <select className={`w-full p-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'}`}>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_MONTH">Last Month</option>
                <option value="YTD">Year to Date</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Columns to Include</label>
              <div className={`p-3 rounded-xl border space-y-2 ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-rose-500" /> ID
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-rose-500" /> Name / Description
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-rose-500" /> Status
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-rose-500" /> Date/Timestamp
                </label>
              </div>
            </div>

            <button 
              onClick={handleGeneratePreview}
              disabled={isGenerating}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm"
            >
              {isGenerating ? 'Generating...' : 'Run Report'}
            </button>
          </div>
        </div>

        <div className={`lg:col-span-3 p-6 rounded-3xl border flex flex-col ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Report Preview
            </h3>
            {previewData.length > 0 && (
              <button 
                onClick={handleExportCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-auto">
            {previewData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Activity className="w-12 h-12 mb-2 opacity-50" />
                <p>Configure and run the report to see preview (max 10 rows shown).</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    {Object.keys(previewData[0]).filter(k => typeof previewData[0][k] !== 'object').map(key => (
                      <th key={key} className="p-3 font-bold uppercase tracking-wider">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {previewData.map((row, i) => (
                    <tr key={i}>
                      {Object.keys(previewData[0]).filter(k => typeof previewData[0][k] !== 'object').map(key => (
                        <td key={key} className="p-3 text-slate-600 dark:text-slate-300">
                          {String(row[key] || '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

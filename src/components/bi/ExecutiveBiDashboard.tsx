import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Clock,
  BarChart2
} from 'lucide-react';
import { CompanyTenant, UserSession } from '../../types';
import { BiService } from '../../services/biService';
import { KpiSnapshot } from '../../types';
import { RbacService } from '../../services/rbacService';

interface BiDashboardProps {
  session: UserSession;
  company: CompanyTenant;
}

const CATEGORIES = [
  { id: 'WORKFORCE', label: 'Workforce & HCM' },
  { id: 'ATTENDANCE', label: 'Attendance & Time' },
  { id: 'FINANCE', label: 'Payroll & Finance' },
  { id: 'OPERATIONS', label: 'Site Operations' },
  { id: 'COMPLIANCE', label: 'Compliance & Risk' }
];

export const ExecutiveBiDashboard: React.FC<BiDashboardProps> = ({ session, company }) => {
  const [snapshot, setSnapshot] = useState<KpiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  useEffect(() => {
    // 1. Fetch latest snapshot
    const fetchLatest = async () => {
      try {
        const latest = await BiService.getLatestSnapshot(company.companyId);
        setSnapshot(latest);
      } catch (err) {
        console.error('Error fetching BI snapshot:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLatest();

    // 2. Poll for updates if generating
    let interval: NodeJS.Timeout;
    if (snapshot?.status === 'GENERATING' || snapshot?.status === 'PARTIAL') {
      interval = setInterval(fetchLatest, 5000);
    }
    return () => clearInterval(interval);
  }, [company.companyId, snapshot?.status]);

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      await BiService.generateSnapshot(company.companyId, session);
      // Let polling pick it up
    } catch (err) {
      console.error('Generation failed:', err);
      setGenerating(false);
    }
  };

  const canGenerate = ['A0_OWNER', 'A1_DIRECTOR_CEO'].includes(RbacService.getAuthorityLevel(session) as string);

  const renderTrendIcon = (val: any) => {
    if (val.trendDirection === 'UP') return <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />;
    if (val.trendDirection === 'DOWN') return <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const renderStatusBadge = (val: any) => {
    switch (val.status) {
      case 'ON_TRACK':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle className="w-3 h-3" /> Target Met</span>;
      case 'WARNING':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"><AlertTriangle className="w-3 h-3" /> Warning</span>;
      case 'CRITICAL':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"><AlertTriangle className="w-3 h-3" /> Critical</span>;
      default:
        return null;
    }
  };

  const filteredValues = snapshot?.values.filter((v: any) => activeCategory === 'ALL' || v.category === activeCategory) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#fcfcfd] dark:bg-[#0f1115] p-6 rounded-[12px] border border-[#eaebec] dark:border-[#1f2228]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-black dark:text-white tracking-tight">Executive Telemetry</h2>
            {snapshot && snapshot.status !== 'COMPLETE' && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest
                ${snapshot.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                ${snapshot.status === 'GENERATING' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : ''}
                ${snapshot.status === 'FAILED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' : ''}
              `}>
                {snapshot.status} DATA
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" /> 
            {snapshot 
              ? `Calculated: ${format(new Date(snapshot.generatedAt), 'PP p')} • v${snapshot.calculationVersion || '1.0'}` 
              : 'No snapshot available'}
          </p>
        </div>
        {canGenerate && (
          <button 
            onClick={handleGenerateNow}
            disabled={generating || snapshot?.status === 'GENERATING'}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${(generating || snapshot?.status === 'GENERATING') ? 'animate-spin' : ''}`} />
            {generating || snapshot?.status === 'GENERATING' ? 'Calculating...' : (snapshot?.status === 'PARTIAL' ? 'Regenerate Snapshot' : 'Generate Snapshot')}
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-5 py-2.5 rounded-lg whitespace-nowrap text-xs font-bold uppercase tracking-widest transition-colors ${
            activeCategory === 'ALL' 
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
              : 'bg-white dark:bg-[#0f1115] text-slate-600 dark:text-slate-400 hover:bg-[#fcfcfd] dark:hover:bg-[#141517] border border-[#eaebec] dark:border-[#1f2228]'
          }`}
        >
          All Metrics
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-5 py-2.5 rounded-lg whitespace-nowrap text-xs font-bold uppercase tracking-widest transition-colors ${
              activeCategory === cat.id 
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                : 'bg-white dark:bg-[#0f1115] text-slate-600 dark:text-slate-400 hover:bg-[#fcfcfd] dark:hover:bg-[#141517] border border-[#eaebec] dark:border-[#1f2228]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0f1115] rounded-[12px] border border-[#eaebec] dark:border-[#1f2228]">
          <div className="w-8 h-8 border-4 border-slate-300 dark:border-slate-700 border-t-black dark:border-t-white rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Loading Telemetry...</p>
        </div>
      ) : snapshot ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredValues.map((val: any) => (
            <div key={val.kpiId} className="bg-white dark:bg-[#0f1115] p-6 rounded-[12px] border border-[#eaebec] dark:border-[#1f2228] transition-colors">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest">{val.name}</h3>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-black text-black dark:text-white">
                      {val.currentValue.toLocaleString()}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">{val.unit}</span>
                  </div>
                </div>
                {renderStatusBadge(val)}
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#eaebec] dark:border-[#1f2228]">
                <div className="flex items-center gap-1.5">
                  {renderTrendIcon(val)}
                  <span className={`text-sm font-bold ${
                    val.trendDirection === 'UP' ? 'text-emerald-600 dark:text-emerald-500' :
                    val.trendDirection === 'DOWN' ? 'text-rose-600 dark:text-rose-500' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {val.percentageChange !== null ? `${Math.abs(val.percentageChange).toFixed(1)}%` : '0%'}
                  </span>
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  VS PREV: {val.previousValue !== null ? val.previousValue.toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          ))}

          {filteredValues.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 bg-[#fcfcfd] dark:bg-[#0f1115] rounded-[12px] border border-[#eaebec] dark:border-[#1f2228] border-dashed">
              <BarChart2 className="w-10 h-10 mx-auto mb-4 opacity-20" />
              <p className="font-bold text-sm tracking-wide">NO KPIs FOUND</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#fcfcfd] dark:bg-[#0f1115] rounded-[12px] border border-[#eaebec] dark:border-[#1f2228]">
          <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-black text-black dark:text-white mb-2 tracking-tight">No Snapshots Available</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 text-sm leading-relaxed">
            There is no KPI snapshot data for this company yet. Generate the first snapshot to populate the dashboard.
          </p>
          {canGenerate && (
            <button 
              onClick={handleGenerateNow}
              disabled={generating}
              className="inline-flex items-center gap-2 px-8 py-3 bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black font-bold rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Calculating KPIs...' : 'Generate Initial Snapshot'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

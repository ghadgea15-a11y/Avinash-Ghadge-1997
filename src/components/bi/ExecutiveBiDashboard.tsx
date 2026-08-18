import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, KpiSnapshot, KpiValue, KpiCategory } from '../../types';
import { BiService } from '../../services/biService';
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Clock, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { RbacService } from '../../services/rbacService';

interface ExecutiveBiDashboardProps {
  session: UserSession;
  company: CompanyTenant;
}

const CATEGORIES: { id: KpiCategory; label: string }[] = [
  { id: 'WORKFORCE', label: 'Workforce' },
  { id: 'OPERATIONS', label: 'Operations' },
  { id: 'FINANCE', label: 'Finance' },
  { id: 'ASSETS', label: 'Assets' },
  { id: 'INVENTORY', label: 'Inventory' },
  { id: 'CRM', label: 'CRM' }
];

export const ExecutiveBiDashboard: React.FC<ExecutiveBiDashboardProps> = ({ session, company }) => {
  const [snapshot, setSnapshot] = useState<KpiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeCategory, setActiveCategory] = useState<KpiCategory | 'ALL'>('ALL');
  
  const authorityLevel = RbacService.getAuthorityLevel(session);
  const canGenerate = ['A0_OWNER', 'A1_DIRECTOR_CEO'].includes(authorityLevel);

  useEffect(() => {
    loadLatestSnapshot();
  }, [company.companyId]);

  const loadLatestSnapshot = async () => {
    setLoading(true);
    try {
      let snap = await BiService.getLatestSnapshot(company.companyId);
      
      // Auto-generate today's snapshot if missing (Edge-triggered scheduling fallback)
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      if (canGenerate && (!snap || snap.snapshotDate !== todayStr)) {
        try {
          snap = await BiService.generateSnapshot(company.companyId, session);
        } catch (genErr) {
          console.warn('Auto-generation of daily snapshot failed or was concurrent:', genErr);
          // If it fails, another client might have just generated it, re-fetch
          snap = await BiService.getLatestSnapshot(company.companyId);
        }
      }
      
      setSnapshot(snap);
    } catch (err) {
      console.error('Failed to load snapshot:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const snap = await BiService.generateSnapshot(company.companyId, session);
      setSnapshot(snap);
    } catch (err) {
      console.error('Failed to generate snapshot:', err);
      alert('Failed to generate snapshot.');
    } finally {
      setGenerating(false);
    }
  };

  const renderTrendIcon = (val: KpiValue) => {
    if (val.trendDirection === 'UP') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (val.trendDirection === 'DOWN') return <TrendingDown className="w-4 h-4 text-rose-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const renderStatusBadge = (val: KpiValue) => {
    switch (val.status) {
      case 'ON_TARGET':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle className="w-3 h-3" /> Target Met</span>;
      case 'WARNING':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"><AlertTriangle className="w-3 h-3" /> Warning</span>;
      case 'CRITICAL':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"><AlertTriangle className="w-3 h-3" /> Critical</span>;
      default:
        return null;
    }
  };

  const filteredValues = snapshot?.values.filter(v => activeCategory === 'ALL' || v.category === activeCategory) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Executive Telemetry</h2>
            {snapshot && snapshot.status !== 'COMPLETE' && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider
                ${snapshot.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                ${snapshot.status === 'GENERATING' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                ${snapshot.status === 'FAILED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' : ''}
              `}>
                {snapshot.status} DATA
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 text-sm">
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-70 shadow-sm"
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
          className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
            activeCategory === 'ALL' 
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          All Metrics
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
              activeCategory === cat.id 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Loading Telemetry...</p>
        </div>
      ) : snapshot ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredValues.map(val => (
            <div key={val.kpiId} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              {/* Category indicator line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">{val.name}</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900 dark:text-white">
                      {val.currentValue.toLocaleString()}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{val.unit}</span>
                  </div>
                </div>
                {renderStatusBadge(val)}
              </div>
              
              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-1">
                  {renderTrendIcon(val)}
                  <span className={`text-sm font-medium ${
                    val.trendDirection === 'UP' ? 'text-emerald-600 dark:text-emerald-400' :
                    val.trendDirection === 'DOWN' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {val.percentageChange !== null ? `${Math.abs(val.percentageChange).toFixed(1)}%` : '0%'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  vs previous ({val.previousValue !== null ? val.previousValue.toLocaleString() : 'N/A'})
                </div>
              </div>
            </div>
          ))}
          {filteredValues.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
              No KPIs found for this category.
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Snapshots Available</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            There is no KPI snapshot data for this company yet. Generate the first snapshot to populate the dashboard.
          </p>
          {canGenerate && (
            <button 
              onClick={handleGenerateNow}
              disabled={generating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm"
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

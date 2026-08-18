import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, SlaDefinitionRecord, SlaBreachRecord, SlaScorecardRecord } from '../../types';
import { slaService } from '../../services/slaService';
import { crmService } from '../../services/crmService';
import { Target, AlertTriangle, FileBarChart, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { CreateSlaModal } from './CreateSlaModal';
import { SlaScorecardView } from './SlaScorecardView';
import { SlaBreachList } from './SlaBreachList';
import { SlaDefinitionList } from './SlaDefinitionList';
import { GenerateScorecardModal } from './GenerateScorecardModal';

interface Props {
  session: UserSession;
  company: CompanyTenant;
}

export const SlaScorecardTab: React.FC<Props> = ({ session, company }) => {
  const [subTab, setSubTab] = useState<'SCORECARDS' | 'DEFINITIONS' | 'BREACHES'>('SCORECARDS');
  
  const [showCreateSla, setShowCreateSla] = useState(false);
  const [showGenerateScorecard, setShowGenerateScorecard] = useState(false);
  
  const [definitions, setDefinitions] = useState<SlaDefinitionRecord[]>([]);
  const [scorecards, setScorecards] = useState<SlaScorecardRecord[]>([]);
  const [breaches, setBreaches] = useState<SlaBreachRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [defs, cards, brs] = await Promise.all([
        slaService.getSlaDefinitions(company.companyId),
        slaService.getScorecards(company.companyId),
        slaService.getSlaBreaches(company.companyId)
      ]);
      setDefinitions(defs);
      setScorecards(cards.sort((a,b) => b.generatedAt.localeCompare(a.generatedAt)));
      setBreaches(brs.sort((a,b) => b.detectedAt.localeCompare(a.detectedAt)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [company.companyId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setSubTab('SCORECARDS')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${subTab === 'SCORECARDS' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            Scorecards
          </button>
          <button 
            onClick={() => setSubTab('DEFINITIONS')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${subTab === 'DEFINITIONS' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            SLA Definitions
          </button>
          <button 
            onClick={() => setSubTab('BREACHES')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${subTab === 'BREACHES' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            Breaches
            {breaches.filter(b => b.status === 'OPEN').length > 0 && (
              <span className="ml-2 bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-xs">
                {breaches.filter(b => b.status === 'OPEN').length}
              </span>
            )}
          </button>
        </div>
        
        <div>
          {subTab === 'DEFINITIONS' && (
            <button onClick={() => setShowCreateSla(true)} className="btn-primary py-1.5 text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> New SLA
            </button>
          )}
          {subTab === 'SCORECARDS' && (
            <button onClick={() => setShowGenerateScorecard(true)} className="btn-primary py-1.5 text-sm flex items-center gap-1">
              <FileBarChart className="w-4 h-4" /> Generate Scorecard
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-500">Loading SLA data...</div>
      ) : (
        <>
          {subTab === 'SCORECARDS' && <SlaScorecardView scorecards={scorecards} />}
          {subTab === 'DEFINITIONS' && <SlaDefinitionList definitions={definitions} onRefresh={loadData} />}
          {subTab === 'BREACHES' && <SlaBreachList breaches={breaches} onRefresh={loadData} />}
        </>
      )}

      {showCreateSla && (
        <CreateSlaModal 
          session={session} 
          company={company} 
          onClose={() => setShowCreateSla(false)} 
          onSaved={() => { setShowCreateSla(false); loadData(); }} 
        />
      )}
      
      {showGenerateScorecard && (
        <GenerateScorecardModal 
          session={session} 
          company={company} 
          definitions={definitions}
          onClose={() => setShowGenerateScorecard(false)} 
          onGenerated={() => { setShowGenerateScorecard(false); loadData(); }} 
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, ContractRecord, SlaDefinitionRecord } from '../../types';
import { crmService } from '../../services/crmService';
import { slaCalculationEngine } from '../../services/slaCalculationEngine';
import { X, FileBarChart, Loader2 } from 'lucide-react';

interface Props {
  session: UserSession;
  company: CompanyTenant;
  definitions: SlaDefinitionRecord[];
  onClose: () => void;
  onGenerated: () => void;
}

export const GenerateScorecardModal: React.FC<Props> = ({ session, company, definitions, onClose, onGenerated }) => {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [formData, setFormData] = useState({
    contractId: '',
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of month
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const loadContracts = async () => {
      try {
        const res = await crmService.getContracts(company.companyId);
        // Only contracts that have SLAs defined
        const activeContracts = res.filter(c => c.status === 'ACTIVE' || c.status === 'APPROVED');
        setContracts(activeContracts);
        
        if (activeContracts.length > 0) {
          setFormData(prev => ({ ...prev, contractId: activeContracts[0].id }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadContracts();
  }, [company.companyId]);

  const handleGenerate = async () => {
    if (!formData.contractId || !formData.startDate || !formData.endDate) return;
    setGenerating(true);
    try {
      const contract = contracts.find(c => c.id === formData.contractId);
      if (!contract) throw new Error('Contract not found');

      const start = new Date(formData.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(formData.endDate);
      end.setHours(23, 59, 59, 999);

      await slaCalculationEngine.generateScorecard(
        company.companyId,
        contract.id,
        contract.clientId,
        start,
        end
      );

      onGenerated();
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const activeSlas = definitions.filter(d => d.contractId === formData.contractId && d.status === 'ACTIVE').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-indigo-600" />
            Generate Scorecard
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading configurations...</div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contract</label>
              <select
                value={formData.contractId}
                onChange={e => setFormData({ ...formData, contractId: e.target.value })}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {contracts.map(c => (
                  <option key={c.id} value={c.id}>{c.contractNumber} - {c.contractTitle}</option>
                ))}
              </select>
              {formData.contractId && (
                <p className="text-xs mt-1 text-slate-500">{activeSlas} active SLA definitions found.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
              <p className="text-sm text-indigo-800">
                Generating a scorecard will query operational data (Service Desk, Work Orders, Attendance) for the selected period to calculate compliance deterministically.
              </p>
            </div>
          </div>
        )}

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button 
            onClick={handleGenerate} 
            disabled={generating || !formData.contractId || activeSlas === 0} 
            className="btn-primary flex items-center gap-2"
          >
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculating...</> : 'Generate Scorecard'}
          </button>
        </div>
      </div>
    </div>
  );
};

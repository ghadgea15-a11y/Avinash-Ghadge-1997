import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, BillingRateMatrixRecord, ContractRecord } from '../../types';
import { billingRateService } from '../../services/billingRateService';
import { crmService } from '../../services/crmService';
import { Receipt, Plus, Calculator } from 'lucide-react';
import { BillingRateList } from './BillingRateList';
import { CreateBillingRateModal } from './CreateBillingRateModal';
import { BillingPreviewModal } from './BillingPreviewModal';

interface Props {
  session: UserSession;
  company: CompanyTenant;
}

export const BillingRatesTab: React.FC<Props> = ({ session, company }) => {
  const [rates, setRates] = useState<BillingRateMatrixRecord[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateRate, setShowCreateRate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rts, ctrs] = await Promise.all([
        billingRateService.getRates(company.companyId),
        crmService.getContracts(company.companyId)
      ]);
      setRates(rts);
      setContracts(ctrs);
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
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Billing Rate Matrices</h3>
          <p className="text-sm text-slate-500">Configure contract billing rates and generate operational billing previews.</p>
        </div>
        
        <div className="flex space-x-2">
          <button onClick={() => setShowPreview(true)} className="btn-secondary py-1.5 text-sm flex items-center gap-1">
            <Calculator className="w-4 h-4" /> Calculate Preview
          </button>
          <button onClick={() => setShowCreateRate(true)} className="btn-primary py-1.5 text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> New Rate
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-500">Loading rate matrices...</div>
      ) : (
        <BillingRateList rates={rates} contracts={contracts} />
      )}

      {showCreateRate && (
        <CreateBillingRateModal 
          session={session} 
          company={company} 
          contracts={contracts}
          onClose={() => setShowCreateRate(false)} 
          onSaved={() => { setShowCreateRate(false); loadData(); }} 
        />
      )}
      
      {showPreview && (
        <BillingPreviewModal 
          session={session} 
          company={company} 
          contracts={contracts}
          onClose={() => setShowPreview(false)} 
        />
      )}
    </div>
  );
};

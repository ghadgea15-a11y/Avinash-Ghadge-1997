import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, ContractExpiryEventRecord, ContractRecord } from '../../types';
import { contractExpiryEngine } from '../../services/contractExpiryEngine';
import { AlertTriangle, Clock, Calendar, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface Props {
  session: UserSession;
  company: CompanyTenant;
  contracts: ContractRecord[];
}

export const CrmExpiryAlerts: React.FC<Props> = ({ session, company, contracts }) => {
  const [events, setEvents] = useState<ContractExpiryEventRecord[]>([]);
  const [loading, setLoading] = useState(true);


  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [company.companyId]);

  const processNotifications = async () => {
    setProcessing(true);
    try {
      await contractExpiryEngine.processPendingNotifications(company.companyId);
      await loadEvents();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const loadEvents = async () => {

    setLoading(true);
    try {
      const evts = await contractExpiryEngine.getActiveExpiryEvents(company.companyId);
      // Sort by days remaining ascending
      evts.sort((a, b) => a.daysRemaining - b.daysRemaining);
      setEvents(evts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-slate-500 dark:text-slate-400 py-4 animate-pulse">Loading Expiry Alerts...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-xl shadow-sm p-8 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
        <CheckCircle2 className="w-12 h-12 text-emerald-300 mb-3" />
        <p className="font-medium text-slate-900 dark:text-slate-300">No active expiry alerts.</p>
        <p className="text-sm">All contracts are well within their active periods.</p>
      </div>
    );
  }

  const getContractName = (id: string) => {
    return contracts.find(c => c.id === id)?.contractTitle || id;
  };

  const getSeverityClass = (days: number) => {
    if (days <= 0) return 'bg-red-100 text-red-800 border-red-200';
    if (days <= 15) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (days <= 30) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      
      <div className="p-4 border-b border-slate-200 bg-white dark:bg-slate-950 flex justify-between items-center">
        <h3 className="font-bold text-lg text-black dark:text-slate-200 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Active Expiration Alerts
        </h3>
        <div className="flex items-center gap-3">
          <span className="bg-slate-200 text-slate-900 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-full">
            {events.length} Alerts
          </span>
          {events.some(e => e.status === 'PENDING_NOTIFICATION') && (
            <button 
              onClick={processNotifications}
              disabled={processing}
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Send Notifications'}
            </button>
          )}
        </div>
      </div>

      
      <div className="divide-y divide-slate-100">
        {events.slice(0, 10).map(evt => (
          <div key={evt.id} className="p-4 hover:bg-white dark:bg-slate-950 flex items-start justify-between">
            <div className="flex gap-3">
              <div className={`p-2 rounded-lg border ${getSeverityClass(evt.daysRemaining)} flex-shrink-0 mt-1`}>
                {evt.daysRemaining <= 0 ? <ShieldAlert className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-medium text-black dark:text-white">{getContractName(evt.contractId)}</p>
                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mt-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Ends: {new Date(evt.expiryDate || Date.now()).toLocaleDateString()}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-300">
                    {evt.daysRemaining < 0 ? `Expired ${Math.abs(evt.daysRemaining)} days ago` : 
                     evt.daysRemaining === 0 ? 'Expires today' : 
                     `${evt.daysRemaining} days remaining`}
                  </span>
                </div>
                {evt.status === 'PENDING_NOTIFICATION' && (
                  <p className="text-xs text-indigo-600 mt-1">Queued for notification</p>
                )}
              </div>
            </div>
            
            <div>
              <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 dark:text-slate-400 rounded">
                Milestone: {evt.milestone}d
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Also we need to import CheckCircle2, I missed that in the imports above.

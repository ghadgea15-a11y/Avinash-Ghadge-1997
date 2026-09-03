import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  DollarSign, 
  ShieldAlert, 
  TrendingUp, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Building2, 
  Clock, 
  Percent, 
  ArrowRight,
  Download,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Sliders
} from 'lucide-react';
import { UserSession, CompanyTenant } from '../../types';
import { 
  ClientContract, 
  RateCard, 
  ClientInvoice, 
  SlaBreachRecord, 
  ContractProfitabilitySummary 
} from '../../types/clientBilling';
import { ClientBillingService } from '../../services/clientBillingService';

interface ClientBillingContractScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  onNavigate?: (screen: string) => void;
}

export const ClientBillingContractScreen: React.FC<ClientBillingContractScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'CONTRACTS' | 'RATE_CARDS' | 'INVOICES' | 'SLA_BREACHES' | 'PROFITABILITY'>('CONTRACTS');
  const [loading, setLoading] = useState<boolean>(true);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [breaches, setBreaches] = useState<SlaBreachRecord[]>([]);
  const [selectedContract, setSelectedContract] = useState<ClientContract | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<ClientInvoice | null>(null);
  const [profitability, setProfitability] = useState<ContractProfitabilitySummary | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  // Invoice generation modal state
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [genContractId, setGenContractId] = useState('');
  const [genStart, setGenStart] = useState('2026-02-01');
  const [genEnd, setGenEnd] = useState('2026-02-28');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // New Contract Modal State
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [newContractForm, setNewContractForm] = useState<Partial<ClientContract>>({
    clientId: 'CLIENT-NEW',
    clientName: '',
    contractNumber: '',
    title: '',
    siteIds: ['SITE-01'],
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    billingCycle: 'MONTHLY',
    autoRenewal: true,
    status: 'ACTIVE',
    slaTerms: {
      minGuardsRequiredPerShift: 4,
      penaltyPerShortfallShift: 1500,
      maxPenaltyCapPercent: 15
    },
    paymentTermsDays: 30
  });

  const companyId = activeCompany.companyId;
  const isFinanceOrAdmin = userSession.role === 'SUPER_ADMIN' || 
    userSession.role === 'COMPANY_ADMIN' || 
    userSession.departmentName === 'FINANCE' || 
    userSession.role === 'FINANCE_MANAGER';

  const isSiteInCharge = userSession.authorityLevel === 'A5_SITE_IN_CHARGE';

  const loadData = async () => {
    setLoading(true);
    try {
      const [cList, rcList, invList, bList] = await Promise.all([
        ClientBillingService.getContracts(companyId),
        ClientBillingService.getRateCards(companyId),
        ClientBillingService.getInvoices(companyId),
        ClientBillingService.getSlaBreaches(companyId)
      ]);
      setContracts(cList);
      setRateCards(rcList);
      setInvoices(invList);
      setBreaches(bList);
      if (cList.length > 0) {
        setSelectedContract(cList[0]);
        setGenContractId(cList[0].contractId);
      }
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  // Load profitability when selected contract changes
  useEffect(() => {
    if (selectedContract) {
      ClientBillingService.getContractProfitability(
        companyId,
        selectedContract.contractId,
        '2026-02-01',
        '2026-02-28'
      ).then(res => setProfitability(res)).catch(err => console.error(err));
    }
  }, [selectedContract, companyId]);

  const handleGenerateInvoice = async () => {
    if (!genContractId) return;
    setLoading(true);
    try {
      const inv = await ClientBillingService.generateInvoice({
        companyId,
        contractId: genContractId,
        periodStart: genStart,
        periodEnd: genEnd,
        createdByUser: userSession.fullName
      });
      setIsGeneratingInvoice(false);
      setActionSuccessMsg(`Invoice ${inv.invoiceId} successfully generated with idempotency key.`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
      await loadData();
      setSelectedInvoice(inv);
      setActiveTab('INVOICES');
    } catch (err: any) {
      alert(`Invoice generation error: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContract = async () => {
    if (!newContractForm.clientName || !newContractForm.contractNumber) {
      alert('Please fill all required contract details');
      return;
    }
    const contractToSave: ClientContract = {
      id: `CONTRACT-${Date.now()}`,
      contractId: `CONTRACT-${Date.now()}`,
      companyId,
      clientId: newContractForm.clientId || 'CLIENT-GEN',
      clientName: newContractForm.clientName,
      contractNumber: newContractForm.contractNumber,
      title: newContractForm.title || `${newContractForm.clientName} Service Agreement`,
      siteIds: newContractForm.siteIds || ['SITE-01'],
      startDate: newContractForm.startDate || '2026-03-01',
      endDate: newContractForm.endDate || '2027-02-28',
      billingCycle: newContractForm.billingCycle as any || 'MONTHLY',
      autoRenewal: !!newContractForm.autoRenewal,
      status: 'ACTIVE',
      slaTerms: {
        minGuardsRequiredPerShift: Number(newContractForm.slaTerms?.minGuardsRequiredPerShift || 4),
        penaltyPerShortfallShift: Number(newContractForm.slaTerms?.penaltyPerShortfallShift || 1500),
        maxPenaltyCapPercent: Number(newContractForm.slaTerms?.maxPenaltyCapPercent || 15)
      },
      paymentTermsDays: Number(newContractForm.paymentTermsDays || 30),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await ClientBillingService.saveContract(companyId, contractToSave);
    setIsNewContractOpen(false);
    setActionSuccessMsg(`Contract ${contractToSave.contractNumber} activated successfully.`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
    loadData();
  };

  const totalBilledMTD = invoices.reduce((acc, inv) => acc + inv.netAmount, 0);
  const totalSlaDeductions = invoices.reduce((acc, inv) => acc + inv.totalPenaltyDeduction, 0);

  return (
    <div id="client-billing-contract-screen" className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-y-auto">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded">
                Enterprise Parity
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                TrackTik / Silvertrac Parity
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              Client Billing & Contract Profitability
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Contract SLAs, versioned rate cards, automated shortfall penalties & client invoicing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFinanceOrAdmin && (
              <>
                <button
                  id="btn-generate-invoice"
                  onClick={() => setIsGeneratingInvoice(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Generate Invoice
                </button>
                <button
                  id="btn-new-contract"
                  onClick={() => setIsNewContractOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Contract
                </button>
              </>
            )}
            <button
              onClick={loadData}
              title="Refresh data"
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {actionSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Metric Cards Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium uppercase">Active SLA Contracts</span>
              <Building2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {contracts.filter(c => c.status === 'ACTIVE').length}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Across {contracts.reduce((acc, c) => acc + c.siteIds.length, 0)} contracted sites
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium uppercase">Total Billed (MTD)</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              ₹{totalBilledMTD.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <span>{invoices.length} invoices generated</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium uppercase">SLA Penalty Impact</span>
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ₹{totalSlaDeductions.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {breaches.filter(b => b.status === 'CONFIRMED').length} confirmed shortfall breaches
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium uppercase">Avg. Contract Margin</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {profitability ? `${profitability.profitMarginPercent}%` : '28.4%'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Health: <span className="text-emerald-600 font-semibold">{profitability?.healthStatus || 'HEALTHY'}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 mt-6 gap-6">
          <button
            onClick={() => setActiveTab('CONTRACTS')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'CONTRACTS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            SLA Contracts ({contracts.length})
          </button>
          <button
            onClick={() => setActiveTab('RATE_CARDS')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'RATE_CARDS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Versioned Rate Cards ({rateCards.length})
          </button>
          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'INVOICES'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Client Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('SLA_BREACHES')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'SLA_BREACHES'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            SLA Shortfalls & Penalties ({breaches.length})
          </button>
          <button
            onClick={() => setActiveTab('PROFITABILITY')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'PROFITABILITY'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Profitability & Wage Margin
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-6">
        {/* TAB 1: CONTRACTS */}
        {activeTab === 'CONTRACTS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="relative w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search client or contract..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contracts
                .filter(c => c.clientName.toLowerCase().includes(filterQuery.toLowerCase()) || c.contractNumber.toLowerCase().includes(filterQuery.toLowerCase()))
                .map(contract => (
                  <div
                    key={contract.contractId}
                    onClick={() => setSelectedContract(contract)}
                    className={`p-5 rounded-xl border transition-all cursor-pointer ${
                      selectedContract?.contractId === contract.contractId
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500 shadow-sm ring-1 ring-indigo-500'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                            {contract.contractNumber}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full">
                            {contract.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                          {contract.clientName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {contract.title}
                        </p>
                      </div>

                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {contract.billingCycle}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                      <div>
                        <span className="text-slate-400 block">Min. Strength:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {contract.slaTerms.minGuardsRequiredPerShift} Guards / Shift
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Shortfall Penalty:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          ₹{contract.slaTerms.penaltyPerShortfallShift} / Shift
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Payment Terms:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Net {contract.paymentTermsDays} Days
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      <span>Sites: {contract.siteIds.join(', ')}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                        View Details <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 2: VERSIONED RATE CARDS */}
        {activeTab === 'RATE_CARDS' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Versioned Billing Rate Cards
                </h3>
                <p className="text-xs text-slate-500">
                  Historical rates are immutable. New versions apply strictly from effective dates onwards.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Shift Type</th>
                    <th className="px-4 py-3">Rate / Shift</th>
                    <th className="px-4 py-3">Rate / Hour</th>
                    <th className="px-4 py-3">OT / Hour</th>
                    <th className="px-4 py-3">Effective Date</th>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {rateCards.map(rc => (
                    <tr key={rc.rateCardId} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {rc.role}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {rc.shiftType}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{rc.ratePerShift}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        ₹{rc.ratePerHour}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        ₹{rc.overtimeRatePerHour}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {rc.effectiveFrom}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">
                          v{rc.version}.0
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded">
                          {rc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CLIENT INVOICES */}
        {activeTab === 'INVOICES' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Client Invoices (Automated & Idempotent)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Includes shift muster units × rate cards minus automatically deducted SLA penalties.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Invoice #</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Billing Period</th>
                      <th className="px-4 py-3">Gross</th>
                      <th className="px-4 py-3">SLA Penalties</th>
                      <th className="px-4 py-3">GST (18%)</th>
                      <th className="px-4 py-3">Net Payable</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {invoices.map(inv => (
                      <tr 
                        key={inv.invoiceId}
                        onClick={() => setSelectedInvoice(inv)}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-750 cursor-pointer ${
                          selectedInvoice?.invoiceId === inv.invoiceId ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {inv.invoiceId}
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                          {inv.clientName}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {inv.billingPeriodStart} to {inv.billingPeriodEnd}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          ₹{inv.grossAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-amber-600 dark:text-amber-400 font-semibold">
                          -₹{inv.totalPenaltyDeduction.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          ₹{inv.taxAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{inv.netAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                            inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' :
                            inv.status === 'SENT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoice(inv);
                            }}
                            className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="View Invoice Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Invoice Details Drawer/Card */}
            {selectedInvoice && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-900 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Invoice Statement: {selectedInvoice.invoiceId}</span>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-normal text-slate-600 dark:text-slate-300">
                        Contract: {selectedInvoice.contractNumber}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Billing Period: {selectedInvoice.billingPeriodStart} to {selectedInvoice.billingPeriodEnd} | Due: {selectedInvoice.dueDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedInvoice.status !== 'PAID' && isFinanceOrAdmin && (
                      <button
                        onClick={async () => {
                          await ClientBillingService.updateInvoiceStatus(companyId, selectedInvoice.invoiceId, 'PAID');
                          await loadData();
                          setSelectedInvoice({ ...selectedInvoice, status: 'PAID' });
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                      >
                        Mark as Paid
                      </button>
                    )}
                    <button
                      onClick={() => alert('Exporting Invoice to QuickBooks / Xero CSV format...')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg"
                    >
                      <Download className="w-3.5 h-3.5" />
                      QuickBooks Export
                    </button>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="mt-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Shift Units & Billable Rates
                  </h5>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2">Site</th>
                          <th className="px-3 py-2">Shift Units</th>
                          <th className="px-3 py-2">Rate / Unit</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedInvoice.lineItems.map(item => (
                          <tr key={item.lineItemId}>
                            <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                              {item.description}
                            </td>
                            <td className="px-3 py-2 text-slate-500">{item.siteName || item.siteId}</td>
                            <td className="px-3 py-2 font-semibold">{item.units} Shifts</td>
                            <td className="px-3 py-2">₹{item.unitPrice}</td>
                            <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                              ₹{item.amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SLA Penalties Breakdown */}
                {selectedInvoice.slaPenalties.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Automated SLA Penalty Deductions
                    </h5>
                    <div className="border border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
                          <tr>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Site</th>
                            <th className="px-3 py-2">Contracted vs Actual</th>
                            <th className="px-3 py-2">Shortfall</th>
                            <th className="px-3 py-2 text-right">Penalty Deducted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
                          {selectedInvoice.slaPenalties.map(p => (
                            <tr key={p.breachId}>
                              <td className="px-3 py-2 font-mono">{p.date} ({p.shift})</td>
                              <td className="px-3 py-2">{p.siteName || p.siteId}</td>
                              <td className="px-3 py-2">{p.contractedStrength} req / {p.actualStrength} present</td>
                              <td className="px-3 py-2 font-bold text-amber-600">-{p.shortfall} guards</td>
                              <td className="px-3 py-2 text-right font-bold text-amber-600 dark:text-amber-400">
                                -₹{p.penaltyAmount.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Summary Math */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                  <div className="w-72 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Gross Billable:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        ₹{selectedInvoice.grossAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>SLA Penalty Deduction:</span>
                      <span className="font-semibold">
                        -₹{selectedInvoice.totalPenaltyDeduction.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>GST ({selectedInvoice.taxRatePercent}%):</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        ₹{selectedInvoice.taxAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span>Net Payable:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ₹{selectedInvoice.netAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SLA BREACHES */}
        {activeTab === 'SLA_BREACHES' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Daily Shift Shortfalls & SLA Penalties
                </h3>
                <p className="text-xs text-slate-500">
                  Auto-detected whenever muster attendance is below contracted headcount.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Date / Shift</th>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Contract</th>
                    <th className="px-4 py-3">Contracted</th>
                    <th className="px-4 py-3">Actual Deployed</th>
                    <th className="px-4 py-3">Shortfall</th>
                    <th className="px-4 py-3">Penalty</th>
                    <th className="px-4 py-3">Status</th>
                    {isFinanceOrAdmin && <th className="px-4 py-3">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {breaches.map(b => (
                    <tr key={b.breachId} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                      <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-white">
                        {b.date} ({b.shiftType})
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                        {b.siteName || b.siteId}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {b.contractNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {b.contractedStrength} guards
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {b.actualStrength} guards
                      </td>
                      <td className="px-4 py-3 font-bold text-amber-600">
                        -{b.shortfall}
                      </td>
                      <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">
                        ₹{b.penaltyAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                          b.status === 'CONFIRMED' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                          b.status === 'WAIVED' ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                          'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      {isFinanceOrAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {b.status !== 'WAIVED' && (
                              <button
                                onClick={async () => {
                                  await ClientBillingService.updateBreachStatus(companyId, b.breachId, 'WAIVED');
                                  await loadData();
                                }}
                                className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded"
                              >
                                Waive
                              </button>
                            )}
                            {b.status !== 'CONFIRMED' && (
                              <button
                                onClick={async () => {
                                  await ClientBillingService.updateBreachStatus(companyId, b.breachId, 'CONFIRMED');
                                  await loadData();
                                }}
                                className="px-2 py-1 text-xs text-white bg-amber-600 hover:bg-amber-700 rounded"
                              >
                                Confirm
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PROFITABILITY & WAGE MARGIN */}
        {activeTab === 'PROFITABILITY' && profitability && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Contract Profitability Breakdown: {profitability.clientName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluated Period: {profitability.periodStart} to {profitability.periodEnd} | Contract: {profitability.contractNumber}
                  </p>
                </div>

                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  profitability.healthStatus === 'HEALTHY' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' :
                  profitability.healthStatus === 'AT_RISK' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400' :
                  'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                }`}>
                  {profitability.healthStatus} MARGIN
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-400 block font-medium">CLIENT BILLED REVENUE</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                    ₹{profitability.totalBilledRevenue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">Net invoice billing</span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-400 block font-medium">DIRECT WORKER WAGES</span>
                  <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
                    ₹{profitability.directWorkerCost.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Payroll wages across {profitability.totalDeployedShifts} shifts
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-400 block font-medium">GROSS PROFIT</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    ₹{profitability.grossProfit.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">Revenue minus wages</span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-400 block font-medium">GROSS PROFIT MARGIN</span>
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                    {profitability.profitMarginPercent}%
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Penalty impact: ₹{profitability.slaPenaltyImpact}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GENERATE INVOICE MODAL */}
      {isGeneratingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Generate Client Invoice
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Idempotent generator: Re-running for identical period updates existing draft without duplication.
            </p>

            <div className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contract / Client
                </label>
                <select
                  value={genContractId}
                  onChange={(e) => setGenContractId(e.target.value)}
                  className="w-full text-sm p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  {contracts.map(c => (
                    <option key={c.contractId} value={c.contractId}>
                      {c.clientName} ({c.contractNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Period Start
                  </label>
                  <input
                    type="date"
                    value={genStart}
                    onChange={(e) => setGenStart(e.target.value)}
                    className="w-full text-sm p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Period End
                  </label>
                  <input
                    type="date"
                    value={genEnd}
                    onChange={(e) => setGenEnd(e.target.value)}
                    className="w-full text-sm p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsGeneratingInvoice(false)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateInvoice}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                Run Generation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW CONTRACT MODAL */}
      {isNewContractOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Create New Client Contract & SLA
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Define billing cycles, minimum guard strength per shift, and shortfall penalty clauses.
            </p>

            <div className="space-y-4 mt-5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client Organization Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tata Consultancy Services"
                  value={newContractForm.clientName || ''}
                  onChange={(e) => setNewContractForm({ ...newContractForm, clientName: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contract Number / SLA Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SLA-2026-TCS-01"
                    value={newContractForm.contractNumber || ''}
                    onChange={(e) => setNewContractForm({ ...newContractForm, contractNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={newContractForm.billingCycle || 'MONTHLY'}
                    onChange={(e) => setNewContractForm({ ...newContractForm, billingCycle: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="BI_WEEKLY">Bi-Weekly</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min Guards Required / Shift
                  </label>
                  <input
                    type="number"
                    value={newContractForm.slaTerms?.minGuardsRequiredPerShift || 4}
                    onChange={(e) => setNewContractForm({
                      ...newContractForm,
                      slaTerms: {
                        ...newContractForm.slaTerms!,
                        minGuardsRequiredPerShift: Number(e.target.value)
                      }
                    })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shortfall Penalty / Shift (₹)
                  </label>
                  <input
                    type="number"
                    value={newContractForm.slaTerms?.penaltyPerShortfallShift || 1500}
                    onChange={(e) => setNewContractForm({
                      ...newContractForm,
                      slaTerms: {
                        ...newContractForm.slaTerms!,
                        penaltyPerShortfallShift: Number(e.target.value)
                      }
                    })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsNewContractOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContract}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                Save & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

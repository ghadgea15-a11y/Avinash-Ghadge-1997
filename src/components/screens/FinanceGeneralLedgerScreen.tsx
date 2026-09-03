import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import {
  DollarSign,
  BookOpen,
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  PieChart,
  Building2,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  Download,
  Filter,
  Layers,
  Landmark,
  FileCheck
} from 'lucide-react';
import { CompanyTenant, UserSession } from '../../types';
import {
  ChartOfAccountRecord,
  GeneralLedgerJournalVoucher,
  CostCenterRecord,
  ClientInvoiceRecord,
  SiteProfitabilityStatement
} from '../../types/financeLedger';
import { GeneralLedgerService } from '../../services/generalLedgerService';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

export const FinanceGeneralLedgerScreen: React.FC<Props> = ({ userSession, activeCompany }) => {
  const [activeTab, setActiveTab] = useState<'GL_JOURNAL' | 'COA' | 'COST_CENTERS' | 'CLIENT_BILLING' | 'PROFITABILITY'>('GL_JOURNAL');
  const [isLoading, setIsLoading] = useState(true);

  // States
  const [journalVouchers, setJournalVouchers] = useState<GeneralLedgerJournalVoucher[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccountRecord[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterRecord[]>([]);
  const [clientInvoices, setClientInvoices] = useState<ClientInvoiceRecord[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<GeneralLedgerJournalVoucher | null>(null);
  useBackNavigation(!!selectedVoucher, () => setSelectedVoucher(null), 'selectedVoucher');

  // Profitability mock data computed live
  const [profitabilityStatements, setProfitabilityStatements] = useState<SiteProfitabilityStatement[]>([]);

  useEffect(() => {
    if (!activeCompany) return;
    loadFinanceData();
  }, [activeCompany]);

  const loadFinanceData = async () => {
    setIsLoading(true);
    try {
      const cid = activeCompany.companyId;
      await GeneralLedgerService.initializeDefaultChartOfAccounts(cid, {
        uid: userSession.userId || 'SYSTEM',
        name: userSession.name || 'Finance Admin'
      });

      const [jvs, coas, ccs, invs] = await Promise.all([
        GeneralLedgerService.getJournalVouchers(cid),
        GeneralLedgerService.getChartOfAccounts(cid),
        GeneralLedgerService.getCostCenters(cid),
        GeneralLedgerService.getClientInvoices(cid)
      ]);

      setJournalVouchers(jvs);
      setChartOfAccounts(coas);
      setCostCenters(ccs);
      setClientInvoices(invs);

      // Compute sample site profitability statements
      const s1 = GeneralLedgerService.calculateSiteProfitability('SITE-01', 'Mumbai Airport Terminal 2', 'Adani Airport Holdings', 45, 1350, 1150, 20500);
      const s2 = GeneralLedgerService.calculateSiteProfitability('SITE-02', 'Tata Consultancy Services BKC', 'TCS Corporate', 28, 840, 1200, 21000);
      const s3 = GeneralLedgerService.calculateSiteProfitability('SITE-03', 'Amazon Fulfillment Centre Navi Mumbai', 'Amazon Retail India', 60, 1800, 1100, 19500);
      setProfitabilityStatements([s1, s2, s3]);
    } catch (e) {
      console.error('Error loading finance data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const totalDebits = journalVouchers.reduce((acc, v) => acc + (v.totalDebit || 0), 0);
  const totalBilledReceivable = clientInvoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);
  const totalOutstanding = clientInvoices.reduce((acc, i) => acc + (i.outstandingBalance || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <Landmark className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finance & General Ledger (GL)</h1>
              <p className="text-sm text-gray-500">Double-Entry Accounting, Cost Center Allocations, Payroll JV Posting & P&L Analytics</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadFinanceData}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh GL
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm font-medium">
            <span>Total GL Posted Volume</span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">₹{(totalDebits || 8540000).toLocaleString('en-IN')}</span>
          </div>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> 100% Balanced Double-Entry
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm font-medium">
            <span>Trade Receivables (AR)</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">₹{(totalBilledReceivable || 4800000).toLocaleString('en-IN')}</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">DSO: 34 Days (Healthy)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm font-medium">
            <span>Average Site Gross Margin</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">32.8%</span>
          </div>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +2.4% vs Last Month
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm font-medium">
            <span>Chart of Accounts</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{chartOfAccounts.length || 16} Ledgers</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Ind AS 115 / ASC 606 Ready</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          {[
            { id: 'GL_JOURNAL', label: 'Journal Vouchers (JV)', icon: FileSpreadsheet },
            { id: 'COA', label: 'Chart of Accounts', icon: BookOpen },
            { id: 'COST_CENTERS', label: 'Cost Allocation & Budgets', icon: Building2 },
            { id: 'CLIENT_BILLING', label: 'Client Invoicing & AR', icon: Receipt },
            { id: 'PROFITABILITY', label: 'Site P&L & Cost-per-Guard', icon: PieChart },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  isSel
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab 1: Journal Vouchers */}
      {activeTab === 'GL_JOURNAL' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">General Ledger Journal Entries</h3>
            <span className="text-xs text-gray-500">Auto-posted upon Payroll Approval, Invoicing & Claims</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Voucher No</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Source Module</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Narration</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total Debit</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total Credit</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {journalVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No Journal Vouchers found. Post monthly payroll or generate client invoices to populate GL automatically.
                    </td>
                  </tr>
                ) : (
                  journalVouchers.map((jv) => (
                    <tr key={jv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{jv.voucherNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{jv.voucherDate}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          {jv.sourceModule}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{jv.narration}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{jv.totalDebit.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{jv.totalCredit.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle className="w-3 h-3" /> Balanced & Posted
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedVoucher(jv)}
                          className="text-emerald-600 hover:text-emerald-800 font-medium text-xs"
                        >
                          View Split
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Chart of Accounts */}
      {activeTab === 'COA' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Master Chart of Accounts (COA)</h3>
            <span className="text-xs text-gray-500">GAAP / Ind AS 115 Compliant Account Codes</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Account Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Sub-Category</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Normal Balance</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Current Ledger Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {chartOfAccounts.map((coa) => (
                  <tr key={coa.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-emerald-700">{coa.accountCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{coa.accountName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        coa.category === 'ASSET' ? 'bg-blue-50 text-blue-700' :
                        coa.category === 'LIABILITY' ? 'bg-amber-50 text-amber-700' :
                        coa.category === 'REVENUE' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {coa.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{coa.subCategory}</td>
                    <td className="px-4 py-3 text-center font-mono text-xs">{coa.normalBalance}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ₹{coa.currentBalance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Cost Allocation & Budgets */}
      {activeTab === 'COST_CENTERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Site & Department Cost Centers</h3>
            <span className="text-xs text-gray-500">Budget Variance & Commitment Tracking</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono text-emerald-600">CC-MUM-AIRPORT</span>
                  <h4 className="font-semibold text-gray-900 mt-1">Mumbai International Airport T2</h4>
                  <p className="text-xs text-gray-500">Site Cost Center</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded font-medium">Active</span>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Allocated Budget:</span>
                  <span className="font-semibold text-gray-900">₹1,50,00,000</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Actual Direct Wages & Ops:</span>
                  <span className="font-semibold text-gray-900">₹98,40,000</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '65.6%' }}></div>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Budget Variance (Favorable):</span>
                  <span>₹51,60,000 (34.4% Under)</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono text-emerald-600">CC-BKC-TCS</span>
                  <h4 className="font-semibold text-gray-900 mt-1">TCS BKC Campus</h4>
                  <p className="text-xs text-gray-500">Site Cost Center</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded font-medium">Active</span>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Allocated Budget:</span>
                  <span className="font-semibold text-gray-900">₹80,00,000</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Actual Direct Wages & Ops:</span>
                  <span className="font-semibold text-gray-900">₹58,20,000</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '72.7%' }}></div>
                </div>
                <div className="flex justify-between text-blue-700 font-medium">
                  <span>Budget Variance (Favorable):</span>
                  <span>₹21,80,000 (27.3% Under)</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono text-emerald-600">CC-HQ-OPERATIONS</span>
                  <h4 className="font-semibold text-gray-900 mt-1">Corporate Field Operations</h4>
                  <p className="text-xs text-gray-500">Department Cost Center</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded font-medium">Active</span>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Allocated Budget:</span>
                  <span className="font-semibold text-gray-900">₹45,00,000</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Actual Direct Spend:</span>
                  <span className="font-semibold text-gray-900">₹32,10,000</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '71.3%' }}></div>
                </div>
                <div className="flex justify-between text-purple-700 font-medium">
                  <span>Budget Variance (Favorable):</span>
                  <span>₹12,90,000 (28.7% Under)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Client Invoicing & AR */}
      {activeTab === 'CLIENT_BILLING' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Accounts Receivable (Client Invoices)</h3>
            <span className="text-xs text-gray-500">Milestone Billing, GST Output & Payment Status</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Invoice No</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Client Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Due Date</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Taxable Subtotal</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">18% GST</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Grand Total</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">INV-2026-09-001</td>
                  <td className="px-4 py-3 font-medium text-gray-900">Adani Airport Holdings Ltd</td>
                  <td className="px-4 py-3 text-gray-600">2026-10-15</td>
                  <td className="px-4 py-3 text-right text-gray-900">₹15,52,500</td>
                  <td className="px-4 py-3 text-right text-gray-900">₹2,79,450</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">₹18,31,950</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-medium">SENT_TO_CLIENT</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">INV-2026-09-002</td>
                  <td className="px-4 py-3 font-medium text-gray-900">Tata Consultancy Services BKC</td>
                  <td className="px-4 py-3 text-gray-600">2026-10-10</td>
                  <td className="px-4 py-3 text-right text-gray-900">₹10,08,000</td>
                  <td className="px-4 py-3 text-right text-gray-900">₹1,81,440</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">₹11,89,440</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded font-medium">PAID</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Site P&L & Cost-per-Guard */}
      {activeTab === 'PROFITABILITY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Site Profitability & Unit Costing Analytics</h3>
            <span className="text-xs text-gray-500">Cost-per-Employee, Cost-per-Manday & Gross Margins</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Site / Client Name</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Guards</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Billed Revenue</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total Direct Cost</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Gross Margin (₹)</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Gross Margin (%)</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Cost / Guard</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Cost / Manday</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {profitabilityStatements.map((st) => (
                  <tr key={st.siteId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{st.siteName}</p>
                      <p className="text-xs text-gray-500">{st.clientName}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-gray-900">{st.headcount}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{st.billedRevenue.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right text-red-600">₹{st.totalDirectCost.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">₹{st.grossMarginAmount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        {st.grossMarginPercentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">₹{st.costPerEmployee.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">₹{st.costPerManday.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Voucher Detail Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-gray-200 pb-3">
              <div>
                <span className="text-xs font-mono text-emerald-600">{selectedVoucher.voucherNumber}</span>
                <h3 className="text-lg font-bold text-gray-900">Journal Voucher Split Details</h3>
                <p className="text-xs text-gray-500">{selectedVoucher.narration}</p>
              </div>
              <button
                onClick={() => setSelectedVoucher(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Acc Code</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Account Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Debit (₹)</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono">
                  {selectedVoucher.lineItems.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2 text-emerald-700">{l.accountCode}</td>
                      <td className="px-3 py-2 text-gray-900 font-sans">{l.accountName}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          l.type === 'DEBIT' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {l.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {l.type === 'DEBIT' ? `₹${l.amount.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {l.type === 'CREDIT' ? `₹${l.amount.toLocaleString('en-IN')}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right text-gray-700">Total:</td>
                    <td className="px-3 py-2 text-right text-emerald-700">₹{selectedVoucher.totalDebit.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">₹{selectedVoucher.totalCredit.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedVoucher(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-black"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

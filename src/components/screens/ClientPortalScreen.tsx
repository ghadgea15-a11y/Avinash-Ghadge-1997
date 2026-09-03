import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Users, 
  Clock, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  MapPin, 
  QrCode, 
  Radio, 
  Calendar, 
  Search, 
  Eye, 
  DollarSign, 
  TrendingUp,
  Percent,
  Check
} from 'lucide-react';
import { UserSession, CompanyTenant } from '../../types';
import { 
  ClientContract, 
  ClientInvoice, 
  SlaBreachRecord 
} from '../../types/clientBilling';
import { ClientBillingService } from '../../services/clientBillingService';

interface ClientPortalScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  onNavigate?: (screen: string) => void;
}

export const ClientPortalScreen: React.FC<ClientPortalScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const companyId = activeCompany.companyId;
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [breaches, setBreaches] = useState<SlaBreachRecord[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'PATROLS' | 'INVOICES' | 'SLA'>('ATTENDANCE');
  const [selectedInvoice, setSelectedInvoice] = useState<ClientInvoice | null>(null);

  // Mock live attendance data for the client's sites
  const [liveAttendance, setLiveAttendance] = useState<any[]>([
    {
      id: 'ATT-101',
      siteId: 'SITE-01',
      siteName: 'Cyber Towers Tech Park',
      postName: 'Main Ingress Gate #1',
      guardName: 'Ramesh Kumar (GD-801)',
      checkInTime: '08:00 AM',
      shiftType: 'DAY',
      status: 'ON_DUTY',
      verificationMethod: 'BIOMETRIC_GEO'
    },
    {
      id: 'ATT-102',
      siteId: 'SITE-01',
      siteName: 'Cyber Towers Tech Park',
      postName: 'Data Center Sector 4',
      guardName: 'Suresh Patil (GD-802)',
      checkInTime: '08:05 AM',
      shiftType: 'DAY',
      status: 'ON_DUTY',
      verificationMethod: 'NFC_TAP'
    },
    {
      id: 'ATT-103',
      siteId: 'SITE-01',
      siteName: 'Cyber Towers Tech Park',
      postName: 'Perimeter Gate 3',
      guardName: 'Sunil Yadav (GD-804)',
      checkInTime: '08:12 AM',
      shiftType: 'DAY',
      status: 'ON_DUTY',
      verificationMethod: 'QR_SCAN'
    },
    {
      id: 'ATT-104',
      siteId: 'SITE-02',
      siteName: 'Nexus Global Logistics Hub',
      postName: 'Loading Dock Alpha',
      guardName: 'Deepak Verma (GD-705)',
      checkInTime: '08:02 AM',
      shiftType: 'DAY',
      status: 'ON_DUTY',
      verificationMethod: 'BIOMETRIC_GEO'
    },
    {
      id: 'ATT-105',
      siteId: 'SITE-02',
      siteName: 'Nexus Global Logistics Hub',
      postName: 'Warehouse Exit Post',
      guardName: 'Vikram Singh (GD-709)',
      checkInTime: '08:15 AM',
      shiftType: 'DAY',
      status: 'ON_DUTY',
      verificationMethod: 'NFC_TAP'
    }
  ]);

  // Mock real-time patrol scans for client transparency
  const [patrolScans, setPatrolScans] = useState<any[]>([
    {
      scanId: 'SCAN-901',
      siteId: 'SITE-01',
      checkpointName: 'Server Room Vault Door',
      guardName: 'Suresh Patil',
      timestamp: '10:45 AM',
      method: 'NFC',
      tagUid: '04:A2:8B:1F:90',
      gpsCoords: '19.0760° N, 72.8777° E (Within 12m)',
      status: 'VERIFIED'
    },
    {
      scanId: 'SCAN-902',
      siteId: 'SITE-01',
      checkpointName: 'Perimeter Fence Point B',
      guardName: 'Sunil Yadav',
      timestamp: '10:32 AM',
      method: 'QR',
      tagUid: 'QR-P-02-FENCE',
      gpsCoords: '19.0765° N, 72.8781° E (Within 8m)',
      status: 'VERIFIED'
    },
    {
      scanId: 'SCAN-903',
      siteId: 'SITE-01',
      checkpointName: 'Fire Hose Station 3',
      guardName: 'Ramesh Kumar',
      timestamp: '10:15 AM',
      method: 'GPS',
      tagUid: 'GEO-CHK-03',
      gpsCoords: '19.0758° N, 72.8770° E (Within 15m)',
      status: 'VERIFIED'
    },
    {
      scanId: 'SCAN-904',
      siteId: 'SITE-02',
      checkpointName: 'Heavy Cargo Gate Entry',
      guardName: 'Deepak Verma',
      timestamp: '10:50 AM',
      method: 'NFC',
      tagUid: '04:F8:9C:22:11',
      gpsCoords: '18.9822° N, 73.0114° E (Within 5m)',
      status: 'VERIFIED'
    }
  ]);

  const loadClientData = async () => {
    setLoading(true);
    try {
      const [cList, invList, bList] = await Promise.all([
        ClientBillingService.getContracts(companyId),
        ClientBillingService.getInvoices(companyId),
        ClientBillingService.getSlaBreaches(companyId)
      ]);
      setContracts(cList);
      setInvoices(invList);
      setBreaches(bList);
      if (invList.length > 0) {
        setSelectedInvoice(invList[0]);
      }
    } catch (err) {
      console.error('Error loading client portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientData();
  }, [companyId]);

  // Derive client sites
  const availableSites = [
    { id: 'ALL', name: 'All Contracted Sites' },
    { id: 'SITE-01', name: 'Cyber Towers Tech Park' },
    { id: 'SITE-02', name: 'Nexus Global Logistics Hub' }
  ];

  const filteredAttendance = selectedSiteId === 'ALL' 
    ? liveAttendance 
    : liveAttendance.filter(a => a.siteId === selectedSiteId);

  const filteredPatrols = selectedSiteId === 'ALL'
    ? patrolScans
    : patrolScans.filter(p => p.siteId === selectedSiteId);

  const filteredInvoices = invoices;
  const filteredBreaches = selectedSiteId === 'ALL'
    ? breaches
    : breaches.filter(b => b.siteId === selectedSiteId);

  // Contracted vs actual calculations
  const contractedHeadcount = 6;
  const currentActual = filteredAttendance.length;
  const shortfallCount = Math.max(0, contractedHeadcount - currentActual);

  return (
    <div id="client-portal-screen" className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-y-auto">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded">
                Client Transparency Portal
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                TrackTik / Novagems Client View Parity
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span>Client Portal & Live Security Transparency</span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Real-time guard muster, patrol verification logs, SLA compliance & itemized billing invoices.
            </p>
          </div>

          {/* Site Selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-500 uppercase">Site Filter:</label>
            <select
              id="select-client-portal-site"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="text-sm font-medium px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {availableSites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Shortfall Alert Banner if applicable */}
        {shortfallCount > 0 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <span className="font-bold text-sm">Shift Headcount Shortfall Detected: </span>
                <span className="text-xs">
                  Contracted strength is {contractedHeadcount} guards, currently {currentActual} deployed (-{shortfallCount} guard shortfall).
                  Auto-reliever workflow has been triggered with operations supervisor.
                </span>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded text-amber-900 dark:text-amber-100">
              SLA Penalty Clause Active
            </span>
          </div>
        )}

        {/* Real-time KPI Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium uppercase">Active On-Duty Guards</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {currentActual} / {contractedHeadcount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {shortfallCount === 0 ? 'Full contracted strength deployed' : `${shortfallCount} guard shortfall`}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium uppercase">Patrols Completed (Today)</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {filteredPatrols.length} Checkpoints
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              100% verified via GPS / NFC / QR
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium uppercase">SLA Compliance Rate</span>
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              98.2%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {filteredBreaches.length} SLA incident records
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium uppercase">Billed Invoices (MTD)</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              ₹{filteredInvoices.reduce((acc, inv) => acc + inv.netAmount, 0).toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Auto-deductions applied
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 mt-6 gap-6">
          <button
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'ATTENDANCE'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Live Attendance & Muster ({filteredAttendance.length})
          </button>
          <button
            onClick={() => setActiveTab('PATROLS')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'PATROLS'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Patrol Verification Logs ({filteredPatrols.length})
          </button>
          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'INVOICES'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Invoices & Statements ({filteredInvoices.length})
          </button>
          <button
            onClick={() => setActiveTab('SLA')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'SLA'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            SLA Performance & Penalties
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-6">
        {/* TAB 1: LIVE ATTENDANCE */}
        {activeTab === 'ATTENDANCE' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Real-Time Verified On-Site Guards
                </h3>
                <p className="text-xs text-slate-500">
                  Verified with GPS Geofencing, Face Recognition & NFC Supervisor Check-ins.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Feed Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Guard / ID</th>
                    <th className="px-4 py-3">Site Location</th>
                    <th className="px-4 py-3">Assigned Post</th>
                    <th className="px-4 py-3">Check-In Time</th>
                    <th className="px-4 py-3">Shift</th>
                    <th className="px-4 py-3">Verification Mode</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredAttendance.map(att => (
                    <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {att.guardName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
                        {att.siteName}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                        {att.postName}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {att.checkInTime}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 rounded font-medium">
                          {att.shiftType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded">
                          <CheckCircle2 className="w-3 h-3 text-blue-500" />
                          {att.verificationMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded font-bold">
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PATROL VERIFICATION LOGS */}
        {activeTab === 'PATROLS' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Guard Patrol Proof-of-Presence Logs
                </h3>
                <p className="text-xs text-slate-500">
                  Cryptographically verified scans with exact hardware tags, QR codes & GPS coordinates.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Checkpoint Name</th>
                    <th className="px-4 py-3">Patrolling Guard</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Hardware UID / Token</th>
                    <th className="px-4 py-3">GPS Location & Accuracy</th>
                    <th className="px-4 py-3">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredPatrols.map(p => (
                    <tr key={p.scanId} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {p.timestamp}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {p.checkpointName}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {p.guardName}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium ${
                          p.method === 'NFC' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' :
                          p.method === 'QR' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {p.method === 'NFC' && <Radio className="w-3 h-3" />}
                          {p.method === 'QR' && <QrCode className="w-3 h-3" />}
                          {p.method === 'GPS' && <MapPin className="w-3 h-3" />}
                          {p.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {p.tagUid}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {p.gpsCoords}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: INVOICES & STATEMENTS */}
        {activeTab === 'INVOICES' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Client Invoices & Billing Statements
                  </h3>
                  <p className="text-xs text-slate-500">
                    Calculated from verified shift muster units with transparent SLA shortfall deductions.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Invoice ID</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Gross Amount</th>
                      <th className="px-4 py-3">SLA Deductions</th>
                      <th className="px-4 py-3">GST (18%)</th>
                      <th className="px-4 py-3">Net Payable</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredInvoices.map(inv => (
                      <tr 
                        key={inv.invoiceId} 
                        onClick={() => setSelectedInvoice(inv)}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-750 cursor-pointer ${
                          selectedInvoice?.invoiceId === inv.invoiceId ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {inv.invoiceId}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {inv.billingPeriodStart} to {inv.billingPeriodEnd}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                          ₹{inv.grossAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">
                          -₹{inv.totalPenaltyDeduction.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          ₹{inv.taxAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{inv.netAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {inv.dueDate}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
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
                            className="p-1 text-slate-500 hover:text-blue-600"
                            title="View Statement"
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

            {/* Selected Invoice Breakdown */}
            {selectedInvoice && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-900 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                      Statement Details: {selectedInvoice.invoiceId}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Contract: {selectedInvoice.contractNumber} | Due Date: {selectedInvoice.dueDate}
                    </p>
                  </div>

                  <button
                    onClick={() => alert(`Downloading official Tax Invoice PDF for ${selectedInvoice.invoiceId}...`)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                </div>

                <div className="mt-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Line Item Breakdown
                  </h5>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Service Description</th>
                          <th className="px-3 py-2">Site</th>
                          <th className="px-3 py-2">Shifts Billed</th>
                          <th className="px-3 py-2">Rate / Shift</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedInvoice.lineItems.map(item => (
                          <tr key={item.lineItemId}>
                            <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
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

                {/* Penalties deducted */}
                {selectedInvoice.slaPenalties.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Automatic SLA Shortfall Deductions Applied
                    </h5>
                    <div className="border border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
                          <tr>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Site</th>
                            <th className="px-3 py-2">Contracted vs Present</th>
                            <th className="px-3 py-2">Shortfall</th>
                            <th className="px-3 py-2 text-right">Penalty Credit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
                          {selectedInvoice.slaPenalties.map(p => (
                            <tr key={p.breachId}>
                              <td className="px-3 py-2 font-mono">{p.date}</td>
                              <td className="px-3 py-2">{p.siteName || p.siteId}</td>
                              <td className="px-3 py-2">{p.contractedStrength} req / {p.actualStrength} actual</td>
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

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                  <div className="w-72 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Gross Billable:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        ₹{selectedInvoice.grossAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-600 font-medium">
                      <span>SLA Penalty Credits:</span>
                      <span>-₹{selectedInvoice.totalPenaltyDeduction.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>GST (18%):</span>
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

        {/* TAB 4: SLA PERFORMANCE */}
        {activeTab === 'SLA' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                Contractual SLA Terms & Fulfillment
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Guaranteed guard strength, shift shortfall penalties and compliance metrics.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Guaranteed Strength</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                    4-6 Guards / Shift
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Per site contracted schedule
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Penalty Clause</span>
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                    ₹1,500 / Shortfall Shift
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Auto-credited on monthly invoice
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Max Penalty Cap</span>
                  <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                    15% of Gross Billing
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Contractual risk ceiling
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

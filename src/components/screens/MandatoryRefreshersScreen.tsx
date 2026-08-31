import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  UserSession, 
  CompanyTenant, 
  PhaseAScreen, 
  EmployeeRecord, 
  MandatoryRefresherConfig,
  EmployeeRefresherStatus
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Users, 
  Award, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Bell, 
  Download, 
  FileText, 
  Building2, 
  RefreshCw,
  Send,
  Eye,
  Check,
  AlertCircle
} from 'lucide-react';
import { collection, onSnapshot, setDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

interface MandatoryRefreshersScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  onNavigate?: (screen: PhaseAScreen) => void;
}

interface RefresherProgram {
  id: string;
  name: string;
  category: 'SAFETY' | 'COMPLIANCE' | 'SECURITY' | 'QUALITY' | 'TECHNICAL';
  validityMonths: number;
  mandatoryDepartments: string[];
  mandatoryRoles: string[];
  description: string;
  passingScore: number;
}

const DEFAULT_REFRESHER_PROGRAMS: RefresherProgram[] = [
  {
    id: 'REF-FIRE-01',
    name: 'Annual Fire Safety & Emergency Evacuation',
    category: 'SAFETY',
    validityMonths: 12,
    mandatoryDepartments: ['Operations', 'Security', 'Facility'],
    mandatoryRoles: ['SECURITY_GUARD', 'SUPERVISOR', 'SITE_INCHARGE', 'STAFF'],
    description: 'Mandatory standard drill and fire extinguisher handling certification.',
    passingScore: 80
  },
  {
    id: 'REF-FA-02',
    name: 'First Aid & CPR Life Support Refresher',
    category: 'SAFETY',
    validityMonths: 24,
    mandatoryDepartments: ['Operations', 'Security'],
    mandatoryRoles: ['SECURITY_GUARD', 'SUPERVISOR', 'SITE_INCHARGE'],
    description: 'Emergency trauma response, AED operation, and CPR recertification.',
    passingScore: 85
  },
  {
    id: 'REF-POSH-03',
    name: 'Prevention of Sexual Harassment (POSH) Annual Refresher',
    category: 'COMPLIANCE',
    validityMonths: 12,
    mandatoryDepartments: ['All'],
    mandatoryRoles: ['ALL'],
    description: 'Statutory compliance refresher on workplace decorum and grievance redressal.',
    passingScore: 100
  },
  {
    id: 'REF-SEC-04',
    name: 'Access Control & Threat Detection SOP',
    category: 'SECURITY',
    validityMonths: 6,
    mandatoryDepartments: ['Security', 'Operations'],
    mandatoryRoles: ['SECURITY_GUARD', 'SUPERVISOR'],
    description: 'Frisking protocols, visitor gate pass compliance, and perimeter security audit.',
    passingScore: 90
  }
];

export const MandatoryRefreshersScreen: React.FC<MandatoryRefreshersScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const companyId = activeCompany?.companyId || userSession.companyId;

  // View tabs
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ROSTER' | 'PROGRAMS' | 'SCHEDULE_BATCH'>('OVERVIEW');

  // Data states
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [programs, setPrograms] = useState<RefresherProgram[]>(DEFAULT_REFRESHER_PROGRAMS);
  const [refresherStatuses, setRefresherStatuses] = useState<EmployeeRefresherStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState('ALL');
  useBackNavigation(!!selectedProgramFilter, () => setSelectedProgramFilter(null as any), 'selectedProgramFilter');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'UP_TO_DATE' | 'EXPIRING_SOON' | 'OVERDUE'>('ALL');
  useBackNavigation(!!selectedStatusFilter, () => setSelectedStatusFilter(null as any), 'selectedStatusFilter');

  // Modal / Batch States
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  useBackNavigation(!!showScheduleModal, () => setShowScheduleModal(null as any), 'showScheduleModal');
  const [showCertifyModal, setShowCertifyModal] = useState(false);
  useBackNavigation(!!showCertifyModal, () => setShowCertifyModal(null as any), 'showCertifyModal');
  const [selectedStatusRecord, setSelectedStatusRecord] = useState<EmployeeRefresherStatus | null>(null);
  useBackNavigation(!!selectedStatusRecord, () => setSelectedStatusRecord(null as any), 'selectedStatusRecord');

  const [batchForm, setBatchForm] = useState({
    programId: DEFAULT_REFRESHER_PROGRAMS[0].id,
    sessionDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    trainerName: 'Senior Safety Officer',
    location: 'Main Site Training Hall',
    targetDepartment: 'Operations'
  });

  const [certForm, setCertForm] = useState({
    certificateNumber: '',
    score: 90,
    completionDate: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 86400000 * 365).toISOString().slice(0, 10)
  });

  const [statusMessage, setStatusMessage] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);

  // Load Employees and Refresher Records
  useEffect(() => {
    if (!companyId) return;

    setLoading(true);

    // Subscribe to employees
    const empUnsub = FirestoreService.subscribeToEmployees(userSession, companyId, (empList) => {
      setEmployees(empList || []);
    });

    // Listen to refresher status collection
    const statusCol = collection(db, 'companies', companyId, 'mandatoryRefreshers');
    const statusUnsub = onSnapshot(statusCol, (snap) => {
      const records: EmployeeRefresherStatus[] = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRefresherStatuses(records);
      setLoading(false);
    }, (err) => {
      console.error('Failed to load refreshers:', err);
      setLoading(false);
    });

    return () => {
      empUnsub();
      statusUnsub();
    };
  }, [companyId, userSession]);

  // Derived Computed Roster (combines employees with programs)
  const rosterItems = React.useMemo(() => {
    const list: any[] = [];
    const now = new Date().getTime();

    employees.forEach(emp => {
      programs.forEach(prog => {
        // Find existing record
        const record = refresherStatuses.find(
          r => r.employeeId === emp.employeeId && r.programId === prog.id
        );

        let status: 'UP_TO_DATE' | 'EXPIRING_SOON' | 'OVERDUE' | 'NOT_SCHEDULED' = 'NOT_SCHEDULED';
        let daysRemaining: number | null = null;
        let validUntil = record?.validUntil || null;

        if (validUntil) {
          const expiryTime = new Date(validUntil).getTime();
          const diffDays = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));
          daysRemaining = diffDays;

          if (diffDays < 0) {
            status = 'OVERDUE';
          } else if (diffDays <= 30) {
            status = 'EXPIRING_SOON';
          } else {
            status = 'UP_TO_DATE';
          }
        }

        list.push({
          id: `${emp.employeeId}_${prog.id}`,
          employeeId: emp.employeeId,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department || 'Operations',
          designation: emp.designation || 'Staff',
          programId: prog.id,
          programName: prog.name,
          category: prog.category,
          status,
          daysRemaining,
          validUntil,
          lastCompletedDate: record?.lastCompletedDate || null,
          certificateNumber: record?.certificateNumber || null,
          score: record?.score || null
        });
      });
    });

    return list;
  }, [employees, programs, refresherStatuses]);

  // Filtered Roster
  const filteredRoster = rosterItems.filter(item => {
    const matchesSearch = item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.programName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProgram = selectedProgramFilter === 'ALL' || item.programId === selectedProgramFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || item.status === selectedStatusFilter;
    return matchesSearch && matchesProgram && matchesStatus;
  });

  // Calculate Metrics
  const totalMandated = rosterItems.length;
  const upToDateCount = rosterItems.filter(r => r.status === 'UP_TO_DATE').length;
  const expiringSoonCount = rosterItems.filter(r => r.status === 'EXPIRING_SOON').length;
  const overdueCount = rosterItems.filter(r => r.status === 'OVERDUE' || r.status === 'NOT_SCHEDULED').length;
  const compliancePercentage = totalMandated > 0 ? Math.round((upToDateCount / totalMandated) * 100) : 100;

  // Handle Mark Completion / Recertify
  const handleSaveCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !selectedStatusRecord) return;

    try {
      const docId = `${selectedStatusRecord.employeeId}_${selectedStatusRecord.programId}`;
      const payload = {
        id: docId,
        companyId,
        employeeId: selectedStatusRecord.employeeId,
        programId: selectedStatusRecord.programId,
        programName: selectedStatusRecord.programName,
        lastCompletedDate: certForm.completionDate,
        validUntil: certForm.validUntil,
        certificateNumber: certForm.certificateNumber || `CERT-${Date.now().toString(36).toUpperCase()}`,
        score: Number(certForm.score) || 90,
        certifiedBy: userSession.fullName || userSession.email,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'companies', companyId, 'mandatoryRefreshers', docId), payload);
      setStatusMessage({ type: 'SUCCESS', text: `Recertification recorded for ${selectedStatusRecord.employeeName}!` });
      setShowCertifyModal(false);
      setSelectedStatusRecord(null);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ type: 'ERROR', text: err.message || 'Failed to record certification.' });
    }
  };

  // Export Roster to CSV
  const handleExportCSV = () => {
    const headers = ['Employee ID', 'Name', 'Department', 'Designation', 'Refresher Program', 'Category', 'Status', 'Days Remaining', 'Valid Until', 'Certificate #'];
    const rows = filteredRoster.map(r => [
      `"${r.employeeId}"`,
      `"${r.employeeName}"`,
      `"${r.department}"`,
      `"${r.designation}"`,
      `"${r.programName}"`,
      `"${r.category}"`,
      `"${r.status}"`,
      `"${r.daysRemaining ?? 'N/A'}"`,
      `"${r.validUntil || 'N/A'}"`,
      `"${r.certificateNumber || 'N/A'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mandatory_refreshers_matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-600/10 text-amber-600 dark:text-amber-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Mandatory Refreshers & Recertification</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Statutory safety certifications, annual refresher schedules, and automated expiry compliance tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
              isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Download className="w-4 h-4" />
            Export Compliance Matrix
          </button>
        </div>
      </div>

      {/* Compliance Health KPI Cards */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Compliance</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${compliancePercentage >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {compliancePercentage}%
            </span>
            <span className="text-xs text-slate-400">Workforce certified</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Up to Date</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{upToDateCount}</span>
            <span className="text-xs text-slate-400">Valid certifications</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiring in 30 Days</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{expiringSoonCount}</span>
            <span className="text-xs text-slate-400">Need scheduling</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue / Non-Compliant</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{overdueCount}</span>
            <span className="text-xs text-slate-400">Urgent action</span>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className={`mx-6 mb-4 p-3 rounded-xl flex items-center gap-3 text-sm font-medium ${
          statusMessage.type === 'SUCCESS' 
            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
        }`}>
          {statusMessage.type === 'SUCCESS' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {statusMessage.text}
        </div>
      )}

      {/* Tabs */}
      <div className={`px-6 border-b ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'} flex items-center gap-6`}>
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'OVERVIEW'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          Refresher Roster Matrix ({filteredRoster.length})
        </button>

        <button
          onClick={() => setActiveTab('PROGRAMS')}
          className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'PROGRAMS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Programs Catalog ({programs.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'OVERVIEW' ? (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by worker name, employee ID, or program..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <select
                value={selectedProgramFilter}
                onChange={(e) => setSelectedProgramFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-sm border outline-none font-medium ${
                  isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Refresher Programs</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className={`px-3 py-2 rounded-xl text-sm border outline-none font-medium ${
                  isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Compliance Statuses</option>
                <option value="UP_TO_DATE">Up to Date</option>
                <option value="EXPIRING_SOON">Expiring Soon (≤30 Days)</option>
                <option value="OVERDUE">Overdue / Non-Compliant</option>
              </select>
            </div>

            {/* Matrix Table */}
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`border-b text-xs uppercase font-bold text-slate-400 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Department & Role</th>
                      <th className="py-3 px-4">Refresher Program</th>
                      <th className="py-3 px-4">Compliance Status</th>
                      <th className="py-3 px-4">Validity / Expiry</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRoster.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No refresher records found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredRoster.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{item.employeeName}</div>
                            <span className="text-[10px] font-mono text-slate-400">{item.employeeId}</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <div className="font-medium text-slate-800 dark:text-slate-200">{item.department}</div>
                            <div className="text-slate-400">{item.designation}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-xs text-slate-900 dark:text-white">{item.programName}</div>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-500 font-bold">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${
                              item.status === 'UP_TO_DATE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : item.status === 'EXPIRING_SOON'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}>
                              {item.status === 'UP_TO_DATE' ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : item.status === 'EXPIRING_SOON' ? (
                                <Clock className="w-3.5 h-3.5" />
                              ) : (
                                <ShieldAlert className="w-3.5 h-3.5" />
                              )}
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            {item.validUntil ? (
                              <div>
                                <div className="font-medium text-slate-800 dark:text-slate-200">Expires: {item.validUntil}</div>
                                <div className={`${item.daysRemaining < 0 ? 'text-rose-500 font-bold' : item.daysRemaining <= 30 ? 'text-amber-500' : 'text-slate-400'}`}>
                                  {item.daysRemaining < 0 ? `Overdue by ${Math.abs(item.daysRemaining)} days` : `${item.daysRemaining} days remaining`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-rose-400 font-medium">Never Completed</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedStatusRecord(item);
                                setCertForm({
                                  certificateNumber: `CERT-${item.programId.slice(4)}-${Date.now().toString(36).toUpperCase()}`,
                                  score: 92,
                                  completionDate: new Date().toISOString().slice(0, 10),
                                  validUntil: new Date(Date.now() + 86400000 * 365).toISOString().slice(0, 10)
                                });
                                setShowCertifyModal(true);
                              }}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                            >
                              Record Certification
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Programs Catalog */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programs.map(prog => (
              <div 
                key={prog.id}
                className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">
                        {prog.id}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">{prog.name}</h3>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                      {prog.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{prog.description}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400">Validity Cycle:</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{prog.validityMonths} Months</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Passing Score:</span>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">{prog.passingScore}%</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Record Certification */}
      {showCertifyModal && selectedStatusRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500" />
              Record Refresher Recertification
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Recording completion for <strong>{selectedStatusRecord.employeeName}</strong> ({selectedStatusRecord.programName})
            </p>

            <form onSubmit={handleSaveCertification} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Certificate / Badge Number</label>
                <input
                  type="text"
                  required
                  value={certForm.certificateNumber}
                  onChange={(e) => setCertForm({ ...certForm, certificateNumber: e.target.value })}
                  className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none font-mono ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Completion Date</label>
                  <input
                    type="date"
                    required
                    value={certForm.completionDate}
                    onChange={(e) => setCertForm({ ...certForm, completionDate: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Valid Until</label>
                  <input
                    type="date"
                    required
                    value={certForm.validUntil}
                    onChange={(e) => setCertForm({ ...certForm, validUntil: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Examination / Assessment Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={certForm.score}
                  onChange={(e) => setCertForm({ ...certForm, score: parseInt(e.target.value) || 0 })}
                  className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCertifyModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md"
                >
                  Save & Certify Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

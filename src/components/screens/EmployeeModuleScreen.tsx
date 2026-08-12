import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  Building, 
  BadgeCheck, 
  Upload, 
  AlertTriangle, 
  ArrowUpDown, 
  Download, 
  Eye, 
  Edit3, 
  Shield, 
  ChevronRight, 
  Sparkles,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { EmployeeRecord, EmployeeDocument, UserSession, CompanyTenant, UserRole, PhaseAScreen } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { FirestoreService } from '../../services/firestoreService';
import { OfflineSyncService } from '../../services/offlineSyncService';
import { MOCK_EMPLOYEES } from '../../services/mockData';

interface EmployeeModuleScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  isOnline: boolean;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const EmployeeModuleScreen: React.FC<EmployeeModuleScreenProps> = ({
  userSession,
  activeCompany,
  isOnline,
  onNavigate
}) => {
  const { isDark } = useTheme();
  
  // State
  const [employees, setEmployees] = useState<EmployeeRecord[]>(MOCK_EMPLOYEES);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'REGISTER' | 'APPROVALS'>('DIRECTORY');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NAME' | 'JOIN_DATE' | 'ID'>('NAME');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'SUCCESS' | 'ERROR' | 'INFO' } | null>(null);

  // Form state for registration / edit
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    dateOfBirth: '1995-01-01',
    bloodGroup: 'O+',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    emergencyName: '',
    emergencyRelation: 'Spouse',
    emergencyPhone: '',
    assignedRegionId: 'REG-WEST-MUMBAI',
    assignedBranchId: userSession?.branchId || 'MUMBAI_HO',
    assignedSiteId: userSession?.assignedSiteId || 'SITE-MUMBAI-T2-AIRPORT',
    departmentId: 'DPT-SECURITY',
    designation: 'Security Officer',
    role: 'GUARD' as UserRole,
    aadharNumber: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // RBAC permissions helper
  const canManageEmployees = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN'].includes(userSession.role);
  const canApproveOnboarding = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER'].includes(userSession.role);

  // Realtime Firestore listener
  useEffect(() => {
    setLoading(true);
    const companyId = activeCompany?.companyId || userSession.companyId || 'APEX-SEC-101';
    
    const unsubscribe = FirestoreService.subscribeToEmployees(companyId, (records) => {
      setEmployees(records);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeCompany, userSession]);

  // Derived stats
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'ACTIVE').length;
    const pending = employees.filter(e => e.status === 'PENDING_VERIFICATION').length;
    const kycPending = employees.filter(e => (e.documents || []).some(d => d.status === 'PENDING')).length;
    return { total, active, pending, kycPending };
  }, [employees]);

  // Filtered & Sorted employees
  const filteredEmployees = useMemo(() => {
    return employees
      .filter(emp => {
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const matchesQuery = 
          fullName.includes(searchQuery.toLowerCase()) ||
          emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.contactNumber.includes(searchQuery) ||
          (emp.email && emp.email.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
        const matchesDepartment = departmentFilter === 'ALL' || emp.departmentId === departmentFilter;
        const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;

        return matchesQuery && matchesStatus && matchesDepartment && matchesRole;
      })
      .sort((a, b) => {
        if (sortBy === 'NAME') {
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        } else if (sortBy === 'JOIN_DATE') {
          return new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime();
        } else {
          return a.id.localeCompare(b.id);
        }
      });
  }, [employees, searchQuery, statusFilter, departmentFilter, roleFilter, sortBy]);

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.contactNumber.trim()) {
      errors.contactNumber = 'Contact number is required';
    } else if (!/^\+?[0-9]{10,12}$/.test(formData.contactNumber.replace(/[\s-]/g, ''))) {
      errors.contactNumber = 'Enter a valid 10-12 digit phone number';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address format';
    }
    if (!formData.emergencyName.trim()) errors.emergencyName = 'Emergency contact name required';
    if (!formData.emergencyPhone.trim()) errors.emergencyPhone = 'Emergency phone required';
    if (!formData.aadharNumber.trim()) {
      errors.aadharNumber = 'Aadhaar / ID number is required for KYC';
    } else if (!/^[0-9]{4}-?[0-9]{4}-?[0-9]{4}$/.test(formData.aadharNumber.trim())) {
      errors.aadharNumber = 'Format: 1234-5678-9012';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Employee Registration
  const handleRegisterEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const companyId = activeCompany?.companyId || userSession.companyId || 'APEX-SEC-101';
    const newEmpId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRecord: EmployeeRecord = {
      id: newEmpId,
      companyId,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim() || undefined,
      contactNumber: formData.contactNumber.trim(),
      dateOfBirth: formData.dateOfBirth,
      bloodGroup: formData.bloodGroup,
      gender: formData.gender,
      emergencyContact: {
        name: formData.emergencyName.trim(),
        relation: formData.emergencyRelation,
        phone: formData.emergencyPhone.trim()
      },
      assignedRegionId: formData.assignedRegionId,
      assignedBranchId: formData.assignedBranchId,
      assignedSiteId: formData.assignedSiteId,
      departmentId: formData.departmentId,
      designation: formData.designation,
      status: canManageEmployees ? 'ACTIVE' : 'PENDING_VERIFICATION',
      joinedDate: new Date().toISOString().split('T')[0],
      role: formData.role,
      profilePictureUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random()*100000)}?w=150`,
      documents: [
        {
          id: `DOC-${Date.now()}`,
          type: 'AADHAR',
          documentNumber: formData.aadharNumber,
          fileUrl: 'https://placehold.co/400x250/1e293b/indigo?text=Aadhaar+Uploaded',
          status: 'PENDING',
          uploadedAt: new Date().toISOString().split('T')[0]
        }
      ],
      createdBy: userSession.employeeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isOnline) {
      const success = await FirestoreService.saveEmployee(companyId, newRecord);
      if (success) {
        setFeedbackMessage({ text: `Employee ${newEmpId} (${newRecord.firstName}) registered successfully!`, type: 'SUCCESS' });
      } else {
        setFeedbackMessage({ text: 'Failed to write to Firestore, saved to offline queue.', type: 'INFO' });
      }
    } else {
      OfflineSyncService.queueAction('CREATE_EMPLOYEE', newRecord as unknown as Record<string, unknown>);
      setFeedbackMessage({ text: `Offline mode: Employee registration queued for background sync (${newEmpId}).`, type: 'INFO' });
    }

    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      contactNumber: '',
      dateOfBirth: '1995-01-01',
      bloodGroup: 'O+',
      gender: 'MALE',
      emergencyName: '',
      emergencyRelation: 'Spouse',
      emergencyPhone: '',
      assignedRegionId: 'REG-WEST-MUMBAI',
      assignedBranchId: userSession?.branchId || 'MUMBAI_HO',
      assignedSiteId: userSession?.assignedSiteId || 'SITE-MUMBAI-T2-AIRPORT',
      departmentId: 'DPT-SECURITY',
      designation: 'Security Officer',
      role: 'GUARD',
      aadharNumber: ''
    });

    setActiveTab('DIRECTORY');
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Status Workflow Approval
  const handleApproveStatus = async (empId: string, status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED') => {
    const companyId = activeCompany?.companyId || userSession.companyId || 'APEX-SEC-101';
    
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, status } : e));

    if (isOnline) {
      await FirestoreService.updateEmployeeStatus(companyId, empId, status, userSession.employeeId);
      setFeedbackMessage({ text: `Employee ${empId} status updated to ${status}.`, type: 'SUCCESS' });
    } else {
      OfflineSyncService.queueAction('UPDATE_EMPLOYEE_STATUS', { empId, status, approverId: userSession.employeeId });
      setFeedbackMessage({ text: `Status update queued offline.`, type: 'INFO' });
    }

    if (selectedEmployee && selectedEmployee.id === empId) {
      setSelectedEmployee(prev => prev ? { ...prev, status } : null);
    }

    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Verify Document Workflow
  const handleVerifyDoc = async (empId: string, docId: string, docStatus: 'VERIFIED' | 'REJECTED') => {
    const companyId = activeCompany?.companyId || userSession.companyId || 'APEX-SEC-101';
    
    setEmployees(prev => prev.map(emp => {
      if (emp.id === empId) {
        const updatedDocs = (emp.documents || []).map(d => d.id === docId ? { ...d, status: docStatus } : d);
        return { ...emp, documents: updatedDocs };
      }
      return emp;
    }));

    setFeedbackMessage({ text: `Document ${docStatus.toLowerCase()} successfully.`, type: 'SUCCESS' });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Export CSV Helper
  const handleExportCSV = () => {
    const headers = 'Employee ID,First Name,Last Name,Role,Department,Site,Status,Contact,Joined Date\n';
    const rows = filteredEmployees.map(e => 
      `"${e.id}","${e.firstName}","${e.lastName}","${e.role}","${e.departmentId}","${e.assignedSiteId}","${e.status}","${e.contactNumber}","${e.joinedDate}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee_roster_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`p-3 sm:p-5 space-y-4 max-h-full overflow-y-auto ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Module Title Banner */}
      <div className={`p-4 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight">Module 1: Employee Management</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Phase C Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Enterprise HRMS, Verification Queue & Site Placement Roster
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('DIRECTORY')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'DIRECTORY'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-750' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff Directory ({stats.total})</span>
          </button>

          {canManageEmployees && (
            <button
              onClick={() => setActiveTab('REGISTER')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'REGISTER'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-750' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Register New</span>
            </button>
          )}

          {canApproveOnboarding && (
            <button
              onClick={() => setActiveTab('APPROVALS')}
              className={`relative px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'APPROVALS'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-750' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Approvals Queue</span>
              {stats.pending > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {stats.pending}
                </span>
              )}
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className={`p-2 rounded-2xl border text-xs font-bold transition shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Export Employee Roster (CSV)"
          >
            <Download className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Alert / Feedback Notification Banner */}
      {feedbackMessage && (
        <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between animate-fade-in ${
          feedbackMessage.type === 'SUCCESS' ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200' :
          feedbackMessage.type === 'ERROR' ? 'bg-rose-950/80 border-rose-800 text-rose-200' :
          'bg-indigo-950/80 border-indigo-800 text-indigo-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="opacity-70 hover:opacity-100">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dashboard KPI Summary Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Headcount</p>
            <p className="text-xl font-black text-indigo-400">{stats.total}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Staff</p>
            <p className="text-xl font-black text-emerald-400">{stats.active}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verification Pending</p>
            <p className="text-xl font-black text-amber-400">{stats.pending}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KYC Doc Pending</p>
            <p className="text-xl font-black text-sky-400">{stats.kycPending}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TAB 1: DIRECTORY & ROSTER VIEW */}
      {activeTab === 'DIRECTORY' && (
        <div className="space-y-4">
          
          {/* Search, Filter & Sort Controls */}
          <div className={`p-3.5 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Name, Employee ID, Phone, Email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="PENDING_VERIFICATION">Pending Verification</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="NAME">Sort: Name (A-Z)</option>
                  <option value="JOIN_DATE">Sort: Joined Date</option>
                  <option value="ID">Sort: Employee ID</option>
                </select>
              </div>
            </div>
          </div>

          {/* Employee Grid / List */}
          {loading ? (
            <div className={`p-8 text-center rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">Loading Employee Directory from Firestore...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className={`p-10 text-center rounded-3xl border space-y-2 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <Users className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-sm font-bold">No Employees Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No matching personnel records match your search criteria or filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setDepartmentFilter('ALL');
                }}
                className="mt-2 px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEmployees.map(emp => (
                <div
                  key={emp.id}
                  className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                    isDark ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.profilePictureUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={emp.firstName}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500/30 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold tracking-tight">
                            {emp.firstName} {emp.lastName}
                          </h3>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                            emp.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                            emp.status === 'PENDING_VERIFICATION' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                            'bg-rose-950 text-rose-400 border-rose-800'
                          }`}>
                            {emp.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-400 font-mono font-bold mt-0.5">
                          {emp.id} • {emp.designation}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-500" />
                          <span>{emp.assignedSiteId}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedEmployee(emp)}
                      className={`p-2 rounded-xl border transition ${
                        isDark ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-indigo-400' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-indigo-600'
                      }`}
                      title="View Full Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>{emp.contactNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Shield className="w-3 h-3 text-amber-400" />
                      <span>Role: {emp.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REGISTER NEW EMPLOYEE FORM */}
      {activeTab === 'REGISTER' && (
        <form onSubmit={handleRegisterEmployee} className={`p-4 sm:p-5 rounded-3xl border space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-800">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>Onboard New Employee</span>
              </h3>
              <p className="text-xs text-slate-400">Fill in personal, placement, and KYC document details</p>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              Form Validation Enabled
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* First Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="e.g. Rahul"
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  formErrors.firstName ? 'border-rose-500 bg-rose-950/20' : isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              />
              {formErrors.firstName && <p className="text-[10px] text-rose-400 mt-0.5">{formErrors.firstName}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="e.g. Sharma"
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  formErrors.lastName ? 'border-rose-500 bg-rose-950/20' : isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              />
              {formErrors.lastName && <p className="text-[10px] text-rose-400 mt-0.5">{formErrors.lastName}</p>}
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Contact Number *</label>
              <input
                type="text"
                value={formData.contactNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                placeholder="e.g. +919876543210"
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  formErrors.contactNumber ? 'border-rose-500 bg-rose-950/20' : isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              />
              {formErrors.contactNumber && <p className="text-[10px] text-rose-400 mt-0.5">{formErrors.contactNumber}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. rahul@apexsecurity.com"
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  formErrors.email ? 'border-rose-500 bg-rose-950/20' : isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              />
              {formErrors.email && <p className="text-[10px] text-rose-400 mt-0.5">{formErrors.email}</p>}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            {/* Role Assignment */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Assign Role Scope *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-indigo-400' : 'bg-slate-50 border-slate-200 text-indigo-600'
                }`}
              >
                <option value="GUARD">GUARD (Site Patrol & Clock In)</option>
                <option value="FIELD_OFFICER">FIELD_OFFICER (Inspector)</option>
                <option value="OPS_MANAGER">OPS_MANAGER (Site Supervisor)</option>
                <option value="HR_ADMIN">HR_ADMIN (HR Lead)</option>
              </select>
            </div>

            {/* Emergency Contact Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Emergency Contact Person *</label>
              <input
                type="text"
                value={formData.emergencyName}
                onChange={(e) => setFormData(prev => ({ ...prev, emergencyName: e.target.value }))}
                placeholder="Name of Next of Kin"
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  formErrors.emergencyName ? 'border-rose-500 bg-rose-950/20' : isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              />
              {formErrors.emergencyName && <p className="text-[10px] text-rose-400 mt-0.5">{formErrors.emergencyName}</p>}
            </div>

            {/* Emergency Contact Phone */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Emergency Contact Phone *</label>
              <input
                type="text"
                value={formData.emergencyPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                placeholder="+919800011122"
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  formErrors.emergencyPhone ? 'border-rose-500 bg-rose-950/20' : isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              />
              {formErrors.emergencyPhone && <p className="text-[10px] text-rose-400 mt-0.5">{formErrors.emergencyPhone}</p>}
            </div>

            {/* Aadhaar / ID Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Aadhaar Card Number *</label>
              <input
                type="text"
                value={formData.aadharNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, aadharNumber: e.target.value }))}
                placeholder="1234-5678-9012"
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  formErrors.aadharNumber ? 'border-rose-500 bg-rose-950/20' : isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              />
              {formErrors.aadharNumber && <p className="text-[10px] text-rose-400 mt-0.5">{formErrors.aadharNumber}</p>}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('DIRECTORY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
            >
              <BadgeCheck className="w-4 h-4" />
              <span>Submit Registration</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: APPROVALS & KYC VERIFICATION QUEUE */}
      {activeTab === 'APPROVALS' && (
        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Pending Employee Onboarding & Verification Requests</span>
            </h3>
            <p className="text-xs text-slate-400">
              Review new personnel registrations and KYC compliance documents before granting active site duty privileges.
            </p>
          </div>

          {employees.filter(e => e.status === 'PENDING_VERIFICATION' || (e.documents || []).some(d => d.status === 'PENDING')).length === 0 ? (
            <div className={`p-8 text-center rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold">Verification Queue Clear</h4>
              <p className="text-xs text-slate-400">All employee registrations and KYC documents have been processed.</p>
            </div>
          ) : (
            employees
              .filter(e => e.status === 'PENDING_VERIFICATION' || (e.documents || []).some(d => d.status === 'PENDING'))
              .map(emp => (
                <div key={emp.id} className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.profilePictureUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={emp.firstName}
                        className="w-10 h-10 rounded-xl object-cover border border-amber-500/50"
                      />
                      <div>
                        <h4 className="text-xs font-bold">{emp.firstName} {emp.lastName} ({emp.id})</h4>
                        <p className="text-[11px] text-slate-400">{emp.designation} • {emp.assignedSiteId}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveStatus(emp.id, 'ACTIVE')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Employee</span>
                      </button>
                      <button
                        onClick={() => handleApproveStatus(emp.id, 'SUSPENDED')}
                        className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  {/* Documents pending */}
                  <div className="pl-3 border-l-2 border-indigo-500/30 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KYC Verification Documents:</p>
                    {(emp.documents || []).map(doc => (
                      <div key={doc.id} className="flex items-center justify-between text-xs bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-mono font-bold">{doc.type}:</span>
                          <span>{doc.documentNumber}</span>
                        </div>

                        {doc.status === 'PENDING' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleVerifyDoc(emp.id, doc.id, 'VERIFIED')}
                              className="text-[10px] text-emerald-400 font-bold hover:underline"
                            >
                              Verify Doc
                            </button>
                            <button
                              onClick={() => handleVerifyDoc(emp.id, doc.id, 'REJECTED')}
                              className="text-[10px] text-rose-400 font-bold hover:underline"
                            >
                              Reject Doc
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-400">Verified</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* DETAIL MODAL OVERLAY */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-5 rounded-3xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-3 border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={selectedEmployee.profilePictureUrl}
                  alt="Avatar"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-500 shadow"
                />
                <div>
                  <h3 className="text-base font-bold">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h3>
                  <p className="text-xs text-indigo-400 font-mono font-bold">{selectedEmployee.id}</p>
                  <p className="text-[11px] text-slate-400">{selectedEmployee.designation}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Details Grid */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-950/40 border border-slate-800">
                <div>
                  <span className="text-slate-500 text-[10px]">Role Scope:</span>
                  <p className="font-bold text-indigo-400">{selectedEmployee.role}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Status:</span>
                  <p className="font-bold text-emerald-400">{selectedEmployee.status}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Assigned Site:</span>
                  <p className="font-medium">{selectedEmployee.assignedSiteId}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Joined Date:</span>
                  <p className="font-medium">{selectedEmployee.joinedDate}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Information</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{selectedEmployee.contactNumber}</span>
                </div>
                {selectedEmployee.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{selectedEmployee.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Emergency: {selectedEmployee.emergencyContact?.name || 'N/A'} ({selectedEmployee.emergencyContact?.relation || 'N/A'}) - {selectedEmployee.emergencyContact?.phone || 'N/A'}</span>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified KYC Documents</p>
                {(selectedEmployee.documents || []).map(d => (
                  <div key={d.id} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-indigo-300">{d.type}:</span> {d.documentNumber}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400">{d.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            {canManageEmployees && (
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleApproveStatus(selectedEmployee.id, selectedEmployee.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow ${
                    selectedEmployee.status === 'ACTIVE' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {selectedEmployee.status === 'ACTIVE' ? 'Suspend Employee' : 'Activate Employee'}
                </button>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

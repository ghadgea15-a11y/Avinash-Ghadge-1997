import React, { useState, useEffect, useMemo } from 'react';
import { Pagination } from '../common/Pagination';
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
  Upload, X, 
  AlertTriangle, 
  ArrowUpDown, 
  Download, 
  Eye, 
  Edit3, 
  Shield, 
  ChevronRight, 
  Sparkles,
  RefreshCw,
  UserCheck,
  Trash2,
  Lock,
  ShieldCheck,
  Briefcase,
  Calendar,
  User,
  Plus
} from 'lucide-react';
import { 
  EmployeeRecord, 
  EmployeeDocument, 
  UserSession, 
  CompanyTenant, 
  UserRole, 
  PhaseAScreen,
  BranchRecord,
  SiteRecord,
  DepartmentRecord,
  DesignationRecord
} from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { FirestoreService } from '../../services/firestoreService';
import { StorageService } from '../../services/storageService';
import { OfflineSyncService } from '../../services/offlineSyncService';

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
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Dynamic organizational options
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [designations, setDesignations] = useState<DesignationRecord[]>([]);
  const [vendors, setVendors] = useState<{id: string; vendorName: string; vendorCode: string}[]>([]);

  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'REGISTER' | 'APPROVALS'>('DIRECTORY');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  

  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [addDocFile, setAddDocFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);

  // Document upload modal state
  const [showAddDocModal, setShowAddDocModal] = useState<boolean>(false);
  const [newDocData, setNewDocData] = useState<{
    type: 'AADHAR' | 'PAN' | 'POLICE_VERIFICATION' | 'CONTRACT';
    documentNumber: string;
  }>({
    type: 'AADHAR',
    documentNumber: ''
  });

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'TERMINATED'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NAME' | 'JOIN_DATE' | 'ID'>('NAME');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, branchFilter, siteFilter, departmentFilter, roleFilter, employmentTypeFilter, sortBy]);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'SUCCESS' | 'ERROR' | 'INFO' } | null>(null);

  // Form state for registration / edit
  const [formData, setFormData] = useState({
    employeeCode: '',
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
    supervisorId: '',
    shiftId: 'SHIFT-DAY-0800-2000',
    employmentType: 'PERMANENT' as 'PERMANENT' | 'CONTRACT' | 'TEMPORARY',
    vendorId: '',
    role: 'GUARD' as UserRole,
    aadharNumber: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  // RBAC permissions helper
  const canManageEmployees = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN'].includes(userSession.role);
  const canApproveOnboarding = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER'].includes(userSession.role);
  const isCompanyAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(userSession.role);

  const currentCompanyId = activeCompany?.companyId || userSession.companyId;

  // Load organizational structure
  useEffect(() => {
    const loadOrgStructure = async () => {
      try {
        const [bList, sList, dList, desigList, vList] = await Promise.all([
          FirestoreService.getBranches(currentCompanyId),
          FirestoreService.getSites(currentCompanyId),
          FirestoreService.getDepartments(currentCompanyId),
          FirestoreService.getDesignations(currentCompanyId),
          FirestoreService.getVendors(currentCompanyId)
        ]);

        setBranches(bList);
        setSites(sList);
        setDepartments(dList);
        setDesignations(desigList);
        setVendors(vList);

        // Pre-populate form options if available
        if (bList.length > 0 && !formData.assignedBranchId) {
          setFormData(prev => ({ ...prev, assignedBranchId: bList[0].id }));
        }
        if (sList.length > 0 && !formData.assignedSiteId) {
          setFormData(prev => ({ ...prev, assignedSiteId: sList[0].id }));
        }
        if (dList.length > 0 && !formData.departmentId) {
          setFormData(prev => ({ ...prev, departmentId: dList[0].id }));
        }
      } catch (err) {
        console.warn('[EmployeeModule] Error loading organizational records:', err);
      }
    };

    loadOrgStructure();
  }, [currentCompanyId]);

  // Realtime Firestore listener for employees
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = FirestoreService.subscribeToEmployees(currentCompanyId, (records) => {
      setEmployees(records);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentCompanyId]);

  // Derived stats
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'ACTIVE').length;
    const pending = employees.filter(e => e.status === 'PENDING_VERIFICATION').length;
    const suspended = employees.filter(e => e.status === 'SUSPENDED').length;
    const kycPending = employees.filter(e => (e.documents || []).some(d => d.status === 'PENDING')).length;
    return { total, active, pending, suspended, kycPending };
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
        const matchesBranch = branchFilter === 'ALL' || emp.assignedBranchId === branchFilter;
        const matchesSite = siteFilter === 'ALL' || emp.assignedSiteId === siteFilter;
        const matchesDepartment = departmentFilter === 'ALL' || emp.departmentId === departmentFilter;
        const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
        const matchesEmployment = employmentTypeFilter === 'ALL' || emp.employmentType === employmentTypeFilter;

        return matchesQuery && matchesStatus && matchesBranch && matchesSite && matchesDepartment && matchesRole && matchesEmployment;
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
  }, [employees, searchQuery, statusFilter, branchFilter, siteFilter, departmentFilter, roleFilter, employmentTypeFilter, sortBy]);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  // Form Validation
  const validateForm = async () => {
    const errors: Record<string, string> = {};

    if (!editingEmployeeId && !formData.employeeCode.trim()) {
      errors.employeeCode = 'Employee ID / Code is required';
    } else if (!editingEmployeeId) {
      const codeRegex = /^[A-Z0-9_-]{3,20}$/i;
      if (!codeRegex.test(formData.employeeCode.trim())) {
        errors.employeeCode = 'Use 3-20 alphanumeric characters (e.g. EMP-101)';
      } else {
        // Check uniqueness in Firestore
        const exists = await FirestoreService.checkEmployeeExists(currentCompanyId, formData.employeeCode.trim());
        if (exists) {
          errors.employeeCode = `Employee ID ${formData.employeeCode.trim()} already exists in this tenant!`;
        }
      }
    }

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    
    if (!formData.contactNumber.trim()) {
      errors.contactNumber = 'Contact number is required';
    } else if (!/^\+?[0-9]{10,12}$/.test(formData.contactNumber.replace(/[\s-]/g, ''))) {
      errors.contactNumber = 'Enter a valid 10-12 digit phone number';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Invalid email address format';
    }

    if (!formData.emergencyName.trim()) errors.emergencyName = 'Emergency contact name required';
    if (!formData.emergencyPhone.trim()) errors.emergencyPhone = 'Emergency phone required';

    if (!editingEmployeeId) {
      if (!formData.aadharNumber.trim()) {
        errors.aadharNumber = 'Aadhaar / Identity document number is required';
      } else if (!/^[0-9]{4}-?[0-9]{4}-?[0-9]{4}$/.test(formData.aadharNumber.trim())) {
        errors.aadharNumber = 'Format: 1234-5678-9012 (12 digits)';
      }
    }

    if (formData.employmentType === 'CONTRACT' && !formData.vendorId) {
      errors.vendorId = 'Vendor selection is required for Contract employees';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Pre-fill form for Edit Mode
  const handleStartEdit = (emp: EmployeeRecord) => {
    if (!canManageEmployees) {
      setFeedbackMessage({ text: 'Permission Denied: Only HR Administrators and Company Admins can edit employee profiles.', type: 'ERROR' });
      return;
    }

    setEditingEmployeeId(emp.id);
    setFormData({
      employeeCode: emp.id || '',
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      contactNumber: emp.contactNumber || '',
      dateOfBirth: emp.dateOfBirth || '1995-01-01',
      bloodGroup: emp.bloodGroup || 'O+',
      gender: emp.gender || 'MALE',
      emergencyName: emp.emergencyContact?.name || '',
      emergencyRelation: emp.emergencyContact?.relation || 'Spouse',
      emergencyPhone: emp.emergencyContact?.phone || '',
      assignedRegionId: emp.assignedRegionId || 'REG-WEST-MUMBAI',
      assignedBranchId: emp.assignedBranchId || 'MUMBAI_HO',
      assignedSiteId: emp.assignedSiteId || 'SITE-MUMBAI-T2-AIRPORT',
      departmentId: emp.departmentId || 'DPT-SECURITY',
      designation: emp.designation || 'Security Officer',
      supervisorId: emp.supervisorId || '',
      shiftId: emp.shiftId || 'SHIFT-DAY-0800-2000',
      employmentType: emp.employmentType || 'PERMANENT',
      vendorId: emp.vendorId || '',
      role: emp.role || 'GUARD',
      aadharNumber: emp.documents?.[0]?.documentNumber || ''
    });

    setActiveTab('REGISTER');
    setSelectedEmployee(null);
  };

  // Submit Employee Registration or Update
  const handleRegisterOrUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageEmployees) {
      setFeedbackMessage({ text: 'Permission Denied: Unauthorized employee modification.', type: 'ERROR' });
      return;
    }

    setSubmitting(true);
    const isValid = await validateForm();
    if (!isValid) {
      setSubmitting(false);
      return;
    }

    const empId = editingEmployeeId || formData.employeeCode.trim();

    setUploadingFile(true);
    let finalProfileUrl = editingEmployeeId 
        ? (employees.find(e => e.id === empId)?.profilePictureUrl || ``)
        : ``;

    if (profilePictureFile) {
      try {
        finalProfileUrl = await StorageService.uploadFile(`companies/${currentCompanyId}/employees/${empId}/profile/profile_${Date.now()}`, profilePictureFile);
      } catch (err) {
        console.error('Failed to upload profile picture', err);
      }
    }

    let aadharDocUrl = '';
    if (!editingEmployeeId && aadharFile) {
      try {
        aadharDocUrl = await StorageService.uploadFile(`companies/${currentCompanyId}/employees/${empId}/documents/AADHAR/aadhar_${Date.now()}`, aadharFile);
      } catch (err) {
        console.error('Failed to upload aadhar', err);
      }
    }
    setUploadingFile(false);


    const existingDocs = editingEmployeeId 
      ? (employees.find(e => e.id === empId)?.documents || [])
      : [
          {
            id: `DOC-${Date.now()}`,
            type: 'AADHAR' as const,
            documentNumber: formData.aadharNumber.trim(),
            fileUrl: aadharDocUrl,
            status: 'PENDING' as const,
            uploadedAt: new Date().toISOString().split('T')[0]
          }
        ];

    const recordPayload: EmployeeRecord = {
      id: empId,
      companyId: currentCompanyId,
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
      supervisorId: formData.supervisorId || undefined,
      shiftId: formData.shiftId,
      employmentType: formData.employmentType,
      vendorId: formData.vendorId || undefined,
      vendorName: formData.vendorId ? vendors.find(v => v.id === formData.vendorId)?.vendorName : undefined,
      status: editingEmployeeId 
        ? (employees.find(e => e.id === empId)?.status || 'ACTIVE')
        : 'ACTIVE',
      joinedDate: editingEmployeeId
        ? (employees.find(e => e.id === empId)?.joinedDate || new Date().toISOString().split('T')[0])
        : new Date().toISOString().split('T')[0],
      role: formData.role,
      profilePictureUrl: finalProfileUrl,
      createdAt: editingEmployeeId ? (employees.find(e => e.id === empId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documents: existingDocs,
      createdBy: employees.find(e => e.id === empId)?.createdBy || userSession?.userId || 'SYSTEM'
    };

    if (isOnline) {
      const success = await FirestoreService.saveEmployee(currentCompanyId, recordPayload);
      if (success) {
        setFeedbackMessage({ 
          text: `Employee ${empId} (${recordPayload.firstName} ${recordPayload.lastName}) ${editingEmployeeId ? 'updated' : 'registered'} successfully!`, 
          type: 'SUCCESS' 
        });
      } else {
        setFeedbackMessage({ text: 'Error saving to Firestore. Queued offline.', type: 'ERROR' });
      }
    } else {
      OfflineSyncService.queueAction('CREATE_EMPLOYEE', recordPayload as unknown as Record<string, unknown>);
      setFeedbackMessage({ text: `Offline Mode: Employee ${empId} saved locally for auto-sync.`, type: 'INFO' });
    }

    setSubmitting(false);
    resetForm();
    setActiveTab('DIRECTORY');
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const resetForm = () => {
    setEditingEmployeeId(null);
    setProfilePictureFile(null);
    setAadharFile(null);
    setFormData({
      employeeCode: '',
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
      supervisorId: '',
      shiftId: 'SHIFT-DAY-0800-2000',
      employmentType: 'PERMANENT',
      vendorId: '',
      role: 'GUARD',
      aadharNumber: ''
    });
    setFormErrors({});
  };

  // Status Workflow Approval (Onboarding / Suspend / Terminate)
  const handleApproveStatus = async (empId: string, status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED') => {
    if (!canApproveOnboarding) {
      setFeedbackMessage({ text: 'Permission Denied: Only HR and Operations Managers can update status.', type: 'ERROR' });
      return;
    }

    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, status } : e));

    if (isOnline) {
      await FirestoreService.updateEmployeeStatus(currentCompanyId, empId, status, userSession.employeeId);
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

  // Delete Employee (Company Admin / Super Admin)
  const handleDeleteEmployee = async (empId: string) => {
    if (!isCompanyAdmin) {
      setFeedbackMessage({ text: 'Permission Denied: Only Company Administrators can delete employee records.', type: 'ERROR' });
      return;
    }

    if (isOnline) {
      const success = await FirestoreService.deleteEmployee(currentCompanyId, empId);
      if (success) {
        setFeedbackMessage({ text: `Employee ${empId} permanently deleted from company records.`, type: 'SUCCESS' });
        setEmployees(prev => prev.filter(e => e.id !== empId));
      } else {
        setFeedbackMessage({ text: 'Error deleting record from Firestore.', type: 'ERROR' });
      }
    } else {
      setFeedbackMessage({ text: 'Deletion requires active network connection.', type: 'ERROR' });
    }

    setDeletingEmployeeId(null);
    setSelectedEmployee(null);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Add Document to Selected Employee
  const handleAddDocument = async () => {
    if (!selectedEmployee) return;
    if (!newDocData.documentNumber.trim()) {
      alert('Please enter a document number.');
      return;
    }

    
    setUploadingFile(true);
    let finalDocUrl = '';
    if (addDocFile) {
      try {
        finalDocUrl = await StorageService.uploadFile(`companies/${currentCompanyId}/employees/${selectedEmployee.id}/documents/${newDocData.type}/${newDocData.type}_${Date.now()}`, addDocFile);
      } catch (err) {
        console.error('Failed to upload document', err);
      }
    }
    setUploadingFile(false);

    const newDoc: EmployeeDocument = {

      id: `DOC-${Date.now()}`,
      type: newDocData.type,
      documentNumber: newDocData.documentNumber.trim(),
      fileUrl: finalDocUrl,
      status: 'VERIFIED',
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    const updatedDocs = [...(selectedEmployee.documents || []), newDoc];
    const updatedEmployee = { ...selectedEmployee, documents: updatedDocs };

    setEmployees(prev => prev.map(e => e.id === selectedEmployee.id ? updatedEmployee : e));
    setSelectedEmployee(updatedEmployee);

    if (isOnline) {
      await FirestoreService.verifyEmployeeDocument(currentCompanyId, selectedEmployee.id, updatedDocs, userSession.employeeId);
      setFeedbackMessage({ text: `Added ${newDocData.type} document for ${selectedEmployee.id}.`, type: 'SUCCESS' });
    }

    setShowAddDocModal(false);
    setNewDocData({ type: 'AADHAR', documentNumber: '' });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };



  const handleDeleteDocument = async (docId: string, fileUrl: string) => {
    if (!selectedEmployee || !canManageEmployees) return;
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    setUploadingFile(true);
    if (fileUrl) {
      try {
        await StorageService.deleteFile(fileUrl);
      } catch (err) {
        console.error('Failed to delete file from storage', err);
      }
    }

    const updatedDocs = (selectedEmployee.documents || []).filter(d => d.id !== docId);
    const updatedEmployee = { ...selectedEmployee, documents: updatedDocs };
    setEmployees(prev => prev.map(e => e.id === selectedEmployee.id ? updatedEmployee : e));
    setSelectedEmployee(updatedEmployee);

    if (isOnline) {
      await FirestoreService.verifyEmployeeDocument(currentCompanyId, selectedEmployee.id, updatedDocs, userSession.employeeId);
      setFeedbackMessage({ text: 'Document deleted successfully.', type: 'SUCCESS' });
    }
    setUploadingFile(false);
  };

  // Verify Document Workflow
  const handleVerifyDoc = async (empId: string, docId: string, docStatus: 'VERIFIED' | 'REJECTED') => {
    if (!canManageEmployees) {
      setFeedbackMessage({ text: 'Permission Denied: Cannot modify document compliance state.', type: 'ERROR' });
      return;
    }

    const targetEmp = employees.find(e => e.id === empId);
    if (!targetEmp) return;

    const updatedDocs = (targetEmp.documents || []).map(d => d.id === docId ? { ...d, status: docStatus } : d);
    
    setEmployees(prev => prev.map(emp => emp.id === empId ? { ...emp, documents: updatedDocs } : emp));

    if (selectedEmployee && selectedEmployee.id === empId) {
      setSelectedEmployee({ ...selectedEmployee, documents: updatedDocs });
    }

    if (isOnline) {
      await FirestoreService.verifyEmployeeDocument(currentCompanyId, empId, updatedDocs, userSession.employeeId);
    }

    setFeedbackMessage({ text: `Document ${docStatus.toLowerCase()} successfully.`, type: 'SUCCESS' });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Export CSV Helper
  const handleExportCSV = () => {
    const headers = 'Employee ID,First Name,Last Name,Role,Department,Branch,Site,Status,Contact,Email,Employment Type,Joined Date\n';
    const rows = filteredEmployees.map(e => 
      `"${e.id}","${e.firstName}","${e.lastName}","${e.role}","${e.departmentId}","${e.assignedBranchId}","${e.assignedSiteId}","${e.status}","${e.contactNumber}","${e.email || undefined}","${e.employmentType || 'PERMANENT'}","${e.joinedDate}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee_roster_${currentCompanyId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Mask sensitive identity documents for non-admins
  const maskDocumentNumber = (docNum: string) => {
    if (canManageEmployees) return docNum;
    if (!docNum || docNum.length < 4) return 'XXXX-XXXX';
    return `XXXX-XXXX-${docNum.slice(-4)}`;
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
              <h2 className="text-base font-black tracking-tight">Employee & HR Management</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Phase 3 Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Enterprise Roster, KYC Documents, Onboarding & Site Placements ({currentCompanyId})
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => {
              resetForm();
              setActiveTab('DIRECTORY');
            }}
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
              onClick={() => {
                resetForm();
                setActiveTab('REGISTER');
              }}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'REGISTER'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-750' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>{editingEmployeeId ? 'Edit Employee' : 'Onboard Employee'}</span>
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
            {feedbackMessage.type === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
            {feedbackMessage.type === 'ERROR' && <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
            {feedbackMessage.type === 'INFO' && <Sparkles className="w-4 h-4 shrink-0 text-indigo-400" />}
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="opacity-70 hover:opacity-100">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dashboard KPI Summary Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Roster</p>
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Duty</p>
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Onboarding Queue</p>
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suspended Staff</p>
            <p className="text-xl font-black text-rose-400">{stats.suspended}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
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
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Duty</option>
                  <option value="PENDING_VERIFICATION">Pending Verification</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="TERMINATED">Terminated</option>
                </select>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="ALL">All Roles</option>
                  <option value="GUARD">Guard Scope</option>
                  <option value="FIELD_OFFICER">Field Officer</option>
                  <option value="OPS_MANAGER">Ops Manager</option>
                  <option value="HR_ADMIN">HR Admin</option>
                  <option value="COMPANY_ADMIN">Company Admin</option>
                </select>

                {branches.length > 0 && (
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}

                {sites.length > 0 && (
                  <select
                    value={siteFilter}
                    onChange={(e) => setSiteFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="ALL">All Sites</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}

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
                No personnel match your query or active filters for company <span className="font-mono">{currentCompanyId}</span>.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setBranchFilter('ALL');
                  setSiteFilter('ALL');
                  setDepartmentFilter('ALL');
                  setRoleFilter('ALL');
                  setEmploymentTypeFilter('ALL');
                }}
                className="mt-2 px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paginatedEmployees.map(emp => (
                <div
                  key={emp.id}
                  className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                    isDark ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.profilePictureUrl || undefined}
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
                            emp.status === 'SUSPENDED' ? 'bg-rose-950 text-rose-400 border-rose-800' :
                            'bg-slate-950 text-slate-400 border-slate-800'
                          }`}>
                            {emp.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-400 font-mono font-bold mt-0.5">
                          {emp.id} • {emp.designation}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">Site: {emp.assignedSiteId}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedEmployee(emp)}
                        className={`p-2 rounded-xl border transition ${
                          isDark ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-indigo-400' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-indigo-600'
                        }`}
                        title="View Employee Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {canManageEmployees && (
                        <button
                          onClick={() => handleStartEdit(emp)}
                          className={`p-2 rounded-xl border transition ${
                            isDark ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-amber-400' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-amber-600'
                          }`}
                          title="Edit Employee"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{emp.contactNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Role: {emp.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredEmployees.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: REGISTER / EDIT EMPLOYEE FORM */}
      {activeTab === 'REGISTER' && canManageEmployees && (
        <form onSubmit={handleRegisterOrUpdateEmployee} className={`p-4 sm:p-5 rounded-3xl border space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-800">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>{editingEmployeeId ? `Edit Employee Record: ${editingEmployeeId}` : 'Onboard New Employee'}</span>
              </h3>
              <p className="text-xs text-slate-400">Specify personnel details, organizational placements, and identity verification</p>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              Tenant: {currentCompanyId}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Employee ID / Code */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Employee ID / Code *</label>
              <input
                type="text"
                disabled={!!editingEmployeeId}
                value={formData.employeeCode}
                onChange={(e) => setFormData(prev => ({ ...prev, employeeCode: e.target.value.toUpperCase() }))}
                placeholder="e.g. EMP-101"
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none ${
                  editingEmployeeId ? 'opacity-60 bg-slate-950 border-slate-800' :
                  formErrors.employeeCode ? 'border-rose-500 bg-rose-950/20' : isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              />
              {formErrors.employeeCode && <p className="text-[10px] text-rose-400 mt-0.5">{formErrors.employeeCode}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Profile Picture (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfilePictureFile(e.target.files?.[0] || null)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>
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

            {/* Email Address */}
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

            {/* Assigned Branch */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Assigned Branch *</label>
              <select
                value={formData.assignedBranchId}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedBranchId: e.target.value }))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {branches.length > 0 ? (
                  branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))
                ) : (
                  <option value="MUMBAI_HO">Mumbai Head Office (Default)</option>
                )}
              </select>
            </div>

            {/* Assigned Site */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Assigned Duty Site *</label>
              <select
                value={formData.assignedSiteId}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedSiteId: e.target.value }))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {sites.length > 0 ? (
                  sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.clientName})</option>
                  ))
                ) : (
                  <option value="SITE-MUMBAI-T2-AIRPORT">T2 Terminal Airport Site (Default)</option>
                )}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Department *</label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData(prev => ({ ...prev, departmentId: e.target.value }))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {departments.length > 0 ? (
                  departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))
                ) : (
                  <option value="DPT-SECURITY">Security Operations</option>
                )}
              </select>
            </div>

            {/* Designation */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Designation *</label>
              <select
                value={formData.designation}
                onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {designations.length > 0 ? (
                  designations.map(d => (
                    <option key={d.id} value={d.title}>{d.title} (Level {d.level})</option>
                  ))
                ) : (
                  <>
                    <option value="Security Officer">Security Officer</option>
                    <option value="Senior Guard">Senior Guard</option>
                    <option value="Field Inspector">Field Inspector</option>
                    <option value="Site Supervisor">Site Supervisor</option>
                    <option value="Operations Executive">Operations Executive</option>
                  </>
                )}
              </select>
            </div>

            {/* Employment Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Employment Type *</label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData(prev => ({ ...prev, employmentType: e.target.value as any, vendorId: e.target.value === 'CONTRACT' ? (vendors[0]?.id || '') : '' }))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <option value="PERMANENT">PERMANENT (Direct Payroll)</option>
                <option value="CONTRACT">CONTRACT (Vendor Supply)</option>
                <option value="TEMPORARY">TEMPORARY (Casual Duty)</option>
              </select>
            </div>

            {formData.employmentType === 'CONTRACT' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Select Vendor / Agency *</label>
                <select
                  value={formData.vendorId}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendorId: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                    formErrors.vendorId ? 'border-rose-500 bg-rose-50' : isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.vendorName} ({v.vendorCode})</option>
                  ))}
                </select>
                {formErrors.vendorId && <p className="text-[10px] text-rose-500 mt-1">{formErrors.vendorId}</p>}
              </div>
            )}

            {/* Role Scope */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">System Role Scope *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-indigo-400' : 'bg-slate-50 border-slate-200 text-indigo-600'
                }`}
              >
                <option value="GUARD">GUARD (Site Patrol & Mobile Punch)</option>
                <option value="FIELD_OFFICER">FIELD_OFFICER (Inspector)</option>
                <option value="OPS_MANAGER">OPS_MANAGER (Supervisor)</option>
                <option value="HR_ADMIN">HR_ADMIN (HR Lead)</option>
                {isCompanyAdmin && <option value="COMPANY_ADMIN">COMPANY_ADMIN (Full Tenant Control)</option>}
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

            {/* Aadhaar / ID Number (New onboarding only) */}
            {!editingEmployeeId && (
              <>
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
              <div className="mt-3">
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Aadhaar File / Scan (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setAadharFile(e.target.files?.[0] || null)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setActiveTab('DIRECTORY');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
            >
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
              <span>{editingEmployeeId ? 'Save Profile Changes' : 'Submit Registration'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: APPROVALS & KYC VERIFICATION QUEUE */}
      {activeTab === 'APPROVALS' && canApproveOnboarding && (
        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Pending Onboarding & KYC Document Verification Queue</span>
            </h3>
            <p className="text-xs text-slate-400">
              Review new personnel registrations and KYC compliance documents before granting active site duty access.
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
                        src={emp.profilePictureUrl || undefined}
                        alt={emp.firstName}
                        className="w-10 h-10 rounded-xl object-cover border border-amber-500/50"
                      />
                      <div>
                        <h4 className="text-xs font-bold">{emp.firstName} {emp.lastName} ({emp.id})</h4>
                        <p className="text-[11px] text-slate-400">{emp.designation} • Site: {emp.assignedSiteId}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveStatus(emp.id, 'ACTIVE')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Active</span>
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted Verification Documents:</p>
                    {(emp.documents || []).map(doc => (
                      <div key={doc.id} className="flex items-center justify-between text-xs bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-mono font-bold">{doc.type}:</span>
                          <span>{maskDocumentNumber(doc.documentNumber)}</span>
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

      {/* DETAIL PROFILE MODAL OVERLAY */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-xl p-5 rounded-3xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-3 border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={selectedEmployee.profilePictureUrl || undefined}
                  alt="Avatar"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-500 shadow"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </h3>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                      selectedEmployee.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                      selectedEmployee.status === 'PENDING_VERIFICATION' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                      'bg-rose-950 text-rose-400 border-rose-800'
                    }`}>
                      {selectedEmployee.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-400 font-mono font-bold mt-0.5">{selectedEmployee.id}</p>
                  <p className="text-[11px] text-slate-400">{selectedEmployee.designation} • {selectedEmployee.departmentId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Grid Details */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-950/40 border border-slate-800">
                <div>
                  <span className="text-slate-500 text-[10px]">Role Scope:</span>
                  <p className="font-bold text-indigo-400">{selectedEmployee.role}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Employment Type:</span>
                  <p className="font-bold text-amber-400">{selectedEmployee.employmentType || 'PERMANENT'}</p>
                </div>
                {selectedEmployee.employmentType === 'CONTRACT' && (
                  <div className="col-span-2">
                    <span className="text-slate-500 text-[10px]">Vendor / Agency Name:</span>
                    <p className="font-bold text-amber-400">{selectedEmployee.vendorName || selectedEmployee.vendorId || 'N/A'}</p>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 text-[10px]">Assigned Duty Site:</span>
                  <p className="font-semibold text-slate-200">{selectedEmployee.assignedSiteId}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Assigned Branch:</span>
                  <p className="font-semibold text-slate-200">{selectedEmployee.assignedBranchId}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Joined Date:</span>
                  <p className="font-semibold text-slate-200">{selectedEmployee.joinedDate}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Tenant ID:</span>
                  <p className="font-mono text-slate-300">{selectedEmployee.companyId}</p>
                </div>
              </div>

              {/* Contact & Emergency */}
              <div className="p-3 rounded-2xl border border-slate-800 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact & Emergency Contact</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{selectedEmployee.contactNumber}</span>
                  </div>
                  {selectedEmployee.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{selectedEmployee.email}</span>
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                  <span className="text-slate-500">Emergency: </span>
                  <span className="font-bold">{selectedEmployee.emergencyContact?.name || 'N/A'}</span> ({selectedEmployee.emergencyContact?.relation || 'Spouse'}) — {selectedEmployee.emergencyContact?.phone || 'N/A'}
                </div>
              </div>

              {/* KYC Documents */}
              <div className="p-3 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identity & Compliance Documents</p>
                  {canManageEmployees && (
                    <button
                      onClick={() => setShowAddDocModal(true)}
                      className="text-[10px] font-bold text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{uploadingFile ? 'Uploading...' : 'Attach Document'}</span>
                    </button>
                  )}
                </div>

                {(selectedEmployee.documents || []).length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No KYC documents attached yet.</p>
                ) : (
                  (selectedEmployee.documents || []).map(d => (
                    <div key={d.id} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-mono font-bold text-indigo-300">{d.type}:</span>
                        <span>{maskDocumentNumber(d.documentNumber)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.fileUrl && (
                          <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300">
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <span className={`text-[10px] font-bold ${d.status === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {d.status}
                        </span>

                        {canManageEmployees && (
                          <button onClick={() => handleDeleteDocument(d.id, d.fileUrl)} className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400" title="Delete">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {canManageEmployees && (
                  <button
                    onClick={() => handleStartEdit(selectedEmployee)}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}

                {canApproveOnboarding && (
                  <button
                    onClick={() => handleApproveStatus(
                      selectedEmployee.id, 
                      selectedEmployee.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                    )}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow ${
                      selectedEmployee.status === 'ACTIVE' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    {selectedEmployee.status === 'ACTIVE' ? 'Suspend Employee' : 'Activate Employee'}
                  </button>
                )}

                {isCompanyAdmin && (
                  <button
                    onClick={() => setDeletingEmployeeId(selectedEmployee.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-800 text-xs font-bold hover:bg-rose-900"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD DOCUMENT SUB-MODAL */}
      {showAddDocModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-5 rounded-3xl border shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Attach Compliance Document for {selectedEmployee.id}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Document Type *</label>
                <select
                  value={newDocData.type}
                  onChange={(e) => setNewDocData(prev => ({ ...prev, type: e.target.value as any }))}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="AADHAR">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="POLICE_VERIFICATION">Police Verification Certificate</option>
                  <option value="CONTRACT">Employment Contract</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Document Number / Certificate ID *</label>
                <input
                  type="text"
                  value={newDocData.documentNumber}
                  onChange={(e) => setNewDocData(prev => ({ ...prev, documentNumber: e.target.value }))}
                  placeholder="e.g. PVC-8839210-2026"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Upload File (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setAddDocFile(e.target.files ? e.target.files[0] : null)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddDocModal(false);
                  setAddDocFile(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDocument}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Save Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingEmployeeId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-5 rounded-3xl border shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold">Confirm Employee Permanent Deletion</h3>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete employee <span className="font-mono font-bold text-rose-400">{deletingEmployeeId}</span> from company <span className="font-mono">{currentCompanyId}</span>? This action is unrecoverable.
            </p>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setDeletingEmployeeId(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEmployee(deletingEmployeeId)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

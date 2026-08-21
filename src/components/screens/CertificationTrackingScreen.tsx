import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { PhaseAScreen, UserSession, CompanyTenant, EmployeeCertificationRecord, EmployeeRecord } from '../../types';
import { CertificationTrackingService } from '../../services/certificationTrackingService';
import { FirestoreService } from '../../services/firestoreService';
import { format, parseISO } from 'date-fns';
import { 
  Award, Search, Filter, Plus, FileText, CheckCircle2, 
  AlertTriangle, XCircle, RefreshCw, Upload, Eye, X, ShieldAlert 
} from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { StorageService } from '../../services/storageService';
function uuidv4() { return crypto.randomUUID(); }
import { getAuth } from 'firebase/auth';

export const CertificationTrackingScreen: React.FC<{
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  onNavigate: React.Dispatch<React.SetStateAction<PhaseAScreen>>;
}> = ({ userSession, activeCompany, onNavigate }) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'EMPLOYEES'>('DASHBOARD');
  
  const [certifications, setCertifications] = useState<EmployeeCertificationRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<EmployeeCertificationRecord | null>(null);

  // New Cert State
  const [newCert, setNewCert] = useState<Partial<EmployeeCertificationRecord>>({
    certificationName: '',
    certificationType: 'PSARA',
    issuingAuthority: '',
    certificateNumber: '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    isMandatory: true,
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (activeCompany?.companyId) {
      fetchData();
    }
  }, [activeCompany?.companyId]);

  const fetchData = async () => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      // Re-evaluate on load (in real app, this is via nightly job)
      await CertificationTrackingService.evaluateExpiryStatuses(activeCompany.companyId);
      
      const [certs, emps] = await Promise.all([
        CertificationTrackingService.getCompanyCertifications(activeCompany.companyId),
        FirestoreService.getEmployees(activeCompany.companyId)
      ]);
      setCertifications(certs);
      setEmployees(emps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const activeCerts = certifications.filter(c => c.status === 'ACTIVE').length;
  const expiringCerts = certifications.filter(c => c.status === 'EXPIRING_SOON').length;
  const expiredCerts = certifications.filter(c => c.status === 'EXPIRED').length;
  const totalCerts = certifications.filter(c => c.status !== 'RENEWED' && c.status !== 'REVOKED').length;

  const filteredCerts = useMemo(() => {
    return certifications.filter(c => {
      if (c.status === 'RENEWED' || c.status === 'REVOKED') return false;
      const matchesSearch = c.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.certificationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [certifications, searchTerm]);

  const paginatedCerts = filteredCerts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAssignCertification = async () => {
    if (!activeCompany || !selectedEmployeeId || !newCert.certificationName || !newCert.certificateNumber) {
       alert("Please fill all required fields");
       return;
    }
    const emp = employees.find(e => e.id === selectedEmployeeId);
    if (!emp) return;

    setLoading(true);
    try {
      let documentUrl = '';
      if (selectedFile) {
        documentUrl = await StorageService.uploadFile(`companies/${activeCompany.companyId}/certifications/${selectedEmployeeId}/${selectedFile.name}`, selectedFile, userSession);
      }

      const cert: EmployeeCertificationRecord = {
        id: uuidv4(),
        companyId: activeCompany.companyId,
        employeeId: emp.id,
        employeeName: emp.firstName + ' ' + emp.lastName,
        certificationName: newCert.certificationName!,
        certificationType: newCert.certificationType!,
        issuingAuthority: newCert.issuingAuthority || 'Internal',
        certificateNumber: newCert.certificateNumber!,
        issueDate: newCert.issueDate!,
        expiryDate: newCert.expiryDate,
        isMandatory: newCert.isMandatory || false,
        status: 'ACTIVE',
        documentUrl,
        verificationStatus: 'VERIFIED', // Assume verified if uploaded by HR
        verifiedBy: userSession.fullName,
        verifiedAt: new Date().toISOString(),
        siteId: emp.assignedSiteId,
        department: emp.departmentId,
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await CertificationTrackingService.saveCertification(userSession, cert);
      await fetchData();
      setIsAssignModalOpen(false);
      setSelectedFile(null);
    } catch (e) {
      console.error(e);
      alert("Failed to assign certification.");
    } finally {
      setLoading(false);
    }
  };

  const handleRenewCertification = async () => {
    if (!activeCompany || !selectedCert || !newCert.certificateNumber || !newCert.issueDate || !newCert.expiryDate) {
      alert("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      let documentUrl = '';
      if (selectedFile) {
        documentUrl = await StorageService.uploadFile(`companies/${activeCompany.companyId}/certifications/${selectedCert.employeeId}/${selectedFile.name}`, selectedFile, userSession);
      }

      const renewData: Partial<EmployeeCertificationRecord> = {
        certificateNumber: newCert.certificateNumber,
        issueDate: newCert.issueDate,
        expiryDate: newCert.expiryDate,
        documentUrl: documentUrl || undefined,
        verificationStatus: 'VERIFIED',
        verifiedBy: userSession.fullName,
        verifiedAt: new Date().toISOString()
      };

      await CertificationTrackingService.renewCertification(userSession, selectedCert.id, renewData);
      await fetchData();
      setIsRenewModalOpen(false);
      setSelectedCert(null);
      setSelectedFile(null);
    } catch (e) {
      console.error(e);
      alert("Failed to renew certification");
    } finally {
      setLoading(false);
    }
  };


  if (loading && certifications.length === 0) {
    return <div className="p-8 text-center text-slate-500">Loading certifications...</div>;
  }

  return (
    <div className={`p-4 md:p-6 lg:p-8 space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <Award className="w-7 h-7 text-emerald-500" />
            Certification & Expiry Tracking
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage mandatory compliance certifications and automate expiry alerts.
          </p>
        </div>
        <button 
          onClick={() => setIsAssignModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Assign Certification
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-slate-500">Total Tracked</h3>
            <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-display">{totalCerts}</div>
        </div>

        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-emerald-500/30' : 'bg-white border-emerald-200'} shadow-sm relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-slate-500">Active & Compliant</h3>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-display">{activeCerts}</div>
        </div>

        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-amber-500/30' : 'bg-white border-amber-200'} shadow-sm relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-slate-500">Expiring Soon (90d)</h3>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-display">{expiringCerts}</div>
        </div>

        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-rose-500/30' : 'bg-white border-rose-200'} shadow-sm relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-slate-500">Expired (Action Required)</h3>
            <div className="p-2 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-display">{expiredCerts}</div>
        </div>
      </div>

      <div className={`bg-white dark:bg-zinc-900 border ${isDark ? 'border-zinc-800' : 'border-slate-200'} rounded-2xl overflow-hidden shadow-sm`}>
        <div className={`p-4 border-b ${isDark ? 'border-zinc-800' : 'border-slate-200'} flex flex-col md:flex-row justify-between items-center gap-4`}>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search employee or certification..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <button className={`p-2 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'} hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors`}>
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={`text-xs uppercase font-semibold ${isDark ? 'bg-zinc-800/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Certification</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
              {paginatedCerts.map((cert) => (
                <tr key={cert.id} className={`hover:${isDark ? 'bg-zinc-800/50' : 'bg-slate-50/50'} transition-colors`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{cert.employeeName}</div>
                    <div className="text-xs text-slate-500">{cert.certificationType}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-emerald-600 dark:text-emerald-400">{cert.certificationName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      {cert.certificateNumber}
                      {cert.documentUrl && <a href={cert.documentUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline"><Eye className="w-3 h-3 inline"/></a>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{format(parseISO(cert.issueDate), 'MMM dd, yyyy')}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {cert.expiryDate ? format(parseISO(cert.expiryDate), 'MMM dd, yyyy') : 'No Expiry'}
                  </td>
                  <td className="px-4 py-3">
                    {cert.status === 'ACTIVE' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Active</span>}
                    {cert.status === 'EXPIRING_SOON' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"><AlertTriangle className="w-3 h-3" /> Expiring</span>}
                    {cert.status === 'EXPIRED' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"><XCircle className="w-3 h-3" /> Expired</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(cert.status === 'EXPIRED' || cert.status === 'EXPIRING_SOON') && (
                      <button 
                        onClick={() => {
                          setSelectedCert(cert);
                          setNewCert({
                            certificateNumber: '',
                            issueDate: format(new Date(), 'yyyy-MM-dd'),
                            expiryDate: ''
                          });
                          setIsRenewModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Renew
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedCerts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No certifications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={`p-4 border-t ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredCerts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-3xl shadow-xl overflow-hidden ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
              <h3 className="text-lg font-bold font-display flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-500" /> Assign Certification
              </h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Employee</label>
                <select 
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className={`w-full p-3 rounded-xl text-sm border focus:ring-2 focus:ring-emerald-500 outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                >
                  <option value="">Select Employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Certification Name</label>
                  <input 
                    type="text" 
                    value={newCert.certificationName}
                    onChange={(e) => setNewCert({...newCert, certificationName: e.target.value})}
                    placeholder="e.g. First Aid Level 1"
                    className={`w-full p-3 rounded-xl text-sm border focus:ring-2 focus:ring-emerald-500 outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                  <select 
                    value={newCert.certificationType}
                    onChange={(e) => setNewCert({...newCert, certificationType: e.target.value})}
                    className={`w-full p-3 rounded-xl text-sm border focus:ring-2 focus:ring-emerald-500 outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <option value="PSARA">PSARA Compliance</option>
                    <option value="FIRE_SAFETY">Fire Safety</option>
                    <option value="MEDICAL">Medical/First Aid</option>
                    <option value="SKILL">Technical Skill</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Certificate Number</label>
                  <input 
                    type="text" 
                    value={newCert.certificateNumber}
                    onChange={(e) => setNewCert({...newCert, certificateNumber: e.target.value})}
                    placeholder="Cert No."
                    className={`w-full p-3 rounded-xl text-sm border focus:ring-2 focus:ring-emerald-500 outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Issuing Authority</label>
                  <input 
                    type="text" 
                    value={newCert.issuingAuthority}
                    onChange={(e) => setNewCert({...newCert, issuingAuthority: e.target.value})}
                    placeholder="e.g. Red Cross"
                    className={`w-full p-3 rounded-xl text-sm border focus:ring-2 focus:ring-emerald-500 outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Issue Date</label>
                  <input 
                    type="date" 
                    value={newCert.issueDate}
                    onChange={(e) => setNewCert({...newCert, issueDate: e.target.value})}
                    className={`w-full p-3 rounded-xl text-sm border focus:ring-2 focus:ring-emerald-500 outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Expiry Date (Optional)</label>
                  <input 
                    type="date" 
                    value={newCert.expiryDate || ''}
                    onChange={(e) => setNewCert({...newCert, expiryDate: e.target.value})}
                    className={`w-full p-3 rounded-xl text-sm border focus:ring-2 focus:ring-emerald-500 outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Certificate Document</label>
                <div className={`p-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  isDark ? 'border-zinc-700 hover:border-emerald-500 bg-zinc-950' : 'border-slate-300 hover:border-emerald-500 bg-slate-50'
                }`}>
                  <input type="file" className="hidden" id="cert-upload" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                  <label htmlFor="cert-upload" className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-500">
                    <Upload className="w-4 h-4" /> 
                    {selectedFile ? selectedFile.name : 'Upload PDF/Image'}
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  checked={newCert.isMandatory}
                  onChange={(e) => setNewCert({...newCert, isMandatory: e.target.checked})}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-sm font-medium">Mandatory for role/site compliance</span>
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <button onClick={() => setIsAssignModalOpen(false)} className={`px-4 py-2 text-sm font-bold rounded-xl ${isDark ? 'text-slate-300 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
              <button onClick={handleAssignCertification} disabled={loading} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm">
                {loading ? 'Saving...' : 'Save Certification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {isRenewModalOpen && selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-3xl shadow-xl overflow-hidden ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
              <h3 className="text-lg font-bold font-display flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-500" /> Renew Certification
              </h3>
              <button onClick={() => setIsRenewModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800 text-slate-300' : 'bg-slate-100 text-slate-700'} text-sm`}>
                <div className="font-bold mb-1">Renewing: {selectedCert.certificationName}</div>
                <div>Employee: {selectedCert.employeeName}</div>
                <div>Previous Expiry: {selectedCert.expiryDate}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">New Certificate Number</label>
                <input 
                  type="text" 
                  value={newCert.certificateNumber}
                  onChange={(e) => setNewCert({...newCert, certificateNumber: e.target.value})}
                  className={`w-full p-3 rounded-xl text-sm border focus:ring-2 focus:ring-indigo-500 outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">New Issue Date</label>
                  <input 
                    type="date" 
                    value={newCert.issueDate}
                    onChange={(e) => setNewCert({...newCert, issueDate: e.target.value})}
                    className={`w-full p-3 rounded-xl text-sm border focus:ring-2 focus:ring-indigo-500 outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">New Expiry Date</label>
                  <input 
                    type="date" 
                    value={newCert.expiryDate || ''}
                    onChange={(e) => setNewCert({...newCert, expiryDate: e.target.value})}
                    className={`w-full p-3 rounded-xl text-sm border focus:ring-2 focus:ring-indigo-500 outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">New Certificate Document</label>
                <div className={`p-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  isDark ? 'border-zinc-700 hover:border-indigo-500 bg-zinc-950' : 'border-slate-300 hover:border-indigo-500 bg-slate-50'
                }`}>
                  <input type="file" className="hidden" id="cert-renew-upload" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                  <label htmlFor="cert-renew-upload" className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-500">
                    <Upload className="w-4 h-4" /> 
                    {selectedFile ? selectedFile.name : 'Upload PDF/Image'}
                  </label>
                </div>
              </div>

            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <button onClick={() => setIsRenewModalOpen(false)} className={`px-4 py-2 text-sm font-bold rounded-xl ${isDark ? 'text-slate-300 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
              <button onClick={handleRenewCertification} disabled={loading} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm">
                {loading ? 'Processing...' : 'Confirm Renewal'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

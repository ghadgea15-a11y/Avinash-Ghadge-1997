import React, { useState } from 'react';
import { UserSession, UserRole, SensitiveDataCategory, DataSensitivityLevel } from '../../types';
import { 
  SENSITIVE_FIELD_REGISTRY,
  DataProtectionService 
} from '../../services/dataProtectionService';
import { 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Lock, 
  FileText, 
  Database, 
  Users, 
  DollarSign, 
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Layers
} from 'lucide-react';

interface DataPrivacyViewerProps {
  userSession: UserSession;
}

export const DataPrivacyViewer: React.FC<DataPrivacyViewerProps> = ({ userSession }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [simulatorRole, setSimulatorRole] = useState<UserRole>('SUPER_ADMIN');

  // Sample data for DDM Simulator
  const sampleEmployee = {
    id: 'EMP-10042',
    employeeId: 'EMP-10042',
    fullName: 'Rajesh Kumar Sharma',
    companyId: userSession.companyId,
    assignedSiteId: 'SITE-NORTH-01',
    mobileNumber: '9876543210',
    personalEmail: 'rajesh.sharma@gmail.com',
    aadhaarNumber: '548912345678',
    panNumber: 'ABCDE1234F',
    bankAccountNumber: '9180200456789123',
    basicSalary: 32000,
    grossSalary: 45000,
    netSalary: 39500,
    ctc: 540000,
    pfUanNumber: '100987654321',
    esiIpNumber: '3100987654'
  };

  // Run simulation using simulated session
  const simulatedSession: UserSession = {
    ...userSession,
    role: simulatorRole,
    employeeId: simulatorRole === 'GUARD' ? 'EMP-99999' : userSession.employeeId, // non-matching employeeId to test peer access
    dataScope: simulatorRole === 'SUPER_ADMIN' ? 'GLOBAL' : (simulatorRole === 'COMPANY_ADMIN' || simulatorRole === 'HR_ADMIN' ? 'COMPANY' : (simulatorRole === 'SITE_IN_CHARGE' ? 'SITE' : 'SELF'))
  };

  const simulatedEmployee = DataProtectionService.sanitizeEmployeeRecord(simulatedSession, sampleEmployee);

  const getSensitivityBadge = (level: DataSensitivityLevel) => {
    switch (level) {
      case 'RESTRICTED':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-100 text-red-800 border border-red-200">RESTRICTED</span>;
      case 'CONFIDENTIAL':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-800 border border-amber-200">CONFIDENTIAL</span>;
      case 'INTERNAL':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-800 border border-blue-200">INTERNAL</span>;
      case 'PUBLIC':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-100 text-green-800 border border-green-200">PUBLIC</span>;
    }
  };

  const filteredFields = selectedCategory === 'ALL' 
    ? SENSITIVE_FIELD_REGISTRY 
    : SENSITIVE_FIELD_REGISTRY.filter(f => f.category === selectedCategory);

  return (
    <div className="space-y-6" id="data-privacy-viewer">
      {/* 3 Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Classification Tiers</div>
            <div className="text-lg font-bold text-gray-900">10 Sensitive Domains</div>
            <div className="text-xs text-gray-500 mt-1">Full ISO/GRC-compliant catalog</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Dynamic Masking (DDM)</div>
            <div className="text-lg font-bold text-indigo-700">Real-Time Field Masking</div>
            <div className="text-xs text-gray-500 mt-1">Aadhaar, PAN, Bank, CTC redactions</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Storage & DLP Sentinel</div>
            <div className="text-lg font-bold text-amber-700">Zero Insecure Exposure</div>
            <div className="text-xs text-gray-500 mt-1">Tenant-path validation & log scrubbing</div>
          </div>
        </div>
      </div>

      {/* Dynamic Data Masking (DDM) Simulator */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-600" />
              Dynamic Data Masking (DDM) Real-Time Perspective Simulator
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Simulate how employee PII, Aadhaar, PAN, and salary records are dynamically redacted based on caller role.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">Simulate Role:</span>
            <select
              value={simulatorRole}
              onChange={(e) => setSimulatorRole(e.target.value as UserRole)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 font-medium bg-gray-50 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="SUPER_ADMIN">SUPER_ADMIN (Full Access)</option>
              <option value="COMPANY_ADMIN">COMPANY_ADMIN (Company Cleartext)</option>
              <option value="HR_ADMIN">HR_ADMIN (HR / Payroll Cleartext)</option>
              <option value="FINANCE">FINANCE (Salary / Bank Cleartext)</option>
              <option value="OPS_MANAGER">OPS_MANAGER (Masked Aadhaar/PAN)</option>
              <option value="SITE_IN_CHARGE">SITE_IN_CHARGE (Site In-Charge Masked)</option>
              <option value="SUPERVISOR">SUPERVISOR (Supervisor Masked)</option>
              <option value="GUARD">GUARD / GROUND STAFF (Redacted Peer Records)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 font-medium">Employee Name & ID</div>
            <div className="text-sm font-semibold text-gray-900 mt-1">{simulatedEmployee.fullName} ({simulatedEmployee.employeeId})</div>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 font-medium flex justify-between">
              <span>Aadhaar Number</span>
              {simulatedEmployee.aadhaarNumber.includes('X') ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
            </div>
            <div className="text-sm font-semibold font-mono text-gray-900 mt-1">{simulatedEmployee.aadhaarNumber}</div>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 font-medium flex justify-between">
              <span>Income Tax PAN</span>
              {simulatedEmployee.panNumber.includes('X') ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
            </div>
            <div className="text-sm font-semibold font-mono text-gray-900 mt-1">{simulatedEmployee.panNumber}</div>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 font-medium flex justify-between">
              <span>Bank Account</span>
              {simulatedEmployee.bankAccountNumber.includes('•') ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
            </div>
            <div className="text-sm font-semibold font-mono text-gray-900 mt-1">{simulatedEmployee.bankAccountNumber}</div>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 font-medium flex justify-between">
              <span>Basic / Net Salary</span>
              {String(simulatedEmployee.basicSalary).includes('•') ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
            </div>
            <div className="text-sm font-semibold text-gray-900 mt-1">
              {simulatedEmployee.basicSalary} / {simulatedEmployee.netSalary}
            </div>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 font-medium flex justify-between">
              <span>Statutory PF UAN</span>
              {simulatedEmployee.pfUanNumber.includes('[') ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
            </div>
            <div className="text-sm font-semibold font-mono text-gray-900 mt-1">{simulatedEmployee.pfUanNumber}</div>
          </div>
        </div>
      </div>

      {/* Sensitive Data Classification Registry */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Sensitive Data Classification & Governance Matrix
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Comprehensive registry of sensitive fields, sensitivity tiers, and role-based masking rules.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">Filter Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-gray-50 font-medium"
            >
              <option value="ALL">All Categories ({SENSITIVE_FIELD_REGISTRY.length})</option>
              <option value="IDENTITY_DOCUMENTS">Identity Documents</option>
              <option value="SALARY_PAYROLL">Salary & Payroll</option>
              <option value="STATUTORY_INFO">Statutory Info</option>
              <option value="CONTACT_INFO">Contact Info</option>
              <option value="ATTENDANCE_LOCATION">Attendance & Location</option>
              <option value="CONTRACTS_COMMERCIAL">Contracts & Commercial</option>
              <option value="FINANCIAL_RECORDS">Financial Records</option>
              <option value="AUTH_SECURITY">Auth & Security</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="px-5 py-3">Field Key</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Tier</th>
                <th className="px-5 py-3">Masking Pattern</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Cleartext Exempt Roles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFields.map((field) => (
                <tr key={field.fieldKey} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3.5 font-mono text-xs font-bold text-gray-900">{field.fieldKey}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-600 font-medium">{field.category.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3.5">{getSensitivityBadge(field.sensitivityLevel)}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-indigo-700 bg-indigo-50/50 rounded">{field.maskingPattern}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-600">{field.description}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-700">
                    {field.exemptRoles.length > 0 ? (
                      <span className="font-semibold text-gray-800">{field.exemptRoles.slice(0, 3).join(', ')}{field.exemptRoles.length > 3 ? ` +${field.exemptRoles.length - 3}` : ''}</span>
                    ) : (
                      <span className="text-red-600 font-semibold italic">Never Exposed (Zero-Trust)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

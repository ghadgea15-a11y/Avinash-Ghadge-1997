import React, { useState, useMemo } from 'react';
import { UserSession, UserRole, AuthorityLevel, DataScope } from '../../types';
import { PermissionRegistry } from '../../services/permissionRegistry';
import { RbacService } from '../../services/rbacService';
import { EnterpriseModule, StandardPermission, PermissionAction } from '../../types/permissions';
import { Shield, Lock, CheckCircle2, XCircle, Search, Filter, KeyRound, Building, MapPin, Users } from 'lucide-react';

interface PrivilegeMatrixViewerProps {
  userSession: UserSession;
}

const ALL_ROLES: UserRole[] = [
  'OWNER_PROMOTER',
  'DIRECTOR_CEO',
  'GENERAL_MANAGER',
  'REGIONAL_MANAGER',
  'AREA_MANAGER',
  'SITE_IN_CHARGE',
  'SUPERVISOR',
  'HR_ADMIN',
  'FINANCE_MANAGER',
  'HR',
  'FINANCE',
  'ADMIN',
  'PROCUREMENT',
  'EHS',
  'QUALITY',
  'COMMERCIAL',
  'MIS',
  'CLIENT_MANAGEMENT',
  'IT',
  'OPERATIONS_OFFICE',
  'SKILLED',
  'SEMI_SKILLED',
  'SUPPORT',
  'COMPANY_ADMIN',
  'SUPER_ADMIN'
];

const ALL_MODULES: EnterpriseModule[] = [
  'HCM',
  'WFM',
  'ERP_FINANCE',
  'OPERATIONS',
  'EAM',
  'SCM',
  'CRM',
  'BI',
  'BPM',
  'GRC_SECURITY'
];

export const PrivilegeMatrixViewer: React.FC<PrivilegeMatrixViewerProps> = ({ userSession }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(userSession.role);
  const [selectedModule, setSelectedModule] = useState<EnterpriseModule | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<PermissionAction | 'ALL'>('ALL');

  // Simulated target session for inspecting effective permissions
  const targetSession = useMemo<UserSession>(() => {
    return {
      ...userSession,
      role: selectedRole,
      authorityLevel: RbacService.getAuthorityLevel({ ...userSession, role: selectedRole }),
      dataScope: RbacService.getDataScope({ ...userSession, role: selectedRole })
    };
  }, [userSession, selectedRole]);

  // Filter permission definitions
  const permissionList = useMemo(() => {
    return Object.values(PermissionRegistry.PERMISSIONS).filter(perm => {
      if (selectedModule !== 'ALL' && perm.module !== selectedModule) return false;
      if (selectedAction !== 'ALL' && perm.action !== selectedAction) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = perm.name.toLowerCase().includes(term);
        const matchesCode = perm.code.toLowerCase().includes(term);
        const matchesDesc = perm.description.toLowerCase().includes(term);
        if (!matchesName && !matchesCode && !matchesDesc) return false;
      }
      return true;
    });
  }, [selectedModule, selectedAction, searchTerm]);

  return (
    <div id="privilege-governance-matrix" className="space-y-6">
      {/* Header & Role Selector */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Privilege Governance & Access Control Matrix</h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Authoritative zero-trust role-permission evaluation across Modules 1 to 10.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Inspect Role:</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ALL_ROLES.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Effective Session Summary Card */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-slate-500 block mb-1">Effective Authority Level</span>
            <span className="font-bold text-slate-800 text-sm">{targetSession.authorityLevel}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-slate-500 block mb-1">Canonical Data Scope</span>
            <span className="font-bold text-slate-800 text-sm">{targetSession.dataScope}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-slate-500 block mb-1">Active Tenant Boundary</span>
            <span className="font-bold text-indigo-700 text-sm truncate block">{targetSession.companyId}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-slate-500 block mb-1">Assigned Site / Branch</span>
            <span className="font-bold text-slate-800 text-sm truncate block">{targetSession.assignedSiteId || targetSession.branchId || 'Enterprise'}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search permissions by code, name, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value as any)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Modules (1–10)</option>
          {ALL_MODULES.map(m => (
            <option key={m} value={m}>{m.replace('_', ' ')}</option>
          ))}
        </select>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value as any)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Actions</option>
          <option value="READ">READ</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="APPROVE">APPROVE</option>
          <option value="EXPORT">EXPORT</option>
          <option value="REPORT">REPORT</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>

      {/* Permission Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-3 w-12 text-center">Status</th>
                <th className="p-3">Module</th>
                <th className="p-3">Submodule</th>
                <th className="p-3">Action</th>
                <th className="p-3">Permission Code & Description</th>
                <th className="p-3">Min. Authority</th>
                <th className="p-3 text-right">Scope Enforced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionList.map((perm) => {
                const evalResult = PermissionRegistry.evaluatePermission(targetSession, perm.code, {
                  targetCompanyId: targetSession.companyId,
                  targetSiteId: targetSession.assignedSiteId
                });
                const isGranted = evalResult.allowed;

                return (
                  <tr 
                    key={perm.code} 
                    className={`hover:bg-slate-50 transition-colors ${
                      isGranted ? 'bg-white' : 'bg-slate-50/40 text-slate-400'
                    }`}
                  >
                    <td className="p-3 text-center">
                      {isGranted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="p-3 font-semibold text-slate-700">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                        {perm.module}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-600">
                      {perm.submodule}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        perm.action === 'APPROVE' ? 'bg-amber-100 text-amber-800' :
                        perm.action === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                        perm.action === 'DELETE' ? 'bg-rose-100 text-rose-800' :
                        perm.action === 'CREATE' ? 'bg-blue-100 text-blue-800' :
                        perm.action === 'UPDATE' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {perm.action}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-mono text-slate-800 font-semibold">{perm.code}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{perm.description}</div>
                      {!isGranted && evalResult.reason && (
                        <div className="text-rose-600 text-[10px] mt-0.5 flex items-center gap-1 font-sans">
                          <Lock className="w-3 h-3" /> {evalResult.reason}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 font-mono">
                      {perm.minimumAuthority}
                    </td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">
                        {targetSession.dataScope}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

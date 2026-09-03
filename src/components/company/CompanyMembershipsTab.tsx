import React, { useState } from 'react';
import { Users, Plus, Search, Trash2, CheckCircle2, XCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { UserMembershipRecord, UserRole, UserSession, BranchRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { Pagination } from '../common/Pagination';

interface CompanyMembershipsTabProps {
  companyId: string;
  userSession: UserSession;
  memberships: UserMembershipRecord[];
  setMemberships: React.Dispatch<React.SetStateAction<UserMembershipRecord[]>>;
  branches: BranchRecord[];
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  isDark: boolean;
}

export const CompanyMembershipsTab: React.FC<CompanyMembershipsTabProps> = ({
  companyId,
  userSession,
  memberships,
  setMemberships,
  branches,
  onSuccess,
  onError,
  isDark
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New Member Form State
  const [newMember, setNewMember] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'EMPLOYEE' as UserRole,
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
    branchId: ''
  });

  const filteredMembers = memberships.filter(m => {
    const matchesSearch =
      (m.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleUpdateRole = async (member: UserMembershipRecord, newRole: UserRole) => {
    try {
      const updated: UserMembershipRecord = { ...member, role: newRole };
      const success = await FirestoreService.updateUserMembership(userSession, companyId, updated);
      if (success) {
        setMemberships(prev => prev.map(m => m.userId === member.userId ? updated : m));
        onSuccess(`Role for ${member.fullName} updated to ${newRole}.`);
      } else {
        onError('Failed to update user membership role.');
      }
    } catch (err: any) {
      console.error('[CompanyMembershipsTab] Role update error:', err);
      onError(err?.message || 'Error updating member role.');
    }
  };

  const handleToggleStatus = async (member: UserMembershipRecord) => {
    const nextStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const updated: UserMembershipRecord = { ...member, status: nextStatus };
    try {
      const success = await FirestoreService.updateUserMembership(userSession, companyId, updated);
      if (success) {
        setMemberships(prev => prev.map(m => m.userId === member.userId ? updated : m));
        onSuccess(`Member ${member.fullName} status set to ${nextStatus}.`);
      } else {
        onError('Failed to update member status.');
      }
    } catch (err: any) {
      onError(err?.message || 'Failed to update member status.');
    }
  };

  const handleDeleteMember = async (userId: string, fullName: string) => {
    try {
      setSaving(true);
      const success = await FirestoreService.deleteUserMembership(companyId, userId);
      if (success) {
        setMemberships(prev => prev.filter(m => m.userId !== userId));
        setDeletingMemberId(null);
        onSuccess(`Membership for ${fullName} removed successfully.`);
      } else {
        onError('Failed to remove member.');
      }
    } catch (err: any) {
      console.error('[CompanyMembershipsTab] Delete error:', err);
      onError(err?.message || 'Error deleting member.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.fullName.trim()) {
      onError('Full Name is required.');
      return;
    }
    if (!newMember.email.trim() || !newMember.email.includes('@')) {
      onError('Valid Email is required.');
      return;
    }

    try {
      setSaving(true);
      const memberRecord: UserMembershipRecord = {
        userId: `usr_${Date.now().toString(36)}`,
        companyId,
        fullName: newMember.fullName.trim(),
        email: newMember.email.trim().toLowerCase(),
        phone: newMember.phone.trim(),
        role: newMember.role,
        status: newMember.status,
        branchId: newMember.branchId || undefined,
        createdAt: new Date().toISOString()
      };

      const success = await FirestoreService.createUserMembership(companyId, memberRecord);
      if (success) {
        setMemberships(prev => [memberRecord, ...prev]);
        setShowAddModal(false);
        setNewMember({
          fullName: '',
          email: '',
          phone: '',
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          branchId: ''
        });
        onSuccess(`Member ${memberRecord.fullName} registered successfully.`);
      } else {
        onError('Failed to register member.');
      }
    } catch (err: any) {
      console.error('[CompanyMembershipsTab] Create error:', err);
      onError(err?.message || 'Error registering member.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <span>Company User Memberships</span>
          </h3>
          <p className="text-xs text-slate-400">Manage tenant access privileges, RBAC roles, and active member status.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search user / email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none outline-none text-xs w-32"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <option value="ALL">All Roles</option>
            <option value="COMPANY_ADMIN">Company Admin</option>
            <option value="HR_ADMIN">HR Admin</option>
            <option value="OPS_MANAGER">Ops Manager</option>
            <option value="FINANCE_MANAGER">Finance Manager</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="GUARD">Guard</option>
            <option value="EMPLOYEE">Employee</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-indigo-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleCreateMember} className={`w-full max-w-md p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              <span>Register / Invite Company Member</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newMember.fullName}
                  onChange={e => setNewMember({ ...newMember, fullName: e.target.value })}
                  placeholder="e.g. Ramesh Patel"
                  className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newMember.email}
                  onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="ramesh@company.com"
                  className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Mobile Number</label>
                <input
                  type="tel"
                  value={newMember.phone}
                  onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className={`w-full p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Assigned Role</label>
                  <select
                    value={newMember.role}
                    onChange={e => setNewMember({ ...newMember, role: e.target.value as UserRole })}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="GUARD">GUARD</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="FIELD_OFFICER">FIELD_OFFICER</option>
                    <option value="TECHNICIAN">TECHNICIAN</option>
                    <option value="SAFETY_OFFICER">SAFETY_OFFICER</option>
                    <option value="OPS_MANAGER">OPS_MANAGER</option>
                    <option value="HR_ADMIN">HR_ADMIN</option>
                    <option value="FINANCE_MANAGER">FINANCE_MANAGER</option>
                    <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Status</label>
                  <select
                    value={newMember.status}
                    onChange={e => setNewMember({ ...newMember, status: e.target.value as any })}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Branch Assignment (Optional)</label>
                <select
                  value={newMember.branchId}
                  onChange={e => setNewMember({ ...newMember, branchId: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                >
                  <option value="">-- Unassigned --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Register Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMemberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <h4 className="text-sm font-bold text-rose-500">Revoke Member Access</h4>
            <p className="text-xs text-slate-400">
              Are you sure you want to remove this user from the company roster? They will lose access to company data immediately.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeletingMemberId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const m = memberships.find(mem => mem.userId === deletingMemberId);
                  if (m) handleDeleteMember(m.userId, m.fullName);
                }}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                {saving ? 'Removing...' : 'Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Memberships Table */}
      <div className={`rounded-2xl border overflow-x-auto ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <table className="w-full text-sm text-left">
          <thead className={`text-[11px] uppercase tracking-wider ${isDark ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
            <tr>
              <th className="py-3 px-4 font-semibold">User Name</th>
              <th className="py-3 px-4 font-semibold">Email</th>
              <th className="py-3 px-4 font-semibold">Role</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {paginatedMembers.map(member => (
              <tr key={member.userId} className="hover:bg-slate-800/20 transition">
                <td className="py-3 px-4 font-bold">
                  <div>
                    <span>{member.fullName}</span>
                    {member.phone && <p className="text-[11px] text-slate-500 font-mono font-normal">{member.phone}</p>}
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-slate-400 text-xs">{member.email}</td>
                <td className="py-3 px-4">
                  <select
                    value={member.role}
                    onChange={e => handleUpdateRole(member, e.target.value as UserRole)}
                    className={`p-1.5 rounded-lg border text-xs font-semibold ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-black'}`}
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="GUARD">GUARD</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="FIELD_OFFICER">FIELD_OFFICER</option>
                    <option value="TECHNICIAN">TECHNICIAN</option>
                    <option value="SAFETY_OFFICER">SAFETY_OFFICER</option>
                    <option value="OPS_MANAGER">OPS_MANAGER</option>
                    <option value="HR_ADMIN">HR_ADMIN</option>
                    <option value="FINANCE_MANAGER">FINANCE_MANAGER</option>
                    <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
                    {userSession.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
                  </select>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleToggleStatus(member)}
                    title={`Click to ${member.status === 'ACTIVE' ? 'suspend' : 'activate'}`}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      member.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {member.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{member.status}</span>
                  </button>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => setDeletingMemberId(member.userId)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Remove Member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {paginatedMembers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-xs italic">
                  {searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                    ? 'No members matching your filters.'
                    : 'No user memberships registered yet. Click "Add Member" above.'}
                </td>
              </tr>
            )}
          </tbody>
          {filteredMembers.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} className="p-0">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredMembers.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Building2, Plus, Search, Edit3, Trash2, CheckCircle2, XCircle, Phone, Mail, FileText } from 'lucide-react';
import { VendorRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';

interface CompanyVendorsTabProps {
  companyId: string;
  vendors: VendorRecord[];
  setVendors: React.Dispatch<React.SetStateAction<VendorRecord[]>>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  isDark: boolean;
}

export const CompanyVendorsTab: React.FC<CompanyVendorsTabProps> = ({
  companyId,
  vendors,
  setVendors,
  onSuccess,
  onError,
  isDark
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingVendor, setEditingVendor] = useState<Partial<VendorRecord> | null>(null);
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredVendors = vendors.filter(v =>
    (v.vendorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.vendorCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.serviceType || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor?.vendorName?.trim()) {
      onError('Vendor Agency Name is required.');
      return;
    }
    if (!editingVendor?.vendorCode?.trim()) {
      onError('Vendor Code is required.');
      return;
    }
    if (!editingVendor?.contactPerson?.trim()) {
      onError('Contact Person name is required.');
      return;
    }
    if (!editingVendor?.contactPhone?.trim()) {
      onError('Contact Phone number is required.');
      return;
    }

    try {
      setSaving(true);
      const vRecord: VendorRecord = {
        id: editingVendor.id || `VEND-${Date.now().toString(36).toUpperCase()}`,
        companyId,
        vendorName: editingVendor.vendorName.trim(),
        vendorCode: editingVendor.vendorCode.trim().toUpperCase(),
        serviceType: editingVendor.serviceType || 'SECURITY_AGENCY',
        gstinNumber: editingVendor.gstinNumber?.trim().toUpperCase() || '',
        panNumber: editingVendor.panNumber?.trim().toUpperCase() || '',
        contactPerson: editingVendor.contactPerson.trim(),
        contactPhone: editingVendor.contactPhone.trim(),
        contactEmail: editingVendor.contactEmail?.trim() || '',
        address: editingVendor.address?.trim() || '',
        contractStartDate: editingVendor.contractStartDate || new Date().toISOString(),
        status: editingVendor.status || 'ACTIVE',
        createdAt: editingVendor.createdAt || new Date().toISOString()
      };

      const success = await FirestoreService.saveVendor(companyId, vRecord);
      if (success) {
        setVendors(prev => {
          const idx = prev.findIndex(v => v.id === vRecord.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = vRecord;
            return next;
          }
          return [...prev, vRecord];
        });
        setEditingVendor(null);
        onSuccess(`Vendor "${vRecord.vendorName}" saved successfully.`);
      } else {
        onError('Failed to save vendor to Firestore.');
      }
    } catch (err: any) {
      console.error('[CompanyVendorsTab] Save error:', err);
      onError(err?.message || 'Error saving vendor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vendorId: string, vendorName: string) => {
    try {
      setSaving(true);
      const success = await FirestoreService.deleteVendor(companyId, vendorId);
      if (success) {
        setVendors(prev => prev.filter(v => v.id !== vendorId));
        setDeletingVendorId(null);
        onSuccess(`Vendor "${vendorName}" deleted successfully.`);
      } else {
        onError('Failed to delete vendor.');
      }
    } catch (err: any) {
      console.error('[CompanyVendorsTab] Delete error:', err);
      onError(err?.message || 'Error deleting vendor.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (vendor: VendorRecord) => {
    const nextStatus = vendor.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = { ...vendor, status: nextStatus };
    try {
      const success = await FirestoreService.saveVendor(companyId, updated);
      if (success) {
        setVendors(prev => prev.map(v => v.id === vendor.id ? updated : v));
        onSuccess(`Vendor "${vendor.vendorName}" marked ${nextStatus}.`);
      } else {
        onError('Failed to update vendor status.');
      }
    } catch (err: any) {
      onError(err?.message || 'Failed to update vendor status.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span>Vendors & Manpower Contractors</span>
          </h3>
          <p className="text-xs text-slate-400">Manage third-party agencies supplying contract guards, housekeeping staff, and facility management.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-36"
            />
          </div>

          <button
            onClick={() => setEditingVendor({ status: 'ACTIVE', serviceType: 'SECURITY_AGENCY' })}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-indigo-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vendor</span>
          </button>
        </div>
      </div>

      {/* Inline Form / Modal */}
      {editingVendor && (
        <form onSubmit={handleSave} className={`p-5 rounded-2xl border ${isDark ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-200'} space-y-4`}>
          <h4 className="text-sm font-bold text-indigo-400">
            {editingVendor.id ? `Edit Vendor: ${editingVendor.vendorName || ''}` : 'Register New Vendor Agency'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Vendor Agency Name *</label>
              <input
                type="text"
                required
                value={editingVendor.vendorName || ''}
                onChange={e => setEditingVendor({ ...editingVendor, vendorName: e.target.value })}
                placeholder="e.g. Eagle Security Services"
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Vendor Code *</label>
              <input
                type="text"
                required
                value={editingVendor.vendorCode || ''}
                onChange={e => setEditingVendor({ ...editingVendor, vendorCode: e.target.value.toUpperCase() })}
                placeholder="e.g. ESS-01"
                className={`w-full p-2.5 rounded-xl border font-mono uppercase ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Service Category</label>
              <select
                value={editingVendor.serviceType || 'SECURITY_AGENCY'}
                onChange={e => setEditingVendor({ ...editingVendor, serviceType: e.target.value as any })}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              >
                <option value="SECURITY_AGENCY">Security Guarding</option>
                <option value="HOUSEKEEPING">Housekeeping</option>
                <option value="MANPOWER">General Manpower / Labour</option>
                <option value="FACILITY_MANAGEMENT">Facility Management</option>
                <option value="OTHER">Other Services</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Contact Person *</label>
              <input
                type="text"
                required
                value={editingVendor.contactPerson || ''}
                onChange={e => setEditingVendor({ ...editingVendor, contactPerson: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Contact Phone *</label>
              <input
                type="tel"
                required
                value={editingVendor.contactPhone || ''}
                onChange={e => setEditingVendor({ ...editingVendor, contactPhone: e.target.value })}
                placeholder="e.g. +91 9876543210"
                className={`w-full p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Contact Email</label>
              <input
                type="email"
                value={editingVendor.contactEmail || ''}
                onChange={e => setEditingVendor({ ...editingVendor, contactEmail: e.target.value })}
                placeholder="contact@eaglesecurity.com"
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">GSTIN Number</label>
              <input
                type="text"
                value={editingVendor.gstinNumber || ''}
                onChange={e => setEditingVendor({ ...editingVendor, gstinNumber: e.target.value.toUpperCase() })}
                placeholder="27ABCDE1234F1Z5"
                className={`w-full p-2.5 rounded-xl border font-mono uppercase ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">PAN Number</label>
              <input
                type="text"
                value={editingVendor.panNumber || ''}
                onChange={e => setEditingVendor({ ...editingVendor, panNumber: e.target.value.toUpperCase() })}
                placeholder="ABCDE1234F"
                className={`w-full p-2.5 rounded-xl border font-mono uppercase ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Status</label>
              <select
                value={editingVendor.status || 'ACTIVE'}
                onChange={e => setEditingVendor({ ...editingVendor, status: e.target.value as any })}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setEditingVendor(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Vendor'}
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {deletingVendorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <h4 className="text-sm font-bold text-rose-500">Confirm Vendor Deletion</h4>
            <p className="text-xs text-slate-400">
              Are you sure you want to permanently delete this vendor contractor?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeletingVendorId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const vn = vendors.find(v => v.id === deletingVendorId);
                  if (vn) handleDelete(vn.id, vn.vendorName);
                }}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                {saving ? 'Deleting...' : 'Delete Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map(v => (
          <div
            key={v.id}
            className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-400'} transition flex flex-col justify-between group space-y-3`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-400 transition-colors">
                    {v.vendorName}
                  </h4>
                  <span className="font-mono text-xs font-semibold text-indigo-400">{v.vendorCode}</span>
                </div>
                <button
                  onClick={() => handleToggleStatus(v)}
                  title={`Click to ${v.status === 'ACTIVE' ? 'deactivate' : 'activate'}`}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    v.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {v.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>{v.status}</span>
                </button>
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <p className="text-[11px] font-semibold text-slate-300">Category: {v.serviceType?.replace('_', ' ')}</p>
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span>{v.contactPerson} ({v.contactPhone})</span>
                </p>
                {v.contactEmail && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-slate-500" />
                    <span>{v.contactEmail}</span>
                  </p>
                )}
                {v.gstinNumber && (
                  <p className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                    <FileText className="w-3 h-3 text-slate-500" />
                    <span>GSTIN: {v.gstinNumber}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">ID: {v.id.substring(0, 10)}...</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingVendor(v)}
                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition"
                  title="Edit Vendor"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingVendorId(v.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Delete Vendor"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredVendors.length === 0 && !editingVendor && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            {searchQuery ? 'No vendors matching your search query.' : 'No vendors registered yet. Click "Add Vendor" above.'}
          </div>
        )}
      </div>
    </div>
  );
};

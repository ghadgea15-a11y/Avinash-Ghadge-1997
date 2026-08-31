import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { ShieldCheck, Plus, Search, UserCheck, ShieldAlert, Lock, AlertCircle, RefreshCw, EyeOff, Eye } from 'lucide-react';
import { UserSession } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { db } from '../../firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminManagementScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: string) => void;
}

export const SuperAdminManagementScreen: React.FC<SuperAdminManagementScreenProps> = ({ currentSession, onNavigate }) => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  useBackNavigation(!!showAddModal, () => setShowAddModal(null as any), 'showAddModal');
  const { showSuccess, handleError, showLoading } = useFeedback();

  // Add Admin form state
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'super_admins'));
      const adminList = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      setAdmins(adminList);
    } catch (err) {
      handleError(err, 'Failed to load super admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminName) return;

    const dismiss = showLoading('Provisioning Super Admin...');
    try {
      const docRef = doc(db, 'super_admins', '');
      await setDoc(docRef, {
        email: newAdminEmail,
        name: newAdminName,
        phone: newAdminPhone,
        status: 'ACTIVE',
        mfaEnabled: false,
        createdBy: currentSession.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      dismiss();
      showSuccess('Super Admin added successfully');
      setShowAddModal(false);
      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminPhone('');
      const noop = ('');
      loadAdmins();
    } catch (err) {
      dismiss();
      handleError(err, 'Failed to add super admin');
    }
  };

  const toggleAdminStatus = async (uid: string, currentStatus: string) => {
    if (uid === currentSession.userId) {
      handleError(new Error('Cannot suspend your own account'), 'Action Denied');
      return;
    }
    const dismiss = showLoading('Updating status...');
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await updateDoc(doc(db, 'super_admins', uid), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: currentSession.userId
      });
      dismiss();
      showSuccess(`Admin \${newStatus === 'ACTIVE' ? 'activated' : 'suspended'}`);
      loadAdmins();
    } catch (err) {
      dismiss();
      handleError(err, 'Failed to update status');
    }
  };

  const filteredAdmins = admins.filter(a => 
    (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (a.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-slate-50 p-6 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Platform Administrators</h1>
            <p className="text-sm text-slate-500 font-medium">Manage top-level super admin access and MFA policies.</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-black hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Admin</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl focus:border-black outline-none text-sm transition-all"
            />
          </div>
          <button 
            onClick={loadAdmins}
            className="text-slate-500 hover:text-black p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 \${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Administrator</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">MFA Status</th>
                <th className="px-6 py-4">Account Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdmins.map(admin => (
                <tr key={admin.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                        {(admin.name || admin.email || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{admin.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 font-mono">{admin.uid}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{admin.email}</div>
                    <div className="text-xs text-slate-500">{admin.phone || 'No phone'}</div>
                  </td>
                  <td className="px-6 py-4">
                    {admin.mfaEnabled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-200">
                        <Lock className="w-3 h-3" /> Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                        <ShieldAlert className="w-3 h-3" /> Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border \${
                      admin.status === 'ACTIVE' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {admin.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleAdminStatus(admin.uid, admin.status)}
                      disabled={admin.uid === currentSession.userId}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors \${
                        admin.uid === currentSession.userId
                          ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                          : admin.status === 'ACTIVE'
                            ? 'bg-white border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200'
                            : 'bg-white border-slate-200 text-green-600 hover:bg-green-50 hover:border-green-200'
                      }`}
                    >
                      {admin.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAdmins.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No administrators found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Provision Super Admin</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <EyeOff className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAdmin} className="p-6 space-y-4">
              
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-xs font-medium text-amber-800 leading-relaxed">
                  Provisioning a Super Admin grants complete platform control. Use a valid Firebase Auth UID.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Auth UID</label>
                <input 
                  type="text" 
                  value={''}
                  onChange={e => {}}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-black outline-none font-mono text-sm"
                  placeholder="e.g. j2K4...lP9"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={newAdminName}
                  onChange={e => setNewAdminName(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-black outline-none"
                  placeholder="Jane Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-black outline-none"
                  placeholder="admin@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Phone (Optional)</label>
                <input 
                  type="tel" 
                  value={newAdminPhone}
                  onChange={e => setNewAdminPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-black outline-none"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-black hover:bg-slate-900 rounded-xl transition-colors shadow-lg"
                >
                  Provision Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen, AnnouncementRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { Bell, Megaphone, Plus } from 'lucide-react';
import { RbacService } from '../../services/rbacService';

interface Props {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const AnnouncementsScreen: React.FC<Props> = ({ userSession, company, onNavigate }) => {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newAnn, setNewAnn] = useState<Partial<AnnouncementRecord>>({ message: '', priority: 'NORMAL' });

  const canCreate = RbacService.hasModuleAccess(userSession, 'COMPANY_MANAGEMENT') || userSession.role === 'HR';

  useEffect(() => {
    const unsub = FirestoreService.subscribeToAnnouncements(userSession, company.companyId, setAnnouncements);
    setTimeout(() => setLoading(false), 800);
    return () => unsub();
  }, [userSession, company.companyId]);

  const handleCreate = async () => {
    if (!newAnn.message) return;
    
    const ann: AnnouncementRecord = {
      id: crypto.randomUUID(),
      companyId: company.companyId,
      targetAudience: 'ALL',
      priority: newAnn.priority as any,
      message: newAnn.message || '',
      expiresAt: Date.now() + 86400000 * 7,
      createdBy: userSession.employeeId || 'admin',
      createdAt: Date.now(),
      
    };
    
    await FirestoreService.saveAnnouncement(company.companyId, ann);
    setShowCreate(false);
    setNewAnn({ message: '', priority: 'NORMAL' });
  };

  if (loading) return <div className="p-8 text-center">Loading Announcements...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-indigo-600" /> Company Announcements
        </h2>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg">
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        )}
      </div>

      {showCreate && (
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
          <h3 className="font-bold mb-4">Post Announcement</h3>
          <div className="space-y-4">
            <input type="text" placeholder="Title" className="w-full p-2 border rounded" value={newAnn.message} onChange={e => setNewAnn({...newAnn, message: e.target.value})} />
            <textarea placeholder="Message content..." className="w-full p-2 border rounded h-32" value={newAnn.message} onChange={e => setNewAnn({...newAnn, message: e.target.value + ' '})} />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="bg-indigo-600 text-white px-4 py-2 rounded">Post</button>
              <button onClick={() => setShowCreate(false)} className="bg-slate-200 px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {announcements.sort((a,b) => b.createdAt - a.createdAt).map(ann => (
          <div key={ann.id} className="bg-white p-6 rounded-xl shadow-sm border flex gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">Announcement</h3>
                <span className="text-xs text-slate-400">{new Date(ann.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-slate-600 whitespace-pre-wrap">{ann.message}</p>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed">
            No active announcements.
          </div>
        )}
      </div>
    </div>
  );
};

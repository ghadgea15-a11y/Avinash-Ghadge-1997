import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  Building2, 
  Search, 
  UserCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Filter
} from 'lucide-react';
import { UserSession, PhaseAScreen, LeadRecord, LeadStatus, LeadActivity } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { Pagination } from '../common/Pagination';
import { useTheme } from '../../context/ThemeContext';

interface SuperAdminLeadsScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SuperAdminLeadsScreen: React.FC<SuperAdminLeadsScreenProps> = ({
  currentSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  useBackNavigation(!!selectedLead, () => setSelectedLead(null as any), 'selectedLead');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const unsub = FirestoreService.subscribeToLeads((data) => {
      setLeads(data);
      setLoading(false);
      
      if (selectedLead) {
        const updated = data.find(l => l.id === selectedLead.id);
        if (updated) setSelectedLead(updated);
      }
    });
    return () => unsub();
  }, []);

  const filteredLeads = leads.filter(lead => {
    const leadName = lead.name || lead.contactPerson || '';
    const leadCompany = lead.company || lead.companyName || '';
    const matchesSearch = 
      leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leadCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW').length,
    contacted: leads.filter(l => l.status === 'CONTACTED').length,
    qualified: leads.filter(l => l.status === 'QUALIFIED').length,
    demo: leads.filter(l => l.status === 'DEMO').length,
    converted: leads.filter(l => l.status === 'CONVERTED').length,
    lost: leads.filter(l => l.status === 'LOST').length,
  };

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    const activity: LeadActivity = {
      id: `act_${Date.now()}`,
      action: 'STATUS_CHANGE',
      notes: `Status changed to ${newStatus}`,
      timestamp: new Date().toISOString(),
      actorId: currentSession.userId,
      actorName: currentSession.fullName
    };
    
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    await FirestoreService.updateLead(leadId, {
      status: newStatus,
      activityHistory: [...(lead.activityHistory || []), activity]
    });
  };

  const handleAddNote = async () => {
    if (!selectedLead || !newNote.trim()) return;
    
    const activity: LeadActivity = {
      id: `act_${Date.now()}`,
      action: 'NOTE_ADDED',
      notes: newNote.trim(),
      timestamp: new Date().toISOString(),
      actorId: currentSession.userId,
      actorName: currentSession.fullName
    };
    
    await FirestoreService.updateLead(selectedLead.id, {
      notes: selectedLead.notes ? `${selectedLead.notes}\n\n[${new Date().toLocaleDateString()}] ${newNote.trim()}` : newNote.trim(),
      activityHistory: [...(selectedLead.activityHistory || []), activity]
    });
    
    setNewNote('');
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'NEW': return 'bg-sky-500/20 text-sky-500 border-sky-500/30';
      case 'CONTACTED': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'QUALIFIED': return 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30';
      case 'DEMO': return 'bg-fuchsia-500/20 text-fuchsia-500 border-fuchsia-500/30';
      case 'CONVERTED': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
      case 'LOST': return 'bg-rose-500/20 text-rose-500 border-rose-500/30';
      default: return 'bg-white0/20 text-slate-500 border-slate-500/30';
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-white text-black'} p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => onNavigate('SUPER_ADMIN_DASHBOARD')}
            className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-amber-500 font-bold mb-1 block"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-500" />
            Lead Management CRM
          </h1>
          <p className="text-xs text-slate-400">Track and manage inbound sales inquiries and enterprise demos.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Total Leads', count: stats.total, color: 'text-slate-400' },
          { label: 'New', count: stats.new, color: 'text-sky-400' },
          { label: 'Contacted', count: stats.contacted, color: 'text-amber-400' },
          { label: 'Qualified', count: stats.qualified, color: 'text-indigo-400' },
          { label: 'In Demo', count: stats.demo, color: 'text-fuchsia-400' },
          { label: 'Converted', count: stats.converted, color: 'text-emerald-400' }
        ].map(stat => (
          <div key={stat.label} className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{stat.label}</div>
            <div className={`text-xl font-black ${stat.color}`}>{stat.count}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Lead List */}
        <div className={`lg:col-span-2 rounded-2xl border flex flex-col h-[600px] ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search leads by name, email, company..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-black focus:border-emerald-500'
                }`}
              />
              <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className={`pl-8 pr-8 py-2 rounded-xl text-xs border appearance-none focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'
                }`}
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="DEMO">Demo</option>
                <option value="CONVERTED">Converted</option>
                <option value="LOST">Lost</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading leads...</div>
            ) : paginatedLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No leads found.</div>
            ) : (
              paginatedLeads.map(lead => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                    selectedLead?.id === lead.id 
                      ? isDark ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-emerald-50 border-emerald-500/50'
                      : isDark ? 'bg-transparent border-transparent hover:bg-slate-800/50' : 'bg-transparent border-transparent hover:bg-white'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm truncate pr-2 text-black dark:text-white">{lead.company}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
                      <span className="font-medium text-slate-900 dark:text-slate-300">{lead.name}</span>
                      <span>•</span>
                      <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="truncate">{lead.interestedModules || 'General'}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          
          {filteredLeads.length > 0 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-800">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredLeads.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          )}
        </div>

        {/* Right Col: Lead Details */}
        <div className={`rounded-2xl border flex flex-col h-[600px] overflow-hidden ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          {selectedLead ? (
            <div className="flex-1 flex flex-col h-full">
              {/* Details Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 dark:bg-slate-950/50">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-lg">{selectedLead.company}</h2>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value as LeadStatus)}
                    className={`px-2 py-1 rounded text-xs font-bold border appearance-none focus:outline-none ${getStatusColor(selectedLead.status)}`}
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="DEMO">DEMO</option>
                    <option value="CONVERTED">CONVERTED</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
                
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium text-black dark:text-white dark:text-slate-200">{selectedLead.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <a href={`mailto:${selectedLead.email}`} className="hover:text-emerald-500">{selectedLead.email}</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <a href={`tel:${selectedLead.phone}`} className="hover:text-emerald-500">{selectedLead.phone}</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Submitted: {new Date(selectedLead.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Details Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Requirements */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Requirements & Context</h3>
                  <div className={`p-3 rounded-xl border text-xs space-y-2 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Workforce Size</span>
                        <span className="font-medium">{selectedLead.workforceSize || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Interested In</span>
                        <span className="font-medium">{selectedLead.interestedModules || 'General'}</span>
                      </div>
                    </div>
                    {selectedLead.message && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">Message</span>
                        <p className="text-slate-900 dark:text-slate-300 whitespace-pre-wrap">{selectedLead.message}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Internal Notes & Activity */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Activity History</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Add Note Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add internal note..."
                        className={`flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-emerald-500'
                        }`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddNote();
                        }}
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim()}
                        className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4 pt-2 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                      {(selectedLead.activityHistory || []).slice().reverse().map((act: any) => (
                        <div key={act.id} className="relative flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center border-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} z-10`}>
                            {act.action === 'STATUS_CHANGE' ? <ArrowRight className="w-3 h-3 text-emerald-500" /> : <MessageSquare className="w-3 h-3 text-indigo-500" />}
                          </div>
                          <div className={`flex-1 p-2.5 rounded-xl border text-xs ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <span className="font-medium text-black dark:text-white dark:text-slate-200">{act.actorName || 'System'}</span>
                              <span className="text-[9px] text-slate-500 dark:text-slate-400 shrink-0">{new Date(act.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400">{act.notes}</p>
                          </div>
                        </div>
                      ))}
                      
                      {/* Initial Submission */}
                      <div className="relative flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center border-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} z-10`}>
                          <CheckCircle2 className="w-3 h-3 text-slate-400" />
                        </div>
                        <div className={`flex-1 p-2.5 rounded-xl border text-xs ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <span className="font-medium text-black dark:text-white dark:text-slate-200">System</span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 shrink-0">{new Date(selectedLead.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400">Lead captured from website form.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-4">
              <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-900 dark:text-slate-300" />
              <div>
                <p className="font-medium text-sm text-slate-500 dark:text-slate-400">No Lead Selected</p>
                <p className="text-xs mt-1">Select a lead from the list to view details, update status, and add notes.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

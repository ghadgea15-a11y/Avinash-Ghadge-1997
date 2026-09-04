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
  Filter,
  Plus,
  Trash2,
  Rocket,
  ExternalLink,
  CalendarCheck,
  AlertTriangle,
  Send,
  Sparkles,
  Users,
  Copy,
  Check
} from 'lucide-react';
import { UserSession, PhaseAScreen, LeadRecord, LeadStatus, LeadActivity } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { SuperAdminService } from '../../services/superAdminService';
import { Pagination } from '../common/Pagination';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminLeadsScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SuperAdminLeadsScreen: React.FC<SuperAdminLeadsScreenProps> = ({
  currentSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError, showLoading, handleError } = useFeedback();

  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [followUpFilter, setFollowUpFilter] = useState<'ALL' | 'TODAY' | 'OVERDUE' | 'UPCOMING'>('ALL');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  useBackNavigation(!!selectedLead, () => setSelectedLead(null), 'selectedLead');
  
  // Note inputs
  const [newNote, setNewNote] = useState('');

  // Follow-up state for selected lead
  const [followUpDateInput, setFollowUpDateInput] = useState('');
  const [followUpNotesInput, setFollowUpNotesInput] = useState('');
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  // Modals
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Conversion Form State
  const [convertData, setConvertData] = useState({
    companyName: '',
    companyCode: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    subscriptionPlan: 'ENTERPRISE' as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
    trialDays: 14,
    adminPassword: 'TempPassword123!'
  });
  const [converting, setConverting] = useState(false);
  const [conversionSuccessResult, setConversionSuccessResult] = useState<{ companyId: string; adminEmail: string; password: string } | null>(null);

  // New Lead Form State
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    workforceSize: '50-200',
    interestedModules: 'Attendance, Roster, Compliance, Patrol',
    source: 'SUPER_ADMIN_MANUAL',
    message: '',
    notes: '',
    followUpDate: ''
  });
  const [creatingLead, setCreatingLead] = useState(false);

  // Subscribe to real-time leads
  useEffect(() => {
    const unsub = FirestoreService.subscribeToLeads((data) => {
      setLeads(data);
      setLoading(false);
      
      if (selectedLead) {
        const updated = data.find(l => l.id === selectedLead.id);
        if (updated) {
          setSelectedLead(updated);
        }
      }
    });
    return () => unsub();
  }, [selectedLead?.id]);

  // Sync follow-up inputs when selectedLead changes
  useEffect(() => {
    if (selectedLead) {
      setFollowUpDateInput(selectedLead.followUpDate ? selectedLead.followUpDate.slice(0, 16) : '');
      setFollowUpNotesInput(selectedLead.followUpNotes || '');
      
      // Auto-generate suggested tenant code and prep conversion modal data
      const cleanName = (selectedLead.company || selectedLead.name || 'COMPANY').trim();
      const codeSuggestion = cleanName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) + '-' + Math.floor(100 + Math.random() * 900);
      
      // Load platform config trial days
      SuperAdminService.getPlatformGlobalConfig().then(cfg => {
        const trialDays = cfg.defaultTrialDays || 14;
        setConvertData({
          companyName: selectedLead.company || selectedLead.name || '',
          companyCode: codeSuggestion,
          adminName: selectedLead.name || 'Admin',
          adminEmail: selectedLead.email || '',
          adminPhone: selectedLead.phone || '',
          subscriptionPlan: 'ENTERPRISE',
          trialDays,
          adminPassword: `Pass@${Math.floor(1000 + Math.random() * 9000)}!`
        });
      }).catch(() => {
        setConvertData({
          companyName: selectedLead.company || selectedLead.name || '',
          companyCode: codeSuggestion,
          adminName: selectedLead.name || 'Admin',
          adminEmail: selectedLead.email || '',
          adminPhone: selectedLead.phone || '',
          subscriptionPlan: 'ENTERPRISE',
          trialDays: 14,
          adminPassword: `Pass@${Math.floor(1000 + Math.random() * 9000)}!`
        });
      });
    } else {
      setConversionSuccessResult(null);
    }
  }, [selectedLead?.id]);

  // Helper to determine follow-up status
  const getFollowUpStatus = (dateStr?: string) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    if (target < now) {
      return { type: 'OVERDUE', label: 'Overdue', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' };
    }
    if (targetDay.getTime() === todayStart.getTime()) {
      return { type: 'TODAY', label: 'Due Today', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' };
    }
    return { type: 'UPCOMING', label: target.toLocaleDateString(), color: 'text-sky-500 bg-sky-500/10 border-sky-500/30' };
  };

  // Filtered Leads
  const filteredLeads = leads.filter(lead => {
    const leadName = lead.name || lead.contactPerson || '';
    const leadCompany = lead.company || lead.companyName || '';
    const matchesSearch = 
      leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leadCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.phone || '').includes(searchTerm);
      
    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;

    let matchesFollowUp = true;
    if (followUpFilter !== 'ALL') {
      const fu = getFollowUpStatus(lead.followUpDate);
      if (!fu) matchesFollowUp = false;
      else if (followUpFilter === 'OVERDUE' && fu.type !== 'OVERDUE') matchesFollowUp = false;
      else if (followUpFilter === 'TODAY' && fu.type !== 'TODAY') matchesFollowUp = false;
      else if (followUpFilter === 'UPCOMING' && fu.type !== 'UPCOMING') matchesFollowUp = false;
    }
    
    return matchesSearch && matchesStatus && matchesFollowUp;
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
    followUpsDue: leads.filter(l => {
      const fu = getFollowUpStatus(l.followUpDate);
      return fu && (fu.type === 'TODAY' || fu.type === 'OVERDUE');
    }).length
  };

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    const activity: LeadActivity = {
      id: `act_${Date.now()}`,
      action: 'STATUS_CHANGE',
      notes: `Status changed from ${lead.status} to ${newStatus}`,
      timestamp: new Date().toISOString(),
      actorId: currentSession.userId,
      actorName: currentSession.fullName
    };
    
    const success = await FirestoreService.updateLead(leadId, {
      status: newStatus,
      activityHistory: [...(lead.activityHistory || []), activity]
    });

    if (success) {
      showSuccess(`Status updated to ${newStatus}`);
    } else {
      showError('Failed to update status');
    }
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
    
    const success = await FirestoreService.updateLead(selectedLead.id, {
      notes: selectedLead.notes ? `${selectedLead.notes}\n\n[${new Date().toLocaleDateString()}] ${newNote.trim()}` : newNote.trim(),
      activityHistory: [...(selectedLead.activityHistory || []), activity]
    });
    
    if (success) {
      setNewNote('');
      showSuccess('Note added to activity history');
    }
  };

  const handleSaveFollowUp = async () => {
    if (!selectedLead) return;
    setSavingFollowUp(true);
    try {
      const activity: LeadActivity = {
        id: `act_${Date.now()}`,
        action: 'FOLLOW_UP_SCHEDULED',
        notes: followUpDateInput 
          ? `Follow-up scheduled for ${new Date(followUpDateInput).toLocaleString()}. Notes: ${followUpNotesInput || 'None'}`
          : 'Follow-up cleared',
        timestamp: new Date().toISOString(),
        actorId: currentSession.userId,
        actorName: currentSession.fullName
      };

      const success = await FirestoreService.updateLead(selectedLead.id, {
        followUpDate: followUpDateInput ? new Date(followUpDateInput).toISOString() : null,
        followUpNotes: followUpNotesInput,
        activityHistory: [...(selectedLead.activityHistory || []), activity]
      });

      if (success) {
        showSuccess(followUpDateInput ? 'Follow-up date & note saved' : 'Follow-up cleared');
      } else {
        showError('Could not save follow-up');
      }
    } catch (err: any) {
      handleError(err, 'Failed to schedule follow-up');
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleClearFollowUp = async () => {
    setFollowUpDateInput('');
    setFollowUpNotesInput('');
    if (!selectedLead) return;
    await FirestoreService.updateLead(selectedLead.id, {
      followUpDate: null,
      followUpNotes: '',
      activityHistory: [
        ...(selectedLead.activityHistory || []),
        {
          id: `act_${Date.now()}`,
          action: 'FOLLOW_UP_SCHEDULED',
          notes: 'Follow-up reminder cleared',
          timestamp: new Date().toISOString(),
          actorId: currentSession.userId,
          actorName: currentSession.fullName
        }
      ]
    });
    showSuccess('Follow-up cleared');
  };

  // Execute Fast Conversion to Tenant Company
  const handleExecuteConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    
    const cleanCode = convertData.companyCode.trim().toUpperCase();
    if (!cleanCode) {
      showError('Company Code is required');
      return;
    }
    if (!convertData.companyName.trim()) {
      showError('Company Name is required');
      return;
    }
    if (!convertData.adminEmail.trim()) {
      showError('Admin Email is required');
      return;
    }

    setConverting(true);
    const dismiss = showLoading('Provisioning new tenant organization from lead...');
    try {
      const result = await FirestoreService.convertLeadToTenantCompany({
        leadId: selectedLead.id,
        companyCode: cleanCode,
        companyName: convertData.companyName.trim(),
        subscriptionPlan: convertData.subscriptionPlan,
        trialDays: convertData.trialDays,
        adminPassword: convertData.adminPassword,
        adminEmail: convertData.adminEmail.trim().toLowerCase(),
        adminPhone: convertData.adminPhone.trim(),
        adminName: convertData.adminName.trim(),
        session: currentSession
      });

      dismiss();
      if (result.success) {
        setConversionSuccessResult({
          companyId: result.companyId || cleanCode,
          adminEmail: convertData.adminEmail.trim().toLowerCase(),
          password: convertData.adminPassword
        });
        showSuccess(`Tenant company ${cleanCode} created successfully! Lead status set to CONVERTED.`);
      } else {
        showError(result.message || 'Failed to convert lead to tenant company');
      }
    } catch (err: any) {
      dismiss();
      handleError(err, 'Failed to convert lead');
    } finally {
      setConverting(false);
    }
  };

  // Open in Full Wizard
  const handleOpenInFullWizard = () => {
    if (!selectedLead) return;
    sessionStorage.setItem('pending_convert_lead', JSON.stringify(selectedLead));
    onNavigate('SUPER_ADMIN_CREATE_COMPANY');
  };

  // Manual Lead Creation
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name.trim() || !newLeadForm.company.trim() || !newLeadForm.email.trim()) {
      showError('Name, Company, and Email are required.');
      return;
    }

    setCreatingLead(true);
    try {
      const success = await SuperAdminService.createLead(currentSession, {
        name: newLeadForm.name.trim(),
        company: newLeadForm.company.trim(),
        email: newLeadForm.email.trim().toLowerCase(),
        phone: newLeadForm.phone.trim(),
        workforceSize: newLeadForm.workforceSize,
        interestedModules: newLeadForm.interestedModules,
        source: newLeadForm.source,
        message: newLeadForm.message.trim(),
        notes: newLeadForm.notes.trim(),
        followUpDate: newLeadForm.followUpDate ? new Date(newLeadForm.followUpDate).toISOString() : null,
        status: 'NEW'
      });

      if (success) {
        showSuccess('Sales lead registered successfully!');
        setShowAddLeadModal(false);
        setNewLeadForm({
          name: '',
          company: '',
          email: '',
          phone: '',
          workforceSize: '50-200',
          interestedModules: 'Attendance, Roster, Compliance, Patrol',
          source: 'SUPER_ADMIN_MANUAL',
          message: '',
          notes: '',
          followUpDate: ''
        });
      } else {
        showError('Could not save sales lead.');
      }
    } catch (err: any) {
      handleError(err, 'Failed to create lead');
    } finally {
      setCreatingLead(false);
    }
  };

  // Delete Lead
  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    const success = await FirestoreService.deleteLead(selectedLead.id);
    if (success) {
      showSuccess(`Lead ${selectedLead.company} deleted`);
      setSelectedLead(null);
      setShowDeleteConfirm(false);
    } else {
      showError('Failed to delete lead');
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'NEW': return 'bg-sky-500/20 text-sky-500 border-sky-500/30';
      case 'CONTACTED': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'QUALIFIED': return 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30';
      case 'DEMO': return 'bg-fuchsia-500/20 text-fuchsia-500 border-fuchsia-500/30';
      case 'CONVERTED': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
      case 'LOST': return 'bg-rose-500/20 text-rose-500 border-rose-500/30';
      default: return 'bg-slate-500/20 text-slate-500 border-slate-500/30';
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'} p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full`}>
      
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
            Inbound Leads & Sales CRM
          </h1>
          <p className="text-xs text-slate-400">Manage demo inquiries, schedule follow-ups, and convert leads into live tenant companies.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddLeadModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Sales Lead
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Leads', count: stats.total, color: 'text-slate-400' },
          { label: 'New Inquiries', count: stats.new, color: 'text-sky-400' },
          { label: 'Contacted', count: stats.contacted, color: 'text-amber-400' },
          { label: 'Qualified', count: stats.qualified, color: 'text-indigo-400' },
          { label: 'In Demo', count: stats.demo, color: 'text-fuchsia-400' },
          { label: 'Converted', count: stats.converted, color: 'text-emerald-400' },
          { label: 'Follow-ups Due', count: stats.followUpsDue, color: 'text-rose-400' }
        ].map(stat => (
          <div key={stat.label} className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 truncate">{stat.label}</div>
            <div className={`text-xl font-black ${stat.color}`}>{stat.count}</div>
          </div>
        ))}
      </div>

      {/* Main CRM Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Lead List & Filters (5 cols) */}
        <div className={`lg:col-span-5 rounded-2xl border flex flex-col h-[700px] ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by company, contact, email, phone..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-black focus:border-emerald-500'
                }`}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className={`w-full pl-7 pr-4 py-1.5 rounded-lg text-xs border appearance-none focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                  }`}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="DEMO">In Demo</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="LOST">Lost</option>
                </select>
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              <div className="relative flex-1">
                <select
                  value={followUpFilter}
                  onChange={(e) => setFollowUpFilter(e.target.value as any)}
                  className={`w-full pl-7 pr-4 py-1.5 rounded-lg text-xs border appearance-none focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                  }`}
                >
                  <option value="ALL">All Follow-ups</option>
                  <option value="TODAY">Due Today</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="UPCOMING">Upcoming</option>
                </select>
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Lead Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading leads from Firestore...</div>
            ) : paginatedLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No leads found matching current criteria.
              </div>
            ) : (
              paginatedLeads.map(lead => {
                const fu = getFollowUpStatus(lead.followUpDate);
                const isSelected = selectedLead?.id === lead.id;

                return (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                      isSelected 
                        ? isDark ? 'bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/50' : 'bg-emerald-50 border-emerald-500/60 ring-1 ring-emerald-500/50'
                        : isDark ? 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs truncate text-black dark:text-white">{lead.company || 'Unnamed Company'}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="truncate">{lead.name || 'Anonymous'}</span>
                      <span className="shrink-0 text-[10px]">{new Date(lead.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Follow-up / Converted Tag */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/50 text-[10px]">
                      <span className="truncate text-slate-400">
                        {lead.interestedModules ? `Modules: ${lead.interestedModules}` : lead.email}
                      </span>
                      {lead.convertedCompanyId ? (
                        <span className="shrink-0 font-semibold text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {lead.convertedCompanyId}
                        </span>
                      ) : fu ? (
                        <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[9px] font-bold ${fu.color}`}>
                          {fu.label}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          
          {filteredLeads.length > 0 && (
            <div className="p-2.5 border-t border-slate-200 dark:border-slate-800">
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

        {/* Right Column: Lead Workspace & Detail View (7 cols) */}
        <div className={`lg:col-span-7 rounded-2xl border flex flex-col h-[700px] overflow-hidden ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          {selectedLead ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Lead Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg text-slate-900 dark:text-white">{selectedLead.company || selectedLead.name}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(selectedLead.status)}`}>
                        {selectedLead.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Captured from: {selectedLead.source || 'Website Demo Form'}</p>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="flex items-center gap-2">
                    {selectedLead.status === 'CONVERTED' || selectedLead.convertedCompanyId ? (
                      <button
                        onClick={() => onNavigate('SUPER_ADMIN_COMPANIES')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500/20 transition"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        View Company ({selectedLead.convertedCompanyId})
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setConversionSuccessResult(null);
                          setShowConvertModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                      >
                        <Rocket className="w-3.5 h-3.5" />
                        Convert to Tenant
                      </button>
                    )}

                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-1.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-500 transition"
                      title="Delete Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Contact Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-900 dark:text-slate-200 truncate">{selectedLead.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={`mailto:${selectedLead.email}`} className="hover:text-emerald-500 truncate">{selectedLead.email}</a>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={`tel:${selectedLead.phone}`} className="hover:text-emerald-500 truncate">{selectedLead.phone || 'No phone'}</a>
                  </div>
                </div>

                {/* Status Progression Shortcuts */}
                <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-slate-200/70 dark:border-slate-800/70 overflow-x-auto">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Stage:</span>
                  {(['NEW', 'CONTACTED', 'QUALIFIED', 'DEMO', 'CONVERTED', 'LOST'] as LeadStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedLead.id, st)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                        selectedLead.status === st 
                          ? getStatusColor(st)
                          : isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-black'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                
                {/* Converted Company Banner */}
                {selectedLead.convertedCompanyId && (
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isDark ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">Successfully Converted to Live Tenant</div>
                        <div className="text-[11px] opacity-80">Tenant Company ID: <strong>{selectedLead.convertedCompanyId}</strong></div>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('SUPER_ADMIN_COMPANIES')}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      Open Companies
                    </button>
                  </div>
                )}

                {/* Follow-Up Schedule Manager */}
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-amber-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Follow-Up Schedule & Reminder
                      </h3>
                    </div>
                    {selectedLead.followUpDate && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getFollowUpStatus(selectedLead.followUpDate)?.color}`}>
                        {getFollowUpStatus(selectedLead.followUpDate)?.label}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Follow-up Date & Time</label>
                      <input
                        type="datetime-local"
                        value={followUpDateInput}
                        onChange={(e) => setFollowUpDateInput(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-black focus:border-amber-500'
                        }`}
                      />
                    </div>

                    <div className="sm:col-span-7">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Reminder Objective / Agenda</label>
                      <input
                        type="text"
                        value={followUpNotesInput}
                        onChange={(e) => setFollowUpNotesInput(e.target.value)}
                        placeholder="e.g., Call CEO to review enterprise pricing proposal"
                        className={`w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-black focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    {selectedLead.followUpDate && (
                      <button
                        type="button"
                        onClick={handleClearFollowUp}
                        className="px-3 py-1 text-xs text-rose-400 hover:text-rose-300 font-medium"
                      >
                        Clear Schedule
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveFollowUp}
                      disabled={savingFollowUp}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {savingFollowUp ? 'Saving...' : 'Save Follow-Up'}
                    </button>
                  </div>
                </div>

                {/* Inquiry Details & Modules */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Requirements & Inbound Context
                  </h3>
                  <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Workforce Size</span>
                        <span className="font-semibold">{selectedLead.workforceSize || '10-50'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Interested In</span>
                        <span className="font-semibold truncate block">{selectedLead.interestedModules || 'General Logistics'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Created On</span>
                        <span className="font-semibold">{new Date(selectedLead.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {selectedLead.message && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1">Message from Customer</span>
                        <p className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-lg text-xs whitespace-pre-wrap">
                          {selectedLead.message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Internal Notes & Timeline */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Activity History & Internal Notes
                  </h3>
                  
                  {/* Add Note Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add follow-up notes, discussion summary..."
                      className={`flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-white' : 'bg-white border-slate-200 focus:border-emerald-500 text-black'
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddNote();
                      }}
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Add Note
                    </button>
                  </div>

                  {/* Activity Timeline */}
                  <div className="space-y-3 pt-2">
                    {(selectedLead.activityHistory || []).slice().reverse().map((act: any) => (
                      <div key={act.id} className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center border ${
                          act.action === 'CONVERTED_TO_TENANT' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                          act.action === 'FOLLOW_UP_SCHEDULED' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' :
                          act.action === 'STATUS_CHANGE' ? 'bg-sky-500/20 border-sky-500/50 text-sky-400' :
                          'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                        }`}>
                          {act.action === 'CONVERTED_TO_TENANT' ? <Rocket className="w-3.5 h-3.5" /> :
                           act.action === 'FOLLOW_UP_SCHEDULED' ? <Calendar className="w-3.5 h-3.5" /> :
                           act.action === 'STATUS_CHANGE' ? <ArrowRight className="w-3.5 h-3.5" /> :
                           <MessageSquare className="w-3.5 h-3.5" />}
                        </div>
                        <div className={`flex-1 p-3 rounded-xl border text-xs ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{act.actorName || 'System'}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">{new Date(act.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">{act.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-4">
              <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-800" />
              <div>
                <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Lead Selected</p>
                <p className="text-xs mt-1 text-slate-400">Select a lead from the list to view requirements, schedule follow-ups, or convert to a new tenant company.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: CONVERT LEAD TO TENANT COMPANY (THE SHORTCUT)         */}
      {/* ============================================================== */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-5 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'} shadow-2xl`}>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Convert Lead to Tenant Company</h3>
                  <p className="text-xs text-slate-400">Provision tenant organization and assign company admin credentials.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowConvertModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {conversionSuccessResult ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                  <div className="flex items-center gap-2 font-bold text-sm mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Tenant Organization Created Successfully!
                  </div>
                  <p className="text-xs mb-3">
                    Company <strong>{conversionSuccessResult.companyId}</strong> is now live with full module entitlements and 14-day trial.
                  </p>

                  <div className="p-3 rounded-lg bg-black/40 text-xs font-mono space-y-1">
                    <div>Company Code: <span className="text-emerald-400">{conversionSuccessResult.companyId}</span></div>
                    <div>Admin Email: <span className="text-emerald-400">{conversionSuccessResult.adminEmail}</span></div>
                    <div>Password: <span className="text-emerald-400">{conversionSuccessResult.password}</span></div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const text = `Company: ${conversionSuccessResult.companyId}\nAdmin Email: ${conversionSuccessResult.adminEmail}\nPassword: ${conversionSuccessResult.password}`;
                      navigator.clipboard.writeText(text);
                      setCopiedCredentials(true);
                      setTimeout(() => setCopiedCredentials(false), 2500);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    {copiedCredentials ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedCredentials ? 'Copied!' : 'Copy Credentials'}
                  </button>

                  <button
                    onClick={() => {
                      setShowConvertModal(false);
                      onNavigate('SUPER_ADMIN_COMPANIES');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Building2 className="w-4 h-4" />
                    Open Companies List
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecuteConversion} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Company Legal / Brand Name</label>
                    <input
                      type="text"
                      required
                      value={convertData.companyName}
                      onChange={(e) => setConvertData({ ...convertData, companyName: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Company Code (Tenant ID)</label>
                    <input
                      type="text"
                      required
                      value={convertData.companyCode}
                      onChange={(e) => setConvertData({ ...convertData, companyCode: e.target.value.toUpperCase() })}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono uppercase border focus:outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Subscription Plan</label>
                    <select
                      value={convertData.subscriptionPlan}
                      onChange={(e) => setConvertData({ ...convertData, subscriptionPlan: e.target.value as any })}
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                      }`}
                    >
                      <option value="STARTER">Starter Tier</option>
                      <option value="PROFESSIONAL">Professional Tier</option>
                      <option value="ENTERPRISE">Enterprise Tier</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Admin Full Name</label>
                    <input
                      type="text"
                      required
                      value={convertData.adminName}
                      onChange={(e) => setConvertData({ ...convertData, adminName: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Admin Email</label>
                    <input
                      type="email"
                      required
                      value={convertData.adminEmail}
                      onChange={(e) => setConvertData({ ...convertData, adminEmail: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Admin Mobile</label>
                    <input
                      type="text"
                      value={convertData.adminPhone}
                      onChange={(e) => setConvertData({ ...convertData, adminPhone: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Initial Password</label>
                    <input
                      type="text"
                      required
                      value={convertData.adminPassword}
                      onChange={(e) => setConvertData({ ...convertData, adminPassword: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleOpenInFullWizard}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Full Provisioning Wizard
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConvertModal(false)}
                      className="px-3 py-2 rounded-xl border border-slate-700 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={converting}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      {converting ? 'Provisioning Tenant...' : 'Create Tenant Now'}
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ADD SALES LEAD MANUALLY                              */}
      {/* ============================================================== */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-5 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'} shadow-2xl`}>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Add New Sales Lead</h3>
                  <p className="text-xs text-slate-400">Record a demo request or outbound sales lead directly into Firestore CRM.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddLeadModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Company / Organization *</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.company}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, company: e.target.value })}
                    placeholder="e.g. Apex Security Solutions"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.name}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                    placeholder="e.g. Vikram Patil"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    placeholder="vikram@apexsecurity.com"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Workforce Size</label>
                  <select
                    value={newLeadForm.workforceSize}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, workforceSize: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                    }`}
                  >
                    <option value="10-50">10 - 50 Employees</option>
                    <option value="50-200">50 - 200 Employees</option>
                    <option value="200-1000">200 - 1,000 Employees</option>
                    <option value="1000+">1,000+ Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Lead Source</label>
                  <select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                    }`}
                  >
                    <option value="SUPER_ADMIN_MANUAL">Super Admin Manual</option>
                    <option value="WEBSITE_DEMO">Website Demo Form</option>
                    <option value="CONTACT_SALES">Contact Sales Inbound</option>
                    <option value="PHONE_INQUIRY">Phone Inquiry</option>
                    <option value="REFERRAL">Referral</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Interested Modules</label>
                  <input
                    type="text"
                    value={newLeadForm.interestedModules}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, interestedModules: e.target.value })}
                    placeholder="Attendance, Roster, Compliance, Patrol"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                    }`}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Follow-up Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={newLeadForm.followUpDate}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, followUpDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                    }`}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Initial Notes</label>
                  <textarea
                    rows={2}
                    value={newLeadForm.notes}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                    placeholder="Customer requirements, pain points, budget..."
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLead}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {creatingLead ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION                                   */}
      {/* ============================================================== */}
      {showDeleteConfirm && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className={`w-full max-w-sm rounded-2xl border p-5 space-y-4 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'} shadow-2xl`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Delete Sales Lead?</h3>
                <p className="text-xs text-slate-400">Are you sure you want to permanently delete lead for {selectedLead.company}?</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLead}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

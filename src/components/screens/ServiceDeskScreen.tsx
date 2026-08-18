import React, { useState, useEffect } from 'react';
import { 
  UserSession, 
  CompanyTenant, 
  ServiceTicketRecord, 
  ServiceTicketStatus, 
  ServiceTicketPriority, 
  ServiceTicketCategory,
  TicketCommentRecord,
  SiteRecord,
  ClientRecord,
  PhaseAScreen
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';
import { 
  LifeBuoy, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare, 
  Star, 
  User, 
  MapPin, 
  Building2, 
  ArrowLeft,
  X,
  Send,
  RefreshCw,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';

interface ServiceDeskScreenProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
  onNavigate?: (screen: PhaseAScreen) => void;
}

export const ServiceDeskScreen: React.FC<ServiceDeskScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const [tickets, setTickets] = useState<ServiceTicketRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicketRecord | null>(null);
  const [comments, setComments] = useState<TicketCommentRecord[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [isInternalComment, setIsInternalComment] = useState<boolean>(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

  // New ticket form
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: ServiceTicketCategory;
    priority: ServiceTicketPriority;
    siteId: string;
    clientId: string;
  }>({
    title: '',
    description: '',
    category: 'SHORT_MANPOWER',
    priority: 'MEDIUM',
    siteId: '',
    clientId: ''
  });

  const [savingTicket, setSavingTicket] = useState<boolean>(false);
  const [closeRating, setCloseRating] = useState<number>(5);
  const [closeFeedback, setCloseFeedback] = useState<string>('');
  const [resolutionSummary, setResolutionSummary] = useState<string>('');

  useEffect(() => {
    if (!activeCompany) return;

    setLoading(true);
    const unsubTickets = FirestoreService.subscribeToServiceTickets(activeCompany.companyId, (list) => {
      setTickets(list);
      setLoading(false);
    });

    const unsubSites = FirestoreService.subscribeToSites(activeCompany.companyId, (siteList) => {
      setSites(siteList);
      if (siteList.length > 0 && !formData.siteId) {
        setFormData(prev => ({ ...prev, siteId: siteList[0].id }));
      }
    });

    let unsubClients = () => {};
    if (userSession) {
      unsubClients = FirestoreService.subscribeToClients(userSession, activeCompany.companyId, (clientList) => {
        setClients(clientList);
        if (clientList.length > 0 && !formData.clientId) {
          setFormData(prev => ({ ...prev, clientId: clientList[0].id }));
        }
      });
    }

    return () => {
      unsubTickets();
      unsubSites();
      unsubClients();
    };
  }, [activeCompany?.companyId, userSession?.userId]);

  // Subscribe to comments for selected ticket
  useEffect(() => {
    if (!activeCompany || !selectedTicket) return;

    const unsubComments = FirestoreService.subscribeToTicketComments(
      activeCompany.companyId,
      selectedTicket.id,
      (comms) => {
        setComments(comms);
      }
    );

    return () => unsubComments();
  }, [activeCompany?.companyId, selectedTicket?.id]);

  const calculateSlaHours = (priority: ServiceTicketPriority): number => {
    switch (priority) {
      case 'CRITICAL': return 2;
      case 'HIGH': return 6;
      case 'MEDIUM': return 24;
      case 'LOW': return 48;
      default: return 24;
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !userSession || !formData.title.trim()) return;

    setSavingTicket(true);
    try {
      const ticketId = `TKT-${Date.now().toString().slice(-6)}`;
      const selectedSite = sites.find(s => s.id === formData.siteId);
      const selectedClient = clients.find(c => c.id === formData.clientId);

      const slaHours = calculateSlaHours(formData.priority);
      const slaDueDate = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

      const newTicket: ServiceTicketRecord = {
        id: ticketId,
        ticketNumber: `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        companyId: activeCompany.companyId,
        clientId: formData.clientId || selectedClient?.id || 'CLIENT-GEN',
        clientName: selectedClient?.legalName || '' || 'Direct Facility Client',
        siteId: formData.siteId || selectedSite?.id || 'SITE-GEN',
        siteName: selectedSite?.name || selectedSite?.siteName || 'Headquarters Site',
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        status: 'OPEN',
        reportedByUserId: userSession.userId,
        reportedByName: userSession.fullName || userSession.email || 'Staff Member',
        reportedByEmail: userSession.email,
        assignedToName: 'Field Operations In-Charge',
        slaDueTime: slaDueDate,
        isSlaBreached: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await FirestoreService.saveServiceTicket(activeCompany.companyId, newTicket);

      // Add initial comment
      const commentId = `COM-${Date.now()}`;
      await FirestoreService.addTicketComment(activeCompany.companyId, ticketId, {
        id: commentId,
        ticketId,
        companyId: activeCompany.companyId,
        authorUserId: userSession.userId,
        authorName: userSession.fullName || 'System',
        authorRole: userSession.role,
        comment: `Ticket opened: "${formData.title}" with priority ${formData.priority}. SLA target: ${slaHours} hours.`,
        isInternalOnly: false,
        createdAt: new Date().toISOString()
      });

      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        description: '',
        category: 'SHORT_MANPOWER',
        priority: 'MEDIUM',
        siteId: sites[0]?.id || '',
        clientId: clients[0]?.id || ''
      });
    } catch (err) {
      console.error('Failed to create ticket:', err);
    } finally {
      setSavingTicket(false);
    }
  };

  const handleUpdateStatus = async (newStatus: ServiceTicketStatus) => {
    if (!activeCompany || !selectedTicket || !userSession) return;

    try {
      const updated: ServiceTicketRecord = {
        ...selectedTicket,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      if (newStatus === 'RESOLVED') {
        updated.resolvedAt = new Date().toISOString();
        updated.resolvedByUserId = userSession.userId;
        updated.resolutionSummary = resolutionSummary || 'Issue addressed and resolved by on-site operations team.';
      }

      if (newStatus === 'CLOSED') {
        updated.closedAt = new Date().toISOString();
        updated.clientRating = closeRating;
        updated.clientFeedbackNotes = closeFeedback;
      }

      await FirestoreService.saveServiceTicket(activeCompany.companyId, updated);
      setSelectedTicket(updated);

      // Add comment about status transition
      await FirestoreService.addTicketComment(activeCompany.companyId, selectedTicket.id, {
        id: `COM-${Date.now()}`,
        ticketId: selectedTicket.id,
        companyId: activeCompany.companyId,
        authorUserId: userSession.userId,
        authorName: userSession.fullName || userSession.email || 'Supervisor',
        authorRole: userSession.role,
        comment: `Ticket status updated to ${newStatus}.${newStatus === 'RESOLVED' && resolutionSummary ? ` Resolution: ${resolutionSummary}` : ''}`,
        isInternalOnly: false,
        createdAt: new Date().toISOString()
      });

      setResolutionSummary('');
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !selectedTicket || !userSession || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const comm: TicketCommentRecord = {
        id: `COM-${Date.now()}`,
        ticketId: selectedTicket.id,
        companyId: activeCompany.companyId,
        authorUserId: userSession.userId,
        authorName: userSession.fullName || userSession.email || 'Staff',
        authorRole: userSession.role,
        comment: newComment.trim(),
        isInternalOnly: isInternalComment,
        createdAt: new Date().toISOString()
      };

      await FirestoreService.addTicketComment(activeCompany.companyId, selectedTicket.id, comm);
      setNewComment('');
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Metrics computation
  const openCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'REOPENED').length;
  const criticalCount = tickets.filter(t => t.priority === 'CRITICAL' && t.status !== 'CLOSED').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const slaBreachedCount = tickets.filter(t => {
    if (t.status === 'CLOSED' || t.status === 'RESOLVED') return t.isSlaBreached;
    return new Date(t.slaDueTime).getTime() < Date.now();
  }).length;

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityBadge = (priority: ServiceTicketPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">Critical (2h SLA)</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">High (6h SLA)</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">Medium (24h SLA)</span>;
      case 'LOW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">Low (48h SLA)</span>;
    }
  };

  const getStatusBadge = (status: ServiceTicketStatus) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">Open</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">In Progress</span>;
      case 'PENDING_CLIENT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Pending Client</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Resolved</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Closed</span>;
      case 'REOPENED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">Reopened</span>;
    }
  };

  return (
    <div className={`p-4 md:p-6 space-y-6 min-h-screen ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Client Service Desk & SLA</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Module 11: Enterprise Client Service Management, Real-time Ticket SLA & Resolution
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Ticket</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Active Tickets</span>
            <LifeBuoy className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{openCount}</p>
          <span className="text-xs text-slate-500">Awaiting resolution</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Critical Priority</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-rose-600 dark:text-rose-400">{criticalCount}</p>
          <span className="text-xs text-slate-500">2-Hour SLA window</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">SLA Breaches</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-amber-600 dark:text-amber-400">{slaBreachedCount}</p>
          <span className="text-xs text-slate-500">Exceeded SLA due time</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Resolved Total</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">{resolvedCount}</p>
          <span className="text-xs text-slate-500">Completed cases</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center gap-3 justify-between ${
        isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ticket #, site, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg text-sm border focus:outline-none ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING_CLIENT">Pending Client</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg text-sm border focus:outline-none ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Ticket List Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
            <p>Loading service desk tickets from Firestore...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <LifeBuoy className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="font-bold text-base text-slate-700 dark:text-slate-300">No Tickets Found</h3>
            <p className="text-sm mt-1">There are no client service tickets matching your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`border-b text-xs uppercase font-semibold ${
                isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
              }`}>
                <tr>
                  <th className="p-3.5">Ticket #</th>
                  <th className="p-3.5">Subject & Category</th>
                  <th className="p-3.5">Client & Site</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">SLA Target</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredTickets.map((t) => {
                  const isBreached = (t.status !== 'RESOLVED' && t.status !== 'CLOSED') && new Date(t.slaDueTime).getTime() < Date.now();
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`cursor-pointer transition ${
                        isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3.5 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {t.ticketNumber}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{t.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{t.category.replace(/_/g, ' ')}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{t.siteName}</div>
                        <div className="text-xs text-slate-500">{t.clientName}</div>
                      </td>
                      <td className="p-3.5">
                        {getPriorityBadge(t.priority)}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock className={`w-3.5 h-3.5 ${isBreached ? 'text-rose-500' : 'text-slate-400'}`} />
                          <span className={isBreached ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-300'}>
                            {new Date(t.slaDueTime).toLocaleDateString()} {new Date(t.slaDueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {isBreached && (
                          <span className="inline-block mt-0.5 text-[10px] text-rose-500 font-bold uppercase">SLA Overdue</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {getStatusBadge(t.status)}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(t);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-semibold rounded-lg transition"
                        >
                          View & Reply
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Details & Discussion Drawer / Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-lg">
                  {selectedTicket.ticketNumber}
                </div>
                {getStatusBadge(selectedTicket.status)}
                {getPriorityBadge(selectedTicket.priority)}
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedTicket.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> Client: {selectedTicket.clientName}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Site: {selectedTicket.siteName}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Reported By: {selectedTicket.reportedByName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Logged: {new Date(selectedTicket.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className={`p-4 rounded-xl border text-sm ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Issue Description</h4>
                <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">{selectedTicket.description}</p>
              </div>

              {/* Status Action Buttons */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-indigo-50/50 border-indigo-100'}`}>
                <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Workflow Status Controls</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTicket.status === 'OPEN' && (
                    <button
                      onClick={() => handleUpdateStatus('IN_PROGRESS')}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                    >
                      Start Investigation (In Progress)
                    </button>
                  )}

                  {selectedTicket.status === 'IN_PROGRESS' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus('PENDING_CLIENT')}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        Request Client Info
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('RESOLVED')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        Mark as Resolved
                      </button>
                    </>
                  )}

                  {selectedTicket.status === 'PENDING_CLIENT' && (
                    <button
                      onClick={() => handleUpdateStatus('IN_PROGRESS')}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                    >
                      Resume Work
                    </button>
                  )}

                  {selectedTicket.status === 'RESOLVED' && (
                    <div className="space-y-3 w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">Client Rating:</span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setCloseRating(star)}
                            className="p-1 text-amber-400 hover:scale-110 transition"
                          >
                            <Star className={`w-4 h-4 ${star <= closeRating ? 'fill-amber-400' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Client closure feedback..."
                        value={closeFeedback}
                        onChange={(e) => setCloseFeedback(e.target.value)}
                        className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                        }`}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus('CLOSED')}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                          Close Ticket with CSAT Rating
                        </button>
                        <button
                          onClick={() => handleUpdateStatus('REOPENED')}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                          Reopen Ticket
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedTicket.status === 'CLOSED' && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Ticket Closed. Rating: {selectedTicket.clientRating || 5}/5 Stars
                      </span>
                      <button
                        onClick={() => handleUpdateStatus('REOPENED')}
                        className="px-3 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 transition"
                      >
                        Reopen Case
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments & Activity Stream */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> Activity & Communication Log
                </h4>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No notes logged yet.</p>
                  ) : (
                    comments.map((comm) => (
                      <div
                        key={comm.id}
                        className={`p-3 rounded-xl border text-xs ${
                          comm.isInternalOnly
                            ? isDark ? 'bg-amber-950/30 border-amber-800/50' : 'bg-amber-50/70 border-amber-200'
                            : isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold mb-1">
                          <span className="text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {comm.authorName}
                            <span className="text-[10px] text-slate-400 font-normal">({comm.authorRole})</span>
                            {comm.isInternalOnly && (
                              <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-300 rounded font-bold">INTERNAL NOTE</span>
                            )}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{comm.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Input */}
                <form onSubmit={handleAddComment} className="pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add an update or communication..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className={`flex-1 px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !newComment.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post</span>
                    </button>
                  </div>
                  <label className="flex items-center gap-2 mt-2 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Mark as Internal Staff Note (Hidden from Client)</span>
                  </label>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <h3 className="font-bold text-lg">Create Service Desk Ticket</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                  Ticket Subject / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Guard replacement requested for night shift"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ServiceTicketCategory }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="SHORT_MANPOWER">Short Manpower</option>
                    <option value="GUARD_BEHAVIOR">Guard Behavior</option>
                    <option value="EQUIPMENT_MALFUNCTION">Equipment Malfunction</option>
                    <option value="ACCESS_CONTROL">Access Control</option>
                    <option value="PATROL_IRREGULARITY">Patrol Irregularity</option>
                    <option value="BILLING_INVOICE">Billing & Invoice</option>
                    <option value="CLEANLINESS_HYGIENE">Cleanliness & Hygiene</option>
                    <option value="OTHER">Other Query</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Priority & SLA *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as ServiceTicketPriority }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="CRITICAL">Critical (2 Hours SLA)</option>
                    <option value="HIGH">High (6 Hours SLA)</option>
                    <option value="MEDIUM">Medium (24 Hours SLA)</option>
                    <option value="LOW">Low (48 Hours SLA)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Site Location *
                  </label>
                  <select
                    value={formData.siteId}
                    onChange={(e) => setFormData(prev => ({ ...prev, siteId: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name || s.siteName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Client Account
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.legalName || c.primaryContactName || c.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                  Detailed Issue Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide any specific location, guard name, or incident background..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTicket}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
                >
                  {savingTicket ? 'Logging Ticket...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import re

with open('src/components/screens/ServiceDeskScreen.tsx', 'r') as f:
    code = f.read()

# Add ServiceDeskService and StorageService imports
code = code.replace("import { FirestoreService }", "import { FirestoreService }\nimport { ServiceDeskService } from '../../services/serviceDeskService';\nimport { StorageService } from '../../services/storageService';")

# Add attachment states to formData
code = code.replace("priority: ServiceTicketPriority;", "priority: ServiceTicketPriority;\n    attachments: File[];")

# Fix formData initialization
code = code.replace("category: 'INCIDENT',", "category: 'INCIDENT',\n    attachments: [],")

# Add upload states
code = code.replace("const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);", "const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);\n  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);\n  const [errorMsg, setErrorMsg] = useState<string>('');")

# Update handleCreateTicket
handle_create = """  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!activeCompany || !userSession || !formData.title.trim()) return;

    setSavingTicket(true);
    try {
      const selectedSite = sites.find(s => s.id === formData.siteId);
      const selectedClient = clients.find(c => c.id === formData.clientId);
      
      let attachmentUrls: string[] = [];
      if (formData.attachments.length > 0) {
        for (const file of formData.attachments) {
           const path = `companies/${activeCompany.companyId}/serviceTickets/${Date.now()}_${file.name}`;
           const url = await StorageService.uploadFile(path, file, userSession);
           attachmentUrls.push(url);
        }
      }

      const res = await ServiceDeskService.createTicket(userSession, activeCompany.companyId, {
        clientId: formData.clientId,
        clientName: selectedClient?.legalName || selectedClient?.displayName || 'Unknown Client',
        siteId: formData.siteId,
        siteName: selectedSite?.name || selectedSite?.siteName || 'Unknown Site',
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        attachmentUrls
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create ticket');
        setSavingTicket(false);
        return;
      }

      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        description: '',
        category: 'INCIDENT',
        priority: 'MEDIUM',
        siteId: sites[0]?.id || '',
        clientId: clients[0]?.id || '',
        attachments: []
      });
      // Refresh tickets
      const updatedTickets = await ServiceDeskService.getTickets(userSession, activeCompany.companyId);
      setTickets(updatedTickets);

    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      setErrorMsg(err.message || 'Error occurred');
    } finally {
      setSavingTicket(false);
    }
  };"""

code = re.sub(r'const handleCreateTicket = async \(e: React\.FormEvent\) => \{.*?setSavingTicket\(false\);\n  \};', handle_create, code, flags=re.DOTALL)


# Update handleUpdateStatus
handle_update = """  const handleUpdateStatus = async (newStatus: ServiceTicketStatus) => {
    if (!activeCompany || !selectedTicket || !userSession) return;
    try {
       const res = await ServiceDeskService.updateTicket(userSession, activeCompany.companyId, selectedTicket.id, {
         status: newStatus,
         resolutionSummary: newStatus === 'RESOLVED' ? resolutionSummary : undefined,
         clientRating: newStatus === 'CLOSED' ? closeRating : undefined,
         clientFeedbackNotes: newStatus === 'CLOSED' ? closeFeedback : undefined
       }, `Status updated to ${newStatus}`);
       
       if (res.success) {
          const updatedTickets = await ServiceDeskService.getTickets(userSession, activeCompany.companyId);
          setTickets(updatedTickets);
          const updatedSelected = updatedTickets.find(t => t.id === selectedTicket.id);
          if (updatedSelected) setSelectedTicket(updatedSelected);
          if (newStatus === 'RESOLVED') setResolutionSummary('');
          if (newStatus === 'CLOSED') { setCloseRating(5); setCloseFeedback(''); }
       }
    } catch(e) {
       console.error(e);
    }
  };"""

code = re.sub(r'const handleUpdateStatus = async \(newStatus: ServiceTicketStatus\) => \{.*?catch \(e\) \{\n      console\.error\(e\);\n    \}\n  \};', handle_update, code, flags=re.DOTALL)


# Update handleAddComment
handle_add_comment = """  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !selectedTicket || !userSession || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      let urls: string[] = [];
      if (commentAttachments.length > 0) {
        for (const file of commentAttachments) {
           const path = `companies/${activeCompany.companyId}/serviceTickets/${selectedTicket.id}/comments/${Date.now()}_${file.name}`;
           const url = await StorageService.uploadFile(path, file, userSession);
           urls.push(url);
        }
      }
      
      await ServiceDeskService.addComment(userSession, activeCompany.companyId, selectedTicket.id, newComment.trim(), isInternalComment, urls);
      setNewComment('');
      setCommentAttachments([]);
      setIsInternalComment(false);
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };"""

code = re.sub(r'const handleAddComment = async \(e: React\.FormEvent\) => \{.*?setIsSubmittingComment\(false\);\n    \}\n  \};', handle_add_comment, code, flags=re.DOTALL)


# Update the useEffect for initial load
use_effect = """  useEffect(() => {
    if (!activeCompany || !userSession) return;
    let unsubComments: (() => void) | undefined;

    const loadData = async () => {
      setLoading(true);
      try {
        const [loadedSites, loadedClients, loadedTickets] = await Promise.all([
           FirestoreService.getSites(activeCompany.companyId),
           FirestoreService.getClients(activeCompany.companyId),
           ServiceDeskService.getTickets(userSession, activeCompany.companyId)
        ]);
        setSites(loadedSites);
        setClients(loadedClients);
        setTickets(loadedTickets);
        
        if (loadedSites.length > 0 && !formData.siteId) {
           setFormData(prev => ({...prev, siteId: loadedSites[0].id}));
        }
        if (loadedClients.length > 0 && !formData.clientId) {
           setFormData(prev => ({...prev, clientId: loadedClients[0].id}));
        }
      } catch(e) {
         console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    if (selectedTicket) {
      unsubComments = FirestoreService.subscribeToTicketComments(activeCompany.companyId, selectedTicket.id, (loaded) => {
        setComments(loaded);
      });
    }

    return () => {
      if (unsubComments) unsubComments();
    };
  }, [activeCompany, userSession, selectedTicket?.id]);"""

code = re.sub(r'useEffect\(\(\) => \{.*?\} \]\);', use_effect, code, flags=re.DOTALL)


with open('src/components/screens/ServiceDeskScreen.tsx', 'w') as f:
    f.write(code)


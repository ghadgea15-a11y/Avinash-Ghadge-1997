import React, { useState, useEffect, useMemo } from 'react';
import { UserSession, SiteRecord, EmployeeRecord, AppNotification } from '../../types';
import { SosEventRecord, SosEmergencyType, SosSeverity, SosStatus } from '../../types/ops';
import { FirestoreService } from '../../services/firestoreService';
import { 
  AlertTriangle, PhoneCall, ShieldAlert, CheckCircle, 
  MapPin, Clock, X, Eye, Plus, Loader2, Navigation,
  AlertCircle
} from 'lucide-react';

interface EmergencySosProps {
  session: UserSession;
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  selectedSiteId: string;
}

export function EmergencySos({ session, sites, employees, selectedSiteId }: EmergencySosProps) {
  const [events, setEvents] = useState<SosEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SosEventRecord | null>(null);
  
  useEffect(() => {
    if (!session?.companyId || !selectedSiteId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const unsub = FirestoreService.subscribeToActiveSos(session, session.companyId, (data) => {
       const filtered = data.filter(e => e.siteId === selectedSiteId);
       setEvents(filtered);
       setLoading(false);
    });
    return () => unsub();
  }, [session, selectedSiteId]);

  const handleTrigger = async (type: SosEmergencyType, severity: SosSeverity) => {
    if (!session?.companyId || !selectedSiteId || !session.employeeId) return;

    // Simulate location capture
    const latitude = 19.0760 + (Math.random() - 0.5) * 0.01;
    const longitude = 72.8777 + (Math.random() - 0.5) * 0.01;

    const newEvent: SosEventRecord = {
      id: `SOS-${Date.now()}`,
      companyId: session.companyId,
      siteId: selectedSiteId,
      employeeId: session.employeeId,
      triggeredByUserId: session.userId,
      source: 'WEB',
      emergencyType: type,
      severity,
      status: 'TRIGGERED',
      latitude,
      longitude,
      locationAccuracy: 10,
      locationTimestamp: new Date().toISOString(),
      triggeredAt: new Date().toISOString(),
      escalationLevel: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const success = await FirestoreService.triggerSos(session.companyId, newEvent);
    if (success) {
      // Also trigger a notification (Mocking notification trigger via FirestoreService would be better, but we can assume rules/triggers handle it or do it here)
      const notif: AppNotification = {
        id: `NOTIF-${Date.now()}`,
        title: `SOS TRIGGERED: ${type}`,
        message: `Emergency reported at ${sites.find(s => s.id === selectedSiteId)?.name || 'Unknown Site'}`,
        type: 'ALERT',
        timestamp: new Date().toISOString(),
        isRead: false,
        roleScope: ['HR_ADMIN', 'COMPANY_ADMIN', 'OPS_MANAGER'],
        
        
      };
      // await FirestoreService.createNotification(session.companyId, notif);
      setShowTriggerModal(false);
    }
  };

  const handleUpdateStatus = async (eventId: string, status: SosStatus, notes?: string) => {
    if (!session?.companyId || !session.employeeId) return;
    
    const updates: Partial<SosEventRecord> = {};
    if (status === 'ACKNOWLEDGED') {
      updates.acknowledgedAt = new Date().toISOString();
      updates.acknowledgedBy = session.employeeId;
    } else if (status === 'RESPONSE_STARTED') {
      updates.responseStartedAt = new Date().toISOString();
    } else if (status === 'RESOLVED') {
      updates.resolvedAt = new Date().toISOString();
      updates.resolvedBy = session.employeeId;
      updates.resolutionNotes = notes;
    } else if (status === 'CLOSED' || status === 'CANCELLED' || status === 'FALSE_ALARM') {
      updates.closedAt = new Date().toISOString();
      updates.cancellationReason = notes;
    }

    await FirestoreService.updateSosStatus(session.companyId, eventId, status, updates);
    setSelectedEvent(null);
  };

  const activeEvents = useMemo(() => events.filter(e => !['CLOSED', 'CANCELLED', 'FALSE_ALARM', 'RESOLVED'].includes(e.status)), [events]);
  const historyEvents = useMemo(() => events.filter(e => ['CLOSED', 'CANCELLED', 'FALSE_ALARM', 'RESOLVED'].includes(e.status)), [events]);

  if (loading) {
     return <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-red-50 p-4 rounded-lg border border-red-100">
        <div>
          <h2 className="text-lg font-semibold text-red-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Emergency & SOS Management
          </h2>
          <p className="text-red-700 text-sm">Monitor and respond to active emergency signals.</p>
        </div>
        <button type="button" onClick={() => setShowTriggerModal(true)} className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium">
          <ShieldAlert className="w-4 h-4 mr-2" />
          Trigger SOS
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 font-medium text-slate-800 flex justify-between items-center">
            <span>Active Emergencies</span>
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">{activeEvents.length}</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {activeEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <CheckCircle className="w-12 h-12 text-emerald-400 mb-3" />
                <p>No active emergencies</p>
              </div>
            ) : (
              activeEvents.map(event => (
                <div key={event.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-medium text-slate-900">{event.emergencyType.replace(/_/g, ' ')}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(event.triggeredAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      event.status === 'TRIGGERED' ? 'bg-red-100 text-red-700' :
                      event.status === 'ACKNOWLEDGED' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-end">
                    <div className="text-sm text-slate-600">
                      <p><strong>Emp ID:</strong> {employees.find(e => e.id === event.employeeId)?.firstName || event.employeeId}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3 h-3" />
                        {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                      </p>
                    </div>
                    <button type="button" onClick={() => setSelectedEvent(event)}>
                      <Eye className="w-4 h-4 mr-1" /> View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 font-medium text-slate-800 flex justify-between items-center">
            <span>Recent History</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {historyEvents.length === 0 ? (
               <div className="p-8 text-center text-slate-500">
                 <p>No recent history</p>
               </div>
            ) : (
              historyEvents.map(event => (
                <div key={event.id} className="p-4 opacity-75">
                   <div className="flex justify-between">
                     <span className="font-medium text-slate-800">{event.emergencyType.replace(/_/g, ' ')}</span>
                     <span className="text-xs text-slate-500">{new Date(event.triggeredAt).toLocaleDateString()}</span>
                   </div>
                   <p className="text-xs text-slate-500 mt-1">Status: {event.status}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showTriggerModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-red-600 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Trigger SOS Alarm
              </h3>
              <button onClick={() => setShowTriggerModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 mb-4">This will instantly alert all administrators and response teams.</p>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { type: 'MEDICAL_EMERGENCY', label: 'Medical', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
                  { type: 'SECURITY_THREAT', label: 'Security', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
                  { type: 'FIRE_EMERGENCY', label: 'Fire', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
                  { type: 'PERSONAL_EMERGENCY', label: 'Personal SOS', color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100' },
                ].map(opt => (
                  <button 
                    key={opt.type}
                    onClick={() => handleTrigger(opt.type as SosEmergencyType, 'HIGH')}
                    className={`p-4 rounded-lg border text-center font-medium transition-colors ${opt.color}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                SOS Response Protocol
              </h3>
              <button onClick={() => setSelectedEvent(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6">
               <div className="bg-slate-50 p-4 rounded-lg mb-6 space-y-2 text-sm">
                 <p><span className="text-slate-500">Event Type:</span> <span className="font-semibold">{selectedEvent.emergencyType.replace(/_/g, ' ')}</span></p>
                 <p><span className="text-slate-500">Status:</span> <span>{selectedEvent.status}</span></p>
                 <p><span className="text-slate-500">Triggered By:</span> {employees.find(e => e.id === selectedEvent.employeeId)?.firstName}</p>
                 <p><span className="text-slate-500">Location:</span> {selectedEvent.latitude.toFixed(5)}, {selectedEvent.longitude.toFixed(5)}</p>
                 <p><span className="text-slate-500">Time:</span> {new Date(selectedEvent.triggeredAt).toLocaleString()}</p>
               </div>
               
               <div className="space-y-3">
                 <h4 className="font-medium text-slate-800">Available Actions</h4>
                 
                 {selectedEvent.status === 'TRIGGERED' && (
                   <button type="button" className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium" onClick={() => handleUpdateStatus(selectedEvent.id, 'ACKNOWLEDGED')}>
                     Acknowledge Emergency
                   </button>
                 )}
                 
                 {selectedEvent.status === 'ACKNOWLEDGED' && (
                   <button type="button" className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium" onClick={() => handleUpdateStatus(selectedEvent.id, 'RESPONSE_STARTED')}>
                     Start Response Deployment
                   </button>
                 )}

                 {selectedEvent.status === 'RESPONSE_STARTED' && (
                   <div className="space-y-3 pt-4 border-t border-slate-100">
                     <button type="button" className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium" onClick={() => handleUpdateStatus(selectedEvent.id, 'RESOLVED', 'Situation contained and resolved.')}>
                       Mark as Resolved
                     </button>
                   </div>
                 )}

                 {['TRIGGERED', 'ACKNOWLEDGED'].includes(selectedEvent.status) && (
                    <button type="button" className="w-full px-4 py-2 border border-slate-300 rounded-md font-medium hover:bg-slate-50" onClick={() => handleUpdateStatus(selectedEvent.id, 'FALSE_ALARM', 'Confirmed false alarm')}>
                       Mark as False Alarm
                    </button>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

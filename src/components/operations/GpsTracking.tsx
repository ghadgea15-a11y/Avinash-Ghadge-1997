import React, { useState, useEffect } from 'react';
import { UserSession, SiteRecord, EmployeeRecord } from '../../types';
import { TrackingSessionRecord, GpsLocationEvent } from '../../types/ops';
import { FirestoreService } from '../../services/firestoreService';
import { 
  Navigation, MapPin, Play, Square, Loader2, Clock, CheckCircle2, History
} from 'lucide-react';

interface GpsTrackingProps {
  session: UserSession;
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  selectedSiteId: string;
}

export function GpsTracking({ session, sites, employees, selectedSiteId }: GpsTrackingProps) {
  const [activeSession, setActiveSession] = useState<TrackingSessionRecord | null>(null);
  const [locationEvents, setLocationEvents] = useState<GpsLocationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // We use navigator.geolocation to monitor GPS movement when a session is active.
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    // Basic initialization
    setLoading(false);
  }, []);

  const handleStartSession = async () => {
    if (!session?.companyId || !selectedSiteId || !session.employeeId) return;

    const newSession: TrackingSessionRecord = {
      id: `TRK-${Date.now()}`,
      companyId: session.companyId,
      siteId: selectedSiteId,
      employeeId: session.employeeId,
      purposeType: 'PATROL',
      startedAt: new Date().toISOString(),
      status: 'ACTIVE',
      startedBy: session.employeeId,
      locationPolicy: 'INTERVAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const success = await FirestoreService.startTrackingSession(session.companyId, newSession);
    if (success) {
      setActiveSession(newSession);
      setLocationEvents([]);
      setIsTracking(true);
    }
  };

  const handleStopSession = async () => {
    if (!session?.companyId || !activeSession || !session.employeeId) return;

    const success = await FirestoreService.endTrackingSession(session.companyId, activeSession.id, session.employeeId);
    if (success) {
      setActiveSession(null);
      setIsTracking(false);
    }
  };

  // Tracking effect for generating real GPS points
  useEffect(() => {
    if (!isTracking || !activeSession || !session.companyId) return;

    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      return;
    }

    let seq = locationEvents.length;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        seq++;
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        const event: GpsLocationEvent = {
          id: `GPS-${Date.now()}`,
          trackingSessionId: activeSession.id,
          companyId: session.companyId,
          siteId: activeSession.siteId,
          employeeId: activeSession.employeeId,
          latitude: lat,
          longitude: lng,
          accuracy: accuracy,
          timestamp: new Date().toISOString(),
          source: 'GPS',
          sequenceNumber: seq
        };
        await FirestoreService.recordGpsEvent(session.companyId, event);
        
        // Update local state directly for immediate UI feedback
        setLocationEvents(prev => [...prev, event]);
      },
      (error) => {
        console.warn("Error watching position", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 27000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking, activeSession, session.companyId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
        <div>
          <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            Purpose-Bound GPS Tracking
          </h2>
          <p className="text-blue-700 text-sm">Monitor active patrols and operations paths.</p>
        </div>
        {!activeSession ? (
          <button type="button" onClick={handleStartSession} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium">
            <Play className="w-4 h-4 mr-2" />
            Start Session
          </button>
        ) : (
          <button type="button" onClick={handleStopSession} className="flex items-center px-4 py-2 border border-transparent text-white bg-red-600 rounded-md text-sm font-medium hover:bg-red-700">
            <Square className="w-4 h-4 mr-2" />
            End Session
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px] relative flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-white dark:bg-slate-950 flex justify-between items-center">
             <h3 className="font-medium text-black dark:text-slate-200 flex items-center gap-2">
               <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400" />
               Live Path Tracing
             </h3>
             {activeSession && <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 animate-pulse">Live Tracking</span>}
          </div>
          
          <div className="flex-1 p-6 flex flex-col items-center justify-center bg-white dark:bg-slate-950/50">
             {/* Data Visualization Area */}
             {!activeSession ? (
                <div className="text-center text-slate-400">
                   <Navigation className="w-12 h-12 mx-auto mb-3 opacity-50" />
                   <p>No active tracking session.</p>
                   <p className="text-sm mt-1">Start a session to begin logging path.</p>
                </div>
             ) : (
                <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 p-4 rounded-lg shadow-sm">
                   <h4 className="font-medium text-black dark:text-slate-200 mb-4 border-b pb-2">Session Details</h4>
                   <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <p className="flex justify-between"><span>Session ID:</span> <span className="font-mono text-xs">{activeSession.id}</span></p>
                      <p className="flex justify-between"><span>Purpose:</span> <span className="px-2 py-1 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900">{activeSession.purposeType}</span></p>
                      <p className="flex justify-between"><span>Started:</span> <span>{new Date(activeSession.startedAt).toLocaleTimeString()}</span></p>
                      <p className="flex justify-between"><span>Points Captured:</span> <span className="font-bold text-blue-600">{locationEvents.length}</span></p>
                   </div>
                   
                   {locationEvents.length > 0 && (
                     <div className="mt-6 pt-4 border-t border-slate-100">
                       <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Latest Coordinate</p>
                       <div className="bg-white dark:bg-slate-950 p-3 rounded text-center font-mono text-xs text-slate-900 dark:text-slate-300">
                          {locationEvents[locationEvents.length - 1].latitude.toFixed(6)}, {locationEvents[locationEvents.length - 1].longitude.toFixed(6)}
                       </div>
                     </div>
                   )}
                </div>
             )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[600px]">
          <div className="px-4 py-3 border-b border-slate-100 bg-white dark:bg-slate-950 font-medium text-black dark:text-slate-200">
            Event Log
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {locationEvents.length === 0 ? (
               <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">Waiting for location events...</p>
            ) : (
               [...locationEvents].reverse().map(event => (
                 <div key={event.id} className="flex gap-3 text-sm">
                   <div className="flex flex-col items-center">
                     <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                     <div className="flex-1 w-px bg-slate-200 my-1" />
                   </div>
                   <div className="flex-1 bg-white dark:bg-slate-950 p-2 rounded border border-slate-100">
                     <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                       <span>Seq: {event.sequenceNumber}</span>
                       <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(event.timestamp).toLocaleTimeString()}</span>
                     </div>
                     <p className="font-mono text-xs text-slate-900 dark:text-slate-300">
                       Lat: {event.latitude.toFixed(4)}<br/>
                       Lng: {event.longitude.toFixed(4)}
                     </p>
                   </div>
                 </div>
               ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { ContinuousMonitoringService } from '../../services/continuousMonitoringService';
import { DetectedRiskEvent, SecurityDetectionRule } from '../../types';
import { ShieldAlert, AlertTriangle, ShieldCheck, Clock, CheckCircle, Activity, Search } from 'lucide-react';

export function ContinuousMonitoringDashboard({ userSession }: { userSession: any }) {
  const session = userSession;
  const [activeRules, setActiveRules] = useState<SecurityDetectionRule[]>([]);
  const [riskEvents, setRiskEvents] = useState<DetectedRiskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (session?.companyId) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const rules = await ContinuousMonitoringService.getActiveRules(session.companyId);
      setActiveRules(rules);

      const events = await ContinuousMonitoringService.getRiskEvents(session.companyId);
      setRiskEvents(events);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'DETECTED': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'INVESTIGATION': return <Search className="w-4 h-4 text-blue-500" />;
      case 'CLOSED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FALSE_POSITIVE': return <ShieldCheck className="w-4 h-4 text-gray-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading Continuous Monitoring Data...</div>;
  }

  const filteredEvents = riskEvents.filter(e => 
    e.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Continuous Security Monitoring
          </h1>
          <p className="text-gray-500 mt-1">Real-time risk detection and event correlation engine.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <div className="text-sm font-medium text-gray-500">Total Open Risks</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {riskEvents.filter(e => !['CLOSED', 'FALSE_POSITIVE'].includes(e.status)).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-red-100">
          <div className="text-sm font-medium text-red-600">Critical / High Risks</div>
          <div className="mt-2 text-3xl font-bold text-red-700">
            {riskEvents.filter(e => !['CLOSED', 'FALSE_POSITIVE'].includes(e.status) && (e.severity === 'CRITICAL' || e.severity === 'HIGH')).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-blue-100">
          <div className="text-sm font-medium text-blue-600">Active Investigations</div>
          <div className="mt-2 text-3xl font-bold text-blue-700">
            {riskEvents.filter(e => e.status === 'INVESTIGATION' || e.status === 'REMEDIATION').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-green-100">
          <div className="text-sm font-medium text-green-600">Active Detection Rules</div>
          <div className="mt-2 text-3xl font-bold text-green-700">
            {activeRules.length}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-gray-500" />
            Detected Risk Events
          </h3>
          <div className="w-64">
            <input 
              type="text" 
              placeholder="Search events..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No risk events detected matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detection Rule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User / Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvents.map(event => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(event.status)}
                        <span className="text-sm font-medium text-gray-900">{event.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(event.severity)}`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">{event.ruleName}</div>
                      <div className="text-xs text-gray-500">{event.eventType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{event.userId || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{event.source}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {event.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

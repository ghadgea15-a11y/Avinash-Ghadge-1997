import React, { useState, useEffect } from 'react';
import { UserSession, AuditTrailRecord } from '../../types';
import { AuditTrailService } from '../../services/auditTrailService';
import { Shield, Search, Filter, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface AuditViewerProps {
  userSession: UserSession;
}

export const AuditViewer: React.FC<AuditViewerProps> = ({ userSession }) => {
  const [logs, setLogs] = useState<AuditTrailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [searchId, setSearchId] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    const data = await AuditTrailService.getAuditLogs(userSession, {
      module: filterModule || undefined,
      action: filterAction || undefined,
      severity: filterSeverity || undefined,
      correlationId: searchId || undefined,
      limitCount: 200
    });
    // Filter locally for entity ID or correlation ID search if provided
    let filteredData = data;
    if (searchId && !filterModule) {
       filteredData = data.filter(d => 
         d.correlationId?.includes(searchId) || 
         d.entityId.includes(searchId) || 
         d.id.includes(searchId) ||
         d.actorId.includes(searchId)
       );
    }
    setLogs(filteredData);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [userSession, filterModule, filterAction, filterSeverity]);

  // Use a debounced search or manual refresh button
  useEffect(() => {
    const delay = setTimeout(() => {
      loadLogs();
    }, 500);
    return () => clearTimeout(delay);
  }, [searchId]);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Immutable Audit Trail</h3>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search ID, Actor, Entity..." 
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <select 
            value={filterSeverity} 
            onChange={e => setFilterSeverity(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          
          <select 
            value={filterAction} 
            onChange={e => setFilterAction(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="APPROVE">Approve</option>
            <option value="REJECT">Reject</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor / Role</th>
              <th className="px-4 py-3">Module / Action</th>
              <th className="px-4 py-3">Entity / Changes</th>
              <th className="px-4 py-3">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No audit logs found matching criteria.
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap text-gray-500 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className="text-gray-400 mt-1 font-mono text-[10px]" title="Audit ID">{log.id}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{log.actorId}</div>
                    <div className="text-xs text-gray-500">{log.actorRole || 'N/A'} {log.actorEmployeeId ? `(${log.actorEmployeeId})` : ''}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full inline-block w-fit">
                        {log.module}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        {log.success ? (
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                        <span className={`text-xs font-mono font-medium ${log.success ? 'text-gray-700' : 'text-red-600'}`}>
                          {log.operation}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 max-w-xs">
                    <div className="text-xs text-gray-900 font-medium mb-1">
                      {log.entityType}: <span className="font-mono text-indigo-600">{log.entityId}</span>
                    </div>
                    {log.changeSummary && (
                      <div className="text-xs text-gray-600 bg-white border border-gray-200 p-1.5 rounded truncate" title={log.changeSummary}>
                        {log.changeSummary}
                      </div>
                    )}
                    {log.correlationId && (
                      <div className="text-[10px] text-gray-400 mt-1 font-mono flex items-center gap-1">
                        Corr: {log.correlationId}
                      </div>
                    )}
                    {log.failureReason && (
                      <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {log.failureReason}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded border ${getSeverityStyle(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

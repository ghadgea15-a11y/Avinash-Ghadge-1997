import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, EmployeeRefresherStatus, MandatoryRefresherConfig } from '../../types';
import { AlertCircle, CheckCircle, Clock, ShieldAlert, Calendar, UserX, FileText } from 'lucide-react';
import { getFirestore, collection, query, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { LearningManagementService } from '../../services/learningManagementService';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  onNavigate: (screen: any) => void;
}

export function MandatoryRefreshersScreen({ userSession, activeCompany, onNavigate }: Props) {
  const [statuses, setStatuses] = useState<EmployeeRefresherStatus[]>([]);
  const [configs, setConfigs] = useState<MandatoryRefresherConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const fetchedConfigs = await LearningManagementService.getMandatoryRefresherConfigs(userSession, activeCompany.companyId);
        const fetchedStatuses = await LearningManagementService.getEmployeeRefresherStatuses(userSession, activeCompany.companyId);
        setConfigs(fetchedConfigs);
        setStatuses(fetchedStatuses);
      } catch (err) {
        console.error('Failed to fetch refreshers:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userSession, activeCompany.companyId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'DUE_SOON': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'IN_GRACE_PERIOD': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'OVERDUE_LOCKED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="w-4 h-4 mr-1" />;
      case 'DUE_SOON': return <Clock className="w-4 h-4 mr-1" />;
      case 'IN_GRACE_PERIOD': return <AlertCircle className="w-4 h-4 mr-1" />;
      case 'OVERDUE_LOCKED': return <ShieldAlert className="w-4 h-4 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mandatory Refreshers</h1>
            <p className="text-sm text-slate-500 mt-1">
              Track compliance training, overdue refreshers, and roster blocking rules.
            </p>
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            Assign Refresher
          </button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Enrolled</p>
              <p className="text-2xl font-bold text-slate-900">{loading ? '-' : statuses.length}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Fully Compliant</p>
              <p className="text-2xl font-bold text-emerald-600">
                {loading ? '-' : statuses.filter(s => s.status === 'ACTIVE').length}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Due Soon / Grace</p>
              <p className="text-2xl font-bold text-amber-600">
                {loading ? '-' : statuses.filter(s => s.status === 'DUE_SOON' || s.status === 'IN_GRACE_PERIOD').length}
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Overdue (Blocked)</p>
              <p className="text-2xl font-bold text-red-600">
                {loading ? '-' : statuses.filter(s => s.status === 'OVERDUE_LOCKED').length}
              </p>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <UserX className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Status Directory */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800">Compliance Directory</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 font-medium">Employee</th>
                  <th className="px-6 py-3 font-medium">Refresher Course</th>
                  <th className="px-6 py-3 font-medium">Last Completed</th>
                  <th className="px-6 py-3 font-medium">Next Due</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      Loading data...
                    </td>
                  </tr>
                ) : statuses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No mandatory refreshers assigned.
                    </td>
                  </tr>
                ) : (
                  statuses.map((status) => (
                    <tr key={status.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{status.employeeName}</div>
                        <div className="text-slate-500 text-xs">{status.employeeId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-800 font-medium">{status.courseName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {status.lastCompletedDate ? format(new Date(status.lastCompletedDate), 'MMM d, yyyy') : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        <div className="flex flex-col">
                          <span>{format(new Date(status.nextDueDate), 'MMM d, yyyy')}</span>
                          {status.status === 'IN_GRACE_PERIOD' && (
                            <span className="text-xs text-orange-600 mt-0.5">
                              Grace ends: {format(new Date(status.gracePeriodExpiryDate), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(status.status)}`}>
                          {getStatusIcon(status.status)}
                          {status.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="text-indigo-600 hover:text-indigo-900 font-medium text-sm transition-colors">
                          Log Completion
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

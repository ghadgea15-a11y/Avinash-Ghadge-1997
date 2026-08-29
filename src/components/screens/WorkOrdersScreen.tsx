import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, WorkOrderRecord, WorkOrderStatus } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { Plus, ListTodo, Search, Filter, AlertCircle, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { WorkOrderList } from '../workorders/WorkOrderList';
import { WorkOrderForm } from '../workorders/WorkOrderForm';
import { WorkOrderDetail } from '../workorders/WorkOrderDetail';

interface WorkOrdersScreenProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant;
  isOnline: boolean;
}

export function WorkOrdersScreen({ userSession, activeCompany, isOnline }: WorkOrdersScreenProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'LIST' | 'CREATE' | 'DETAIL'>('LIST');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderRecord | null>(null);

  useEffect(() => {
    if (!userSession || !activeCompany) return;
    
    setLoading(true);
    const unsub = FirestoreService.subscribeToWorkOrders(userSession, activeCompany.companyId, (data) => {
      setWorkOrders(data);
      setLoading(false);
    });

    return () => unsub();
  }, [userSession, activeCompany]);

  if (!userSession) return null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 dark:bg-slate-900">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-slate-950 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black dark:text-white">Work Orders</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Dispatch, tracking, and operational tasks</p>
          </div>
        </div>
        {view === 'LIST' && (
          <button 
            onClick={() => setView('CREATE')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Work Order
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {view === 'LIST' && (
              <WorkOrderList 
                workOrders={workOrders} 
                onSelect={(order) => {
                  setSelectedOrder(order);
                  setView('DETAIL');
                }}
              />
            )}
            {view === 'CREATE' && (
              <div className="h-full overflow-y-auto">
                <WorkOrderForm 
                  companyId={activeCompany.companyId}
                  userSession={userSession}
                  onClose={() => setView('LIST')} 
                />
              </div>
            )}
            {view === 'DETAIL' && selectedOrder && (
              <div className="h-full overflow-y-auto">
                <WorkOrderDetail 
                  workOrder={selectedOrder}
                  companyId={activeCompany.companyId}
                  userSession={userSession}
                  onClose={() => {
                    setSelectedOrder(null);
                    setView('LIST');
                  }} 
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

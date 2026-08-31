import React, { useState, useEffect, useMemo } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { PurchaseOrderRecord, PoLineItem } from '../../types';
import { db, functions } from '../../firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { 
  Plus, Edit, Trash2, Search, FileText, CheckCircle, 
  XCircle, Truck, FileOutput, Printer, ChevronRight, X
} from 'lucide-react';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface PurchaseOrderManagementScreenProps {
  userSession: any;
  activeCompany: any;
  onNavigate?: (screen: string) => void;
}

export const PurchaseOrderManagementScreen: React.FC<PurchaseOrderManagementScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError, confirm } = useFeedback();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderRecord | null>(null);
  useBackNavigation(!!selectedPO, () => setSelectedPO(null as any), 'selectedPO');
  const [showForm, setShowForm] = useState(false);
  useBackNavigation(!!showForm, () => setShowForm(null as any), 'showForm');
  
  // For Approval Drawer
  const [showApprovalDrawer, setShowApprovalDrawer] = useState(false);
  useBackNavigation(!!showApprovalDrawer, () => setShowApprovalDrawer(null as any), 'showApprovalDrawer');
  const [approvalComment, setApprovalComment] = useState('');
  
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!activeCompany?.id) return;
    
    const poRef = collection(db, 'companies', activeCompany.id, 'purchase_orders');
    const q = query(poRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as PurchaseOrderRecord);
      setPurchaseOrders(data);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [activeCompany?.id]);

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchesSearch = 
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, searchQuery, statusFilter]);

  const handleApprovePO = async (po: PurchaseOrderRecord, status: 'APPROVED' | 'REJECTED') => {
    if (!activeCompany?.id) return;
    const dismiss = showLoading(status === 'APPROVED' ? 'Approving Purchase Order...' : 'Rejecting Purchase Order...');
    try {
      const poRef = doc(db, 'companies', activeCompany.id, 'purchase_orders', po.id);
      
      const newApprovalStep = {
        tier: po.approvalWorkflow?.currentApprovalTier || 'A2',
        approvedBy: userSession.userId,
        status,
        timestamp: new Date().toISOString(),
        comments: approvalComment
      };

      let newStatus = po.status;
      let newTier = po.approvalWorkflow?.currentApprovalTier;

      if (status === 'REJECTED') {
         newStatus = 'REJECTED';
      } else {
         // Determine next tier
         if (newTier === 'A2') {
             // check if it needs A1
             if (po.grandTotal >= 25000) newTier = 'A1';
             else { newTier = 'COMPLETED'; newStatus = 'APPROVED'; }
         } else if (newTier === 'A1') {
             if (po.grandTotal > 100000) newTier = 'A0';
             else { newTier = 'COMPLETED'; newStatus = 'APPROVED'; }
         } else if (newTier === 'A0') {
             newTier = 'COMPLETED'; 
             newStatus = 'APPROVED';
         }
      }

      await updateDoc(poRef, {
        status: newStatus,
        'approvalWorkflow.currentApprovalTier': newTier,
        'approvalWorkflow.approvalTrail': [...(po.approvalWorkflow?.approvalTrail || []), newApprovalStep],
        updatedAt: new Date().toISOString()
      });

      setShowApprovalDrawer(false);
      setApprovalComment('');
      dismiss();
      showSuccess(`✓ Purchase Order ${po.poNumber} marked as ${status}`);
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to update PO approval status');
    }
  };

  const handleGeneratePdf = async (poId: string) => {
    if (!activeCompany?.id) return;
    setGeneratingPdf(true);
    const dismiss = showLoading('Generating Purchase Order PDF...');
    try {
      const generatePOPdf = httpsCallable(functions, 'generatePOPdf');
      await generatePOPdf({ companyId: activeCompany.id, poId });
      dismiss();
      showSuccess('✓ PDF generated and downloaded successfully!');
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDispatch = async (poId: string) => {
     if (!activeCompany?.id) return;
     const dismiss = showLoading('Dispatching PO to vendor...');
     try {
       const dispatchPO = httpsCallable(functions, 'dispatchPOToVendor');
       await dispatchPO({ companyId: activeCompany.id, poId });
       dismiss();
       showSuccess('✓ PO Dispatched to Vendor successfully!');
     } catch (err: any) {
       dismiss();
       handleError(err, '✕ Failed to dispatch PO');
     }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-100 text-black';
      case 'PENDING_APPROVAL': return 'bg-amber-100 text-amber-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'ISSUED_TO_VENDOR': return 'bg-blue-100 text-blue-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStepper = (status: string) => {
    const steps = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ISSUED_TO_VENDOR', 'PARTIALLY_DELIVERED', 'COMPLETED'];
    const currentIndex = steps.indexOf(status) === -1 && status === 'REJECTED' ? 1 : steps.indexOf(status);
    
    return (
      <div className="flex items-center w-full">
        {steps.map((step, idx) => (
          <React.Fragment key={step}>
            <div className={`flex flex-col items-center \${idx <= currentIndex ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 \${idx <= currentIndex ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300 bg-white'}`}>
                {idx < currentIndex ? <CheckCircle className="w-5 h-5" /> : <span className="text-sm font-medium">{idx + 1}</span>}
              </div>
              <span className="text-xs mt-1 hidden sm:block whitespace-nowrap">{step.replace(/_/g, ' ')}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 \${idx < currentIndex ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">Purchase Orders</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage PO lifecycle and approvals</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create PO
            </button>
          </div>
        </div>

        
        {/* Creation Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                   <div>
                     <h2 className="text-xl font-bold text-black dark:text-white">Create Purchase Order</h2>
                     <p className="text-sm text-slate-500 dark:text-slate-400">Draft a new PO or import from RFQ</p>
                   </div>
                   <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                     <X className="w-5 h-5" />
                   </button>
                </div>
                <div className="p-6 space-y-6">
                   <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-full"><Search className="w-5 h-5 text-blue-700" /></div>
                      <div>
                         <h3 className="text-sm font-semibold text-blue-900">Import from RFQ</h3>
                         <p className="text-xs text-blue-700 mt-1">Select an awarded RFQ to automatically populate vendor, items, and negotiated prices.</p>
                         <button className="mt-3 text-xs font-semibold bg-white dark:bg-slate-900 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors">
                            Select Awarded RFQ
                         </button>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Vendor Name</label>
                         <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" placeholder="e.g. Acme Corp" />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Delivery Site</label>
                         <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm">
                            <option>Main HQ (Mumbai)</option>
                            <option>Pune Facility</option>
                         </select>
                      </div>
                   </div>

                   <div>
                      <div className="flex items-center justify-between mb-2">
                         <label className="block text-sm font-medium text-slate-900 dark:text-slate-300">Line Items</label>
                         <button className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center">
                            <Plus className="w-3 h-3 mr-1" /> Add Item
                         </button>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-4 bg-white dark:bg-slate-950 text-center">
                         <p className="text-sm text-slate-500 dark:text-slate-400">No items added yet. Import an RFQ or add items manually.</p>
                      </div>
                   </div>

                   <div className="flex items-center justify-between bg-slate-100 p-4 rounded-lg">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                         Budget Headroom: <span className="font-semibold text-green-600">₹4,50,000</span>
                      </div>
                      <div className="text-right">
                         <div className="text-xs text-slate-500 dark:text-slate-400">Grand Total</div>
                         <div className="text-xl font-bold text-black dark:text-white">₹0.00</div>
                      </div>
                   </div>
                </div>
                <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-white dark:bg-slate-950">
                   <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 text-slate-900 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-white dark:bg-slate-950">
                      Cancel
                   </button>
                   <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save as Draft
                   </button>
                </div>
             </div>
          </div>
        )}


        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center bg-white dark:bg-slate-950 rounded-lg px-3 py-2 border border-slate-200 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search by PO number or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-slate-950 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="ISSUED_TO_VENDOR">Issued to Vendor</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* PO List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white dark:bg-slate-950 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">PO Number</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Vendor</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                      No Purchase Orders found.
                    </td>
                  </tr>
                ) : (
                  filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-white dark:bg-slate-950 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-black dark:text-white">{po.poNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{po.vendorName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-black dark:text-white">
                          ₹{po.grandTotal.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium \${getStatusBadge(po.status)}`}>
                          {po.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(po.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {po.status === 'PENDING_APPROVAL' && (
                          <button
                            onClick={() => { setSelectedPO(po); setShowApprovalDrawer(true); }}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            Review
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedPO(po)}
                          className="text-slate-600 dark:text-slate-400 hover:text-black dark:text-white text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PO Details Modal */}
        {selectedPO && !showApprovalDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-xl font-bold text-black dark:text-white">{selectedPO.poNumber}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Vendor: {selectedPO.vendorName}</p>
                </div>
                <button onClick={() => setSelectedPO(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* Stepper */}
                <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200">
                   {renderStepper(selectedPO.status)}
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div>
                     <h3 className="text-sm font-semibold text-black dark:text-white mb-2">Billing Address</h3>
                     <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{selectedPO.billingAddress}</p>
                   </div>
                   <div>
                     <h3 className="text-sm font-semibold text-black dark:text-white mb-2">Delivery Address</h3>
                     <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{selectedPO.deliveryAddress}</p>
                   </div>
                </div>

                <div>
                   <h3 className="text-sm font-semibold text-black dark:text-white mb-4">Line Items</h3>
                   <div className="border border-slate-200 rounded-lg overflow-hidden">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-white dark:bg-slate-950 border-b border-slate-200">
                         <tr>
                           <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Item</th>
                           <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Qty</th>
                           <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Price</th>
                           <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Tax %</th>
                           <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-right">Total</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-200">
                         {selectedPO.lineItems?.map((item: any, idx: number) => (
                           <tr key={idx}>
                             <td className="px-4 py-3">
                               <div className="font-medium text-black dark:text-white">{item.itemName}</div>
                               <div className="text-xs text-slate-500 dark:text-slate-400">{item.description}</div>
                             </td>
                             <td className="px-4 py-3 text-right">{item.quantity} {item.uom}</td>
                             <td className="px-4 py-3 text-right">₹{item.unitPrice.toLocaleString()}</td>
                             <td className="px-4 py-3 text-right">{item.gstRate}%</td>
                             <td className="px-4 py-3 text-right font-medium">₹{item.totalAmount.toLocaleString()}</td>
                           </tr>
                         ))}
                       </tbody>
                       <tfoot className="bg-white dark:bg-slate-950 border-t border-slate-200 font-medium">
                         <tr>
                           <td colSpan={4} className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">Subtotal</td>
                           <td className="px-4 py-3 text-right">₹{(selectedPO.subTotal ?? selectedPO.subtotal ?? 0).toLocaleString()}</td>
                         </tr>
                         <tr>
                           <td colSpan={4} className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">Tax</td>
                           <td className="px-4 py-3 text-right">₹{(selectedPO.totalTax ?? selectedPO.taxAmount ?? 0).toLocaleString()}</td>
                         </tr>
                         <tr>
                           <td colSpan={4} className="px-4 py-3 text-right text-black dark:text-white font-bold">Grand Total</td>
                           <td className="px-4 py-3 text-right text-indigo-700 font-bold">₹{selectedPO.grandTotal.toLocaleString()}</td>
                         </tr>
                       </tfoot>
                     </table>
                   </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                   {selectedPO.status === 'APPROVED' && !selectedPO.pdfUrl && (
                      <button 
                         onClick={() => handleGeneratePdf(selectedPO.id)}
                         disabled={generatingPdf}
                         className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                      >
                         <Printer className="w-4 h-4 mr-2" />
                         {generatingPdf ? 'Generating...' : 'Generate PDF'}
                      </button>
                   )}
                   {selectedPO.pdfUrl && (
                      <a 
                         href={selectedPO.pdfUrl} target="_blank" rel="noopener noreferrer"
                         className="flex items-center px-4 py-2 border border-slate-300 text-slate-900 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-white dark:bg-slate-950"
                      >
                         <FileOutput className="w-4 h-4 mr-2" />
                         View PDF
                      </a>
                   )}
                   {selectedPO.status === 'APPROVED' && (
                      <button 
                         onClick={() => handleDispatch(selectedPO.id)}
                         className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                      >
                         <Truck className="w-4 h-4 mr-2" />
                         Dispatch to Vendor
                      </button>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approval Drawer */}
        {showApprovalDrawer && selectedPO && (
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 border-l border-slate-200 flex flex-col transform transition-transform">
             <div className="flex items-center justify-between p-6 border-b border-slate-200">
               <div>
                 <h2 className="text-lg font-bold text-black dark:text-white">Approve PO</h2>
                 <p className="text-sm text-slate-500 dark:text-slate-400">{selectedPO.poNumber}</p>
               </div>
               <button onClick={() => {setShowApprovalDrawer(false); setSelectedPO(null);}} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                 <X className="w-5 h-5" />
               </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                   <h3 className="text-sm font-semibold text-amber-800">Approval Required</h3>
                   <p className="text-xs text-amber-700 mt-1">
                      This PO is in tier <strong>{selectedPO.approvalWorkflow?.currentApprovalTier}</strong>. 
                      Grand Total: <strong>₹{selectedPO.grandTotal.toLocaleString()}</strong>.
                   </p>
                </div>

                <div>
                   <h3 className="text-sm font-semibold text-black dark:text-white mb-3">Vendor Details</h3>
                   <div className="text-sm text-slate-600 dark:text-slate-400">
                      <p><strong>Name:</strong> {selectedPO.vendorName}</p>
                      <p><strong>GST:</strong> {selectedPO.vendorGst}</p>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-semibold text-black dark:text-white mb-2">Comments (Optional)</label>
                   <textarea
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      rows={4}
                      placeholder="Add any remarks for the approval trail..."
                      className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                   />
                </div>
             </div>

             <div className="p-6 border-t border-slate-200 flex gap-3 bg-white dark:bg-slate-950">
                <button 
                  onClick={() => handleApprovePO(selectedPO, 'REJECTED')}
                  className="flex-1 px-4 py-2 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium"
                >
                   Reject
                </button>
                <button 
                  onClick={() => handleApprovePO(selectedPO, 'APPROVED')}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                   Approve PO
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

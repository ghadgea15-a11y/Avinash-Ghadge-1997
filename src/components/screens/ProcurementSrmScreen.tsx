import React, { useState, useEffect } from 'react';
import { 
  UserSession, 
  CompanyTenant, 
  ProcurementRequisitionRecord, 
  PurchaseOrderRecord, 
  GoodsReceiptNoteRecord, 
  ThreeWayMatchRecord,
  SiteRecord,
  VendorRecord,
  PhaseAScreen
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';
import { 
  ShoppingCart, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Search, 
  Building2, 
  MapPin, 
  Truck, 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  ChevronRight, 
  X, 
  RefreshCw, 
  Layers, 
  ClipboardList
} from 'lucide-react';

interface ProcurementSrmScreenProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
  onNavigate?: (screen: PhaseAScreen) => void;
}

export const ProcurementSrmScreen: React.FC<ProcurementSrmScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'REQUISITIONS' | 'ORDERS' | 'GRN' | 'THREE_WAY_MATCH'>('REQUISITIONS');
  
  const [requisitions, setRequisitions] = useState<ProcurementRequisitionRecord[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([]);
  const [grns, setGrns] = useState<GoodsReceiptNoteRecord[]>([]);
  const [threeWayMatches, setThreeWayMatches] = useState<ThreeWayMatchRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isPrModalOpen, setIsPrModalOpen] = useState<boolean>(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState<boolean>(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState<boolean>(false);
  const [selectedPR, setSelectedPR] = useState<ProcurementRequisitionRecord | null>(null);

  // PR Form
  const [prFormData, setPrFormData] = useState({
    siteId: '',
    departmentName: 'Facility Security Operations',
    urgency: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY',
    justification: 'Site Uniforms & Safety Equipment Refurbishment',
    requiredByDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    itemName: 'Security Uniform Set (Shirt + Pant + Cap + Lanyard)',
    unit: 'SETS',
    quantity: 20,
    estimatedUnitCost: 850
  });

  // PO Form
  const [poFormData, setPoFormData] = useState({
    prId: '',
    vendorId: '',
    deliverySiteId: '',
    paymentTerms: 'NET_30' as 'ADVANCE' | 'NET_15' | 'NET_30' | 'NET_45' | 'ON_DELIVERY',
    expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // GRN Form
  const [grnFormData, setGrnFormData] = useState({
    poId: '',
    vendorInvoiceNumber: 'INV-2026-991',
    challanNumber: 'DC-8871',
    receivedQty: 20,
    acceptedQty: 20,
    rejectedQty: 0,
    rejectionReason: '',
    siteId: ''
  });

  useEffect(() => {
    if (!activeCompany) return;

    setLoading(true);
    const unsubPr = FirestoreService.subscribeToProcurementRequisitions(activeCompany.companyId, (list) => {
      setRequisitions(list);
    });

    const unsubPo = FirestoreService.subscribeToPurchaseOrders(activeCompany.companyId, (list) => {
      setPurchaseOrders(list);
    });

    const unsubGrn = FirestoreService.subscribeToGoodsReceiptNotes(activeCompany.companyId, (list) => {
      setGrns(list);
    });

    const unsubMatch = FirestoreService.subscribeToThreeWayMatches(activeCompany.companyId, (list) => {
      setThreeWayMatches(list);
      setLoading(false);
    });

    const unsubSites = FirestoreService.subscribeToSites(activeCompany.companyId, (siteList) => {
      setSites(siteList);
      if (siteList.length > 0 && !prFormData.siteId) {
        setPrFormData(prev => ({ ...prev, siteId: siteList[0].id }));
      }
    });

    let unsubVendors = () => {};
    if (userSession) {
      unsubVendors = FirestoreService.subscribeToVendors(userSession, activeCompany.companyId, (vList: VendorRecord[]) => {
        setVendors(vList);
        if (vList.length > 0 && !poFormData.vendorId) {
          setPoFormData(prev => ({ ...prev, vendorId: vList[0].id }));
        }
      });
    }

    return () => {
      unsubPr();
      unsubPo();
      unsubGrn();
      unsubMatch();
      unsubSites();
      unsubVendors();
    };
  }, [activeCompany?.companyId, userSession?.userId]);

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !userSession) return;

    try {
      const prId = `PR-${Date.now().toString().slice(-6)}`;
      const selectedSite = sites.find(s => s.id === prFormData.siteId);
      const totalAmount = prFormData.quantity * prFormData.estimatedUnitCost;

      const newPR: ProcurementRequisitionRecord = {
        id: prId,
        prNumber: `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        companyId: activeCompany.companyId,
        departmentId: 'DEPT-OPS',
        departmentName: prFormData.departmentName,
        siteId: prFormData.siteId || selectedSite?.id || 'SITE-001',
        siteName: selectedSite?.name || selectedSite?.siteName || 'Headquarters Site',
        requestedByUserId: userSession.userId,
        requestedByName: userSession.fullName || 'Site Incharge',
        urgency: prFormData.urgency,
        justification: prFormData.justification,
        status: 'SUBMITTED',
        items: [
          {
            itemName: prFormData.itemName,
            quantityRequested: Number(prFormData.quantity),
            unit: prFormData.unit,
            estimatedUnitPrice: Number(prFormData.estimatedUnitCost),
            totalEstimatedAmount: totalAmount
          }
        ],
        totalEstimatedValue: totalAmount,
        requiredByDate: prFormData.requiredByDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await FirestoreService.saveProcurementRequisition(activeCompany.companyId, newPR);
      setIsPrModalOpen(false);
    } catch (err) {
      console.error('Error creating PR:', err);
    }
  };

  const handleApprovePR = async (pr: ProcurementRequisitionRecord) => {
    if (!activeCompany || !userSession) return;

    try {
      const updated: ProcurementRequisitionRecord = {
        ...pr,
        status: 'APPROVED',
        approvedByUserId: userSession.userId,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await FirestoreService.saveProcurementRequisition(activeCompany.companyId, updated);
      setSelectedPR(updated);
    } catch (err) {
      console.error('Error approving PR:', err);
    }
  };

  const handleGeneratePOFromPR = async (pr: ProcurementRequisitionRecord) => {
    if (!activeCompany || !userSession) return;

    try {
      const poId = `PO-${Date.now().toString().slice(-6)}`;
      const defaultVendor = vendors[0] || { id: 'VEND-001', vendorName: 'Apex Safety & Uniform Solutions Pvt Ltd' };
      const subtotal = pr.totalEstimatedValue;
      const taxAmount = Math.round(subtotal * 0.18); // 18% GST
      const grandTotal = subtotal + taxAmount;

      const newPO: PurchaseOrderRecord = {
        id: poId,
        poNumber: `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        companyId: activeCompany.companyId,
        prId: pr.id,
        vendorId: defaultVendor.id,
        vendorName: defaultVendor.vendorName,
        shippingSiteId: pr.siteId,
        shippingSiteName: pr.siteName,
        deliveryAddress: pr.siteName + ' Facility Gate No 1',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentTerms: 'NET_30',
        items: pr.items.map((it: any) => ({
          itemName: it.itemName,
          quantityOrdered: it.quantityRequested,
          quantityReceived: 0,
          unit: it.unit,
          unitPrice: it.estimatedUnitPrice,
          taxPercent: 18,
          totalAmount: Math.round(it.totalEstimatedAmount * 1.18)
        })),
        subtotal: subtotal,
        taxAmount: taxAmount,
        grandTotal: grandTotal,
        status: 'ISSUED',
        authorizedByUserId: userSession.userId,
        authorizedByName: userSession.fullName || 'Procurement Lead',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await FirestoreService.savePurchaseOrder(activeCompany.companyId, newPO);

      // Mark PR as PO_ISSUED
      const updatedPR: ProcurementRequisitionRecord = {
        ...pr,
        status: 'PO_ISSUED',
        poId: newPO.id,
        updatedAt: new Date().toISOString()
      };
      await FirestoreService.saveProcurementRequisition(activeCompany.companyId, updatedPR);

      setActiveTab('ORDERS');
    } catch (err) {
      console.error('Error generating PO:', err);
    }
  };

  const handleCreateGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !userSession) return;

    try {
      const selectedPO = purchaseOrders.find(p => p.id === grnFormData.poId) || purchaseOrders[0];
      if (!selectedPO) return;

      const grnId = `GRN-${Date.now().toString().slice(-6)}`;
      const hasVariance = Number(grnFormData.rejectedQty) > 0 || Number(grnFormData.receivedQty) !== (selectedPO.items[0]?.quantityOrdered || 20);

      const newGRN: GoodsReceiptNoteRecord = {
        id: grnId,
        grnNumber: `GRN-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
        companyId: activeCompany.companyId,
        poId: selectedPO.id,
        poNumber: selectedPO.poNumber,
        vendorId: selectedPO.vendorId,
        vendorName: selectedPO.vendorName,
        siteId: selectedPO.shippingSiteId,
        siteName: selectedPO.shippingSiteName,
        deliveryChallanNumber: grnFormData.challanNumber,
        receivedDate: new Date().toISOString().split('T')[0],
        receivedByUserId: userSession.userId,
        receivedByName: userSession.fullName || 'Store Officer',
        vendorInvoiceNumber: grnFormData.vendorInvoiceNumber,
        vendorInvoiceAmount: selectedPO.grandTotal,
        itemsReceived: [
          {
            itemName: selectedPO.items[0]?.itemName || 'Uniform Sets',
            unit: selectedPO.items[0]?.unit || 'SETS',
            quantityOrdered: selectedPO.items[0]?.quantityOrdered || 20,
            quantityReceived: Number(grnFormData.receivedQty),
            quantityAccepted: Number(grnFormData.acceptedQty),
            quantityRejected: Number(grnFormData.rejectedQty),
            rejectionReason: grnFormData.rejectionReason || undefined
          }
        ],
        hasVariance,
        createdAt: new Date().toISOString()
      };

      await FirestoreService.saveGoodsReceiptNote(activeCompany.companyId, newGRN);

      // Automated 3-Way Match Creation
      const matchId = `MATCH-${Date.now().toString().slice(-6)}`;
      const isQtyMatched = Number(grnFormData.acceptedQty) === (selectedPO.items[0]?.quantityOrdered || 20);
      const invoiceAmount = selectedPO.grandTotal;
      const varianceAmount = isQtyMatched ? 0 : Math.round(selectedPO.grandTotal * 0.1);

      const newMatch: ThreeWayMatchRecord = {
        id: matchId,
        companyId: activeCompany.companyId,
        poId: selectedPO.id,
        poNumber: selectedPO.poNumber,
        grnId: newGRN.id,
        grnNumber: newGRN.grnNumber,
        vendorInvoiceNumber: grnFormData.vendorInvoiceNumber,
        vendorInvoiceDate: new Date().toISOString().split('T')[0],
        poTotalAmount: selectedPO.grandTotal,
        grnAcceptedValue: isQtyMatched ? selectedPO.grandTotal : selectedPO.grandTotal - varianceAmount,
        invoiceTotalAmount: invoiceAmount,
        varianceAmount: varianceAmount,
        isMatched: isQtyMatched,
        matchStatus: isQtyMatched ? 'EXACT_MATCH' : 'DISCREPANCY_FLAGGED',
        flaggedReason: isQtyMatched ? undefined : 'Discrepancy in received vs ordered item count',
        approvedForPayment: isQtyMatched,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await FirestoreService.saveThreeWayMatch(activeCompany.companyId, newMatch);

      // Update PO status to COMPLETED
      await FirestoreService.savePurchaseOrder(activeCompany.companyId, {
        ...selectedPO,
        status: 'COMPLETED',
        updatedAt: new Date().toISOString()
      });

      setIsGrnModalOpen(false);
      setActiveTab('THREE_WAY_MATCH');
    } catch (err) {
      console.error('Error creating GRN & 3-Way Match:', err);
    }
  };

  return (
    <div className={`p-4 md:p-6 space-y-6 min-h-screen ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-black'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Procurement & Sourcing (SRM)</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Module 14: Requisitions, PO Issuance, Goods Receipt (GRN) & Automated 3-Way Match Verification
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'REQUISITIONS' && (
            <button
              onClick={() => setIsPrModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Requisition (PR)</span>
            </button>
          )}

          {activeTab === 'ORDERS' && (
            <button
              onClick={() => setIsPrModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Raise Requisition First</span>
            </button>
          )}

          {activeTab === 'GRN' && (
            <button
              onClick={() => setIsGrnModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Receive Goods (GRN)</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Purchase Requisitions</span>
          <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{requisitions.length}</p>
          <span className="text-xs text-slate-500 dark:text-slate-400">Site material requests</span>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Active Purchase Orders</span>
          <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{purchaseOrders.length}</p>
          <span className="text-xs text-slate-500 dark:text-slate-400">Issued & in fulfillment</span>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Goods Receipts (GRN)</span>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{grns.length}</p>
          <span className="text-xs text-slate-500 dark:text-slate-400">Inspected at site gate</span>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">3-Way Match Clearance</span>
          <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
            {threeWayMatches.filter(m => m.matchStatus === 'EXACT_MATCH' || m.matchStatus === 'RESOLVED').length} / {threeWayMatches.length || 0}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400">Audit-ready for payout</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('REQUISITIONS')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'REQUISITIONS'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Purchase Requisitions (PR) ({requisitions.length})
        </button>
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'ORDERS'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Purchase Orders (PO) ({purchaseOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('GRN')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'GRN'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Goods Receipt Notes (GRN) ({grns.length})
        </button>
        <button
          onClick={() => setActiveTab('THREE_WAY_MATCH')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'THREE_WAY_MATCH'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          3-Way Match Audit ({threeWayMatches.length})
        </button>
      </div>

      {/* Tab 1: Requisitions */}
      {activeTab === 'REQUISITIONS' && (
        <div className="space-y-4">
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
            {loading ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-600" />
                <p>Loading requisitions...</p>
              </div>
            ) : requisitions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-300">No Requisitions Found</h3>
                <p className="text-sm mt-1">Create a purchase requisition for site uniforms, safety gear, or supplies.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`border-b text-xs uppercase font-semibold ${
                    isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
                  }`}>
                    <tr>
                      <th className="p-3.5">PR Number & Site</th>
                      <th className="p-3.5">Requested Items</th>
                      <th className="p-3.5">Estimated Value</th>
                      <th className="p-3.5">Urgency & Date</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {requisitions.map((pr) => (
                      <tr
                        key={pr.id}
                        className={`transition ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-white'}`}
                      >
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-amber-600 dark:text-amber-400">{pr.prNumber}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {pr.siteName}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-black dark:text-slate-200">{pr.items[0]?.itemName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Qty: {pr.items[0]?.quantityRequested} {pr.items[0]?.unit} • {pr.justification}</div>
                        </td>
                        <td className="p-3.5 font-bold text-black dark:text-white dark:text-slate-100">
                          ₹{pr.totalEstimatedValue.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-xs text-slate-500 dark:text-slate-400">
                          <div className="font-semibold text-slate-900 dark:text-slate-300">Urgency: {pr.urgency}</div>
                          <div>Needed: {new Date(pr.requiredByDate).toLocaleDateString()}</div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            pr.status === 'APPROVED' || pr.status === 'PO_ISSUED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {pr.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            {pr.status === 'SUBMITTED' && (
                              <button
                                onClick={() => handleApprovePR(pr)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                              >
                                Approve PR
                              </button>
                            )}
                            {pr.status === 'APPROVED' && (
                              <button
                                onClick={() => handleGeneratePOFromPR(pr)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                              >
                                Generate PO
                              </button>
                            )}
                            {pr.status === 'PO_ISSUED' && (
                              <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> PO Issued
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Purchase Orders */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
            {purchaseOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-300">No Purchase Orders Issued</h3>
                <p className="text-sm mt-1">Approve a purchase requisition to issue a formal Purchase Order to vendors.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`border-b text-xs uppercase font-semibold ${
                    isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
                  }`}>
                    <tr>
                      <th className="p-3.5">PO Number</th>
                      <th className="p-3.5">Vendor</th>
                      <th className="p-3.5">Delivery Site</th>
                      <th className="p-3.5">Total Amount</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {purchaseOrders.map((po) => (
                      <tr
                        key={po.id}
                        className={`transition ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-white'}`}
                      >
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-blue-600 dark:text-blue-400">{po.poNumber}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Issued: {po.orderDate}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-black dark:text-slate-200">{po.vendorName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Terms: {po.paymentTerms}</div>
                        </td>
                        <td className="p-3.5 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-300">
                          <div>{po.shippingSiteName}</div>
                          <div className="text-slate-400">{po.deliveryAddress}</div>
                        </td>
                        <td className="p-3.5 font-bold text-black dark:text-white dark:text-slate-100">
                          ₹{po.grandTotal.toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            po.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {po.status !== 'COMPLETED' && (
                            <button
                              onClick={() => {
                                setGrnFormData(prev => ({ ...prev, poId: po.id }));
                                setIsGrnModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                            >
                              Receive (GRN)
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Goods Receipt Notes (GRN) */}
      {activeTab === 'GRN' && (
        <div className="space-y-4">
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
            {grns.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-300">No Goods Receipt Notes</h3>
                <p className="text-sm mt-1">Receive material shipments at facility sites against approved Purchase Orders.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`border-b text-xs uppercase font-semibold ${
                    isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
                  }`}>
                    <tr>
                      <th className="p-3.5">GRN # & PO</th>
                      <th className="p-3.5">Vendor & Challan</th>
                      <th className="p-3.5">Received Items</th>
                      <th className="p-3.5">Received By</th>
                      <th className="p-3.5">Inspection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {grns.map((grn) => (
                      <tr
                        key={grn.id}
                        className={`transition ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-white'}`}
                      >
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{grn.grnNumber}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">PO: {grn.poNumber}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-black dark:text-slate-200">{grn.vendorName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">DC: {grn.deliveryChallanNumber}</div>
                        </td>
                        <td className="p-3.5 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-300">
                          <div>Accepted: <span className="font-bold text-emerald-600">{grn.itemsReceived[0]?.quantityAccepted}</span> / {grn.itemsReceived[0]?.quantityOrdered} {grn.itemsReceived[0]?.unit}</div>
                          {grn.itemsReceived[0]?.quantityRejected ? (
                            <div className="text-rose-500 font-semibold">Rejected: {grn.itemsReceived[0]?.quantityRejected}</div>
                          ) : null}
                        </td>
                        <td className="p-3.5 text-xs text-slate-500 dark:text-slate-400">
                          <div>{grn.receivedByName}</div>
                          <div>{grn.receivedDate}</div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            !grn.hasVariance
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {!grn.hasVariance ? 'PASSED 100%' : 'VARIANCE DETECTED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: 3-Way Match Verification */}
      {activeTab === 'THREE_WAY_MATCH' && (
        <div className="space-y-4">
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
            {threeWayMatches.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-300">No 3-Way Matches Conducted</h3>
                <p className="text-sm mt-1">Automatic verification will trigger when GRNs are recorded against active Purchase Orders.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`border-b text-xs uppercase font-semibold ${
                    isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
                  }`}>
                    <tr>
                      <th className="p-3.5">Match Ref & PO</th>
                      <th className="p-3.5">PO Value</th>
                      <th className="p-3.5">GRN Gate Value</th>
                      <th className="p-3.5">Vendor Invoice</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Payment Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {threeWayMatches.map((m) => (
                      <tr
                        key={m.id}
                        className={`transition ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-white'}`}
                      >
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{m.id}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">PO: {m.poNumber} • GRN: {m.grnNumber}</div>
                        </td>
                        <td className="p-3.5 font-bold text-black dark:text-slate-200">
                          ₹{(m.poTotalAmount ?? 0).toLocaleString()}
                        </td>
                        <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{(m.grnAcceptedValue ?? 0).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-black dark:text-slate-200">₹{(m.invoiceTotalAmount ?? 0).toLocaleString()}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Inv: {m.vendorInvoiceNumber}</div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            m.matchStatus === 'EXACT_MATCH'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {m.matchStatus}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {m.approvedForPayment ? (
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                              <CheckCircle className="w-4 h-4" /> Ready For Payout
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600 flex items-center gap-1 justify-end">
                              <AlertCircle className="w-4 h-4" /> Discrepancy Held
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PR Create Modal */}
      {isPrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-black'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-white'}`}>
              <h3 className="font-bold text-lg">Create Purchase Requisition</h3>
              <button onClick={() => setIsPrModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePR} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Target Site *</label>
                <select
                  value={prFormData.siteId}
                  onChange={(e) => setPrFormData(prev => ({ ...prev, siteId: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                  }`}
                >
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.siteName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Item Name *</label>
                <input
                  type="text"
                  required
                  value={prFormData.itemName}
                  onChange={(e) => setPrFormData(prev => ({ ...prev, itemName: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Quantity</label>
                  <input
                    type="number"
                    value={prFormData.quantity}
                    onChange={(e) => setPrFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Unit Cost (₹)</label>
                  <input
                    type="number"
                    value={prFormData.estimatedUnitCost}
                    onChange={(e) => setPrFormData(prev => ({ ...prev, estimatedUnitCost: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Justification / Purpose</label>
                <textarea
                  rows={2}
                  value={prFormData.justification}
                  onChange={(e) => setPrFormData(prev => ({ ...prev, justification: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPrModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRN Create Modal */}
      {isGrnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-black'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-white'}`}>
              <h3 className="font-bold text-lg">Receive Goods & Create GRN</h3>
              <button onClick={() => setIsGrnModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGRN} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Select Purchase Order *</label>
                <select
                  value={grnFormData.poId}
                  onChange={(e) => setGrnFormData(prev => ({ ...prev, poId: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                  }`}
                >
                  {purchaseOrders.map(p => (
                    <option key={p.id} value={p.id}>{p.poNumber} - {p.vendorName} (₹{p.grandTotal.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Delivery Challan #</label>
                  <input
                    type="text"
                    required
                    value={grnFormData.challanNumber}
                    onChange={(e) => setGrnFormData(prev => ({ ...prev, challanNumber: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Vendor Invoice #</label>
                  <input
                    type="text"
                    required
                    value={grnFormData.vendorInvoiceNumber}
                    onChange={(e) => setGrnFormData(prev => ({ ...prev, vendorInvoiceNumber: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Received Qty</label>
                  <input
                    type="number"
                    value={grnFormData.receivedQty}
                    onChange={(e) => setGrnFormData(prev => ({ ...prev, receivedQty: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Accepted Qty</label>
                  <input
                    type="number"
                    value={grnFormData.acceptedQty}
                    onChange={(e) => setGrnFormData(prev => ({ ...prev, acceptedQty: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Rejected Qty</label>
                  <input
                    type="number"
                    value={grnFormData.rejectedQty}
                    onChange={(e) => setGrnFormData(prev => ({ ...prev, rejectedQty: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGrnModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  Create GRN & 3-Way Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

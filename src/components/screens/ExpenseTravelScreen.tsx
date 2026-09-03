import React, { useState, useEffect, useRef } from 'react';
import { 
  Receipt, 
  Plane, 
  Plus, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Sparkles, 
  Upload, 
  Eye, 
  DollarSign, 
  MapPin, 
  Calendar,
  Filter,
  RefreshCw,
  Camera,
  ShieldAlert,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { CompanyTenant, UserSession } from '../../types';
import { 
  ExpenseClaimRecord, 
  TravelRequestRecord, 
  ExpenseReceiptItem, 
  ExpenseCategory,
  ExpensePolicyRecord 
} from '../../types/expense';
import { ExpenseService } from '../../services/expenseService';
import { FirestoreService } from '../../services/firestoreService';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface ExpenseTravelScreenProps {
  currentCompany: CompanyTenant;
  userSession: UserSession;
  onNavigate?: (screenKey: string) => void;
}

export const ExpenseTravelScreen: React.FC<ExpenseTravelScreenProps> = ({
  currentCompany,
  userSession
}) => {
  const { showSuccess, showError } = useFeedback();
  const [activeTab, setActiveTab] = useState<'claims' | 'travel' | 'policies'>('claims');
  const [loading, setLoading] = useState<boolean>(true);

  // Data States
  const [claims, setClaims] = useState<ExpenseClaimRecord[]>([]);
  const [travelRequests, setTravelRequests] = useState<TravelRequestRecord[]>([]);
  const [costCentres, setCostCentres] = useState<any[]>([]);
  const [travelCostCenterId, setTravelCostCenterId] = useState('');
  const [policy, setPolicy] = useState<ExpensePolicyRecord | null>(null);

  // New Claim Modal
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimTitle, setClaimTitle] = useState('');
  const [items, setItems] = useState<ExpenseReceiptItem[]>([]);
  
  // Single Item Form inside Claim Modal
  const [itemCategory, setItemCategory] = useState<ExpenseCategory>('MEALS_FOOD');
  const [itemAmount, setItemAmount] = useState('');
  const [itemMerchant, setItemMerchant] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatusMessage, setOcrStatusMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
    confidence?: number;
    reason?: string;
  } | null>(null);
  const [currentItemOcrExtracted, setCurrentItemOcrExtracted] = useState(false);
  const [currentItemOcrConfidence, setCurrentItemOcrConfidence] = useState<number | undefined>(undefined);
  const [currentItemRequiresManualReview, setCurrentItemRequiresManualReview] = useState(false);
  const [currentItemManualReviewReason, setCurrentItemManualReviewReason] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Travel Modal
  const [isTravelModalOpen, setIsTravelModalOpen] = useState(false);
  const [travelPurpose, setTravelPurpose] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [destCity, setDestCity] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [estBudget, setEstBudget] = useState('');
  const [advRequested, setAdvRequested] = useState('');

  const isFinanceOrExecutive = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'FINANCE_ADMIN', 'ACCOUNTS'].includes(userSession.role);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cList, tList, pol, ccList] = await Promise.all([
        ExpenseService.getExpenseClaims(currentCompany.companyId, isFinanceOrExecutive ? undefined : userSession.uid),
        ExpenseService.getTravelRequests(currentCompany.companyId, isFinanceOrExecutive ? undefined : userSession.uid),
        ExpenseService.getExpensePolicy(currentCompany.companyId),
        FirestoreService.getCostCentres(currentCompany.companyId)
      ]);
      setClaims(cList);
      setTravelRequests(tList);
      setPolicy(pol);
      setCostCentres(ccList || []);
    } catch (err) {
      showError('Failed to load expense records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentCompany.companyId]);

  const handleReceiptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const ocrResult = await ExpenseService.processReceiptOcr(base64Data, file.type);

        if (ocrResult.success && ocrResult.data) {
          if (ocrResult.data.category) setItemCategory(ocrResult.data.category as ExpenseCategory);
          if (ocrResult.data.amount) setItemAmount(String(ocrResult.data.amount));
          if (ocrResult.data.merchantName) setItemMerchant(ocrResult.data.merchantName);
          if (ocrResult.data.description) setItemDescription(ocrResult.data.description);

          setCurrentItemOcrExtracted(true);
          setCurrentItemOcrConfidence(ocrResult.confidenceScore);
          setCurrentItemRequiresManualReview(ocrResult.requiresManualReview);
          setCurrentItemManualReviewReason(ocrResult.manualReviewReason);

          if (ocrResult.requiresManualReview) {
            setOcrStatusMessage({
              type: 'warning',
              text: ocrResult.manualReviewReason || `Low OCR Confidence (${Math.round(ocrResult.confidenceScore * 100)}% < 80%). Extracted for convenience, but flagged for Approver Review.`,
              confidence: ocrResult.confidenceScore,
              reason: ocrResult.manualReviewReason
            });
            showError('Low confidence OCR: Claim will require manual approver review.');
          } else {
            setOcrStatusMessage({
              type: 'success',
              text: `AI OCR parsed invoice with ${Math.round(ocrResult.confidenceScore * 100)}% confidence score.`,
              confidence: ocrResult.confidenceScore
            });
            showSuccess(`AI OCR verified invoice (${Math.round(ocrResult.confidenceScore * 100)}% confidence)`);
          }
        } else {
          // FAIL-CLOSED: Never create fake data!
          setCurrentItemOcrExtracted(false);
          setCurrentItemOcrConfidence(0);
          setCurrentItemRequiresManualReview(true);
          setCurrentItemManualReviewReason(ocrResult.manualReviewReason || 'AI OCR unavailable or execution error. Manual entry required.');
          setOcrStatusMessage({
            type: 'error',
            text: ocrResult.manualReviewReason || 'AI OCR service unavailable. Please enter receipt details manually; claim will be flagged for Mandatory Approver Review.',
            reason: ocrResult.manualReviewReason
          });
          showError('AI OCR unavailable. Manual line item entry required.');
        }
      } catch (err: any) {
        setCurrentItemOcrExtracted(false);
        setCurrentItemRequiresManualReview(true);
        setCurrentItemManualReviewReason('Receipt processing error: ' + (err?.message || 'Unknown'));
        setOcrStatusMessage({
          type: 'error',
          text: 'Error processing receipt file. Please enter details manually for approver review.'
        });
        showError('Receipt parsing failed');
      } finally {
        setOcrLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddItemToClaim = () => {
    if (!itemAmount || Number(itemAmount) <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    const confidence = currentItemOcrConfidence ?? (currentItemOcrExtracted ? 0.9 : undefined);
    const isBelowThreshold = confidence !== undefined && confidence < 0.80;
    const requiresReview = currentItemRequiresManualReview || isBelowThreshold || !currentItemOcrExtracted;

    const newItem: ExpenseReceiptItem = {
      id: Math.random().toString(36).substring(2, 9),
      category: itemCategory,
      amount: Number(itemAmount),
      currency: 'INR',
      expenseDate: new Date().toISOString().split('T')[0],
      merchantName: itemMerchant || 'Merchant',
      description: itemDescription || '',
      ocrExtracted: currentItemOcrExtracted,
      ocrConfidenceScore: confidence,
      ocrExtractionStatus: currentItemOcrExtracted 
        ? (isBelowThreshold ? 'LOW_CONFIDENCE' : 'SUCCESS')
        : (currentItemRequiresManualReview ? 'FAILED_MANUAL_REVIEW_REQUIRED' : 'MANUAL_ENTRY'),
      requiresManualReview: requiresReview,
      manualReviewReason: currentItemManualReviewReason || (requiresReview ? (!currentItemOcrExtracted ? 'Manual entry without verified AI OCR' : 'Low OCR confidence score') : undefined),
      isPolicyViolated: false
    };

    setItems([...items, newItem]);
    setItemAmount('');
    setItemMerchant('');
    setItemDescription('');
    setCurrentItemOcrExtracted(false);
    setCurrentItemOcrConfidence(undefined);
    setCurrentItemRequiresManualReview(false);
    setCurrentItemManualReviewReason(undefined);
    setOcrStatusMessage(null);
  };

  const handleSaveClaim = async () => {
    if (!claimTitle.trim()) {
      showError('Please provide a claim title');
      return;
    }
    if (items.length === 0) {
      showError('Please add at least one expense receipt item');
      return;
    }
    try {
      await ExpenseService.saveExpenseClaim(
        currentCompany.companyId,
        {
          title: claimTitle,
          items,
          employeeId: userSession.uid,
          employeeName: ((userSession.fullName || userSession.email) || 'Unknown') || 'User'
        },
        { uid: userSession.uid || 'system', name: ((userSession.fullName || userSession.email) || 'Unknown') || 'User', role: userSession.role }
      );
      setIsClaimModalOpen(false);
      setClaimTitle('');
      setItems([]);
      setOcrStatusMessage(null);
      loadData();
      showSuccess('Expense claim submitted for approval');
    } catch (err: any) {
      showError('Failed to submit expense claim');
    }
  };

  const handleApproveTravel = async (tr: TravelRequestRecord) => {
    if (!['Platform Admin', 'Super Admin', 'Company Admin', 'Manager'].includes(userSession.role)) {
      showError('Unauthorized to approve travel');
      return;
    }
    try {
      setLoading(true);
      await ExpenseService.approveTravelRequest(currentCompany.companyId, tr, { uid: userSession.uid!, name: userSession.fullName || 'User', role: userSession.role });
      showSuccess('Travel request approved and budget reserved');
      const updatedTr = await ExpenseService.getTravelRequests(currentCompany.companyId);
      setTravelRequests(updatedTr);
    } catch (err: any) {
      showError(err.message || 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTravel = async (tr: TravelRequestRecord) => {
    try {
      setLoading(true);
      await ExpenseService.cancelTravelRequest(currentCompany.companyId, tr, { uid: userSession.uid!, name: userSession.fullName || 'User', role: userSession.role });
      showSuccess('Travel request cancelled');
      const updatedTr = await ExpenseService.getTravelRequests(currentCompany.companyId);
      setTravelRequests(updatedTr);
    } catch (err: any) {
      showError(err.message || 'Failed to cancel');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTravel = async (tr: TravelRequestRecord) => {
    if (!['Platform Admin', 'Super Admin', 'Company Admin', 'Manager'].includes(userSession.role)) {
      showError('Unauthorized to reject travel');
      return;
    }
    try {
      setLoading(true);
      await ExpenseService.rejectTravelRequest(currentCompany.companyId, tr, { uid: userSession.uid!, name: userSession.fullName || 'User', role: userSession.role });
      showSuccess('Travel request rejected');
      const updatedTr = await ExpenseService.getTravelRequests(currentCompany.companyId);
      setTravelRequests(updatedTr);
    } catch (err: any) {
      showError(err.message || 'Failed to reject');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTravel = async () => {
    if (!destCity || !travelPurpose) {
      showError('Please fill in destination and purpose');
      return;
    }
    try {
      await ExpenseService.saveTravelRequest(
        currentCompany.companyId,
        {
          purpose: travelPurpose,
          costCenterId: travelCostCenterId || undefined,
          originCity: originCity || 'Headquarters',
          destinationCity: destCity,
          departureDate: departureDate || new Date().toISOString().split('T')[0],
          returnDate: returnDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
          estimatedBudget: Number(estBudget) || 5000,
          advanceRequestedAmount: Number(advRequested) || 0,
          employeeId: userSession.uid,
          employeeName: ((userSession.fullName || userSession.email) || 'Unknown') || 'User'
        },
        { uid: userSession.uid || 'system', name: ((userSession.fullName || userSession.email) || 'Unknown') || 'User', role: userSession.role }
      );
      setIsTravelModalOpen(false);
      setTravelPurpose('');
      setTravelCostCenterId('');
      setDestCity('');
      loadData();
      showSuccess('Travel pre-authorization request filed');
    } catch (err: any) {
      showError('Failed to submit travel request');
    }
  };

  const handleApproveClaim = async (claimId: string) => {
    try {
      await ExpenseService.updateClaimStatus(
        currentCompany.companyId,
        claimId,
        'APPROVED',
        { uid: userSession.uid || 'system', name: ((userSession.fullName || userSession.email) || 'Unknown') || 'Finance Admin', role: userSession.role }
      );
      showSuccess('Expense claim approved for reimbursement');
      loadData();
    } catch (err) {
      showError('Failed to approve expense');
    }
  };

  const totalPendingExpense = claims
    .filter(c => c.status === 'SUBMITTED' || c.status === 'UNDER_MANAGER_REVIEW')
    .reduce((acc, c) => acc + c.totalAmount, 0);

  const totalApprovedReimbursements = claims
    .filter(c => c.status === 'APPROVED' || c.status === 'PAID')
    .reduce((acc, c) => acc + c.totalAmount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-emerald-600" />
            Expense & Travel Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit expense claims with AI OCR receipt scanning, travel requests, and automated policy validation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTravelModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50"
          >
            <Plane className="w-4 h-4 text-sky-600" /> Pre-Trip Request
          </button>
          <button
            onClick={() => setIsClaimModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Expense Claim
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>PENDING CLAIMS</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{totalPendingExpense.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 mt-1">Awaiting Manager / Finance Sign-off</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>APPROVED REIMBURSEMENTS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹{totalApprovedReimbursements.toLocaleString('en-IN')}</p>
          <p className="text-xs text-emerald-600 mt-1">Queued for Next Payroll Payout</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ACTIVE TRAVEL TRIPS</span>
            <Plane className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {travelRequests.filter(t => t.status === 'APPROVED').length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Authorized Site Inspection Trips</p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('claims')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'claims' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Expense Claims ({claims.length})
        </button>
        <button
          onClick={() => setActiveTab('travel')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'travel' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Plane className="w-4 h-4" />
          Travel Requests ({travelRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'policies' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Expense Policies & Limits
        </button>
      </div>

      {/* TAB 1: EXPENSE CLAIMS */}
      {activeTab === 'claims' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Title & Employee</th>
                <th className="py-3 px-4">Items & OCR Status</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status & Review Flag</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No expense claims submitted. File an expense claim with receipt items.
                  </td>
                </tr>
              ) : (
                claims.map(claim => {
                  const hasManualReviewFlag = claim.requiresManualReview || claim.items.some(it => it.requiresManualReview || (it.ocrExtracted && (it.ocrConfidenceScore ?? 1) < 0.80));
                  return (
                    <tr key={claim.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{claim.title}</div>
                        <div className="text-xs text-slate-500">{claim.employeeName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded w-fit">
                            {claim.items.length} line items
                          </span>
                          {claim.items.some(it => it.ocrExtracted && (it.ocrConfidenceScore ?? 0) >= 0.80) && (
                            <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                              <FileCheck className="w-3 h-3" /> Verified AI OCR
                            </span>
                          )}
                          {hasManualReviewFlag && (
                            <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> Review Required
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        ₹{claim.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{claim.submissionDate}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full w-fit ${
                            claim.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            claim.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-800' :
                            claim.status === 'PAID' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {claim.status}
                          </span>
                          {hasManualReviewFlag && (
                            <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium" title={claim.manualReviewReason || 'Receipt contains unverified OCR or low confidence scores'}>
                              <AlertCircle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                              Manual Audit Required
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {claim.status === 'SUBMITTED' && isFinanceOrExecutive && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveClaim(claim.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: TRAVEL REQUESTS */}
      {activeTab === 'travel' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {travelRequests.length === 0 ? (
            <div className="col-span-2 text-center py-8 bg-white border border-slate-200 rounded-xl text-slate-400">
              No travel requests filed.
            </div>
          ) : (
            travelRequests.map(tr => (
              <div key={tr.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{tr.purpose}</span>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    tr.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {tr.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>{tr.originCity} &rarr; {tr.destinationCity}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{tr.departureDate} to {tr.returnDate}</span>
                </div>
                <div className="pt-2 border-t flex items-center justify-between text-xs">
                  <span className="text-slate-500">Est. Budget: <strong className="text-slate-800">₹{tr.estimatedBudget}</strong></span>
                  <span className="text-slate-500">Employee: <strong className="text-slate-800">{tr.employeeName}</strong></span>
                </div>
                {tr.costCenterId && (
                  <div className="text-xs text-slate-500 flex items-center justify-between bg-slate-50 p-2 rounded">
                    <span>Cost Center: <strong className="text-slate-700">{costCentres.find(c => c.id === tr.costCenterId)?.name || tr.costCenterId}</strong></span>
                    {tr.status === 'APPROVED' && (
                      <span className="text-emerald-700 font-medium">Budget Hold: ₹{tr.budgetReservedAmount ?? tr.estimatedBudget}</span>
                    )}
                    {tr.status === 'COMPLETED' && (
                      <span className="text-blue-700 font-medium">Settled: ₹{tr.settledAmount ?? tr.estimatedBudget}</span>
                    )}
                    {(tr.status === 'CANCELLED' || tr.status === 'REJECTED') && (
                      <span className="text-slate-500 italic">Hold Released</span>
                    )}
                  </div>
                )}
                {(tr.status === 'SUBMITTED' || tr.status === 'APPROVED') && tr.employeeId === userSession.uid && (
                  <div className="pt-2 border-t flex justify-end gap-2">
                    <button onClick={() => handleCancelTravel(tr)} className="px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded hover:bg-slate-200">Cancel Trip</button>
                  </div>
                )}
                {tr.status === 'SUBMITTED' && ['Platform Admin', 'Super Admin', 'Company Admin', 'Manager'].includes(userSession.role) && (
                  <div className="pt-2 border-t flex justify-end gap-2">
                    <button onClick={() => handleRejectTravel(tr)} className="px-3 py-1 text-xs font-semibold bg-rose-50 text-rose-600 rounded hover:bg-rose-100">Reject</button>
                    <button onClick={() => handleApproveTravel(tr)} className="px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100">Approve</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: POLICIES */}
      {activeTab === 'policies' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 max-w-3xl">
          <h3 className="font-semibold text-slate-900">Configured Corporate Expense Caps</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <span>Meals & Food Daily Cap:</span>
              <span className="font-bold text-slate-900">₹600 / Day</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <span>Hotel & Lodging Tier 1 Cap:</span>
              <span className="font-bold text-slate-900">₹2,500 / Night</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <span>Fuel & Mileage Allowance:</span>
              <span className="font-bold text-slate-900">₹9.50 / Km (Four-Wheeler)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <span>Mandatory Receipt Threshold:</span>
              <span className="font-bold text-slate-900">All expenses above ₹200</span>
            </div>
          </div>
        </div>
      )}

      {/* NEW CLAIM MODAL WITH AI OCR */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">Submit Expense Claim</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Claim Title / Purpose</label>
              <input
                type="text"
                value={claimTitle}
                onChange={e => setClaimTitle(e.target.value)}
                placeholder="e.g. Pune Site Inspection & Safety Audit"
                className="w-full border border-slate-300 rounded-lg p-2 text-sm"
              />
            </div>

            {/* AI OCR Scanner Box */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleReceiptFileUpload}
                accept="image/*,application/pdf"
                className="hidden"
              />
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    AI Receipt Vision OCR
                  </span>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Upload physical or digital invoice. Confidence &lt;80% automatically flags for Approver Audit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ocrLoading}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {ocrLoading ? 'Scanning Invoice...' : 'Upload & Scan Invoice'}
                </button>
              </div>

              {/* OCR Feedback Banner */}
              {ocrStatusMessage && (
                <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
                  ocrStatusMessage.type === 'success' ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900' :
                  ocrStatusMessage.type === 'warning' ? 'bg-amber-100/80 border-amber-300 text-amber-900' :
                  'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {ocrStatusMessage.type === 'success' && <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />}
                  {ocrStatusMessage.type === 'warning' && <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />}
                  {ocrStatusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="font-semibold">{ocrStatusMessage.text}</p>
                    {ocrStatusMessage.reason && (
                      <p className="text-[11px] opacity-80 mt-0.5">Audit Note: {ocrStatusMessage.reason}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-800 mb-1">Category</label>
                  <select
                    value={itemCategory}
                    onChange={e => setItemCategory(e.target.value as any)}
                    className="w-full border border-emerald-300 rounded p-1.5 text-xs bg-white"
                  >
                    <option value="MEALS_FOOD">Meals & Food</option>
                    <option value="LODGING">Lodging</option>
                    <option value="TRAVEL_FARE">Travel Fare</option>
                    <option value="FUEL_MILEAGE">Fuel & Mileage</option>
                    <option value="CLIENT_ENTERTAINMENT">Client Entertainment</option>
                    <option value="OFFICE_SUPPLIES">Office Supplies</option>
                    <option value="EQUIPMENT_REPAIR">Equipment Repair</option>
                    <option value="UNIFORM_SAFETY_GEAR">Uniform / Safety Gear</option>
                    <option value="COMMUNICATION_INTERNET">Internet / Phone</option>
                    <option value="MISCELLANEOUS">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-800 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={itemAmount}
                    onChange={e => setItemAmount(e.target.value)}
                    placeholder="e.g. 1450"
                    className="w-full border border-emerald-300 rounded p-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-800 mb-1">Merchant / Establishment</label>
                  <input
                    type="text"
                    value={itemMerchant}
                    onChange={e => setItemMerchant(e.target.value)}
                    placeholder="e.g. Hotel Grand Residency"
                    className="w-full border border-emerald-300 rounded p-1.5 text-xs bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddItemToClaim}
                  className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800"
                >
                  + Add Line Item
                </button>
              </div>
            </div>

            {/* List of Added Items */}
            {items.length > 0 && (
              <div className="border rounded-lg divide-y text-xs">
                {items.map((it, idx) => {
                  const isVerified = it.ocrExtracted && (it.ocrConfidenceScore ?? 0) >= 0.80;
                  const isLowConf = it.ocrExtracted && (it.ocrConfidenceScore ?? 0) < 0.80;
                  return (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-800">{it.category}</strong> - {it.merchantName} ({it.description || 'Invoice attached'})
                          {isVerified && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded flex items-center gap-0.5">
                              <FileCheck className="w-2.5 h-2.5" /> AI OCR {Math.round((it.ocrConfidenceScore ?? 0.95) * 100)}%
                            </span>
                          )}
                          {isLowConf && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-semibold rounded flex items-center gap-0.5">
                              <ShieldAlert className="w-2.5 h-2.5" /> Low Conf: {Math.round((it.ocrConfidenceScore ?? 0) * 100)}%
                            </span>
                          )}
                          {!it.ocrExtracted && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded">
                              Manual Entry
                            </span>
                          )}
                        </div>
                        {it.requiresManualReview && (
                          <p className="text-[10px] text-amber-700 italic">
                            ⚠️ {it.manualReviewReason || 'Manual Approver Audit Required'}
                          </p>
                        )}
                      </div>
                      <span className="font-bold text-slate-900">₹{it.amount}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClaim}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Submit Claim (₹{items.reduce((a, b) => a + b.amount, 0)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW TRAVEL MODAL */}
      {isTravelModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Pre-Trip Travel Request</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Travel Purpose</label>
              <input
                type="text"
                value={travelPurpose}
                onChange={e => setTravelPurpose(e.target.value)}
                placeholder="e.g. Client Site Security Audit"
                className="w-full border border-slate-300 rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Debit Cost Center (Budget Hold)</label>
              <select
                value={travelCostCenterId}
                onChange={e => setTravelCostCenterId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
              >
                <option value="">-- Select Cost Center --</option>
                {costCentres.map(cc => {
                  const allocated = Number(cc.budgetAllocated || 0);
                  const consumed = Number(cc.budgetConsumed || 0);
                  const reserved = Number(cc.budgetReserved || 0);
                  const available = allocated > 0 ? Math.max(0, allocated - (consumed + reserved)) : 'Uncapped';
                  return (
                    <option key={cc.id} value={cc.id}>
                      {cc.name} ({cc.code || 'CC'}) — Available: {typeof available === 'number' ? `₹${available}` : available}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Destination City</label>
                <input
                  type="text"
                  value={destCity}
                  onChange={e => setDestCity(e.target.value)}
                  placeholder="e.g. Ahmedabad"
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Estimated Budget (₹)</label>
                <input
                  type="number"
                  value={estBudget}
                  onChange={e => setEstBudget(e.target.value)}
                  placeholder="6000"
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsTravelModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTravel}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Submit Pre-Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

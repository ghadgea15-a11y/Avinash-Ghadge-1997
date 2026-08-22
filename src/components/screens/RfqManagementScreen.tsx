import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, RfqRequest, RfqBid } from '../../types';
import { Search, Plus, Filter, FileText, CheckCircle, Clock, Ban, Award, FileSignature, ArrowRight, DollarSign, Download, Upload, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { ScmService } from '../../services/scmService';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  onNavigate: (screen: any) => void;
}

export function RfqManagementScreen({ userSession, activeCompany, onNavigate }: Props) {
  const [rfqs, setRfqs] = useState<RfqRequest[]>([]);
  const [bids, setBids] = useState<RfqBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PUBLISHED' | 'EVALUATION'>('ALL');
  const [selectedRfq, setSelectedRfq] = useState<RfqRequest | null>(null);
  
  // Matrix View State
  const [showMatrix, setShowMatrix] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const fetchedRfqs = await ScmService.getRfqs(userSession, activeCompany.companyId);
        const fetchedBids = await ScmService.getRfqBids(userSession, activeCompany.companyId);
        setRfqs(fetchedRfqs);
        setBids(fetchedBids);
      } catch (error) {
        console.error('Failed to fetch RFQ data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userSession, activeCompany.companyId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'UNDER_EVALUATION': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'AWARDED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CLOSED_FOR_BIDDING': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredRfqs = rfqs.filter(r => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PUBLISHED') return r.status === 'PUBLISHED';
    if (activeTab === 'EVALUATION') return r.status === 'UNDER_EVALUATION';
    return true;
  });

  const handleOpenComparison = (rfq: RfqRequest) => {
    setSelectedRfq(rfq);
    setShowMatrix(true);
  };

  const rfqBids = bids.filter(b => selectedRfq && b.rfqId === selectedRfq.id);

  return (
    <div className="min-h-screen bg-slate-50 pt-20 px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">RFQ & Bid Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              Create Requests for Quotations, broadcast to vendors, and evaluate bids.
            </p>
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Create New RFQ
          </button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Active RFQs</p>
              <p className="text-2xl font-bold text-slate-900">{loading ? '-' : rfqs.filter(r => r.status === 'PUBLISHED').length}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Under Evaluation</p>
              <p className="text-2xl font-bold text-amber-600">
                {loading ? '-' : rfqs.filter(r => r.status === 'UNDER_EVALUATION').length}
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Awarded (30 Days)</p>
              <p className="text-2xl font-bold text-emerald-600">
                {loading ? '-' : rfqs.filter(r => r.status === 'AWARDED').length}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* RFQ List Section */}
        {!showMatrix && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3 flex gap-4">
              <button 
                onClick={() => setActiveTab('ALL')}
                className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === 'ALL' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                All RFQs
              </button>
              <button 
                onClick={() => setActiveTab('PUBLISHED')}
                className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === 'PUBLISHED' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Active / Published
              </button>
              <button 
                onClick={() => setActiveTab('EVALUATION')}
                className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === 'EVALUATION' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Under Evaluation
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3 font-medium">RFQ Details</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Deadline</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Bids Received</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading RFQs...</td>
                    </tr>
                  ) : filteredRfqs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No RFQs found.</td>
                    </tr>
                  ) : (
                    filteredRfqs.map((rfq) => {
                      const receivedBidsCount = bids.filter(b => b.rfqId === rfq.id).length;
                      return (
                        <tr key={rfq.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{rfq.title}</div>
                            <div className="text-slate-500 text-xs">{rfq.rfqNumber}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-700 font-medium">{rfq.category}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                            {rfq.submissionDeadline ? format(new Date(rfq.submissionDeadline), 'dd MMM yyyy, HH:mm') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(rfq.status)}`}>
                              {rfq.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                            {receivedBidsCount} {receivedBidsCount === 1 ? 'Bid' : 'Bids'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {rfq.status === 'UNDER_EVALUATION' ? (
                              <button 
                                onClick={() => handleOpenComparison(rfq)}
                                className="text-indigo-600 hover:text-indigo-900 font-medium text-sm flex items-center justify-end gap-1 w-full"
                              >
                                Compare Bids <ArrowRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <button className="text-slate-600 hover:text-slate-900 font-medium text-sm">
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Evaluation Matrix View */}
        {showMatrix && selectedRfq && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 fade-in">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowMatrix(false)}
                className="text-slate-500 hover:text-slate-800 font-medium text-sm flex items-center"
              >
                ← Back to List
              </button>
              <h2 className="text-xl font-bold text-slate-900">Bid Comparison Matrix</h2>
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-medium border border-amber-200">
                {selectedRfq.rfqNumber}
              </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                      <th className="px-4 py-4 font-semibold text-slate-700 w-1/4 border-r border-slate-200">
                        Criteria / Line Items
                      </th>
                      {rfqBids.map((bid, i) => (
                        <th key={bid.id} className={`px-4 py-4 border-r border-slate-200 ${bid.score?.totalRank === 1 ? 'bg-indigo-50/50' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-slate-900">{bid.vendorName}</div>
                              <div className="text-xs text-slate-500">Submitted: {format(new Date(bid.submittedAt || ''), 'dd MMM')}</div>
                            </div>
                            {bid.score?.totalRank === 1 && (
                              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded">L1</span>
                            )}
                            {bid.score?.totalRank === 2 && (
                              <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded">L2</span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {/* Commercial Score Row */}
                    <tr className="bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-600 border-r border-slate-200">Evaluation Score (Max 100)</td>
                      {rfqBids.map(bid => (
                        <td key={bid.id} className="px-4 py-3 border-r border-slate-200 font-medium text-slate-900">
                          {bid.score?.commercialScore} / 100
                        </td>
                      ))}
                    </tr>
                    {/* Line Items */}
                    {selectedRfq.lineItems.map(item => (
                      <tr key={item.itemId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4 border-r border-slate-200">
                          <div className="font-medium text-slate-900">{item.itemName}</div>
                          <div className="text-xs text-slate-500 mt-1">Qty: {item.quantity} {item.uom}</div>
                        </td>
                        {rfqBids.map(bid => {
                          const quote = bid.lineItemQuotes.find(q => q.itemId === item.itemId);
                          return (
                            <td key={bid.id + item.itemId} className="px-4 py-4 border-r border-slate-200 align-top">
                              {quote ? (
                                <div className="space-y-1">
                                  <div className="font-medium text-slate-900">₹{quote.offeredUnitPrice.toLocaleString()} <span className="text-xs text-slate-500">/unit</span></div>
                                  <div className="text-xs text-slate-500">Tax: {quote.taxPercent}% (HSN: {quote.hsnCode})</div>
                                  <div className="text-xs text-amber-600">Lead time: {quote.leadTimeDays} days</div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs">No quote</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Totals */}
                    <tr className="bg-slate-50 font-medium">
                      <td className="px-4 py-4 border-r border-slate-200 text-slate-700">Sub Total</td>
                      {rfqBids.map(bid => (
                        <td key={'sub'+bid.id} className="px-4 py-4 border-r border-slate-200">₹{bid.subTotal.toLocaleString()}</td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50 font-medium">
                      <td className="px-4 py-4 border-r border-slate-200 text-slate-700">Tax Total</td>
                      {rfqBids.map(bid => (
                        <td key={'tax'+bid.id} className="px-4 py-4 border-r border-slate-200">₹{bid.totalTax.toLocaleString()}</td>
                      ))}
                    </tr>
                    <tr className="bg-slate-100 font-bold text-lg">
                      <td className="px-4 py-4 border-r border-slate-300 text-slate-900">Grand Total</td>
                      {rfqBids.map(bid => (
                        <td key={'grand'+bid.id} className={`px-4 py-4 border-r border-slate-300 ${bid.score?.totalRank === 1 ? 'text-indigo-700' : 'text-slate-900'}`}>
                          ₹{bid.grandTotal.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    {/* Action Row */}
                    <tr>
                      <td className="px-4 py-4 border-r border-slate-200"></td>
                      {rfqBids.map(bid => (
                        <td key={'action'+bid.id} className="px-4 py-4 border-r border-slate-200 text-center">
                          <button 
                            className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm ${
                              bid.score?.totalRank === 1 
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            Award & Generate PO
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

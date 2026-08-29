import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, SrmVendorRecord, VendorTier, VendorStatus } from '../../types';
import { Search, Plus, Filter, FileText, CheckCircle, XCircle, ShieldAlert, Star, Building2, Ban } from 'lucide-react';
import { getFirestore, collection, query, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { SrmService } from '../../services/srmService';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  onNavigate: (screen: any) => void;
}

export function VendorDirectoryScreen({ userSession, activeCompany, onNavigate }: Props) {
  const [vendors, setVendors] = useState<SrmVendorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<VendorTier | 'ALL'>('ALL');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const fetchedVendors = await SrmService.getVendors(activeCompany.companyId);
        setVendors(fetchedVendors);
      } catch (err) {
        console.error('Failed to fetch vendors:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userSession, activeCompany.companyId]);

  const getTierBadge = (tier: VendorTier) => {
    switch (tier) {
      case 'TIER_1_PREFERRED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'TIER_2_APPROVED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TIER_3_PROVISIONAL': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'BLACKLISTED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredVendors = vendors.filter(v => {
    const vendorName = v.businessName || v.name || '';
    const category = v.category || '';
    const matchesSearch = vendorName.toLowerCase().includes(searchQuery.toLowerCase()) || category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === 'ALL' || v.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pt-20 px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white tracking-tight">Vendor Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Onboarding, Document Verification, and Compliance Directory.
            </p>
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Onboard Vendor
          </button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Vendors</p>
              <p className="text-2xl font-bold text-black dark:text-white">{loading ? '-' : vendors.length}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Tier 1 Preferred</p>
              <p className="text-2xl font-bold text-emerald-600">
                {loading ? '-' : vendors.filter(s => s.tier === 'TIER_1_PREFERRED').length}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Under Review</p>
              <p className="text-2xl font-bold text-amber-600">
                {loading ? '-' : vendors.filter(s => s.status === 'UNDER_REVIEW').length}
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Blacklisted</p>
              <p className="text-2xl font-bold text-red-600">
                {loading ? '-' : vendors.filter(s => s.tier === 'BLACKLISTED').length}
              </p>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <Ban className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Directory Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as VendorTier | 'ALL')}
            className="px-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="ALL">All Tiers</option>
            <option value="TIER_1_PREFERRED">Tier 1 (Preferred)</option>
            <option value="TIER_2_APPROVED">Tier 2 (Approved)</option>
            <option value="TIER_3_PROVISIONAL">Tier 3 (Provisional)</option>
            <option value="BLACKLISTED">Blacklisted</option>
          </select>
        </div>

        {/* Status Directory */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white dark:bg-slate-950/50">
            <h2 className="text-lg font-semibold text-black dark:text-slate-200">Vendor Master List</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white dark:bg-slate-950 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-3 font-medium">Business Name</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Compliance</th>
                  <th className="px-6 py-3 font-medium">Rating</th>
                  <th className="px-6 py-3 font-medium">Tier Classification</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                      Loading vendors...
                    </td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                      No vendors found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor) => {
                    const email = typeof vendor.contactPerson === 'object' 
                      ? vendor.contactPerson?.email || vendor.email || 'N/A'
                      : vendor.email || vendor.contactPerson || 'N/A';
                    const score = typeof vendor.complianceScore === 'number' ? vendor.complianceScore : 100;
                    const rating = typeof vendor.ratingAverage === 'number' ? vendor.ratingAverage : 5.0;

                    return (
                      <tr key={vendor.id} className="hover:bg-white dark:bg-slate-950/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-black dark:text-white">{vendor.businessName || vendor.name}</div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs">{email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-black dark:text-slate-200 font-medium">{vendor.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{score}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-slate-900 dark:text-slate-300 font-medium">
                            <Star className="w-4 h-4 text-amber-500 mr-1 fill-amber-500" />
                            {rating.toFixed(1)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getTierBadge(vendor.tier)}`}>
                            {String(vendor.tier).replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button className="text-indigo-600 hover:text-indigo-900 font-medium text-sm transition-colors">
                            View Profile
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

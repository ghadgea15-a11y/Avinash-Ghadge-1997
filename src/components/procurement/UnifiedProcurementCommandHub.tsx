import React, { useState } from 'react';
import { 
  Package, 
  Users, 
  TrendingDown, 
  CheckCircle2, 
  AlertTriangle, 
  ShoppingCart, 
  Star, 
  ShieldCheck, 
  Clock, 
  Tag, 
  ArrowRight,
  Filter,
  DollarSign,
  Layers,
  Sparkles
} from 'lucide-react';
import { UserSession } from '../../types';
import { LanguageService } from '../../services/voiceFeedbackService';

interface UnifiedProcurementHubProps {
  userSession: UserSession;
  onGeneratePOFromL1?: (item: any, selectedVendor: any) => void;
}

export const UnifiedProcurementCommandHub: React.FC<UnifiedProcurementHubProps> = ({
  userSession,
  onGeneratePOFromL1
}) => {
  // Sample real-time stock + vendor + price dataset
  const procurementItems = [
    {
      id: 'ITEM-101',
      itemName: 'Reflective Safety Jacket (Class 3)',
      category: 'PPE Safety Gear',
      currentStock: 12,
      minReorderLevel: 50,
      reorderRequiredQty: 100,
      unit: 'Pairs',
      stockStatus: 'CRITICAL_LOW',
      vendors: [
        {
          id: 'VEND-001',
          vendorName: 'Apex Industrial Safety Ltd.',
          rating: 4.8,
          pastOrders: 24,
          unitPrice: 380,
          gstRate: 18,
          leadTimeDays: 2,
          rank: 'L1',
          paymentTerms: '30 Days Credit',
          complianceStatus: 'GST_VERIFIED'
        },
        {
          id: 'VEND-002',
          vendorName: 'Suraksha Protective Equipment',
          rating: 4.5,
          pastOrders: 18,
          unitPrice: 410,
          gstRate: 18,
          leadTimeDays: 3,
          rank: 'L2',
          paymentTerms: '15 Days Credit',
          complianceStatus: 'GST_VERIFIED'
        },
        {
          id: 'VEND-003',
          vendorName: 'Global Safety Solutions India',
          rating: 4.2,
          pastOrders: 8,
          unitPrice: 445,
          gstRate: 18,
          leadTimeDays: 5,
          rank: 'L3',
          paymentTerms: 'Advance Payment',
          complianceStatus: 'GST_VERIFIED'
        }
      ]
    },
    {
      id: 'ITEM-102',
      itemName: 'Steel Toe Guard Boots (ISI Mark)',
      category: 'Footwear & Safety',
      currentStock: 28,
      minReorderLevel: 60,
      reorderRequiredQty: 80,
      unit: 'Pairs',
      stockStatus: 'LOW',
      vendors: [
        {
          id: 'VEND-004',
          vendorName: 'Karam Footwear & Safety',
          rating: 4.9,
          pastOrders: 32,
          unitPrice: 850,
          gstRate: 18,
          leadTimeDays: 3,
          rank: 'L1',
          paymentTerms: '45 Days Credit',
          complianceStatus: 'GST_VERIFIED'
        },
        {
          id: 'VEND-001',
          vendorName: 'Apex Industrial Safety Ltd.',
          rating: 4.8,
          pastOrders: 15,
          unitPrice: 890,
          gstRate: 18,
          leadTimeDays: 2,
          rank: 'L2',
          paymentTerms: '30 Days Credit',
          complianceStatus: 'GST_VERIFIED'
        }
      ]
    },
    {
      id: 'ITEM-103',
      itemName: 'Full Body Safety Harness Kit',
      category: 'Height Safety Equipment',
      currentStock: 5,
      minReorderLevel: 20,
      reorderRequiredQty: 25,
      unit: 'Kits',
      stockStatus: 'CRITICAL_LOW',
      vendors: [
        {
          id: 'VEND-005',
          vendorName: 'HeightSafe Solutions Pvt Ltd',
          rating: 4.7,
          pastOrders: 12,
          unitPrice: 2200,
          gstRate: 18,
          leadTimeDays: 4,
          rank: 'L1',
          paymentTerms: '30 Days Credit',
          complianceStatus: 'GST_VERIFIED'
        },
        {
          id: 'VEND-002',
          vendorName: 'Suraksha Protective Equipment',
          rating: 4.5,
          pastOrders: 9,
          unitPrice: 2450,
          gstRate: 18,
          leadTimeDays: 3,
          rank: 'L2',
          paymentTerms: '15 Days Credit',
          complianceStatus: 'GST_VERIFIED'
        }
      ]
    }
  ];

  const [selectedItem, setSelectedItem] = useState(procurementItems[0]);

  return (
    <div className="space-y-6">
      {/* Top Banner explaining the 3-in-1 Unified Hub */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-900/40 via-indigo-900/40 to-slate-900 border border-amber-500/30 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-amber-500/5 blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Unified Procurement Command Hub</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              3-in-1 खरेदी केंद्र: स्टॉक + वेंडर इतिहास + किंमत तुलना
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              वेगवेगळ्या टॅबमध्ये न जाता एकाच स्क्रीनवर वस्तूचा चालू साठा (Stock), मागील मान्यताप्राप्त वेंडर्स (Vendors) आणि L1/L2/L3 दर तुलना तपासून थेट Purchase Order (PO) तयार करा.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 shrink-0">
            <Layers className="w-5 h-5 text-indigo-400" />
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-bold">Smart Sourcing</div>
              <div className="text-xs font-extrabold text-emerald-400">3 Screens Integrated in 1</div>
            </div>
          </div>
        </div>
      </div>

      {/* Item Selection Strip */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {procurementItems.map(item => {
          const isSelected = selectedItem.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedItem(item)}
              className={`p-4 rounded-2xl border transition-all shrink-0 text-left w-72 ${
                isSelected
                  ? 'bg-amber-600/20 border-amber-500 text-white ring-2 ring-amber-500/40 shadow-lg'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  {item.id}
                </span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                  item.stockStatus === 'CRITICAL_LOW' 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {item.stockStatus === 'CRITICAL_LOW' ? '⚠️ कमी साठा (Critical)' : 'Low Stock'}
                </span>
              </div>
              <h4 className="font-bold text-sm text-white truncate">{item.itemName}</h4>
              <div className="mt-2 text-xs flex items-center justify-between text-slate-400">
                <span>साठा: <strong className="text-white">{item.currentStock} {item.unit}</strong></span>
                <span>पुन्हा मागणी: <strong className="text-amber-300">{item.reorderRequiredQty} {item.unit}</strong></span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main 3-Column Unified Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* COLUMN 1: Stock Status & Demand Analysis */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm border-b border-slate-800 pb-3">
            <Package className="w-5 h-5 text-amber-500" />
            <span>१. सध्याचा स्टॉक व मागणी (Stock & Demand)</span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] uppercase font-bold text-slate-400">निवडलेली वस्तू (Selected Item)</span>
              <h3 className="text-base font-extrabold text-white mt-1">{selectedItem.itemName}</h3>
              <span className="inline-block mt-1 text-xs text-indigo-400 font-medium">{selectedItem.category}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20">
                <span className="text-[11px] uppercase font-bold text-red-400">शिल्लक साठा (Current)</span>
                <div className="text-2xl font-black text-red-300 mt-0.5">
                  {selectedItem.currentStock} <span className="text-xs font-normal">{selectedItem.unit}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] uppercase font-bold text-emerald-400">कमीतकमी मर्यादा (Min)</span>
                <div className="text-2xl font-black text-emerald-300 mt-0.5">
                  {selectedItem.minReorderLevel} <span className="text-xs font-normal">{selectedItem.unit}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  मागणी प्रमाण (Recommended PO Qty)
                </span>
                <span className="text-sm font-black text-white bg-amber-600/30 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                  {selectedItem.reorderRequiredQty} {selectedItem.unit}
                </span>
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                शिल्लक साठा री-ऑर्डर लेव्हलपेक्षा कमी आहे. साइटवर तुटवडा टाळण्यासाठी त्वरित PO जारी करण्याची शिफारस केली जाते.
              </p>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Approved Vendors for this Item */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-sm">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>२. वेंडर इतिहास (Approved Vendors)</span>
            </div>
            <span className="text-xs font-bold text-slate-400">{selectedItem.vendors.length} वेंडर्स उपलब्ध</span>
          </div>

          <div className="space-y-3">
            {selectedItem.vendors.map(vendor => (
              <div key={vendor.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                      {vendor.vendorName}
                      {vendor.complianceStatus === 'GST_VERIFIED' && (
                        <span title="GST Compliant"><ShieldCheck className="w-4 h-4 text-emerald-400" /></span>
                      )}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {vendor.rating}
                      </span>
                      <span>• {vendor.pastOrders} मागील ऑर्डर्स</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                    vendor.rank === 'L1' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {vendor.rank} Supplier
                  </span>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-900 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div>क्रेडिट मुदत: <strong className="text-slate-200">{vendor.paymentTerms}</strong></div>
                  <div>डिलिव्हरी वेळ: <strong className="text-slate-200">{vendor.leadTimeDays} दिवस</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 3: Price Comparison & Instant PO Generation */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
              <span>३. किंमत तुलना व PO जारी करणे</span>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              L1 Best Price
            </span>
          </div>

          {/* L1 Highlighted Offer */}
          {(() => {
            const l1Vendor = selectedItem.vendors.find(v => v.rank === 'L1') || selectedItem.vendors[0];
            const baseCost = l1Vendor.unitPrice * selectedItem.reorderRequiredQty;
            const gstAmount = baseCost * (l1Vendor.gstRate / 100);
            const totalCost = baseCost + gstAmount;

            return (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                      L1 Lowest Quotation
                    </span>
                    <span className="text-xs font-bold text-slate-300">GST {l1Vendor.gstRate}% समाविष्ट</span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-base text-white">{l1Vendor.vendorName}</h4>
                    <div className="text-2xl font-black text-emerald-300 mt-1">
                      ₹{l1Vendor.unitPrice.toLocaleString()} <span className="text-xs font-normal text-slate-300">/ {selectedItem.unit}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>मूळ रक्कम ({selectedItem.reorderRequiredQty} {selectedItem.unit}):</span>
                      <span className="text-white font-mono">₹{baseCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>GST (18%):</span>
                      <span className="text-white font-mono">₹{gstAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800 text-sm">
                      <span>एकूण अंदाज मूल्य (Total PO Value):</span>
                      <span className="font-mono text-emerald-300">₹{totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Instant PO Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (onGeneratePOFromL1) {
                      onGeneratePOFromL1(selectedItem, l1Vendor);
                    } else {
                      alert(`L1 वेंडर ${l1Vendor.vendorName} साठी ₹${totalCost.toLocaleString()} चा Purchase Order (PO) तयार केला गेला आहे.`);
                    }
                  }}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 active:scale-95 transition-all border border-emerald-400/30"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>थेट L1 Purchase Order (PO) जारी करा</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
};

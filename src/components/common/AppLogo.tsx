import React, { useState, useEffect } from 'react';
import { CompanyTenant } from '../../types';

interface AppLogoProps {
  company?: CompanyTenant | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  variant?: 'full' | 'icon-only' | 'badge';
  layout?: 'horizontal' | 'vertical';
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  className = '',
  variant = 'full',
  layout = 'horizontal',
  company = null
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset image error state whenever company or logoUrl changes
  useEffect(() => {
    setImageError(false);
  }, [company?.logoUrl, company?.companyId]);

  const dimensions = {
    sm: { container: 'h-8 w-8', text: 'text-sm', badge: 'text-[8px] px-1.5 py-0.5', icon: 'text-xs' },
    md: { container: 'h-10 w-10', text: 'text-base', badge: 'text-[9px] px-2 py-0.5', icon: 'text-sm' },
    lg: { container: 'h-14 w-14', text: 'text-xl', badge: 'text-[10px] px-2.5 py-1', icon: 'text-lg' },
    xl: { container: 'h-20 w-20', text: 'text-2xl', badge: 'text-xs px-3 py-1', icon: 'text-2xl' }
  }[size];

  const brandName = company?.brandName || company?.companyLegalName;
  const hasTenant = Boolean(company && (company.brandName || company.companyId));
  const hasValidLogo = Boolean(company?.logoUrl && company.logoUrl.trim().length > 0 && !imageError);
  const brandColor = company?.primaryColorHex || '#4f46e5';

  const renderLogoGraphic = () => {
    if (hasTenant) {
      if (hasValidLogo) {
        return (
          <div className={`relative flex-shrink-0 ${dimensions.container} rounded-2xl overflow-hidden shadow-md shadow-indigo-950/20 bg-white p-1.5 border border-slate-200/80 flex items-center justify-center`}>
            <img 
              src={company?.logoUrl}
              alt={brandName || "Company Logo"}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
          </div>
        );
      }

      // Controlled Monogram Fallback (never show another tenant or default platform logo)
      const initial = (brandName || company?.companyId || 'C').charAt(0).toUpperCase();
      return (
        <div 
          className={`relative flex-shrink-0 ${dimensions.container} rounded-2xl shadow-md flex items-center justify-center font-black text-white ${dimensions.icon}`}
          style={{ backgroundColor: brandColor }}
        >
          {initial}
        </div>
      );
    }

    // Platform Default Logo (only when no tenant is active)
    return (
      <div className={`relative flex-shrink-0 ${dimensions.container} rounded-2xl overflow-hidden shadow-md shadow-indigo-950/20 bg-white p-1 border border-slate-200/80 flex items-center justify-center`}>
        <img 
          src="/logo.png"
          alt="Log Sheet Muster Logo"
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  };

  const isVertical = layout === 'vertical';

  return (
    <div className={`flex ${isVertical ? 'flex-col items-center text-center gap-2' : 'items-center gap-3'} ${className}`}>
      {renderLogoGraphic()}

      {variant !== 'icon-only' && (
        <div className={`flex flex-col ${isVertical ? 'items-center' : ''}`}>
          <div className="flex items-center gap-1.5">
            <span className={`font-extrabold tracking-tight ${dimensions.text} text-slate-900 dark:text-white`}>
              {hasTenant ? (
                <span style={{ color: company?.primaryColorHex || undefined }}>{brandName}</span>
              ) : (
                <>Log Sheet <span className="text-emerald-500">Muster</span></>
              )}
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
              {hasTenant ? company?.tagline : "YOUR WORKFORCE, OUR PRIORITY"}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

import React from 'react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  variant?: 'full' | 'icon-only' | 'badge';
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  className = '',
  variant = 'full'
}) => {
  const dimensions = {
    sm: { container: 'h-8 w-8', text: 'text-sm', badge: 'text-[8px] px-1.5 py-0.5' },
    md: { container: 'h-10 w-10', text: 'text-base', badge: 'text-[9px] px-2 py-0.5' },
    lg: { container: 'h-14 w-14', text: 'text-xl', badge: 'text-[10px] px-2.5 py-1' },
    xl: { container: 'h-24 w-24', text: 'text-3xl', badge: 'text-xs px-3 py-1' }
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative flex-shrink-0 ${dimensions.container} rounded-2xl overflow-hidden shadow-md shadow-indigo-950/20 bg-white p-0.5 border border-slate-200/80`}>
        <img 
          src="/logo.png" 
          alt="Log Sheet Muster Logo" 
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>

      {variant !== 'icon-only' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-extrabold tracking-tight ${dimensions.text} text-slate-900 dark:text-white`}>
              Log Sheet <span className="text-emerald-500">Muster</span>
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
              YOUR WORKFORCE, OUR PRIORITY
            </span>
          )}
        </div>
      )}
    </div>
  );
};

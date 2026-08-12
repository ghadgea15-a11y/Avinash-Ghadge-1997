import React, { useState, useEffect } from 'react';
import { Wifi, Signal, Battery, ArrowLeft, Circle, Square } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface AndroidFrameProps {
  children: React.ReactNode;
  viewportMode: 'PHONE' | 'TABLET' | 'FULLSCREEN';
  isOnline: boolean;
  onBackClick?: () => void;
  onHomeClick?: () => void;
  companyName?: string;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  viewportMode,
  isOnline,
  onBackClick,
  onHomeClick,
  companyName
}) => {
  const [timeString, setTimeString] = useState('');
  const { isDark } = useTheme();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  if (viewportMode === 'FULLSCREEN') {
    return <div className={`w-full h-full min-h-[calc(100vh-60px)] transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>{children}</div>;
  }

  const isTablet = viewportMode === 'TABLET';

  return (
    <div className={`w-full py-6 px-2 flex justify-center items-center transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-slate-200'} overflow-y-auto`}>
      <div 
        className={`android-frame transition-all duration-300 relative rounded-[38px] border-[10px] ${isDark ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-slate-300'} flex flex-col overflow-hidden ${
          isTablet ? 'w-full max-w-4xl h-[720px]' : 'w-full max-w-md h-[812px]'
        }`}
      >
        {/* Top Notch & Camera Hole */}
        <div className={`absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 ${isDark ? 'bg-slate-900' : 'bg-slate-300'} rounded-b-xl z-50 flex justify-center items-center gap-2`}>
          <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-400 border-slate-200'}`}></div>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-950"></div>
        </div>

        {/* Android Status Bar */}
        <div className={`transition-colors duration-300 ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-600 border-b border-slate-200/50'} text-[11px] font-mono px-6 pt-2 pb-1.5 flex justify-between items-center z-40 select-none`}>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{timeString || '10:42'}</span>
            {companyName && (
              <span className="text-[10px] text-indigo-500 font-sans truncate max-w-[120px]">
                {companyName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Wifi className={`w-3.5 h-3.5 ${isDark ? 'text-slate-300' : 'text-slate-500'} ${isOnline ? '' : 'text-amber-500'}`} />
            <Signal className={`w-3.5 h-3.5 ${isDark ? 'text-slate-300' : 'text-slate-500'}`} />
            <div className="flex items-center gap-1 text-[10px]">
              <span>98%</span>
              <Battery className="w-4 h-4 text-emerald-500 rotate-90" />
            </div>
          </div>
        </div>

        {/* Screen Content Container */}
        <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'} overflow-y-auto relative flex flex-col`}>
          {children}
        </div>

        {/* Android Bottom Navigation Bar */}
        <div className={`transition-colors duration-300 ${isDark ? 'bg-slate-900 border-t border-slate-800/80 text-slate-400' : 'bg-slate-100 border-t border-slate-200 text-slate-500'} h-11 flex justify-around items-center px-12 z-40`}>
          <button 
            onClick={onBackClick}
            className={`p-2 transition active:scale-90 ${isDark ? 'hover:text-slate-100' : 'hover:text-slate-900'}`}
            title="Android Back Button"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={onHomeClick}
            className={`p-2 transition active:scale-90 ${isDark ? 'hover:text-slate-100' : 'hover:text-slate-900'}`}
            title="Android Home Button"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button 
            className={`p-2 transition active:scale-90 opacity-60 ${isDark ? 'hover:text-slate-100' : 'hover:text-slate-900'}`}
            title="Android Recent Apps"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

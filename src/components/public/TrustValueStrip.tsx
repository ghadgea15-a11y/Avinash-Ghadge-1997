import React from 'react';

export const TrustValueStrip: React.FC = () => {
  const pillars = [
    'WORKFORCE',
    'SECURITY',
    'OPERATIONS',
    'ASSETS',
    'INVENTORY',
    'INTELLIGENCE'
  ];

  return (
    <section className="py-20 border-y border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Brand Statement */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="font-mono text-xs uppercase tracking-widest text-emerald-600 font-bold">
            Unified Operational Command
          </span>
          
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-black tracking-tight">
            ONE PLATFORM.<br />
            <span className="text-slate-600">EVERY OPERATION.</span>
          </h2>
          
          <p className="font-body text-sm sm:text-base text-black leading-relaxed max-w-xl mx-auto">
            Eliminating fragmented point solutions, disconnected spreadsheets, and paper muster logs across nationwide enterprise facilities.
          </p>
        </div>

        {/* Minimal Typographic Horizon Line & Ticker */}
        <div className="mt-12 pt-8 border-t border-slate-300">
          <div className="flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-12 gap-y-4 text-center">
            {pillars.map((p, idx) => (
              <div key={idx} className="flex items-center gap-8 sm:gap-12">
                <span className="font-display text-xs sm:text-sm font-bold tracking-widest text-black hover:text-emerald-600 transition-colors">
                  {p}
                </span>
                {idx < pillars.length - 1 && (
                  <span className="w-1 h-1 rounded-full bg-[#A1A1AA]" />
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

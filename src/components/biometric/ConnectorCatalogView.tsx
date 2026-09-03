import React from 'react';
import {
  Cpu,
  Fingerprint,
  Layers,
  Network,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  Zap
} from 'lucide-react';
import { ConnectorRegistry } from '../../services/biometric/ConnectorRegistry';

export const ConnectorCatalogView: React.FC = () => {
  const registry = ConnectorRegistry.getInstance();
  const connectors = registry.listAllConnectors();

  const getVendorIcon = (m: string) => {
    switch (m) {
      case 'ZKTECO':
        return <Fingerprint className="w-5 h-5 text-amber-400" />;
      case 'ESSL':
        return <Cpu className="w-5 h-5 text-emerald-400" />;
      case 'HIKVISION':
        return <Zap className="w-5 h-5 text-rose-400" />;
      default:
        return <Layers className="w-5 h-5 text-sky-400" />;
    }
  };

  return (
    <div id="section-connector-catalog" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h2 className="text-base font-bold text-white tracking-tight">Universal Hardware Connector Registry</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {connectors.length} Native Adapters
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Plug-and-play adapter layer supporting major biometric manufacturers, protocols, and proprietary APIs.
        </p>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map(c => (
          <div key={c.connectorId} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                  {getVendorIcon(c.supportedManufacturer)}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">{c.supportedManufacturer}</h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{c.connectorId}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                Port {c.defaultPort}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block uppercase font-medium">Supported Protocols</span>
              <div className="flex flex-wrap gap-1">
                {c.supportedProtocols.map(p => (
                  <span key={p} className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-900 text-amber-400/90 border border-slate-800">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Certified Connector
              </span>
              <span className="text-slate-500 dark:text-slate-400">Auto-Detect Ready</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

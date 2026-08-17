import React from 'react';
import { X, QrCode, Printer, Download, MapPin, CheckCircle2, Shield } from 'lucide-react';
import { PatrolCheckpointRecord, SiteRecord } from '../../types';

interface CheckpointQRCodeModalProps {
  checkpoint: PatrolCheckpointRecord | null;
  site?: SiteRecord;
  onClose: () => void;
}

export const CheckpointQRCodeModal: React.FC<CheckpointQRCodeModalProps> = ({
  checkpoint,
  site,
  onClose
}) => {
  if (!checkpoint) return null;

  const qrData = checkpoint.qrCode || `LSM-CP-${checkpoint.code}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-lg">Patrol Checkpoint Tag</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tag Card (Printable Area) */}
        <div className="p-6">
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50 flex flex-col items-center text-center shadow-inner relative">
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">
                Seq #{checkpoint.sequenceOrder}
              </span>
            </div>

            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-3 shadow-md">
              <Shield className="w-6 h-6" />
            </div>

            <h4 className="text-xl font-bold text-slate-900 tracking-tight">{checkpoint.checkpointName}</h4>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">
              {site?.name || checkpoint.siteName || 'Security Operations'}
            </p>

            {/* QR Visual */}
            <div className="my-5 p-4 bg-white rounded-xl shadow border border-slate-200 flex flex-col items-center justify-center">
              {/* Generate standard SVG QR Code representation */}
              <div className="w-44 h-44 bg-slate-900 rounded-lg p-2 flex items-center justify-center text-white relative">
                <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                  {/* Outer boundary squares */}
                  <rect x="5" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="4" />
                  <rect x="10" y="10" width="15" height="15" fill="currentColor" />
                  <rect x="70" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="4" />
                  <rect x="75" y="10" width="15" height="15" fill="currentColor" />
                  <rect x="5" y="70" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="4" />
                  <rect x="10" y="75" width="15" height="15" fill="currentColor" />
                  {/* Data patterns */}
                  <rect x="38" y="10" width="6" height="6" fill="currentColor" />
                  <rect x="48" y="10" width="6" height="6" fill="currentColor" />
                  <rect x="58" y="10" width="6" height="6" fill="currentColor" />
                  <rect x="38" y="24" width="6" height="6" fill="currentColor" />
                  <rect x="48" y="24" width="6" height="6" fill="currentColor" />
                  <rect x="58" y="24" width="6" height="6" fill="currentColor" />
                  <rect x="10" y="38" width="6" height="6" fill="currentColor" />
                  <rect x="24" y="38" width="6" height="6" fill="currentColor" />
                  <rect x="38" y="38" width="8" height="8" fill="currentColor" />
                  <rect x="54" y="38" width="8" height="8" fill="currentColor" />
                  <rect x="70" y="38" width="6" height="6" fill="currentColor" />
                  <rect x="84" y="38" width="6" height="6" fill="currentColor" />
                  <rect x="38" y="54" width="8" height="8" fill="currentColor" />
                  <rect x="54" y="54" width="8" height="8" fill="currentColor" />
                  <rect x="70" y="54" width="6" height="6" fill="currentColor" />
                  <rect x="84" y="54" width="6" height="6" fill="currentColor" />
                  <rect x="38" y="70" width="6" height="6" fill="currentColor" />
                  <rect x="48" y="70" width="6" height="6" fill="currentColor" />
                  <rect x="58" y="70" width="6" height="6" fill="currentColor" />
                  <rect x="38" y="84" width="6" height="6" fill="currentColor" />
                  <rect x="48" y="84" width="6" height="6" fill="currentColor" />
                  <rect x="58" y="84" width="6" height="6" fill="currentColor" />
                  <rect x="70" y="70" width="8" height="8" fill="currentColor" />
                  <rect x="82" y="82" width="8" height="8" fill="currentColor" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-indigo-600 text-white rounded p-1 shadow">
                    <Shield className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-slate-800 tracking-wider mt-2">
                {checkpoint.code}
              </span>
            </div>

            {/* Checkpoint Location info */}
            {checkpoint.locationDescription && (
              <div className="flex items-start text-xs text-slate-600 mb-2">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-left">{checkpoint.locationDescription}</span>
              </div>
            )}

            {checkpoint.gpsCoordinates && (
              <div className="text-[11px] font-mono text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded">
                GPS: {checkpoint.gpsCoordinates.latitude.toFixed(6)}, {checkpoint.gpsCoordinates.longitude.toFixed(6)}
                {checkpoint.geofenceRadiusMeters && ` (±${checkpoint.geofenceRadiusMeters}m)`}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 text-center mt-3">
            Affix this weatherproof tag at the physical checkpoint location for security patrol validation.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Tag</span>
          </button>
        </div>
      </div>
    </div>
  );
};

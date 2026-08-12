import React, { useState } from 'react';
import { Fingerprint, CheckCircle2, AlertCircle, X, KeyRound } from 'lucide-react';

interface BiometricPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

export const BiometricPromptModal: React.FC<BiometricPromptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Biometric Authentication',
  subtitle = 'Touch the fingerprint sensor to unlock Log Sheet Muster'
}) => {
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleTouchSensor = () => {
    if (scanning) return;
    setScanning(true);
    setStatus('SCANNING');

    setTimeout(() => {
      // 90% success rate simulation
      if (Math.random() > 0.1) {
        setStatus('SUCCESS');
        setTimeout(() => {
          setScanning(false);
          setStatus('IDLE');
          onSuccess();
        }, 800);
      } else {
        setStatus('ERROR');
        setErrorMessage('Fingerprint not recognized. Please try again.');
        setScanning(false);
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <Fingerprint className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>

        {/* Biometric Sensor Touch Surface */}
        <div 
          onClick={handleTouchSensor}
          className={`my-6 mx-auto w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-all border-2 relative ${
            status === 'SCANNING'
              ? 'border-indigo-500 bg-indigo-950/50 scale-105 shadow-lg shadow-indigo-500/20'
              : status === 'SUCCESS'
              ? 'border-emerald-500 bg-emerald-950/50 text-emerald-400'
              : status === 'ERROR'
              ? 'border-rose-500 bg-rose-950/50 text-rose-400'
              : 'border-slate-700 bg-slate-950 text-indigo-400 hover:border-indigo-500/60 hover:bg-indigo-950/30'
          }`}
        >
          {status === 'SCANNING' && (
            <div className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-40"></div>
          )}

          {status === 'SUCCESS' ? (
            <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-in zoom-in duration-200" />
          ) : status === 'ERROR' ? (
            <AlertCircle className="w-12 h-12 text-rose-400 animate-bounce" />
          ) : (
            <Fingerprint className={`w-12 h-12 ${status === 'SCANNING' ? 'animate-pulse text-indigo-400' : ''}`} />
          )}
        </div>

        <p className="text-xs font-medium h-5">
          {status === 'SCANNING' && <span className="text-indigo-400">Verifying biometric scan...</span>}
          {status === 'SUCCESS' && <span className="text-emerald-400 font-bold">Identity Confirmed!</span>}
          {status === 'ERROR' && <span className="text-rose-400 font-semibold">{errorMessage}</span>}
          {status === 'IDLE' && <span className="text-slate-400">Tap fingerprint icon to authenticate</span>}
        </p>

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col gap-2">
          <button
            onClick={onClose}
            className="w-full text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 rounded-xl flex items-center justify-center gap-2 transition"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
            <span>Use Employee PIN / Password Instead</span>
          </button>
        </div>
      </div>
    </div>
  );
};

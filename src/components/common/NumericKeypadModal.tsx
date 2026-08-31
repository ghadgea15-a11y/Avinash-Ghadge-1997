import React, { useState } from 'react';
import { Delete, KeyRound, Check, X, ShieldAlert } from 'lucide-react';
import { LanguageService, VoiceFeedbackService } from '../../services/voiceFeedbackService';

interface NumericKeypadModalProps {
  isOpen: boolean;
  title?: string;
  pinLength?: number;
  onClose: () => void;
  onSubmitPin: (pin: string) => void;
  errorMessage?: string | null;
}

export const NumericKeypadModal: React.FC<NumericKeypadModalProps> = ({
  isOpen,
  title,
  pinLength = 4,
  onClose,
  onSubmitPin,
  errorMessage
}) => {
  const [pin, setPin] = useState<string>('');

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < pinLength) {
      const newPin = pin + num;
      setPin(newPin);
      
      // Auto submit when pin length reached
      if (newPin.length === pinLength) {
        setTimeout(() => {
          onSubmitPin(newPin);
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight text-white">
                {title || LanguageService.translate('ENTER_PIN')}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {LanguageService.translate('ENTER_PIN')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PIN Display Dots */}
        <div className="my-6 py-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex justify-center items-center gap-4">
          {Array.from({ length: pinLength }).map((_, idx) => (
            <div
              key={idx}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                idx < pin.length
                  ? 'bg-indigo-500 border-indigo-400 scale-110 shadow-lg shadow-indigo-500/50'
                  : 'border-slate-700 bg-slate-900'
              }`}
            />
          ))}
        </div>

        {/* Error Message if Any */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-2 animate-shake">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Touch Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {digits.map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="py-4 text-2xl font-bold rounded-2xl bg-slate-800 hover:bg-indigo-600 hover:text-white active:scale-95 transition-all border border-slate-700/80 shadow-md text-slate-100"
            >
              {num}
            </button>
          ))}

          {/* Bottom Row */}
          <button
            type="button"
            onClick={handleClear}
            className="py-4 text-xs font-bold uppercase rounded-2xl bg-slate-800/60 hover:bg-red-500/30 text-slate-400 hover:text-red-300 active:scale-95 transition-all border border-slate-700/50"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-4 text-2xl font-bold rounded-2xl bg-slate-800 hover:bg-indigo-600 hover:text-white active:scale-95 transition-all border border-slate-700/80 shadow-md text-slate-100"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="py-4 flex items-center justify-center rounded-2xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 active:scale-95 transition-all border border-slate-700/50"
            title="Delete"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Submit Manual Action if needed */}
        <button
          type="button"
          disabled={pin.length < pinLength}
          onClick={() => onSubmitPin(pin)}
          className={`w-full mt-5 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
            pin.length === pinLength
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          <Check className="w-5 h-5" />
          <span>{LanguageService.translate('SUBMIT')}</span>
        </button>
      </div>
    </div>
  );
};

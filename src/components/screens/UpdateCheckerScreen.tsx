import React, { useState } from 'react';
import { Download, CheckCircle2, ShieldAlert, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { AppUpdateInfo, PhaseAScreen } from '../../types';
import { MOCK_APP_UPDATE } from '../../services/mockData';

interface UpdateCheckerScreenProps {
  onContinue: (nextScreen: PhaseAScreen) => void;
  updateInfo?: AppUpdateInfo;
}

export const UpdateCheckerScreen: React.FC<UpdateCheckerScreenProps> = ({
  onContinue,
  updateInfo = MOCK_APP_UPDATE
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);

  const isNewUpdateAvailable = updateInfo.currentVersion !== updateInfo.latestVersion;

  const handleStartUpdate = () => {
    setDownloading(true);
    setDownloadProgress(0);

    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setDownloading(false);
          setDownloadComplete(true);
          return 100;
        }
        return prev + 15;
      });
    }, 300);
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col justify-between p-6">
      <div className="space-y-6">
        {/* Header Icon */}
        <div className="text-center pt-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Sparkles className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white">App Version Check</h2>
          <p className="text-xs text-slate-400 mt-1">Google Play Store Update Service</p>
        </div>

        {/* Version Comparison Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
            <div>
              <p className="text-slate-400">Current Installed</p>
              <p className="text-sm font-bold text-slate-200 font-mono mt-0.5">{updateInfo.currentVersion}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400">Latest Build</p>
              <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{updateInfo.latestVersion}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {updateInfo.isMandatory ? (
              <span className="px-2.5 py-1 rounded-md bg-rose-950 text-rose-300 border border-rose-800 font-semibold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Mandatory Security Update Required
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Latest Stable Release Ready
              </span>
            )}
          </div>
        </div>

        {/* Release Notes */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
            Release Highlights ({updateInfo.latestVersion})
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            {updateInfo.releaseNotes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Download Progress */}
        {downloading && (
          <div className="bg-indigo-950/60 border border-indigo-800 rounded-2xl p-4 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-indigo-200 font-medium">Downloading APK Package (18.4 MB)...</span>
              <span className="text-indigo-400 font-mono font-bold">{downloadProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {downloadComplete && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Update successfully downloaded and verified!</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-6 border-t border-slate-900">
        {!downloadComplete ? (
          <button
            onClick={handleStartUpdate}
            disabled={downloading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition text-sm"
          >
            {downloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Installing Play Store Update...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Update Now (18.4 MB)</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => onContinue('COMPANY_CODE')}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition text-sm"
          >
            <span>Restart & Apply Update</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {!updateInfo.isMandatory && !downloading && (
          <button
            onClick={() => onContinue('COMPANY_CODE')}
            className="w-full text-xs text-slate-400 hover:text-slate-200 py-2.5 transition text-center font-medium"
          >
            Skip for Now & Continue to App
          </button>
        )}
      </div>
    </div>
  );
};

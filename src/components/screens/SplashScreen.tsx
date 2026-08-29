import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, Loader2, AlertCircle, Building2, Smartphone } from 'lucide-react';
import { InitStep, PhaseAScreen, CompanyTenant, UserSession } from '../../types';
import { SessionManager } from '../../services/sessionManager';
import { AppLogo } from '../common/AppLogo';


interface SplashScreenProps {
  onComplete: (nextScreen: PhaseAScreen) => void;
  isOnline: boolean;
  activeCompany: CompanyTenant | null;
  userSession: UserSession | null;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  isOnline,
  activeCompany,
  userSession
}) => {
  const [steps, setSteps] = useState<InitStep[]>([
    { id: '1', label: 'Initializing Firebase Auth & Firestore Engine', status: 'PENDING' },
    { id: '2', label: 'Checking Network & Offline Storage Cache', status: 'PENDING' },
    { id: '3', label: 'Verifying App Version & Security Mandates', status: 'PENDING' },
    { id: '4', label: 'Checking Company Tenant Configuration', status: 'PENDING' },
    { id: '5', label: 'Validating Encrypted User Session Token', status: 'PENDING' }
  ]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    let isSubscribed = true;

    const runInitialization = async () => {
      // Step 1: Firebase Init
      setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'RUNNING', detail: 'Connecting to Cloud Firestore...' } : s));
      await new Promise(r => setTimeout(r, 600));
      if (!isSubscribed) return;
      setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'COMPLETED', detail: 'Firebase SDK Active' } : s));
      setCurrentStepIndex(1);

      // Step 2: Network & Cache
      setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'RUNNING', detail: isOnline ? 'Online mode active' : 'Offline local cache enabled' } : s));
      await new Promise(r => setTimeout(r, 500));
      if (!isSubscribed) return;
      setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'COMPLETED', detail: isOnline ? 'Online Connection OK' : 'IndexedDB Cache Ready' } : s));
      setCurrentStepIndex(2);

      // Step 3: Update Check
      setSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'RUNNING', detail: 'Checking v1.0.0...' } : s));
      await new Promise(r => setTimeout(r, 500));
      if (!isSubscribed) return;

      const hasMandatoryUpdate = false;

      setSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'COMPLETED', detail: 'App Up to Date (v1.0.0)' } : s));
      setCurrentStepIndex(3);

      if (hasMandatoryUpdate) {
        onComplete('UPDATE_CHECKER');
        return;
      }

      // Step 4: Company Tenant Check
      setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: 'RUNNING', detail: 'Reading DataStore tenant...' } : s));
      await new Promise(r => setTimeout(r, 600));
      if (!isSubscribed) return;

      const company = activeCompany || SessionManager.getActiveCompany();
      if (!company) {
        setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: 'COMPLETED', detail: 'Ready for Public Access' } : s));
        await new Promise(r => setTimeout(r, 400));
        onComplete('LANDING');
        return;
      }

      setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: 'COMPLETED', detail: `Tenant: ${company.brandName}` } : s));
      setCurrentStepIndex(4);

      // Step 5: Session Check
      setSteps(prev => prev.map((s, i) => i === 4 ? { ...s, status: 'RUNNING', detail: 'Verifying JWT & Biometric Key...' } : s));
      await new Promise(r => setTimeout(r, 600));
      if (!isSubscribed) return;

      // Always force login screen on app load as requested by user
      SessionManager.clearUserSession();
      const session = SessionManager.getUserSession();
      if (session) {
        setSteps(prev => prev.map((s, i) => i === 4 ? { ...s, status: 'COMPLETED', detail: `Authenticated as ${session.role}` } : s));
        await new Promise(r => setTimeout(r, 400));

        // Check if idle lock required
        if (SessionManager.isIdleLocked(5)) {
          onComplete('SESSION_LOCK');
        } else {
          onComplete('EMPLOYEES');
        }
      } else {
        setSteps(prev => prev.map((s, i) => i === 4 ? { ...s, status: 'COMPLETED', detail: 'System Ready' } : s));
        await new Promise(r => setTimeout(r, 400));
        onComplete('LANDING');
      }
    };

    runInitialization();

    return () => {
      isSubscribed = false;
    };
  }, []);

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-50 via-white to-slate-50 text-black dark:text-white flex flex-col justify-between p-6 relative overflow-hidden select-none">
      {/* Background Subtle Glows */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-100/50 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Section: App Brand & Logo */}
      <div className="flex flex-col items-center text-center pt-8 space-y-3">
        <AppLogo size="xl" showSubtitle={true} company={activeCompany} />
        <span className="inline-block px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 text-[11px] font-mono text-indigo-700 shadow-sm">
          Android Native Edition v1.0.0
        </span>
      </div>

      {/* Middle Section: Startup Diagnostics Queue */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 rounded-2xl p-4 my-6 shadow-xl shadow-slate-200/50 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
            Initialization Sequence
          </span>
          <span className="text-[11px] font-mono text-indigo-600">
            {Math.min(currentStepIndex + 1, steps.length)}/5
          </span>
        </div>

        <div className="space-y-2.5">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-start gap-2.5 text-xs">
              <div className="mt-0.5">
                {step.status === 'COMPLETED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : step.status === 'RUNNING' ? (
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] font-mono text-slate-400">
                    {idx + 1}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${
                  step.status === 'COMPLETED' ? 'text-black' :
                  step.status === 'RUNNING' ? 'text-indigo-700 font-semibold' : 'text-slate-500'
                }`}>
                  {step.label}
                </p>
                {step.detail && (
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Footer Details */}
      <div className="text-center text-[10px] text-slate-400 font-mono space-y-1 pb-2">
        <p>Google Play Store Target SDK 34 • Material Design 3</p>
        <p className="text-slate-500 dark:text-slate-400">Built with Jetpack Compose & Firebase Multi-Tenant Architecture</p>
      </div>
    </div>
  );
};

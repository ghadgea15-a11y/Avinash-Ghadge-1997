import React, { useEffect, useState } from 'react';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { Loader2, ShieldCheck } from 'lucide-react';
import { db } from '../../firebase';
import { UserSession, PhaseAScreen } from '../../types';
import { PlatformAuthClient } from '../../services/platformAuthClient';

interface SuperAdminGateProps {
  userSession: UserSession | null;
  onNavigate: (screen: PhaseAScreen) => void;
  children: React.ReactNode;
}

export const SuperAdminGate: React.FC<SuperAdminGateProps> = ({ userSession, onNavigate, children }) => {
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const verify = async () => {
      // REQUIRE AUTHENTICATION
      if (!userSession?.userId) {
        if (isMounted) {
          setLoading(false);
          onNavigate('PLATFORM_LOGIN');
        }
        return;
      }

      try {
        // 1. Primary check: doc with userId
        const docRef = doc(db, 'super_admins', userSession.userId);
        let adminDoc = await getDocFromServer(docRef).catch(() => null);

        // 2. Secondary check: doc with UID formatted as SA-${cleanEmail}
        const userEmail = (userSession.email || '').trim().toLowerCase();
        if ((!adminDoc || !adminDoc.exists()) && userEmail) {
          const saDocId = `SA-${userEmail.replace(/[^a-z0-9]/g, '_')}`;
          adminDoc = await getDocFromServer(doc(db, 'super_admins', saDocId)).catch(() => null);
        }

        // 3. Primary platform superadmin identifier
        const isPrimaryAdmin = userEmail === 'ghadgea15@gmail.com' || userSession.userId === 'superadmin_primary';

        if (isMounted) {
          const isDocActive = adminDoc && adminDoc.exists() && adminDoc.data().status === 'ACTIVE';
          const hasRole = PlatformAuthClient.isSuperAdmin(userSession);

          if (isDocActive || (isPrimaryAdmin && hasRole)) {
            setVerified(true);
          } else if (hasRole && !adminDoc?.exists()) {
            // Allow active SUPER_ADMIN role claim if doc is syncing
            setVerified(true);
          } else {
            setVerified(false);
          }
        }
      } catch (e) {
        // Fallback to claim check if Firestore is temporarily unreachable, 
        // but this should be rare with getDocFromServer
        if (isMounted) {
          const hasClaim = PlatformAuthClient.isSuperAdmin(userSession);
          setVerified(hasClaim);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    verify();
    
    return () => { isMounted = false; };
  }, [userSession, onNavigate]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-black animate-spin" />
          <p className="text-sm font-bold text-black uppercase tracking-widest">Verifying Platform Credentials</p>
        </div>
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-screen p-8 text-center bg-white">
        <div className="bg-red-50 text-red-600 p-6 rounded-full mb-6 border border-red-100">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black text-black mb-3 tracking-tight">Access Denied</h2>
        <p className="text-slate-500 font-medium mb-8 max-w-md leading-relaxed">
          Your account does not have active platform administrator privileges. 
          Unauthorized access attempts are logged and reported to the system security officer.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => onNavigate('PLATFORM_LOGIN')} 
            className="bg-black hover:bg-slate-900 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg"
          >
            Switch to Admin Account
          </button>
          <button 
            onClick={() => onNavigate('LANDING')} 
            className="text-slate-400 hover:text-slate-600 px-8 py-3 font-bold text-xs uppercase tracking-widest transition-colors"
          >
            Exit to Public Website
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserSession } from '../../types';

interface SuperAdminGateProps {
  userSession: UserSession | null;
  onNavigate: (screen: string) => void;
  children: React.ReactNode;
}

export const SuperAdminGate: React.FC<SuperAdminGateProps> = ({ userSession, onNavigate, children }) => {
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const verify = async () => {
      if (!userSession?.userId) {
        if (isMounted) { setVerified(false); setLoading(false); }
        return;
      }
      try {
        const docRef = doc(db, 'super_admins', userSession.userId);
        const snapPromise = getDoc(docRef);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), 5000)
        );

        const adminDoc = await Promise.race([snapPromise, timeoutPromise]) as any;
        if (isMounted) {
          if (adminDoc && adminDoc.exists() && adminDoc.data().status === 'ACTIVE') {
            setVerified(true);
          } else {
            setVerified(false);
          }
        }
      } catch (e) {
        if (isMounted) setVerified(false);
      }
      if (isMounted) setLoading(false);
    };
    verify();
    
    return () => { isMounted = false; };
  }, [userSession]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center p-8 text-slate-500 font-medium">Verifying Platform Credentials...</div>;
  }

  if (!verified) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50 dark:bg-slate-900">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-full mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">You do not have active platform administrator privileges. This incident has been logged.</p>
        <button 
          onClick={() => onNavigate('ENTERPRISE_DASHBOARD')} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

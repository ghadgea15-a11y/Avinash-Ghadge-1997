import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface SuperAdminAuth {
  user: User | null;
  isSuperAdmin: boolean;
  loading: boolean;
}

const SuperAdminAuthContext = createContext<SuperAdminAuth>({
  user: null,
  isSuperAdmin: false,
  loading: true,
});

export const SuperAdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const adminDocRef = doc(db, 'super_admins', currentUser.uid);
          const snapPromise = getDoc(adminDocRef);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT')), 5000)
          );

          const adminDoc = await Promise.race([snapPromise, timeoutPromise]) as any;
          
          if (adminDoc && adminDoc.exists() && adminDoc.data().status === 'ACTIVE') {
            setUser(currentUser);
            setIsSuperAdmin(true);
          } else {
            setUser(null);
            setIsSuperAdmin(false);
          }
        } catch (e) {
          setUser(null);
          setIsSuperAdmin(false);
        }
      } else {
        setUser(null);
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <SuperAdminAuthContext.Provider value={{ user, isSuperAdmin, loading }}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
};

export const useSuperAdmin = () => useContext(SuperAdminAuthContext);

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
        // Verify Super Admin status in Firestore
        const adminDocRef = doc(db, 'super_admins', currentUser.uid);
        const adminDoc = await getDoc(adminDocRef);
        
        if (adminDoc.exists() && adminDoc.data().status === 'ACTIVE') {
          setUser(currentUser);
          setIsSuperAdmin(true);
        } else {
          // Normal user or inactive admin trying to access Super Admin panel
          setUser(null);
          setIsSuperAdmin(false);
          await auth.signOut(); // Kick them out of this session
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

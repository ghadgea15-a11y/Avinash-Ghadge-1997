const code = `
  static async saveLeavePolicy(companyId: string, policy: import('../types').LeavePolicyRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'leavePolicies', policy.id);
      await setDoc(ref, { ...policy, companyId, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      console.error('[Firestore] saveLeavePolicy error:', err);
      return false;
    }
  }
`;

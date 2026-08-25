sed -i '8775i \
  static async getRegions(companyId: string): Promise<any[]> {\
    try {\
      const colRef = collection(db, "companies", companyId, "regions");\
      const snap = await getDocs(colRef);\
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));\
    } catch (err) {\
      console.warn("[Firestore] getRegions error:", err);\
      return [];\
    }\
  }\
\
  static async saveRegion(companyId: string, region: any): Promise<boolean> {\
    try {\
      const ref = doc(db, "companies", companyId, "regions", region.id);\
      await setDoc(ref, {\
        ...region, companyId,\
        updatedAt: new Date().toISOString()\
      }, { merge: true });\
      return true;\
    } catch (err) {\
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/regions/${region.id}`);\
      return false;\
    }\
  }' src/services/firestoreService.ts

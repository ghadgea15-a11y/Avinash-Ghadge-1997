import sys

with open('src/services/firestoreService.ts', 'r') as f:
    code = f.read()

target_str = """  static async recordPhysicalAssetAudit(
    companyId: string,
    asset: AssetRecord,
    auditData: {
      condition: AssetCondition;
      verifiedLocation: string;
      notes?: string;
    },
    actor: { uid: string; name: string }
  ): Promise<boolean> {"""

start_idx = code.find(target_str)
if start_idx == -1:
    print("Not found target_str")
    sys.exit(1)

end_marker = "handleFirestoreError(err, OperationType.WRITE, assetPath);"
end_idx_raw = code.find(end_marker, start_idx)
if end_idx_raw == -1:
    print("Not found end_marker")
    sys.exit(1)

end_idx = code.find('}', end_idx_raw) + 1
next_end_idx = code.find('}', end_idx) + 1

replacement = """  static async recordPhysicalAssetAudit(
    companyId: string,
    asset: AssetRecord,
    auditData: {
      condition: AssetCondition;
      verifiedLocation: string;
      notes?: string;
    },
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const assetPath = `companies/${companyId}/assets/${asset.id}`;

    try {
      await runTransaction(db, async (t) => {
        const assetRef = doc(db, 'companies', companyId, 'assets', asset.id);
        const assetSnap = await t.get(assetRef);
        
        if (!assetSnap.exists()) {
          throw new Error('Asset not found');
        }
        
        const assetData = assetSnap.data() as AssetRecord;
        
        const updatedAsset: Partial<AssetRecord> = {
          condition: auditData.condition,
          lastAuditDate: now,
          lastAuditedBy: actor.name,
          warehouseLocation: auditData.verifiedLocation,
          updatedAt: now
        };
        
        t.update(assetRef, updatedAsset);
        
        const movementId = `AUD-${Date.now()}`;
        const movementRef = doc(db, 'companies', companyId, 'asset_movements', movementId);
        
        const movementPayload: AssetMovementHistoryRecord = {
          id: movementId,
          companyId,
          assetId: asset.id,
          assetCode: asset.assetCode,
          assetName: asset.assetName,
          action: 'AUDIT_VERIFIED',
          siteId: assetData.siteId,
          siteName: assetData.siteName,
          conditionAtAction: auditData.condition,
          performedByUid: actor.uid,
          performedByName: actor.name,
          remarks: auditData.notes || `Physical verification completed at ${auditData.verifiedLocation}`,
          timestamp: now
        };
        
        t.set(movementRef, movementPayload);
        
        const auditRec = AuditTrailService.buildAuditRecord(
          { userId: actor.uid, companyId },
          companyId,
          'EAM',
          'ASSET_AUDIT',
          'UPDATE',
          'AssetRecord',
          asset.id,
          true,
          'MEDIUM',
          movementId,
          `Verified asset ${asset.assetName} (${asset.assetCode}) at ${auditData.verifiedLocation}`,
          undefined,
          { auditData, assetId: asset.id }
        );
        
        if (auditRec) {
          const auditRef = doc(db, 'companies', companyId, 'audit_logs', auditRec.id);
          t.set(auditRef, auditRec);
        }
      });
      return true;
    } catch (err: any) {
      console.error('[FirestoreService] recordPhysicalAssetAudit error:', err);
      handleFirestoreError(err, OperationType.WRITE, assetPath);
      return false;
    }
  }"""

new_code = code[:start_idx] + replacement + code[next_end_idx:]
with open('src/services/firestoreService.ts', 'w') as f:
    f.write(new_code)
print("Success")

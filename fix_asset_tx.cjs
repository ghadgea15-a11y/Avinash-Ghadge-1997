const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const targetStr = \`  static async assignAssetCustody(
    companyId: string,
    asset: AssetRecord,
    assignment: {
      employeeId: string;
      employeeName: string;
      siteId?: string;
      siteName?: string;
      expectedReturnDate?: string;
      condition: AssetCondition;
      remarks?: string;
    },
    actor: { uid: string; name: string }
  ): Promise<boolean> {\`;

if (!code.includes(targetStr)) {
  console.log("Could not find assignAssetCustody start string.");
  process.exit(1);
}

const replacement = \`  static async assignAssetCustody(
    companyId: string,
    asset: AssetRecord,
    assignment: {
      employeeId: string;
      employeeName: string;
      siteId?: string;
      siteName?: string;
      expectedReturnDate?: string;
      condition: AssetCondition;
      remarks?: string;
    },
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    try {
      await runTransaction(db, async (t) => {
        const assetRef = doc(db, 'companies', companyId, 'assets', asset.id);
        const assetSnap = await t.get(assetRef);
        if (!assetSnap.exists()) {
          throw new Error('Asset not found');
        }
        
        const assetData = assetSnap.data() as AssetRecord;
        if (assetData.status !== 'AVAILABLE' && assetData.status !== 'REPAIRED' && assetData.status !== 'NEW') {
          throw new Error(\`Asset cannot be assigned. Current status is \${assetData.status}\`);
        }
        
        const updatedAsset: Partial<AssetRecord> = {
          status: 'ASSIGNED',
          condition: assignment.condition,
          assignedEmployeeId: assignment.employeeId,
          assignedEmployeeName: assignment.employeeName,
          assignedDate: now,
          expectedReturnDate: assignment.expectedReturnDate || '',
          siteId: assignment.siteId || asset.siteId || '',
          siteName: assignment.siteName || asset.siteName || '',
          updatedAt: now
        };
        
        t.update(assetRef, updatedAsset);
        
        const movementId = \`MOV-\${Date.now()}\`;
        const movementPayload: AssetMovementHistoryRecord = {
          id: movementId,
          companyId,
          assetId: asset.id,
          assetCode: asset.assetCode,
          assetName: asset.assetName,
          movementType: 'CHECK_OUT',
          fromEntity: 'STORE',
          toEntity: 'EMPLOYEE',
          toId: assignment.employeeId,
          toName: assignment.employeeName,
          condition: assignment.condition,
          remarks: assignment.remarks,
          performedByUid: actor.uid,
          performedByName: actor.name,
          createdAt: now
        };
        const movRef = doc(db, 'companies', companyId, 'asset_movements', movementId);
        t.set(movRef, movementPayload);
        
        const auditRec = AuditTrailService.buildAuditRecord(
          { userId: actor.uid, companyId },
          companyId,
          'EAM',
          'ASSET_CHECK_OUT',
          'UPDATE',
          'AssetRecord',
          asset.id,
          true,
          'MEDIUM',
          movementId,
          \`Issued asset \${asset.assetName} (\${asset.assetCode}) to \${assignment.employeeName}\`,
          undefined,
          { assignment, assetId: asset.id }
        );
        if (auditRec) {
          const auditRef = doc(db, 'companies', companyId, 'audit_logs', auditRec.id);
          t.set(auditRef, auditRec);
        }
      });
      return true;
    } catch (err) {
      console.error('[FirestoreService] assignAssetCustody error:', err);
      return false;
    }
  }\`;

const startIdx = code.indexOf(targetStr);
const endMarker = \`console.error('[FirestoreService] assignAssetCustody error:', err);\`;
const endIdxRaw = code.indexOf(endMarker, startIdx);
const endIdx = code.indexOf('}', endIdxRaw) + 1; // catch close
const nextEndIdx = code.indexOf('}', endIdx) + 1; // method close

const newCode = code.substring(0, startIdx) + replacement + code.substring(nextEndIdx);

fs.writeFileSync('src/services/firestoreService.ts', newCode);

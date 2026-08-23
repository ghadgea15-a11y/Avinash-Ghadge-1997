# Production Data Integrity & Safe Migration Plan

## 1. Detection Phase
A diagnostic script `scripts/audit_production_data.ts` has been committed. It uses `firebase-admin` to deeply crawl the production database and safely identify:
- Orphaned Employee records.
- Documents mapped to a missing or invalid `companyId`.
- Users with broken `memberships` cross-tenant subcollections.
- Duplicate tenant configurations sharing the same `companyId` code.

## 2. Backup & Disaster Recovery Strategy
Before any migration executes, perform a full GCP-native snapshot:

**Firestore Backup Command:**
```bash
gcloud firestore export gs://log-sheet-af97a-backups/firestore_$(date +%s)
```

**Firebase Storage Backup Command:**
```bash
gcloud storage cp -R gs://log-sheet-af97a.firebasestorage.app gs://log-sheet-af97a-backups/storage_$(date +%s)
```

**Configuration Backups:**
- Export Firebase Auth Users (for UID preservation):
  `firebase auth:export auth_backup.json --format=json`

**Recovery Test:**
Spin up a Firebase Local Emulator or a secondary sandbox project, run `gcloud firestore import gs://log-sheet-af97a-backups/...` and verify data matches perfectly prior to touching production.

## 3. Safe Migration Architecture
Once the diagnostic script `audit-report.json` is generated, the cleanup script will execute using zero-destructive principles:
1. **Never delete.** Instead, update the status field of orphaned users or invalid memberships to `status: 'ARCHIVED_ORPHAN'` or `isSuspended: true`.
2. All changes will be logged to the immutable `platform_audit` collection.
3. Batch commits will be constrained to batches of 500 max to prevent transaction timeouts.
4. **Tenant Isolation:** Changes only apply to anomalous data. Operational data remains intact.

## 4. Security Verification
Zero-Trust RBAC and Multi-Tenant Isolation rules are strictly enforced in `firestore.rules`.
- `hasMembership(companyId)` prevents cross-tenant sniffing.
- Validated via automated Security Rules Emulators (available in `tests/rules/`).

## 5. Next Actions for Super Admin
1. Setup Application Default Credentials (`GOOGLE_APPLICATION_CREDENTIALS`).
2. Run the detection script: `npx tsx scripts/audit_production_data.ts`
3. Inspect `audit-report.json`.
4. Proceed to Phase 2 Migration Script (once explicitly approved).

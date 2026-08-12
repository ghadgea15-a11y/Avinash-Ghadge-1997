# LOG SHEET MUSTER — PHASE 38: ENTERPRISE AI CAMERA INTEGRATION MODULE (100% COMPLETE)

Enterprise-grade, production-ready AI Camera Integration Module for Log Sheet Muster. Processes RTSP CCTV streams across high-security sites to detect PPE non-compliance (missing helmet, uniform, high-vis jacket), perimeter breaches, unauthorized guard sleeping/absence at post, and crowd accumulation using edge AI and Cloud Vision models.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All AI Camera Integration collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/aiCameraStreams/{streamId}
/companies/{cid}/aiCameraEvents/{eventId}
```

### 1.1 `aiCameraEvents` (AI Violation & Security Alert Logs)
* **Path:** `/companies/{companyId}/aiCameraEvents/{eventId}`
* **Document ID:** `AIEVT-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `eventId` | String | Yes | Unique Event ID |
| `companyId` | String | Yes | Tenant isolation key |
| `siteId` | String | Yes | Site Location ID |
| `cameraId` | String | Yes | Camera Identifier e.g. `"CAM-GATE-01"` |
| `detectionType` | String | Yes | Enum: `'PPE_VIOLATION' \| 'PERIMETER_BREACH' \| 'GUARD_SLEEPING_ABSENT' \| 'UNAUTHORIZED_ENTRY' \| 'CROWD_GATHERING'` |
| `confidenceScore` | Number | Yes | AI confidence percentage (e.g. `0.94`) |
| `snapshotStorageId` | String | Yes | Captured image artifact ID in Storage |
| `severity` | String | Yes | Enum: `'INFO' \| 'WARNING' \| 'CRITICAL'` |
| `status` | String | Yes | Enum: `'NEW' \| 'ACKNOWLEDGED' \| 'VERIFIED_FALSE_POSITIVE' \| 'RESOLVED'` |
| `acknowledgedByUserId` | String | Optional | Operator User ID acknowledging alert |
| `detectedAt` | Timestamp | Yes | Detection timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

1. **Real-time Edge Alert Processing**: Edge RTSP gateway analyzes frames -> Triggers webhook event to backend upon breach -> Creates `aiCameraEvents` doc -> Dispatches push notification to field supervisor within 3 seconds via Notification Engine (Phase 15).
2. **Auto Ticket Escalation**: Critical PPE or Guard Sleeping events auto-open a Ticket Management issue (Phase 27) with snapshot attachment.

---

## 3. FIRESTORE SECURITY RULES

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /aiCameraEvents/{eventId} {
        allow read: if sameCompany(cid) && (opsTier() || mgmtTier());
        allow write: if sameCompany(cid) && mgmtTier();
      }
    }
  }
}
```

---

**End of Phase 38: Enterprise AI Camera Integration Module.**

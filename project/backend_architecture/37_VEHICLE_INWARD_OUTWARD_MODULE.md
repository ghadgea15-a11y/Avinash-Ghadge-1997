# LOG SHEET MUSTER — PHASE 37: ENTERPRISE VEHICLE INWARD & OUTWARD MODULE (100% COMPLETE)

Enterprise-grade, production-ready Vehicle Inward & Outward Module for Log Sheet Muster. Digitizes commercial cargo, client supply truck, and visitor vehicle entry/exit registers at industrial site gates with ANPR license plate OCR, driver document checks, seal/cargo photography, and turnaround time (TAT) analytics.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Vehicle Inward & Outward collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/vehicleEntries/{entryId}
/companies/{cid}/vehicleEntryPhotos/{photoId}
```

### 1.1 `vehicleEntries` (Gate Vehicle Entry Register)
* **Path:** `/companies/{companyId}/vehicleEntries/{entryId}`
* **Document ID:** `VENT-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `entryId` | String | Yes | Unique Entry ID |
| `companyId` | String | Yes | Tenant isolation key |
| `siteId` | String | Yes | Site Location ID |
| `vehicleNumber` | String | Yes | Registration Plate e.g., `"MH04AB5678"` |
| `vehicleCategory` | String | Yes | Enum: `'CARGO_TRUCK' \| 'TANKER' \| 'CONTAINER' \| 'SUPPLIER_VAN' \| 'VISITOR_CAR' \| 'TWO_WHEELER'` |
| `driverName` | String | Yes | Driver Name |
| `driverPhone` | String | Yes | Driver Mobile Number |
| `driverLicenseNumber` | String | Optional | Driving License No. |
| `purpose` | String | Yes | Enum: `'MATERIAL_UNLOADING' \| 'MATERIAL_LOADING' \| 'VISITOR' \| 'MAINTENANCE'` |
| `challanLrNumber` | String | Optional | Delivery Challan / Lorry Receipt No. |
| `grossWeightKg` | Number | Optional | Inward weighbridge gross weight |
| `tareWeightKg` | Number | Optional | Outward weighbridge tare weight |
| `netWeightKg` | Number | Optional | `grossWeightKg - tareWeightKg` |
| `cargoPhotoStorageIds` | Array<String> | Optional | Uploaded cargo & seal photos |
| `entryTime` | Timestamp | Yes | Gate inward timestamp |
| `exitTime` | Timestamp | Optional | Gate outward timestamp |
| `turnaroundMinutes` | Number | Optional | Total duration spent inside site in minutes |
| `status` | String | Yes | Enum: `'INSIDE_SITE' \| 'COMPLETED' \| 'FLAGGED_ALERT'` |
| `gateGuardUserId` | String | Yes | Guard User ID handling gate |

---

## 2. BUSINESS LOGIC & WORKFLOWS

1. **ANPR License Plate & OCR Capture**: Guard captures truck plate via mobile camera -> OCR auto-populates `vehicleNumber`.
2. **Turnaround Time (TAT) Tracking**: System calculates `turnaroundMinutes`. Vehicles remaining inside site >4 hours automatically trigger an alert for site security supervisor.

---

## 3. FIRESTORE SECURITY RULES

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /vehicleEntries/{entryId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow create: if sameCompany(cid) && opsTier();
        allow update: if sameCompany(cid) && opsTier();
      }
    }
  }
}
```

---

**End of Phase 37: Enterprise Vehicle Inward & Outward Module.**

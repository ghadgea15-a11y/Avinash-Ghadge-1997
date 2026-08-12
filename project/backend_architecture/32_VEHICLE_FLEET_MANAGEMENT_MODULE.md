# LOG SHEET MUSTER — PHASE 32: ENTERPRISE VEHICLE FLEET MANAGEMENT MODULE (100% COMPLETE)

Enterprise-grade, production-ready Vehicle Fleet Management Module for Log Sheet Muster. Manages company & site operational patrol vehicles, ambulances, armored cash vans, supervisors' bikes, driver allocations, trip approvals, fuel logs, maintenance schedules, insurance/PUC/fitness expiry tracking, challans, and real-time GPS telemetry.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Vehicle Fleet Management collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/vehicles/{vehicleId}
/companies/{cid}/vehicleDrivers/{driverId}
/companies/{cid}/vehicleTrips/{tripId}
/companies/{cid}/vehicleFuelLogs/{fuelLogId}
/companies/{cid}/vehicleMaintenanceLogs/{maintLogId}
/companies/{cid}/vehiclePermitsAndInsurances/{permitId}
/companies/{cid}/vehicleChallans/{challanId}
/companies/{cid}/vehicleGpsTelemetry/{telemetryId}
```

### 1.1 `vehicles` (Fleet Master Registry)
* **Path:** `/companies/{companyId}/vehicles/{vehicleId}`
* **Document ID:** `VEH-{registrationNumber}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `vehicleId` | String | Yes | Unique Vehicle ID e.g. `VEH-MH02EE1234` |
| `companyId` | String | Yes | Tenant isolation key |
| `registrationNumber` | String | Yes | State RTO Plate Number e.g., `"MH02EE1234"` |
| `vehicleType` | String | Yes | Enum: `'PATROL_BIKE' \| 'PATROL_FOUR_WHEELER' \| 'ARMORED_CASH_VAN' \| 'AMBULANCE' \| 'STAFF_BUS'` |
| `makeModel` | String | Yes | E.g. `"Mahindra Bolero 2024"`, `"Hero Splendor+"` |
| `chassisNumber` | String | Yes | Chassis VIN |
| `engineNumber` | String | Yes | Engine Number |
| `branchId` | String | Yes | Managing Branch |
| `assignedSiteId` | String | Optional | Stationed Site ID |
| `assignedDriverUserId` | String | Optional | Default Driver Employee User ID |
| `fuelType` | String | Yes | Enum: `'DIESEL' \| 'PETROL' \| 'CNG' \| 'ELECTRIC'` |
| `currentOdometerKm` | Number | Yes | Current odometer reading in KM |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'ON_TRIP' \| 'IN_MAINTENANCE' \| 'DECOMMISSIONED'` |
| `pucExpiryDate` | Timestamp | Yes | PUC expiration timestamp |
| `insuranceExpiryDate` | Timestamp | Yes | Insurance policy expiration timestamp |
| `fitnessExpiryDate` | Timestamp | Yes | Fitness Certificate expiry timestamp |
| `permitExpiryDate` | Timestamp | Yes | Commercial Permit expiry timestamp |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `updatedAt` | Timestamp | Yes | Last updated timestamp |

### 1.2 `vehicleTrips` (Patrol & Official Trip Logs)
* **Path:** `/companies/{companyId}/vehicleTrips/{tripId}`
* **Document ID:** `TRIP-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `tripId` | String | Yes | Unique Trip ID |
| `companyId` | String | Yes | Tenant isolation key |
| `vehicleId` | String | Yes | Reference to `vehicles` |
| `driverUserId` | String | Yes | Driver User ID |
| `purpose` | String | Yes | Enum: `'NIGHT_PATROL' \| 'CLIENT_VISIT' \| 'EMERGENCY_RESPONSE' \| 'CASH_TRANSIT' \| 'GUARD_PICKUP'` |
| `startOdometerKm` | Number | Yes | Opening odometer reading |
| `endOdometerKm` | Number | Optional | Closing odometer reading |
| `totalDistanceKm` | Number | Optional | `endOdometerKm - startOdometerKm` |
| `startTime` | Timestamp | Yes | Departure timestamp |
| `endTime` | Timestamp | Optional | Arrival timestamp |
| `startGeoPoint` | Map | Yes | Departure GPS location |
| `endGeoPoint` | Map | Optional | Arrival GPS location |
| `approvedByUserId` | String | Yes | Supervisor User ID |
| `status` | String | Yes | Enum: `'REQUESTED' \| 'IN_PROGRESS' \| 'COMPLETED' \| 'CANCELLED'` |

### 1.3 `vehicleFuelLogs` (Fuel Expense & Mileage Tracking)
* **Path:** `/companies/{companyId}/vehicleFuelLogs/{fuelLogId}`
* **Document ID:** `FUEL-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `fuelLogId` | String | Yes | Unique Fuel Log ID |
| `companyId` | String | Yes | Tenant isolation key |
| `vehicleId` | String | Yes | Reference to `vehicles` |
| `driverUserId` | String | Yes | User ID refueling |
| `odometerKm` | Number | Yes | Odometer reading at time of fueling |
| `liters` | Number | Yes | Quantity of fuel filled |
| `ratePerLiter` | Number | Yes | Unit price |
| `totalCost` | Number | Yes | `liters * ratePerLiter` |
| `receiptStorageFileId` | String | Yes | Uploaded gas receipt image |
| `calculatedKmpl` | Number | Optional | Efficiency ratio based on previous fuel log |
| `fueledAt` | Timestamp | Yes | Refuel timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

1. **Driver Assignment & Trip Authorization**: Field supervisor requests a trip, checking driver license validity from Document Expiry Management (Phase 29). On start, driver captures opening odometer and photo.
2. **Fuel Efficiency & Mileage Alerts**: Fuel log auto-calculates KM/Liter against vehicle baseline. Deviations >15% trigger an audit alert in Ticket Management (Phase 27).
3. **Automated Compliance Expiry Block**: If PUC, Insurance, or Fitness Certificate expires, vehicle status auto-locks to `IN_MAINTENANCE` preventing new trip assignments.

---

## 3. FIRESTORE SECURITY RULES

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /vehicles/{vehicleId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if sameCompany(cid) && opsTier();
      }
      match /vehicleTrips/{tripId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow create: if sameCompany(cid) && (opsTier() || isEmployeeUser());
        allow update: if sameCompany(cid) && (opsTier() || isEmployeeUser());
      }
      match /vehicleFuelLogs/{fuelLogId} {
        allow read: if sameCompany(cid) && (opsTier() || mgmtTier());
        allow create: if sameCompany(cid) && (opsTier() || isEmployeeUser());
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES

```json
{
  "indexes": [
    {
      "collectionGroup": "vehicles",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "branchId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "vehicleTrips",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "vehicleId", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 32: Enterprise Vehicle Fleet Management Module.**

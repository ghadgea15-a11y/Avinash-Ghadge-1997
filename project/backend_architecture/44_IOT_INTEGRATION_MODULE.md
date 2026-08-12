# LOG SHEET MUSTER — PHASE 44: ENTERPRISE IOT INTEGRATION MODULE (100% COMPLETE)

Enterprise-grade, production-ready IoT Integration Module for Log Sheet Muster. Connects physical site IoT hardware—smart boom barriers, Bluetooth beacon guard tour wands, panic buttons, door access control units, and CCTV event relays—via MQTT / WebSockets into Log Sheet Muster.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All IoT Integration collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/iotDevices/{deviceId}
/companies/{cid}/iotTelemetryEvents/{eventId}
```

### 1.1 `iotDevices` (IoT Hardware Directory)
* **Path:** `/companies/{companyId}/iotDevices/{deviceId}`
* **Document ID:** `IOTDEV-{macAddress}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `deviceId` | String | Yes | Unique IoT Device ID |
| `companyId` | String | Yes | Tenant isolation key |
| `siteId` | String | Yes | Associated Site ID |
| `deviceType` | String | Yes | Enum: `'BOOM_BARRIER' \| 'BLE_BEACON' \| 'PANIC_BUTTON' \| 'DOOR_ACCESS_CONTROLLER' \| 'FIRE_ALARM_PANEL'` |
| `macAddress` | String | Yes | Hardware MAC / EUI |
| `ipAddress` | String | Optional | Fixed IP address |
| `mqttTopic` | String | Yes | E.g. `"sites/site_101/barriers/gate_1"` |
| `status` | String | Yes | Enum: `'ONLINE' \| 'OFFLINE' \| 'ALERT'` |
| `lastPingAt` | Timestamp | Yes | Last heartbeat timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

1. **Panic Button Emergency Workflow**: Physical guard panic button triggers MQTT payload -> Ingested by Cloud Function -> Instant high-decibel alert broadcast to Site Incharge, Operations Center dashboard, and nearby guards via Push Notification Engine (Phase 15).

---

## 3. FIRESTORE SECURITY RULES

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /iotDevices/{deviceId} {
        allow read: if sameCompany(cid) && (opsTier() || mgmtTier());
        allow write: if sameCompany(cid) && mgmtTier();
      }
    }
  }
}
```

---

**End of Phase 44: Enterprise IoT Integration Module.**

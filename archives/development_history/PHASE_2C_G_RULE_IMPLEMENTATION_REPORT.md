# Phase 2C-G: Rule Implementation Report

## 1. Overview
This report details the implementation of the new claim-backed zero-trust Firestore security rules in `firestore.rules.phase2c-g`. Production `firestore.rules` remains 100% untouched.

## 2. Helper Implementation
- `isActiveUser()`: Validates that `request.auth` is present, custom claims (`cId`, `aLvl`) are populated, and account status is neither `TERMINATED` nor `SUSPENDED`.
- **A0–A3**: Company-wide data scopes with functional staff role boundaries.
- **A4**: Regional manager site-level scope via `assignedRegionId`.
- **A5/A6**: Site-in-charge and supervisor site-level scope via `assignedSiteId`, with actor/subject separation for delegated Supervisor Muster attendance.
- **A7–A9**: Ground workforce self-service scope (`employeeId == request.auth.token.employeeId`).

## 3. Production Safety Confirmation
- **Production firestore.rules**: UNCHANGED
- **Production storage.rules**: UNCHANGED
- **Production Auth**: UNCHANGED
- **Production Firestore**: UNCHANGED
- **Production Functions**: UNCHANGED

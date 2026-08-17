# Phase 2C-G: Firestore Rules Draft (Claim-Based Authorization)

## 1. Overview
This draft specifies future claim-backed Firestore security rules using `request.auth.token`.

## 2. Helper Functions Draft
```cel
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }
    function companyId() {
      return request.auth.token.cId;
    }
    function authorityLevel() {
      return request.auth.token.aLvl;
    }
    function regionId() {
      return request.auth.token.rId;
    }
    function siteId() {
      return request.auth.token.sId;
    }
    function isOwnerOrDirector() {
      return signedIn() && (authorityLevel() in ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER']);
    }
    function sameCompany(cId) {
      return signedIn() && companyId() == cId;
    }
    function sameSite(sId) {
      return signedIn() && siteId() == sId;
    }
    function sameRegion(rId) {
      return signedIn() && regionId() == rId;
    }

    // Example Company Rules
    match /companies/{companyId} {
      allow read: if signedIn() && sameCompany(companyId);
      
      match /employees/{employeeId} {
        allow read: if signedIn() && sameCompany(companyId);
        allow write: if isOwnerOrDirector() || authorityLevel() == 'A3_OFFICIAL_STAFF';
      }

      match /attendance_logs/{logId} {
        allow read: if signedIn() && sameCompany(companyId);
        allow create: if signedIn() && sameCompany(companyId) && (
          authorityLevel() in ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE', 'A6_SUPERVISOR']
        );
      }
    }
  }
}
```

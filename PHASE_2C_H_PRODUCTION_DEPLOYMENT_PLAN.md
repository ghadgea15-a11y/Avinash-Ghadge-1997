# Phase 2C-H: Production Deployment Plan (Design Only)

## 1. Overview
This document outlines the controlled deployment plan for Phase 2C Custom Token and Claim-Based Authorization. **NO PRODUCTION RESOURCES WERE MODIFIED DURING PHASE 2C-H.**

## 2. Pre-Deployment Backup & Export
- Export Firestore database via Firebase Console / gcloud CLI before deployment.
- Export Storage configuration and security rules.

## 3. Git Version Tagging
- Tag the release candidate commit: `git tag -a v2.6-auth-staging -m "Phase 2C Claim-Based Auth Candidate"`

## 4. Target Firebase Project
- Production Project: `log-sheet-af97a`

## 5. Deployment Commands (Design Only - Not Executed)
- Cloud Functions: `firebase deploy --only functions`
- Firestore Rules: `firebase deploy --only firestore:rules`
- Storage Rules: `firebase deploy --only storage`

## 6. Deployment Order
1. Deploy Cloud Functions (`generatePinToken`, `syncUserClaims`).
2. Deploy Firestore Security Rules (`firestore.rules`).
3. Deploy Storage Rules (`storage.rules`).
4. Build and deploy frontend web application.

## 7. Rollback Procedure
- **Firestore Rules**: `firebase deploy --only firestore:rules` using backup rules file (`firestore.rules.bak`).
- **Cloud Functions**: Roll back function version via Google Cloud Console / Firebase CLI history.

## 8. Post-Deployment Smoke Tests
- Verify Custom Token PIN login (`generatePinToken` -> `signInWithCustomToken`).
- Verify claim propagation (`cId`, `aLvl`, `sId`, `rId`).
- Verify cross-site and cross-company negative tests.

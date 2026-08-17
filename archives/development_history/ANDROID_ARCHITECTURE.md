# Log Sheet Muster - Native Android Architecture

This document outlines the production-ready architecture for the native Android version of **Log Sheet Muster**, designed for the Google Play Store. 

## 1. Core Stack & Technologies
* **Language:** Kotlin
* **UI Toolkit:** Jetpack Compose (Declarative UI)
* **Design System:** Material Design 3 (MD3) + Dynamic Color
* **Architecture Pattern:** MVVM (Model-View-ViewModel) + Clean Architecture
* **Dependency Injection:** Dagger Hilt
* **Asynchronous Programming:** Kotlin Coroutines & StateFlow/SharedFlow
* **Navigation:** Jetpack Navigation Compose

## 2. Firebase & Backend Infrastructure
* **Authentication:** Firebase Auth (Email/Password) + AndroidX Biometric (Fingerprint/Face)
* **Database:** Cloud Firestore (with Offline Persistence enabled)
* **Storage:** Firebase Cloud Storage (for images, documents)
* **Push Notifications:** Firebase Cloud Messaging (FCM)

## 3. Hardware & OS Integrations
* **Camera & QR Scanner:** CameraX + Google ML Kit (Barcode Scanning API)
* **Location (GPS):** Fused Location Provider Client (Google Play Services)
* **Background Sync:** WorkManager (for syncing offline logs when internet returns)
* **Permissions:** Accompanist Permissions (or native Compose permission APIs) for Camera, Location, and Notifications.

## 4. Directory Structure (Package Organization)

```text
com.enterprise.logsheetmuster
│
├── di/                     # Dagger Hilt Modules (Network, Database, Firebase)
│
├── data/                   # Data Layer
│   ├── local/              # Room DB, DataStore (Preferences), DAOs
│   ├── remote/             # Firebase data sources, Network APIs
│   └── repository/         # Repository implementations (Single source of truth)
│
├── domain/                 # Domain Layer (Business Logic)
│   ├── models/             # Pure Kotlin data classes (e.g., User, LogSheet)
│   ├── repository/         # Repository interfaces
│   └── usecases/           # specific business actions (e.g., SyncOfflineLogsUseCase)
│
├── ui/                     # Presentation Layer (Jetpack Compose)
│   ├── theme/              # Material 3 Theme, Typography, Colors (Dark/Light mode)
│   ├── navigation/         # NavHost, Routes, Destinations
│   ├── common/             # Reusable Compose components (Buttons, Cards, Dialogs)
│   │
│   ├── auth/               # Login, Biometric Prompt, Registration
│   ├── dashboard/          # Role-based main dashboard (Mobile & Tablet layouts)
│   ├── modules/            # Feature modules
│   │   ├── hrms/           # Attendance, Leaves
│   │   ├── inventory/      # Stock tracking, QR Scanning
│   │   ├── payroll/        # Payslips, Advances
│   │   └── operations/     # Incident reports, Visitor logs (Camera/GPS integration)
│   │
│   └── settings/           # Profile, Theme toggles, Sync status
│
└── workers/                # WorkManager classes (BackgroundSyncWorker)
```

## 5. Key Implementation Strategies

### A. Mobile First & Tablet Support
* **Adaptive Layouts:** Use `WindowSizeClass` (Compact, Medium, Expanded) to adapt Jetpack Compose layouts.
* **Smart UI:** On phones, use standard Bottom Navigation. On tablets (Expanded), switch to a Navigation Rail or permanent Navigation Drawer for better screen real-estate usage.

### B. Offline-First & Background Sync
* **Firestore Offline:** Enable Firestore's built-in offline caching. Reads/writes apply locally first.
* **WorkManager:** Queue critical uploads (like a clock-in with GPS or an incident report with a photo) in a Room Database. A `BackgroundSyncWorker` listens for `NetworkType.CONNECTED` to push pending local changes to Firestore reliably.

### C. Hardware Integrations
* **QR Scanner:** Use a Compose-wrapped CameraX preview. Feed frames to ML Kit's `BarcodeScanner`. Perfect for Inventory tracking and Visitor logs.
* **GPS Tracking:** Request `ACCESS_FINE_LOCATION`. When clocking in (HRMS) or logging an incident (Operations), fetch the current LatLng to attach to the Firestore document.

### D. Security & Authentication
* **Session Management:** Persist the Auth token securely.
* **Fingerprint:** Use `androidx.biometric:biometric`. After the first Firebase email/password login, offer to bind biometric authentication. Next app launch prompts for Fingerprint to auto-login.

### E. Play Store Readiness
* **App Bundles (AAB):** Build using Android App Bundles for optimized delivery.
* **Dark Mode:** Enforce across the app using Compose `isSystemInDarkTheme()`.
* **ProGuard/R8:** Enable minification and obfuscation for the release build.
* **Target API:** Target the latest Android API level (e.g., API 34+).

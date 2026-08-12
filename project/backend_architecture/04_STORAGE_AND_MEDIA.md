# Log Sheet Muster - Storage & Media Architecture

This document defines the architecture for binary data, images, and documents using **Firebase Cloud Storage**, heavily integrated with the Android client's Camera and File systems.

## 1. Storage Bucket Structure

To ensure strict multi-tenant isolation, the root folder structure always begins with the `companyId`.

```text
gs://logsheet-muster.appspot.com/
│
├── companies/
│   ├── {companyId}/
│   │   │
│   │   ├── user_profiles/
│   │   │   ├── {userId}_avatar.jpg
│   │   │
│   │   ├── attendance_selfies/
│   │   │   ├── {YYYY-MM}/
│   │   │   │   ├── {userId}_{YYYYMMDD_HHMM}.jpg
│   │   │
│   │   ├── incident_reports/
│   │   │   ├── {incidentId}/
│   │   │   │   ├── photo_1.jpg
│   │   │   │   ├── video_1.mp4
│   │   │
│   │   ├── visitor_logs/
│   │   │   ├── {YYYY-MM}/
│   │   │   │   ├── {visitorId}_face.jpg
│   │   │   │   ├── {visitorId}_id_card.jpg
│   │   │
│   │   ├── hr_documents/
│   │   │   ├── {userId}/
│   │   │   │   ├── contract.pdf
│   │   │   │   ├── medical_leave_{date}.pdf
│   │   │
│   │   └── payslips/
│   │       ├── {YYYY-MM}/
│   │       │   ├── {userId}_payslip.pdf
│
```

## 2. Storage Security Rules (`storage.rules`)

Just like Firestore, Cloud Storage must enforce tenant isolation. The rules ensure users can only read/write files within their authorized company folders.

*   **Public Access:** Strictly DENIED. All files require authentication.
*   **Tenant Isolation:** A user can only access `/companies/{companyId}/...` if they have a valid custom claim or database membership for `{companyId}`.
*   **File Type Validation:**
    *   Images (Avatars, Selfies, Incidents): Must be `image/jpeg` or `image/png`. Max size 5MB.
    *   Documents (Payslips, Contracts): Must be `application/pdf`. Max size 10MB.
    *   Videos (Incidents): Must be `video/mp4`. Max size 50MB.

## 3. Android Client Integration Strategy

### Image Capture & Compression (CameraX)
*   **Problem:** Modern Android cameras output 12MP+ images (5-10MB each). Uploading these directly consumes massive bandwidth and storage costs.
*   **Solution:** Before uploading, the Android app MUST compress images.
    *   Use Android's `BitmapFactory` or a library like `Coil` / `Luban` to downscale images to max 1080x1080 resolution.
    *   Compress to JPEG at 70-80% quality.
    *   Target file size: ~300KB - 500KB per image.

### Background Uploads
*   Uploading a 10MB video for an incident report can fail if the user switches apps or loses network.
*   **Android WorkManager:** File uploads must be dispatched to a `WorkManager` enqueue operation. 
*   **Firebase Storage Android SDK:** Utilize `UploadTask` which automatically supports pausing and resuming uploads across network changes.

### Caching
*   Images fetched from Storage (like User Avatars) should be heavily cached on the Android device using **Coil** (Coroutines Image Loader) to minimize egress costs and improve UI responsiveness.

## 4. Data Retention Lifecycle (GCP Policies)

To manage costs and comply with data privacy laws (GDPR, etc.), configure Google Cloud Storage Lifecycle policies:
*   **`attendance_selfies/`:** Delete automatically after 90 days.
*   **`visitor_logs/` (Photos):** Delete automatically after 30 days (security compliance).
*   **`payslips/` & `hr_documents/`:** Retain for 7 years (Archived/Coldline storage class after 1 year).
*   **`incident_reports/`:** Retain indefinitely until manually archived by Admin.

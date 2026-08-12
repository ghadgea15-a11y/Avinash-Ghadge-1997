# Log Sheet Muster - Firebase Mobile Setup Guide

**Project Name:** Log Sheet Muster  
**Project Owner:** Avinash Shivaji Ghadge  
**Platform:** Android (Mobile-First)  

Welcome! Since you are building an enterprise-grade app but managing it from your mobile phone, this guide is written specifically for your mobile web browser (like Chrome or Safari). 

Follow these instructions exactly as written by logging into [console.firebase.google.com](https://console.firebase.google.com) on your phone.

---

### 1. Which Firebase Services Should Be Enabled First?
To build the foundation of Log Sheet Muster, we only need three services right now:
1. **Authentication:** So owners, managers, and workers can securely log in.
2. **Firestore Database:** To store company lists, employee profiles, and attendance records.
3. **Storage:** To store profile pictures and daily log attachments.

**Why not everything?** Enabling everything at once is confusing. We want a clean, simple workspace to start.

---

### 2. Firestore Database Setup (Data Storage)
*This is where all your text data (names, attendance, roles) will live.*

1. In your Firebase project, tap the **3 horizontal lines (Menu)** at the top left.
2. Tap **Build** to expand the list.
3. Tap **Firestore Database**.
4. Tap the big **Create database** button.
5. **Location Selection:** (See Point 12 below before clicking Next).
6. **Secure rules:** It will ask about Security Rules. Select **Start in Test Mode**. 
   *Note: Test mode shows a warning that your database is open for 30 days. Don't worry, since nobody knows your app exists yet, it is safe for development. We will lock it down later.*
7. Tap **Enable**. Wait a few seconds for it to build.

---

### 3. Firebase Authentication Setup (Login System)
*This allows users to log in securely.*

1. Tap the **Menu (3 lines)** > **Build** > **Authentication**.
2. Tap the **Get Started** button.
3. You will see a tab called **Sign-in method**.
4. Under "Native Providers", tap **Email/Password**.
5. Turn on the **Enable** switch (leave "Email link" off) and tap **Save**.
6. Tap **Add new provider**.
7. Tap **Phone**.
8. Turn on the **Enable** switch and tap **Save**. 
   *(You will now see both Email/Password and Phone listed as "Enabled").*

---

### 4. Firebase Storage Setup (Files & Photos)
*This is the hard drive for profile pictures and documents.*

1. Tap the **Menu (3 lines)** > **Build** > **Storage**.
2. Tap the **Get Started** button.
3. Choose **Start in Test Mode** (same reason as Firestore) and tap **Next**.
4. The location will already be selected (it matches your database). Tap **Done**.

---

### 5. Firebase Cloud Messaging Setup (Push Notifications)
*This sends alerts to Android phones.*

- **Action:** None required right now.
- **Why:** Cloud Messaging is built into Firebase by default. You do not need to click "Enable" in the console. We will connect this via code later when we build the Android notification system.

---

### 6 to 10. Secondary Services (When to Enable)

| Service | Enable Now or Later? | Reason (Beginner Friendly Explanation) |
| :--- | :--- | :--- |
| **6. App Check** | **LATER** | App Check proves that a "real" Android phone is connecting to your database, not a hacker. However, it requires special keys from the Google Play Store. Since the app isn't on the Play Store yet, skip this. |
| **7. Analytics** | **LATER** | Tracks how many people use your app. Right now, it's just us testing. Turn this on right before you launch to real workers. |
| **8. Crashlytics** | **LATER** | Reports if the app crashes on a worker's phone. We will enable this when the app is installed on your first testing device. |
| **9. Performance Monitoring** | **LATER** | Checks if the app is slow. Keep the console clean for now. |
| **10. Remote Config** | **LATER** | Allows you to change the app's colors or text remotely without an app update. Too advanced for Phase 1. |

---

### 11. Firebase Security Rules Planning
Right now, you selected **"Test Mode"**. This means anyone with your internet link could technically read your data.
- **Our Plan:** In the next phases, we will provide you a block of text to copy and paste into the "Rules" tab.
- This block of text will act as a digital bouncer, guaranteeing that a Worker can only see their own attendance, and only you (the Owner) can see the billing.

---

### 12. Firestore Database Location Selection
*This is the most critical step because it **CANNOT BE CHANGED** later.*

When creating the Firestore database (Step 2), it asks for a location. 
- You want the server physically closest to your workers so the app is lightning fast.
- If your facility management business is in **India**, tap the dropdown and select **`asia-south1` (Mumbai)** or **`asia-south2` (Delhi)**.
- If you are in the **US**, select `nam5 (us-central)`.
- Choose carefully, then proceed.

---

### 13. Storage Bucket Location
- You do not need to worry about this. Firebase will automatically put your Storage Bucket (Photo storage) in the exact same city you chose for your Firestore Database.

---

### 14. Development Environment Settings (Your Playground)
In enterprise software, we never build the app using real company data. 
- **What it is:** The Firebase project you just set up should be treated as your "Development" (Testing) environment.
- **How to use it:** Use fake names (e.g., "Test Worker A", "Fake Site 1"). If you accidentally delete the whole database while testing, it doesn't matter!

---

### 15. Production Environment Settings (The Real Deal)
Before you give this app to your actual employees:
1. You will log into Firebase and click **Add Project**.
2. You will name it `Log Sheet Muster - LIVE`.
3. You will repeat steps 1 to 4 above in this new project.
4. **Why?** This ensures your testing experiments never accidentally mix with real payroll and attendance data.

---

### 16. What Should NOT Be Configured Yet (And Why)
Please **DO NOT** click on or enable the following features in the Firebase menu right now:

- ❌ **Cloud Functions:** Requires upgrading to a paid "Blaze" plan and writing server scripts. We will do this later when we need automated daily payroll calculations.
- ❌ **Firebase Extensions:** These are pre-packaged tools. They cost money and can complicate our clean architecture.
- ❌ **Billing/Upgrading:** Do not put your credit card in yet. Firebase gives you massive free limits (50,000 database reads per day) for free. Stay on the free "Spark" plan until you have hundreds of daily active workers.
- ❌ **Machine Learning / AI integrations:** Keep the foundation simple first. Get attendance working before adding AI features.

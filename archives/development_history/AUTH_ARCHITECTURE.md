# Log Sheet Muster - Authentication Architecture & Setup

**Project Name:** Log Sheet Muster  
**Project Owner:** Avinash Shivaji Ghadge  
**Platform:** Android (Mobile-First)

---

## 1. Authentication Architecture
The authentication system bridges Firebase's secure login with our Firestore multi-tenant database.
- **Firebase Auth (The Gatekeeper):** Handles the actual login (sending OTPs, checking passwords) and issues a secure "Token".
- **Custom Claims (The VIP Badge):** We will securely attach the user's `role` and `company_id` directly to their login token. This allows Firestore Security Rules to instantly verify if a user has access without doing expensive database lookups.
- **Firestore `/users` Collection:** A master directory linking the Firebase Auth `UID` (Unique ID) to their specific company and profile data.

## 2. Login Flow
1. **Splash Screen:** Checks if a user is already logged in. If yes, jumps to Step 5.
2. **Company Code Screen:** User enters their unique Company Code (e.g., `APX-01`).
3. **Identity Verification:** The app looks up the company, displays the company logo, and asks for Phone Number or Email.
4. **Authentication:** User enters OTP (for phone) or Password (for email).
5. **Role Routing:** The app reads the user's Role from the database and routes them to their specific dashboard (e.g., Super Admin sees all stats, Worker sees a big "Clock In" button).

## 3. Best Authentication Providers
For an enterprise facility management app, we will use a hybrid approach:
- **Phone Number (OTP):** The absolute best choice for Workers, Supervisors, and Incharges. They don't need to remember passwords, and phone numbers are verified identities.
- **Email & Password:** Best for Company Owners, Super Admins, Admins, and HR. Management usually prefers using corporate email addresses and secure passwords.

## 4. Company Code Login Strategy
By asking for the **Company Code** *before* the phone number, we achieve true enterprise isolation:
- If a worker works for "Apex Services", they enter `APX-01`.
- The app locks itself into the "Apex" environment.
- When they enter their phone number, the app only checks the "Apex" employee list. This prevents errors where two different companies might accidentally hire the same contract worker.

## 5. Worker Login Strategy (For Workers Without Phones)
Not every housekeeping or garden staff member has a smartphone, or they may not bring it to the site.
- **Solution: "Supervisor Proxy Mode"**
- **How it works:** These workers do **not** get a Firebase Authentication account. They do not log in.
- Instead, they exist purely as "Employee Documents" in Firestore. 
- The **Supervisor** logs into the app on their own phone. 
- The Supervisor opens the "Team Attendance" screen, sees the list of workers assigned to their site today, and marks them Present/Absent on their behalf.

## 6. Role-Based Authentication (RBAC)
When a user logs in, Firebase generates a secure token. We will inject "Claims" into this token.
- **Super Admin Token:** `{ role: "super_admin" }`
- **Admin Token:** `{ role: "admin", company_id: "CMP-001" }`
- **Worker Token:** `{ role: "worker", company_id: "CMP-001", site_id: "SIT-005" }`
This guarantees mathematically that a worker at Site 5 cannot even *request* data from Site 6, because the database rules will instantly reject the request based on the token.

---

## 7. Firebase Console Setup - STEP 1 (Authentication)
We need to enable the login providers in your Firebase project. Please follow these exact steps on your mobile phone:

1. Open your Firebase Console and go to your **Log Sheet Muster** project.
2. Tap the **Menu (3 horizontal lines)** at the top left.
3. Tap **Build** to expand the menu, then tap **Authentication**.
4. Tap the **Get Started** button.
5. You are now on the "Sign-in method" tab. Under "Native providers", tap **Email/Password**.
6. Turn on the **Enable** toggle switch (leave "Email link" turned off) and tap **Save**.
7. You will be taken back to the list. Tap **Add new provider**.
8. Tap **Phone**.
9. Turn on the **Enable** toggle switch and tap **Save**.

**(You should now see both "Email/Password" and "Phone" listed under "Sign-in providers" with the status "Enabled").**

---
**Action Required:**
Please confirm in the chat once you have completed **Step 1** and see both Phone and Email enabled. Do not proceed to any other settings until you confirm.

# PlateConnect — Smart Surplus Food Matching & Distribution System

PlateConnect is a campus-scale food recovery and surplus matching management platform connecting **Food Providers** (dining halls, catering, cafeterias), **Receivers** (student food pantries, basic needs centers), **Campus Volunteers** (student food recovery couriers), and **Administrators** (sustainability and food safety offices) using Google Firebase.

---

## Table of Contents

1. [How to Create a Firebase Project](#1-how-to-create-a-firebase-project)
2. [How to Register a Web Application](#2-how-to-register-a-web-application)
3. [Where to Obtain Firebase Web Configuration](#3-where-to-obtain-firebase-web-configuration)
4. [How to Configure Environment Variables](#4-how-to-configure-environment-variables)
5. [How to Enable Email/Password Authentication](#5-how-to-enable-emailpassword-authentication)
6. [How to Create the Cloud Firestore Database](#6-how-to-create-the-cloud-firestore-database)
7. [How to Enable Firebase Storage for Food Photos](#7-how-to-enable-firebase-storage)
8. [How to Deploy Firestore Security Rules](#8-how-to-deploy-firestore-security-rules)
9. [How to Deploy Firestore Indexes](#9-how-to-deploy-firestore-indexes)
10. [How to Configure and Deploy Cloud Functions](#10-how-to-configure-and-deploy-cloud-functions)
11. [How to Run the Application Locally](#11-how-to-run-the-application-locally)
12. [How to Test Each User Role](#12-how-to-test-each-user-role)
13. [How to Create the Initial Administrator Securely](#13-how-to-create-the-initial-administrator-securely)
14. [Features Requiring Additional Billing or Configuration](#14-features-requiring-additional-billing-or-configuration)

---

### 1. How to Create a Firebase Project

1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Name your project (e.g., `plateconnect-campus`).
4. (Optional) Toggle Google Analytics according to your campus privacy policy, then click **Create project**.
5. Wait for the provisioning process to complete and click **Continue**.

---

### 2. How to Register a Web Application

1. In the Firebase Console Project Overview page, click the **Web icon (`</>`)** located under "Get started by adding Firebase to your app".
2. Enter an App nickname: `PlateConnect Web`.
3. You do not need to check "Also set up Firebase Hosting" if running in AI Studio or another host.
4. Click **Register app**.

---

### 3. Where to Obtain Firebase Web Configuration

1. In the Firebase Console, click the **Gear Icon (Project settings)** in the left sidebar.
2. Under the **General** tab, scroll down to the **Your apps** section.
3. Select your web app card. Under **Firebase SDK snippet**, select the **Config** radio button.
4. You will see an object containing:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

> **Security Note:** These values identify your Firebase project to the client SDK and are public. Never commit server-side private service-account JSON keys to your frontend!

---

### 4. How to Configure Environment Variables

1. Copy `.env.example` to `.env` in the root of your project:
   ```bash
   cp .env.example .env
   ```
2. Populate the variables with your values obtained from Step 3:
   ```env
   VITE_FIREBASE_API_KEY="AIzaSy..."
   VITE_FIREBASE_AUTH_DOMAIN="plateconnect-campus.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="plateconnect-campus"
   VITE_FIREBASE_STORAGE_BUCKET="plateconnect-campus.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
   VITE_FIREBASE_APP_ID="1:123456789012:web:abcdef1234567890"
   ```
3. Restart your development server (`npm run dev`) so Vite loads the new variables.

---

### 5. How to Enable Email/Password Authentication

1. In the Firebase Console sidebar, open **Build** > **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Enable the first toggle: **Email/Password**. Leave "Email link (passwordless sign-in)" disabled.
5. Click **Save**.

---

### 6. How to Create the Cloud Firestore Database

1. In the Firebase Console sidebar, click **Build** > **Firestore Database**.
2. Click **Create database**.
3. Choose a Firestore location close to your campus (e.g., `nam5 (us-central)`).
4. Start in **Production mode** (our repository provides hardened `firestore.rules`).
5. Click **Enable**.

---

### 7. How to Enable Firebase Storage

1. In the Firebase Console sidebar, click **Build** > **Storage**.
2. Click **Get Started**.
3. Accept the default security rules dialog (we will deploy `storage.rules`).
4. Select a Cloud Storage location matching your Firestore region and click **Done**.

---

### 8. How to Deploy Firestore Security Rules

Install the Firebase CLI if you haven't already:
```bash
npm install -g firebase-tools
firebase login
firebase use --add <your-project-id>
```
Deploy the security rules from `firestore.rules`:
```bash
firebase deploy --only firestore:rules
```
The rules in `firestore.rules` protect all 7 collections (`users`, `foodListings`, `foodRequests`, `pickupTasks`, `notifications`, `distributionRecords`, `auditLogs`), enforce identity integrity, and prevent self-elevation to `admin`.

---

### 9. How to Deploy Firestore Indexes

Deploy the composite indexes defined in `firestore.indexes.json`:
```bash
firebase deploy --only firestore:indexes
```
These indexes ensure low-latency ordering by deadline and status across food listings and volunteer assignments.

---

### 10. How to Configure and Deploy Cloud Functions

1. Navigate to the `functions/` directory:
   ```bash
   cd functions
   npm install
   cd ..
   ```
2. Deploy the backend functions:
   ```bash
   firebase deploy --only functions
   ```
This deploys:
- `setAdminRole`: Server-side authorization gate for promoting administrators.
- `onFoodRequestCreated`: Automated push notification trigger on claim submissions.
- `checkExpiringListings`: Hourly cron job checking surplus availability deadlines.

---

### 11. How to Run the Application Locally

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Visit `http://localhost:3000` in your browser.

#### Using Firebase Local Emulator Suite (Optional)
To test locally without connecting to live cloud resources:
```bash
firebase emulators:start
```
The Auth, Firestore, and Storage emulators will start with GUI available at `http://localhost:4000`.

---

### 12. How to Test Each User Role

PlateConnect includes a **Role Switcher** in the top navigation bar to test all user perspectives:

1. **Food Provider (`provider`)**:
   - Post surplus food listings with quantity, category, and storage temperature.
   - Upload food photos to Firebase Storage with instant preview.
   - Review and approve/decline incoming claim requests from campus pantries.
2. **Food Receiver (`receiver`)**:
   - Browse surplus listings sorted by the **SRS Smart Matching Algorithm** (Weights: Distance 30%, Quantity Compatibility 30%, Urgency 25%, Food Compatibility 15%).
   - Click **Explain Score** to inspect the mathematical breakdown.
   - Submit claim requests within available inventory limits.
3. **Campus Volunteer (`volunteer`)**:
   - Browse the **Available Campus Pool** of approved pickup tasks.
   - Claim an eligible pickup task.
   - Step through delivery milestones: *En Route to Pickup* → *Food Picked Up* → *En Route to Pantry* → *Delivered* → *Complete & Verified*.
4. **Campus Administrator (`admin`)**:
   - Real-time ESG Impact Metrics: Total rescued meals, CO2 avoided (kg), and live food surplus.
   - Export official sustainability reports in CSV format.
   - Review food safety compliance standards (Good Samaritan Act & ServSafe).
   - Inspect immutable Firestore audit logs trail.

---

### 13. How to Create the Initial Administrator Securely

**PlateConnect strictly disables self-granted admin permissions on public registration.**

To establish your first campus administrator:
1. Register a standard account via the **Sign In / Register** modal (e.g. `vaibhavpusarla@gmail.com`).
2. Click the **Firebase Setup / Demo** indicator in the navbar to open the Setup Guide.
3. Click the **Promote Current User to Administrator** button.
4. In production environments, this can also be executed via Cloud Functions (`setAdminRole`) or by directly updating the document in the Firebase Console under `users/{uid}`:
   ```json
   {
     "role": "admin"
   }
   ```

---

### 14. Features Requiring Additional Billing or Configuration

- **Cloud Functions / Cloud Scheduler**: Requires upgrading the Firebase project to the **Blaze (Pay as you go)** plan. Google provides a generous free tier of 2M invocations per month.
- **Firebase Cloud Messaging (FCM) Push Notifications**: Requires uploading Web Push VAPID certificates in Project Settings > Cloud Messaging.
- **Custom Campus Domains**: Can be configured for free via Firebase Hosting custom domain mapping with automated SSL certificates.

---

## 15. PlateConnect REST API Endpoints

PlateConnect provides a full suite of Express REST API endpoints accessible under `/api`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status, uptime, and quick metrics |
| `GET` | `/api/listings` | Query surplus food listings (`?status=`, `?foodType=`, `?urgent=true`) |
| `GET` | `/api/listings/:id` | Get single food listing by ID |
| `POST` | `/api/listings` | Post a surplus listing (for automated kitchen POS / inventory systems) |
| `PATCH` | `/api/listings/:id/status` | Update listing status (`available`, `reserved`, `closed`, `cancelled`) |
| `GET` | `/api/requests` | List food claims (`?status=`, `?receiverId=`, `?providerId=`) |
| `POST` | `/api/requests` | Submit a surplus food claim request with stock validation |
| `PATCH` | `/api/requests/:id/review` | Provider decision: accept or decline food claim request |
| `GET` | `/api/tasks` | Volunteer courier pickup tasks pool and in-transit deliveries |
| `PATCH` | `/api/tasks/:id/progress` | Advance volunteer delivery status (`en_route_pickup`, `picked_up`, etc.) |
| `POST` | `/api/match` | Compute SRS 30/30/25/15 smart matching formula with factor explanations |
| `GET` | `/api/analytics` | Sustainability ESG metrics (meals rescued, CO2 avoided kg) |
| `GET` | `/api/export/csv` | Download official distribution records in CSV spreadsheet format |
| `GET` | `/api/docs` | Machine-readable JSON catalogue of all PlateConnect API routes |

You can explore and test all endpoints interactively within the app using the **REST API** button in the top navigation bar.


# PlateConnect fixes and deployment notes

## Included in this update
- Added a full-page sign-in / create-account gate. Registration supports Food Provider, Food Receiver, and Volunteer; admin cannot be selected publicly.
- Sign-out now clears local user/profile state even if Firebase sign-out errors, so the login page is shown again.
- Replaced `/src/assets/...` hard-coded image paths with Vite asset imports so bundled images load after deployment.
- Old development image paths are mapped to bundled assets; expired `blob:` URLs use a safe fallback image.
- Removed temporary browser-only `blob:` URLs from persistent food listing uploads.

## Required for real accounts and persistent uploads
1. Add the six `VITE_FIREBASE_*` values from your Firebase Web App config to your local `.env` and to Vercel Project Settings → Environment Variables. Use the exact names shown in `.env.example`.
2. In Firebase Console → Authentication → Sign-in method, enable **Email/Password**.
3. Create/enable Firestore and deploy the repository's `firestore.rules`.
4. Enable Firebase Storage and deploy `storage.rules`. Firebase Storage may require upgrading the Firebase project to the Blaze plan; if your project is still on Spark and Storage is unavailable, image uploads will not persist until Storage is enabled.
5. Redeploy the Vercel project after adding environment variables.

## Important
Without Firebase configuration, the app can only run its local/demo behavior; it cannot create real persistent accounts shared across devices. Old `blob:` image links saved in Firestore cannot be recovered because they were temporary browser URLs; those food listings need their photos uploaded again.

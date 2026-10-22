import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Read configuration strictly from Vite client-side environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if valid Firebase configuration is present
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'MY_FIREBASE_API_KEY' &&
  firebaseConfig.projectId !== 'MY_PROJECT_ID' &&
  !firebaseConfig.apiKey.includes('placeholder')
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);
  } catch (error) {
    console.error('PlateConnect: Error initializing Firebase SDK:', error);
  }
} else {
  console.info(
    'PlateConnect: Firebase configuration is missing or incomplete in environment variables. Running in guided demonstration mode. Provide VITE_FIREBASE_* variables to connect live project.'
  );
}

export const firebaseApp = app;
export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;
export const storage = storageInstance as FirebaseStorage;

// Connection test helper as specified in Firebase Integration guidelines
export async function testFirestoreConnection(): Promise<{ connected: boolean; message: string }> {
  if (!dbInstance) {
    return {
      connected: false,
      message: 'Firebase is not initialized. Please verify your VITE_FIREBASE_* environment variables.',
    };
  }

  try {
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
    return { connected: true, message: 'Connected to Firestore successfully.' };
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('the client is offline')) {
      console.warn('PlateConnect: Firestore client is offline or network is unavailable.');
      return { connected: false, message: 'Client is offline. Please check your network and Firebase config.' };
    }
    // Note: A "permission-denied" on 'test/connection' means Firestore is reached and rules are active!
    if (errorMsg.includes('permission-denied') || errorMsg.includes('Missing or insufficient permissions')) {
      return { connected: true, message: 'Connected to Firestore (Security rules active).' };
    }
    return { connected: false, message: `Connection test response: ${errorMsg}` };
  }
}

// Hardened Error handler conforming to Firebase Integration guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = authInstance?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.uid || null,
      email: currentAuth?.email || null,
      emailVerified: currentAuth?.emailVerified || null,
      isAnonymous: currentAuth?.isAnonymous || null,
      tenantId: currentAuth?.tenantId || null,
      providerInfo:
        currentAuth?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

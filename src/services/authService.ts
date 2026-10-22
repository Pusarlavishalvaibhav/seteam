import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { getUserProfile, createUserProfile } from './firestoreService';
import { UserProfile, UserRole } from '../types';

const DEMO_ACCOUNTS_STORAGE_KEY = 'plateconnect_demo_accounts_v1';
function readDemoAccounts(): Array<{ email: string; password: string; profile: UserProfile }> {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DEMO_ACCOUNTS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveDemoAccount(account: { email: string; password: string; profile: UserProfile }): void {
  if (typeof window === 'undefined') return;
  const accounts = readDemoAccounts().filter((item) => item.email.toLowerCase() !== account.email.toLowerCase());
  accounts.push(account);
  window.localStorage.setItem(DEMO_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

export interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isDemoMode: boolean;
}

/**
 * Register a new user with Firebase Authentication and initialize their profile in Firestore.
 * Explicitly rejects self-granted 'admin' role on public registration.
 */
export async function registerWithEmailPassword(
  email: string,
  pass: string,
  name: string,
  role: 'provider' | 'receiver' | 'volunteer',
  extraDetails?: {
    phone?: string;
    departmentOrOrg?: string;
    campusBuilding?: string;
    campusZone?: string;
    capacityMeals?: number;
    preferredFoodTypes?: string[];
  }
): Promise<UserProfile> {
  // Hard guard against privilege escalation
  if ((role as any) === 'admin') {
    throw new Error('Security Violation: Administrator accounts cannot be registered via public registration.');
  }

  if (!isFirebaseConfigured || !auth) {
    // Demo Mode Registration
    const newUid = `user_${Date.now()}`;
    const newProfile: UserProfile = {
      uid: newUid,
      name,
      email,
      role,
      accountStatus: 'active',
      contactInformation: {
        phone: extraDetails?.phone || '',
        departmentOrOrg: extraDetails?.departmentOrOrg || '',
        campusBuilding: extraDetails?.campusBuilding || '',
      },
      location: {
        latitude: 37.775,
        longitude: -122.418,
        campusZone: extraDetails?.campusZone || 'Central Campus',
      },
      capacityMeals: extraDetails?.capacityMeals || (role === 'receiver' ? 40 : undefined),
      preferredFoodTypes: extraDetails?.preferredFoodTypes || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createUserProfile(newProfile);
    saveDemoAccount({ email: email.toLowerCase(), password: pass, profile: newProfile });
    return newProfile;
  }

  // Real Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const user = userCredential.user;

  const profile: UserProfile = {
    uid: user.uid,
    name,
    email: user.email || email,
    role,
    accountStatus: 'active',
    contactInformation: {
      phone: extraDetails?.phone || '',
      departmentOrOrg: extraDetails?.departmentOrOrg || '',
      campusBuilding: extraDetails?.campusBuilding || '',
    },
    location: {
      latitude: 37.775,
      longitude: -122.418,
      campusZone: extraDetails?.campusZone || 'Central Campus',
    },
    capacityMeals: extraDetails?.capacityMeals || (role === 'receiver' ? 40 : undefined),
    preferredFoodTypes: extraDetails?.preferredFoodTypes || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await createUserProfile(profile);
  } catch (profileError) {
    console.error('PlateConnect: User created in Auth but profile write failed:', profileError);
    // Return profile in-memory so user is not locked out, while profile can be synced later
  }

  return profile;
}

/**
 * Log in with Email and Password
 */
export async function loginWithEmailPassword(email: string, pass: string): Promise<UserProfile> {
  if (!isFirebaseConfigured || !auth) {
    // Demo mode: allow login only for accounts registered in this browser,
    // and require both the registered email and its matching password.
    // This local demo store is for development only, not production security.
    const normalizedEmail = email.trim().toLowerCase();
    const savedAccount = readDemoAccounts().find(
      (account) => account.email.trim().toLowerCase() === normalizedEmail && account.password === pass
    );
    if (savedAccount) return savedAccount.profile;

    throw new Error('No registered account found for this email, or the password is incorrect. Please register first or check your credentials.');
  }

  const credential = await signInWithEmailAndPassword(auth, email, pass);
  const user = credential.user;

  // Retrieve user profile from Firestore
  let profile = await getUserProfile(user.uid);

  // Handle case where Auth account exists but Firestore profile is missing
  if (!profile) {
    console.warn('PlateConnect: Auth account exists without Firestore document. Bootstrapping profile...');
    profile = {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Campus User',
      email: user.email || '',
      role: 'receiver', // safe default role
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await createUserProfile(profile);
    } catch (e) {
      console.error('Could not create missing profile:', e);
    }
  }

  return profile;
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  if (!isFirebaseConfigured || !auth) {
    // Simulated in demo mode
    return;
  }
  await sendPasswordResetEmail(auth, email);
}

/**
 * Sign out
 */
export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
}

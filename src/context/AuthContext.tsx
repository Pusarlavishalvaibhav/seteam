import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured, testFirestoreConnection } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import {
  registerWithEmailPassword,
  loginWithEmailPassword,
  logoutUser,
  resetPassword,
} from '../services/authService';
import { getUserProfile, createUserProfile } from '../services/firestoreService';
import { DEMO_USERS } from '../services/sampleData';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;
  connectionStatus: { connected: boolean; message: string; checked: boolean };
  recheckConnection: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  register: (
    email: string,
    pass: string,
    name: string,
    role: 'provider' | 'receiver' | 'volunteer',
    extra?: any
  ) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  makeCurrentUserAdmin: () => Promise<void>; // For bootstrapping initial admin during setup
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isFirebaseConfigured);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    message: string;
    checked: boolean;
  }>({
    connected: false,
    message: 'Testing connection...',
    checked: false,
  });

  const checkConnection = async () => {
    if (!isFirebaseConfigured) {
      setConnectionStatus({
        connected: false,
        message: 'Firebase configuration variables missing in .env. Running in interactive demo mode.',
        checked: true,
      });
      return;
    }
    const result = await testFirestoreConnection();
    setConnectionStatus({
      connected: result.connected,
      message: result.message,
      checked: true,
    });
  };

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || isDemoMode) {
      // Demo mode still requires an explicit sign-in; never silently authenticate a demo user.
      setUser(null);
      setLoading(false);
      return;
    }

    // Real Firebase onAuthStateChanged listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getUserProfile(firebaseUser.uid);
          if (userDoc) {
            setProfile(userDoc);
          } else {
            // Default receiver profile fallback
            const fallback: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Campus User',
              email: firebaseUser.email || '',
              role: 'receiver',
              accountStatus: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setProfile(fallback);
          }
        } catch (err) {
          console.error('Error fetching profile on auth change:', err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const userProfile = await loginWithEmailPassword(email, pass);
      setProfile(userProfile);
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    pass: string,
    name: string,
    role: 'provider' | 'receiver' | 'volunteer',
    extra?: any
  ) => {
    setLoading(true);
    try {
      const userProfile = await registerWithEmailPassword(email, pass, name, role, extra);
      setProfile(userProfile);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      // Clear local UI state even if Firebase sign-out reports an error.
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    await resetPassword(email);
  };

  // Demo role switcher allows instantaneous testing of all 4 dashboards
  const switchDemoRole = (role: UserRole) => {
    const key = `${role}_1`;
    const selected = (DEMO_USERS as any)[key] || DEMO_USERS.provider_1;
    setProfile(selected);
  };

  // One-time Admin bootstrap helper
  const makeCurrentUserAdmin = async () => {
    if (!profile) return;
    const updated: UserProfile = {
      ...profile,
      role: 'admin',
      accountStatus: 'active',
      updatedAt: new Date().toISOString(),
    };
    if (isFirebaseConfigured && user) {
      // Direct setDoc for admin bootstrap
      await createUserProfile(updated).catch(() => {});
    }
    setProfile(updated);
  };

  return (
    <AuthContext.Provider
      value={
        {
          user,
          profile,
          loading,
          isFirebaseConfigured,
          isDemoMode,
          setDemoMode: setIsDemoMode,
          connectionStatus,
          recheckConnection: checkConnection,
          login,
          register,
          logout,
          sendPasswordReset,
          switchDemoRole,
          makeCurrentUserAdmin,
        } as AuthContextType
      }
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

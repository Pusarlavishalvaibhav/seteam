import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { seedInitialFirestoreData } from '../../services/firestoreService';
import {
  X,
  Database,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Shield,
  Key,
  FolderLock,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface FirebaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseSetupModal: React.FC<FirebaseSetupModalProps> = ({ isOpen, onClose }) => {
  const {
    isFirebaseConfigured,
    connectionStatus,
    recheckConnection,
    makeCurrentUserAdmin,
    profile,
  } = useAuth();

  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(id);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const handleTest = async () => {
    setTestingConnection(true);
    await recheckConnection();
    setTestingConnection(false);
  };

  const handleSeed = async () => {
    if (!profile) return;
    setSeeding(true);
    const res = await seedInitialFirestoreData(profile.email);
    setSeedResult(res.message);
    setSeeding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-blue-50/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Firebase Backend Connection</h3>
              <p className="text-xs text-slate-500">Live Cloud Firestore, Auth & Storage Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status Alert */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              isFirebaseConfigured && connectionStatus.connected
                ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            {isFirebaseConfigured && connectionStatus.connected ? (
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  {isFirebaseConfigured && connectionStatus.connected
                    ? 'Firebase Connected & Ready'
                    : 'Interactive Demo Mode Active'}
                </h4>
                <button
                  onClick={handleTest}
                  disabled={testingConnection}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 bg-white/80 px-2 py-1 rounded-md border border-blue-300 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${testingConnection ? 'animate-spin' : ''}`} />
                  Test Status
                </button>
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">{connectionStatus.message}</p>
            </div>
          </div>

          {/* Quick Steps from Console */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600" />
              Where to obtain Firebase Web Configuration:
            </h4>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
              <p className="leading-relaxed">
                1. Visit the{' '}
                <a
                  href="https://console.firebase.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                >
                  Firebase Console <ExternalLink className="w-3 h-3" />
                </a>{' '}
                and create or choose your project.
              </p>
              <p className="leading-relaxed">
                2. Click the <strong>Gear icon (Project Settings)</strong> &gt; <strong>General</strong> &gt; scroll down to <strong>Your apps</strong>.
              </p>
              <p className="leading-relaxed">
                3. Click the <strong>Web icon (&lt;/&gt;)</strong> to register a web app (e.g. <em>PlateConnect Campus</em>).
              </p>
              <p className="leading-relaxed">
                4. Copy the credentials into your <code>.env</code> file:
              </p>
            </div>
          </div>

          {/* Env Variables List with Copy Buttons */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Environment Variables Required (.env)
            </h4>
            <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 font-mono text-xs space-y-1.5 overflow-x-auto shadow-inner">
              {[
                'VITE_FIREBASE_API_KEY=AIzaSy...',
                'VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com',
                'VITE_FIREBASE_PROJECT_ID=your-project',
                'VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com',
                'VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890',
                'VITE_FIREBASE_APP_ID=1:1234567890:web:abcd...',
              ].map((line, idx) => {
                const varName = line.split('=')[0];
                return (
                  <div key={idx} className="flex items-center justify-between gap-2 group py-0.5">
                    <span className="text-sky-300 truncate">{line}</span>
                    <button
                      onClick={() => handleCopy(line, varName)}
                      className="text-slate-400 hover:text-white p-1 rounded transition-colors shrink-0 cursor-pointer"
                      title="Copy"
                    >
                      {copiedVar === varName ? (
                        <Check className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security & One-Time Admin Setup */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Secure One-Time Admin Bootstrap
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              In accordance with PlateConnect security standards, public registration never allows users to grant themselves administrator permissions. To securely establish the initial campus administrator account:
            </p>
            <div className="flex items-center gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
              <button
                onClick={makeCurrentUserAdmin}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Promote Current User to Administrator
              </button>
              <span className="text-xs text-slate-500">
                Current active user: <strong>{profile?.name}</strong> ({profile?.role})
              </span>
            </div>
          </div>

          {/* Seed Initial Data to Firestore button */}
          {isFirebaseConfigured && (
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Seed Initial Campus Listings & Data into Firestore
              </h4>
              <p className="text-xs text-slate-600">
                Populate your live Firestore database with sample dining hall listings, receiver pantries, and initial campus sustainability metrics.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${seeding ? 'animate-spin' : ''}`} />
                  Seed Live Firestore Database
                </button>
                {seedResult && <span className="text-xs font-medium text-blue-700">{seedResult}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Security rules: <code>firestore.rules</code> and <code>storage.rules</code> ready</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

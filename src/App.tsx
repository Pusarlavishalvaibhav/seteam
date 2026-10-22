import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { ProviderDashboard } from './components/provider/ProviderDashboard';
import { ReceiverDashboard } from './components/receiver/ReceiverDashboard';
import { VolunteerDashboard } from './components/volunteer/VolunteerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { FirebaseSetupModal } from './components/setup/FirebaseSetupModal';
import { AuthModal } from './components/auth/AuthModal';
import { ApiExplorerModal } from './components/api/ApiExplorerModal';
import {
  Utensils,
  Database,
  ExternalLink,
  ShieldCheck,
  Heart,
  Sparkles,
  Info,
  Code2,
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { profile, loading, isFirebaseConfigured, isDemoMode } = useAuth();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isApiOpen, setIsApiOpen] = useState(false);

  if (!loading && !profile) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
        <div className="absolute -top-24 -right-20 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="relative z-10 w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
          <div className="text-white px-2 md:px-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl mb-6"><Utensils className="w-7 h-7" /></div>
            <p className="text-emerald-300 text-sm font-bold tracking-[0.2em] uppercase mb-3">Less waste. More good.</p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">Welcome to <span className="text-emerald-300">PlateConnect</span></h1>
            <p className="mt-5 text-blue-100/80 text-lg leading-relaxed">Connect surplus campus food with the people who need it. Sign in or create an account to start sharing, requesting, and recovering food.</p>
            <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Heart className="w-5 h-5 text-emerald-300 mb-2"/><span className="text-blue-50">Share food</span></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Sparkles className="w-5 h-5 text-emerald-300 mb-2"/><span className="text-blue-50">Smart matching</span></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="w-5 h-5 text-emerald-300 mb-2"/><span className="text-blue-50">Safer recovery</span></div>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-2 shadow-2xl shadow-black/30">
            <AuthModal isOpen={true} onClose={() => {}} pageMode />
          </div>
        </div>
        <div className="absolute bottom-4 text-center text-xs text-blue-100/50">PlateConnect · Campus Food Recovery & Surplus Matching</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Banner if Firebase configuration is missing or in guided demo mode */}
      {(!isFirebaseConfigured || isDemoMode) && (
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-950 text-white text-xs px-4 py-2 border-b border-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-3xl truncate">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 animate-pulse" />
            <span className="font-semibold text-blue-200">Interactive Campus Demo & Testing Mode:</span>
            <span className="truncate opacity-90">
              Live sample campus data active. Switch roles anytime via the top badge to test Provider, Receiver, Volunteer, and Admin flows.
            </span>
          </div>
          <button
            onClick={() => setIsSetupOpen(true)}
            className="underline font-bold text-blue-300 hover:text-white shrink-0 ml-3 flex items-center gap-1 cursor-pointer"
          >
            <span>Firebase Setup Instructions</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        onOpenSetupGuide={() => setIsSetupOpen(true)}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onOpenApiExplorer={() => setIsApiOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
          </div>
        ) : profile?.role === 'provider' ? (
          <ProviderDashboard />
        ) : profile?.role === 'receiver' ? (
          <ReceiverDashboard />
        ) : profile?.role === 'volunteer' ? (
          <VolunteerDashboard />
        ) : profile?.role === 'admin' ? (
          <AdminDashboard />
        ) : (
          <ReceiverDashboard />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center">
              <Utensils className="w-3 h-3" />
            </div>
            <span className="font-bold text-slate-800">PlateConnect</span>
            <span>— Campus Food Recovery & Surplus Matching System</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setIsApiOpen(true)}
              className="text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Code2 className="w-3 h-3" />
              <span>REST API Docs</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => setIsSetupOpen(true)}
              className="text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Firebase Configuration Guide
            </button>
            <span className="text-slate-300">•</span>
            <span>Bill Emerson Good Samaritan Act Compliant</span>
            <span className="text-slate-300">•</span>
            <span>Zero-Waste Campus Initiative</span>
          </div>
        </div>
      </footer>

      {/* Setup Guide Modal */}
      <FirebaseSetupModal isOpen={isSetupOpen} onClose={() => setIsSetupOpen(false)} />

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* REST API Explorer Modal */}
      <ApiExplorerModal isOpen={isApiOpen} onClose={() => setIsApiOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainLayout />
      </ToastProvider>
    </AuthProvider>
  );
}

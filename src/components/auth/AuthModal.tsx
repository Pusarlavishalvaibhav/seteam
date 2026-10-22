import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Mail,
  Lock,
  User,
  Utensils,
  HeartHandshake,
  Truck,
  AlertCircle,
  CheckCircle,
  Building,
  Phone,
  ArrowRight,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageMode?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, pageMode = false }) => {
  const { login, register, sendPasswordReset } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'provider' | 'receiver' | 'volunteer'>('provider');
  const [phone, setPhone] = useState('');
  const [building, setBuilding] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        onClose();
      } else if (mode === 'register') {
        if (!name.trim()) throw new Error('Please enter your full name or organization name.');
        await register(email, password, name, role, {
          phone,
          campusBuilding: building,
          campusZone: 'Central Campus',
        });
        setSuccessMsg('Account registered successfully!');
        setTimeout(() => onClose(), 1000);
      } else if (mode === 'forgot') {
        await sendPasswordReset(email);
        setSuccessMsg('Password reset instructions sent to your email.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={pageMode ? "relative z-10 flex items-center justify-center p-2" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-blue-50/60">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {mode === 'login' && 'Sign in to PlateConnect'}
              {mode === 'register' && 'Create Campus Account'}
              {mode === 'forgot' && 'Reset Your Password'}
            </h3>
            <p className="text-xs text-slate-500">Campus food surplus management system</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode Tabs */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`py-2 rounded-lg transition-all ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`py-2 rounded-lg transition-all ${
                  mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* Registration Role Selection */}
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Select Your Campus Role</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'provider', label: 'Food Provider', icon: Utensils },
                  { id: 'receiver', label: 'Food Receiver', icon: HeartHandshake },
                  { id: 'volunteer', label: 'Volunteer', icon: Truck },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = role === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRole(item.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                * Note: Administrator accounts require security authorization and cannot be self-selected.
              </p>
            </div>
          )}

          {/* Name for registration */}
          {mode === 'register' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {role === 'provider' ? 'Dining Hall / Dept Name' : role === 'receiver' ? 'Organization / Pantry Name' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'provider' ? 'e.g. South Commons Dining' : 'e.g. Sarah Jenkins'}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Campus Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@campus.edu"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Password */}
          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={mode === 'register' ? 6 : undefined}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Extra fields for registration */}
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Campus Building</label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder="e.g. Student Union"
                    className="w-full pl-8 pr-2 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Contact Phone</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full pl-8 pr-2 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
          >
            <span>
              {loading
                ? 'Processing...'
                : mode === 'login'
                ? 'Sign In to Dashboard'
                : mode === 'register'
                ? 'Complete Registration'
                : 'Send Password Reset Email'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium pt-1"
            >
              Back to Sign In
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

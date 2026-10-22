import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, AppNotification } from '../../types';
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../services/firestoreService';
import {
  Utensils,
  Bell,
  CheckCircle,
  Database,
  ShieldAlert,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Truck,
  HeartHandshake,
  Layers,
  BarChart3,
  Clock,
  Code2,
} from 'lucide-react';

interface NavbarProps {
  onOpenSetupGuide: () => void;
  onOpenAuthModal: () => void;
  onOpenApiExplorer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSetupGuide,
  onOpenAuthModal,
  onOpenApiExplorer,
}) => {
  const {
    profile,
    user,
    logout,
    switchDemoRole,
    isFirebaseConfigured,
    isDemoMode,
    setDemoMode,
    connectionStatus,
  } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToUserNotifications(profile.uid, (items) => {
      setNotifications(items);
    });
    return () => unsub();
  }, [profile]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const roleLabels: Record<UserRole, { label: string; icon: any; color: string }> = {
    provider: { label: 'Food Provider', icon: Utensils, color: 'bg-blue-100 text-blue-800 border-blue-300' },
    receiver: { label: 'Food Receiver', icon: HeartHandshake, color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    volunteer: { label: 'Campus Volunteer', icon: Truck, color: 'bg-sky-100 text-sky-800 border-sky-300' },
    admin: { label: 'Admin & Safety', icon: ShieldAlert, color: 'bg-amber-100 text-amber-800 border-amber-300' },
  };

  const currentRoleInfo = profile ? roleLabels[profile.role] : roleLabels.provider;
  const RoleIcon = currentRoleInfo.icon;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-blue-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Plate<span className="text-blue-600">Connect</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Campus Food Recovery
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Smart Surplus Matching & Distribution
              </p>
            </div>
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* REST API Explorer Button */}
            {onOpenApiExplorer && (
              <button
                onClick={onOpenApiExplorer}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-colors cursor-pointer"
                title="Open PlateConnect REST API Explorer & Docs"
              >
                <Code2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">REST API</span>
              </button>
            )}

            {/* Firebase Connection Indicator */}
            <button
              onClick={onOpenSetupGuide}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-all cursor-pointer ${
                isFirebaseConfigured && connectionStatus.connected
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
              title="Click to view Firebase setup guide and configuration"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {isFirebaseConfigured && connectionStatus.connected
                  ? 'Firebase Connected'
                  : 'Firebase Setup / Demo'}
              </span>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            </button>

            {/* Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-all cursor-pointer ${currentRoleInfo.color}`}
              >
                <RoleIcon className="w-3.5 h-3.5" />
                <span>{currentRoleInfo.label}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showRoleMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                  onMouseLeave={() => setShowRoleMenu(false)}
                >
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Switch Role View
                    </p>
                  </div>
                  {(['provider', 'receiver', 'volunteer', 'admin'] as UserRole[]).map((r) => {
                    const info = roleLabels[r];
                    const IconComp = info.icon;
                    const isActive = profile?.role === r;
                    return (
                      <button
                        key={r}
                        onClick={() => {
                          switchDemoRole(r);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-blue-50 text-blue-800 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <IconComp className="w-4 h-4 text-blue-600" />
                          <span>{info.label}</span>
                        </div>
                        {isActive && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notifications Menu */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-4.5 h-4.5 px-1 text-[10px] font-bold text-white bg-blue-600 rounded-full border-2 border-white animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-100 py-2 z-50"
                  onMouseLeave={() => setShowNotifMenu(false)}
                >
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-semibold text-slate-800">Campus Alerts</h4>
                    </div>
                    {unreadCount > 0 && profile && (
                      <button
                        onClick={() => markAllNotificationsAsRead(profile.uid)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-slate-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-blue-600" />
                        <p className="text-xs">No notifications right now.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.isRead) markNotificationAsRead(n.id);
                          }}
                          className={`p-3 text-left transition-colors cursor-pointer ${
                            n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900">{n.title}</span>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1.5 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Auth State */}
            {profile ? (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-semibold text-slate-900 truncate max-w-[130px]">
                    {profile.name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate max-w-[130px]">
                    {profile.email}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await logout();
                    } catch (error) {
                      console.error('Sign out failed:', error);
                    }
                  }}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

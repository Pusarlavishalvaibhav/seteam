import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  UserProfile,
  FoodListing,
  FoodRequest,
  PickupTask,
  DistributionRecord,
  AuditLog,
} from '../../types';
import {
  getAllUsers,
  subscribeToFoodListings,
  subscribeToFoodRequests,
  subscribeToPickupTasks,
  subscribeToDistributionRecords,
  subscribeToAuditLogs,
  updateUserProfile,
} from '../../services/firestoreService';
import {
  ShieldAlert,
  Users,
  Utensils,
  Truck,
  HeartHandshake,
  Download,
  FileSpreadsheet,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Leaf,
  BarChart3,
  Search,
  Filter,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [tasks, setTasks] = useState<PickupTask[]>([]);
  const [distributions, setDistributions] = useState<DistributionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'safety' | 'audit'>('overview');
  const [searchUser, setSearchUser] = useState('');

  useEffect(() => {
    getAllUsers().then(setUsers);
    const unsubL = subscribeToFoodListings(setListings);
    const unsubR = subscribeToFoodRequests(setRequests);
    const unsubT = subscribeToPickupTasks(setTasks);
    const unsubD = subscribeToDistributionRecords(setDistributions);
    const unsubA = subscribeToAuditLogs(setAuditLogs);

    return () => {
      unsubL();
      unsubR();
      unsubT();
      unsubD();
      unsubA();
    };
  }, []);

  // Compute Impact Analytics from actual stored records
  const totalMealsDistributed = distributions.reduce((sum, d) => sum + (d.estimatedMeals || 0), 0);
  const totalCo2SavedKg = Math.round(
    distributions.reduce((sum, d) => sum + (d.co2SavedKg || 0), 0) * 10
  ) / 10;
  const totalListingsCount = listings.length;
  const totalActiveSurplus = listings
    .filter((l) => l.status === 'available')
    .reduce((sum, l) => sum + l.quantity, 0);

  // CSV Export for Campus Sustainability Reports
  const exportDistributionReportCSV = () => {
    const headers = [
      'DistributionID',
      'FoodName',
      'QuantityDistributed',
      'Unit',
      'EstimatedMeals',
      'CO2_Saved_Kg',
      'Status',
      'CompletedAt',
    ];
    const rows = distributions.map((d) => [
      d.distributionId,
      `"${d.foodName || 'Surplus'}"`,
      d.quantityDistributed,
      d.quantityUnit,
      d.estimatedMeals,
      d.co2SavedKg,
      d.status,
      d.completedAt,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PlateConnect_Campus_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleUserStatus = async (user: UserProfile) => {
    const nextStatus = user.accountStatus === 'active' ? 'suspended' : 'active';
    try {
      await updateUserProfile(user.uid, { accountStatus: nextStatus });
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, accountStatus: nextStatus } : u))
      );
    } catch (err: any) {
      alert(`Could not update user: ${err?.message}`);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.role.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Admin Hero Header */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-800/60 text-blue-200 text-xs font-semibold border border-blue-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Campus Sustainability & Food Safety Administration</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Campus Operations & Impact Control
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Monitor real-time food diversion metrics, enforce health inspection compliance, audit access logs, and generate ESG sustainability reports.
          </p>
        </div>

        <button
          onClick={exportDistributionReportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export ESG Report (CSV)</span>
        </button>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Rescued Meals</span>
            <Utensils className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalMealsDistributed}</p>
          <span className="text-[11px] text-blue-700 font-semibold block">
            Distributed to campus students
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">CO2e Emissions Diverted</span>
            <Leaf className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalCo2SavedKg} kg</p>
          <span className="text-[11px] text-indigo-700 font-semibold block">
            Avoided landfill methane impact
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Live Surplus Available</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalActiveSurplus}</p>
          <span className="text-[11px] text-amber-700 font-semibold block">
            Across {listings.filter((l) => l.status === 'available').length} active listings
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Active Campus Users</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{users.length}</p>
          <span className="text-[11px] text-blue-700 font-semibold block">
            Dining, Pantries, Volunteers
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-700 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Operations Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'users'
              ? 'text-blue-700 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>User & Role Governance ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('safety')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'safety'
              ? 'text-blue-700 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Food Safety & Compliance</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'audit'
              ? 'text-blue-700 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Audit Log Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Listings Review */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Campus Dining Listings Monitor</span>
              <span className="text-xs text-slate-400 font-normal">
                {listings.length} total recorded
              </span>
            </h3>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900">{l.foodName}</p>
                    <p className="text-[11px] text-slate-500">
                      {l.providerName || 'Provider'} • {l.quantity} {l.quantityUnit}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      l.status === 'available'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Volunteer Deliveries Monitor */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Active Campus Volunteer Routes</span>
              <span className="text-xs text-slate-400 font-normal">
                {tasks.length} tasks recorded
              </span>
            </h3>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No tasks recorded.</p>
              ) : (
                tasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900">{t.foodName}</p>
                      <p className="text-[11px] text-slate-500">
                        {t.volunteerName || 'Unassigned'} • Status: {t.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                      {t.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS & RBAC */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">User Account & Role Governance</h3>
              <p className="text-xs text-slate-500">
                Enforcing Role-Based Access Control (RBAC). Admin privileges cannot be self-granted.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search campus users..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">User / Org Name</th>
                  <th className="px-4 py-3 font-semibold">Campus Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-900">{u.name}</td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-amber-100 text-amber-800'
                            : u.role === 'provider'
                            ? 'bg-blue-100 text-blue-800'
                            : u.role === 'receiver'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.accountStatus === 'active'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.accountStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                        >
                          {u.accountStatus === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FOOD SAFETY REVIEW */}
      {activeTab === 'safety' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Campus Food Safety Verification</h3>
            <p className="text-xs text-slate-500">
              ServSafe & Campus Health Regulations for Prepared Food Donation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-blue-900">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Temperature Standards</span>
              </div>
              <p className="text-slate-600">
                Hot items maintained &gt;140°F until transfer. Chilled items held &lt;40°F. Insulated food carrier bags required for volunteer transit.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-blue-900">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Good Samaritan Act</span>
              </div>
              <p className="text-slate-600">
                Food donations protected under Bill Emerson Good Samaritan Food Donation Act, indemnifying non-profit campus donors in good faith.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-blue-900">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>4-Hour Expiration Rule</span>
              </div>
              <p className="text-slate-600">
                Prepared catered surplus must be distributed within 4 hours of prep time. Automated urgency algorithm prioritizes closing windows.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Firestore Audit Logs Trail</h3>
              <p className="text-xs text-slate-500">
                Immutable records of sensitive transactions and system operations
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {auditLogs.length} audit entries
            </span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Actor Email</th>
                  <th className="px-4 py-3 font-semibold">Target Type & ID</th>
                  <th className="px-4 py-3 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 font-mono text-[11px]">
                    <td className="px-4 py-3 font-bold text-slate-900">{log.action}</td>
                    <td className="px-4 py-3 text-slate-600">{log.actorEmail || log.actorId}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.targetType}:{log.targetId}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

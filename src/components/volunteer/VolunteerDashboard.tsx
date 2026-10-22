import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PickupTask, TaskStatus } from '../../types';
import {
  subscribeToPickupTasks,
  acceptPickupTask,
  updateTaskProgress,
} from '../../services/firestoreService';
import {
  Truck,
  MapPin,
  CheckCircle,
  Clock,
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
  Navigation,
  ArrowRight,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';

export const VolunteerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<PickupTask[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'my_tasks' | 'completed'>('my_tasks');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToPickupTasks((items) => {
      setTasks(items);
    });
    return () => unsub();
  }, []);

  const availablePool = tasks.filter((t) => t.status === 'unassigned');
  const myAssignedTasks = tasks.filter(
    (t) =>
      (!profile || t.volunteerId === profile.uid || profile.role === 'admin') &&
      t.status !== 'completed' &&
      t.status !== 'cancelled' &&
      t.status !== 'unassigned'
  );
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const handleClaim = async (task: PickupTask) => {
    if (!profile) return;
    setUpdatingTaskId(task.id);
    try {
      await acceptPickupTask(task.id, profile.uid, profile.name, profile.email);
      setActiveTab('my_tasks');
    } catch (err: any) {
      alert(`Could not accept task: ${err?.message}`);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleAdvanceStatus = async (taskId: string, nextStatus: TaskStatus) => {
    if (!profile) return;
    setUpdatingTaskId(taskId);
    try {
      await updateTaskProgress(taskId, nextStatus, profile.uid, profile.email);
    } catch (err: any) {
      alert(`Could not advance task: ${err?.message}`);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const statusProgressSteps: { status: TaskStatus; label: string }[] = [
    { status: 'accepted', label: 'Accepted' },
    { status: 'en_route_pickup', label: 'En Route to Pickup' },
    { status: 'picked_up', label: 'Food Picked Up' },
    { status: 'en_route_delivery', label: 'En Route to Pantry' },
    { status: 'delivered', label: 'Delivered' },
    { status: 'completed', label: 'Complete & Verified' },
  ];

  return (
    <div className="space-y-6">
      {/* Volunteer Hero */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-800/60 text-blue-200 text-xs font-semibold border border-blue-500/30">
            <Truck className="w-3.5 h-3.5" />
            <span>Campus Food Recovery Network Volunteers</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Volunteer Pickup & Distribution
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            Bridge the campus gap by transporting surplus from dining halls to pantries. Safe temperature transport and verified distribution.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block">
              Available Tasks
            </span>
            <span className="text-2xl font-black text-white">{availablePool.length}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block">
              Completed
            </span>
            <span className="text-2xl font-black text-white">{completedTasks.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('my_tasks')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'my_tasks'
              ? 'text-blue-700 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>My Active Tasks ({myAssignedTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('available')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'available'
              ? 'text-blue-700 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Available Campus Pool ({availablePool.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'completed'
              ? 'text-blue-700 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Completed Distributions ({completedTasks.length})</span>
        </button>
      </div>

      {/* TAB 1: MY ACTIVE TASKS */}
      {activeTab === 'my_tasks' && (
        <div className="space-y-4">
          {myAssignedTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
              <Truck className="w-10 h-10 mx-auto mb-2 opacity-30 text-blue-600" />
              <p className="text-sm font-semibold text-slate-700">No active pickup tasks assigned</p>
              <p className="text-xs text-slate-400 mt-1">
                Claim an unassigned pickup task from the Available Campus Pool.
              </p>
              <button
                onClick={() => setActiveTab('available')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                View Available Pool ({availablePool.length})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {myAssignedTasks.map((task) => {
                const currentIdx = statusProgressSteps.findIndex((s) => s.status === task.status);
                const nextStep =
                  currentIdx < statusProgressSteps.length - 1
                    ? statusProgressSteps[currentIdx + 1]
                    : null;

                return (
                  <div
                    key={task.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                          Task #{task.taskId.slice(-6)}
                        </span>
                        <span className="text-xs font-extrabold text-blue-700">
                          {task.quantity} {task.quantityUnit || 'servings'}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{task.foodName}</h4>

                      {/* Route Details */}
                      <div className="mt-3 space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                        {/* Pickup */}
                        <div className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                            A
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Pickup: {task.providerName || 'Dining Services'}
                            </span>
                            <p className="font-semibold text-slate-800">{task.pickupDetails.location}</p>
                            {task.pickupDetails.contactPhone && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" /> {task.pickupDetails.contactPhone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Delivery */}
                        <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/60">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                            B
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Dropoff: {task.receiverName || 'Student Food Pantry'}
                            </span>
                            <p className="font-semibold text-slate-800">{task.deliveryDetails.location}</p>
                            {task.deliveryDetails.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5">
                                Note: {task.deliveryDetails.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Progress stepper */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                          <span>Current Status:</span>
                          <span className="text-blue-700 uppercase tracking-wider font-bold">
                            {task.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${((Math.max(0, currentIdx) + 1) / statusProgressSteps.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step Advance Action */}
                    <div className="pt-3 border-t border-slate-100">
                      {nextStep ? (
                        <button
                          onClick={() => handleAdvanceStatus(task.id, nextStep.status)}
                          disabled={updatingTaskId === task.id}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>
                            {updatingTaskId === task.id
                              ? 'Updating in Firestore...'
                              : `Advance: Mark as "${nextStep.label}"`}
                          </span>
                        </button>
                      ) : (
                        <div className="text-center text-xs font-bold text-blue-700 py-2">
                          ✓ Delivery Completed and Recorded
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AVAILABLE POOL */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          {availablePool.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30 text-blue-600" />
              <p className="text-sm font-semibold text-slate-700">All current tasks have been claimed!</p>
              <p className="text-xs text-slate-400 mt-1">
                New tasks will appear here as dining halls accept food requests.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availablePool.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                        Unclaimed
                      </span>
                      <span className="text-xs font-extrabold text-blue-700">
                        {task.quantity} {task.quantityUnit || 'servings'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{task.foodName}</h4>

                    <div className="mt-3 space-y-2 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">FROM:</span>
                        <p className="font-semibold text-slate-800">{task.pickupDetails.location}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">TO:</span>
                        <p className="font-semibold text-slate-800">{task.deliveryDetails.location}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaim(task)}
                    disabled={updatingTaskId === task.id}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>
                      {updatingTaskId === task.id ? 'Claiming in Firestore...' : 'Claim Pickup Task'}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMPLETED DISTRIBUTIONS */}
      {activeTab === 'completed' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Completed Campus Food Recoveries</h3>
            <p className="text-xs text-slate-500">Verified deliveries recorded to Cloud Firestore</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Food Item</th>
                  <th className="px-4 py-3 font-semibold">Quantity</th>
                  <th className="px-4 py-3 font-semibold">Origin & Destination</th>
                  <th className="px-4 py-3 font-semibold">Volunteer</th>
                  <th className="px-4 py-3 font-semibold">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {completedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No completed distributions logged yet.
                    </td>
                  </tr>
                ) : (
                  completedTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{t.foodName}</td>
                      <td className="px-4 py-3 text-blue-700 font-semibold">
                        {t.quantity} {t.quantityUnit}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block truncate max-w-xs text-slate-600">
                          {t.pickupDetails.location} → {t.deliveryDetails.location}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600">
                        {t.volunteerName || 'Volunteer'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {t.completedAt ? new Date(t.completedAt).toLocaleDateString() : 'Recent'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

import fallbackFoodPhoto from '../../assets/images/packed_catering_foil_1792379888094.jpg';
import { resolveFoodPhotoUrl } from '../../constants/foodPhotos';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FoodListing, FoodRequest } from '../../types';
import {
  subscribeToFoodListings,
  subscribeToFoodRequests,
  updateFoodListingStatus,
  reviewFoodRequest,
} from '../../services/firestoreService';
import { CreateListingModal } from './CreateListingModal';
import {
  Plus,
  Utensils,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Flame,
  Snowflake,
  Sun,
  Search,
  Filter,
  Users,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const ProviderDashboard: React.FC = () => {
  const { profile } = useAuth();

  const [listings, setListings] = useState<FoodListing[]>([]);
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  useEffect(() => {
    const unsubListings = subscribeToFoodListings((items) => {
      setListings(items);
    });

    const unsubRequests = subscribeToFoodRequests((items) => {
      setRequests(items);
    });

    return () => {
      unsubListings();
      unsubRequests();
    };
  }, []);

  // Filter listings owned by this provider (or all in demo if id matches)
  const myListings = listings.filter(
    (l) => !profile || l.providerId === profile.uid || profile.role === 'admin'
  );

  const filteredListings = myListings.filter((l) => {
    const matchesSearch =
      l.foodName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.foodType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.pickupLocation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Requests targeted to this provider's listings
  const myRequests = requests.filter(
    (r) => !profile || r.providerId === profile.uid || profile.role === 'admin'
  );
  const pendingRequests = myRequests.filter((r) => r.status === 'requested');

  const handleReview = async (requestId: string, decision: 'accepted' | 'rejected') => {
    if (!profile) return;
    setProcessingRequestId(requestId);
    try {
      await reviewFoodRequest(
        requestId,
        decision,
        profile.uid,
        decision === 'accepted' ? 'Approved for campus pickup' : 'Surplus committed elsewhere',
        profile.email
      );
    } catch (err: any) {
      alert(`Could not update request: ${err?.message}`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleStatusChange = async (listingId: string, newStatus: any) => {
    if (!profile) return;
    try {
      await updateFoodListingStatus(listingId, newStatus, profile.uid, profile.email);
    } catch (err: any) {
      alert(`Could not update listing: ${err?.message}`);
    }
  };

  const totalServingsAvailable = myListings
    .filter((l) => l.status === 'available')
    .reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-800/60 text-blue-200 text-xs font-semibold border border-blue-500/30">
            <Utensils className="w-3.5 h-3.5" />
            <span>Campus Dining & Catering Portal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Manage Surplus Food Listings
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            Register surplus meals, accept receiver claims, and direct volunteer recovery routes before food expires.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-800 hover:bg-blue-50 font-bold text-xs sm:text-sm shadow-lg shadow-black/10 transition-all hover:scale-102 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-blue-600" />
          <span>Post New Surplus</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Active Listings</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {myListings.filter((l) => l.status === 'available').length}
          </p>
          <span className="text-[11px] text-blue-600 font-medium">Ready for campus claims</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Surplus Available</span>
            <Utensils className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalServingsAvailable}</p>
          <span className="text-[11px] text-indigo-600 font-medium">Servings / Units today</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Pending Requests</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{pendingRequests.length}</p>
          <span className="text-[11px] text-amber-600 font-medium">Requires provider approval</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Approved Requests</span>
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {myRequests.filter((r) => r.status === 'accepted').length}
          </p>
          <span className="text-[11px] text-blue-600 font-medium">Assigned to volunteers</span>
        </div>
      </div>

      {/* Pending Incoming Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <h3 className="text-sm font-bold text-amber-900">
              Incoming Food Requests Awaiting Review ({pendingRequests.length})
            </h3>
          </div>

          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{req.foodName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                      {req.requestedQuantity} {req.quantityUnit || 'units'} requested
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Requested by: <strong>{req.receiverName || 'Student Food Pantry'}</strong>
                  </p>
                  {req.note && (
                    <p className="text-xs text-slate-500 italic mt-0.5">Note: "{req.note}"</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReview(req.id, 'accepted')}
                    disabled={processingRequestId === req.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve Request</span>
                  </button>
                  <button
                    onClick={() => handleReview(req.id, 'rejected')}
                    disabled={processingRequestId === req.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Food Listings Catalog */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Your Active & Past Food Listings</h3>
            <p className="text-xs text-slate-500">Live synchronization with Cloud Firestore</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search surplus..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30 text-blue-600" />
            <p className="text-sm font-semibold text-slate-600">No surplus listings found</p>
            <p className="text-xs text-slate-400 mt-1">Post your dining hall surplus to begin matching.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((item) => {
              const isUrgent =
                new Date(item.availabilityDeadline).getTime() - Date.now() < 3 * 3600 * 1000;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-100 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col bg-white"
                >
                  <div className="relative h-40 bg-slate-100 overflow-hidden">
                    <img
                      src={resolveFoodPhotoUrl(item.imageUrl, item.foodType)}
                      alt={item.foodName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackFoodPhoto; }}
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          item.status === 'available'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : item.status === 'reserved'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-700 text-white shadow-xs'
                        }`}
                      >
                        {item.status}
                      </span>
                      {isUrgent && item.status === 'available' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white flex items-center gap-0.5 shadow-xs">
                          <Flame className="w-3 h-3" /> Urgent
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-lg">
                      {item.quantity} {item.quantityUnit}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span className="font-semibold text-blue-700">{item.foodType}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(item.availabilityDeadline).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{item.foodName}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.description}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.pickupLocation}</span>
                      </div>

                      {item.dietaryInfo && item.dietaryInfo.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.dietaryInfo.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      {item.status === 'available' ? (
                        <button
                          onClick={() => handleStatusChange(item.id, 'closed')}
                          className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                        >
                          Mark as Closed
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(item.id, 'available')}
                          className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                        >
                          Reopen Listing
                        </button>
                      )}
                      <button
                        onClick={() => handleStatusChange(item.id, 'cancelled')}
                        className="text-[11px] text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateListingModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
};

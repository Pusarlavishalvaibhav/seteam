import fallbackFoodPhoto from '../../assets/images/packed_catering_foil_1792379888094.jpg';
import { resolveFoodPhotoUrl } from '../../constants/foodPhotos';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FoodListing, FoodRequest, MatchScoreBreakdown } from '../../types';
import {
  subscribeToFoodListings,
  subscribeToFoodRequests,
} from '../../services/firestoreService';
import { calculateMatchScore } from '../../services/matchingService';
import { RequestFoodModal } from './RequestFoodModal';
import { SmartMatchDetailModal } from './SmartMatchDetailModal';
import {
  ReceiverNotificationModal,
  ReceiverNotificationData,
} from './ReceiverNotificationModal';
import {
  HeartHandshake,
  Sparkles,
  Search,
  Filter,
  Clock,
  MapPin,
  Flame,
  CheckCircle,
  XCircle,
  Truck,
  ArrowRight,
  Package,
  BellRing,
  X,
  Send,
  CheckCircle2,
  Zap,
} from 'lucide-react';

// Friendly two-tone synthesizer chime for the Pop-up Notification
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.12); // A5
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch (e) {
    // browser policy fallback
  }
}

export const ReceiverDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [listings, setListings] = useState<FoodListing[]>([]);
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'match' | 'urgency' | 'quantity'>('match');

  // Pop-up Notification Modal State (Centered Interactive Pop-up Dialog)
  const [popNotification, setPopNotification] = useState<ReceiverNotificationData | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Pop-up in-board sticky notification banner state
  const [activeBoardNotification, setActiveBoardNotification] = useState<{
    id: string;
    foodName: string;
    quantity: number;
    unit?: string;
    timestamp: string;
  } | null>(null);

  // Modals state
  const [requestingListing, setRequestingListing] = useState<FoodListing | null>(null);
  const [inspectingMatch, setInspectingMatch] = useState<MatchScoreBreakdown | null>(null);

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

  // Filter to available listings
  const availableListings = listings.filter((l) => l.status === 'available');

  // Compute smart match breakdowns
  const scoredListings: MatchScoreBreakdown[] = availableListings.map((l) =>
    calculateMatchScore(
      l,
      profile || {
        uid: 'guest',
        name: 'Campus Food Pantry',
        email: 'pantry@campus.edu',
        role: 'receiver',
        accountStatus: 'active',
        createdAt: '',
        updatedAt: '',
      }
    )
  );

  // Filter by search & category
  const filteredMatches = scoredListings
    .filter(({ listing }) => {
      const matchesSearch =
        listing.foodName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.foodType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.pickupLocation.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat =
        selectedCategory === 'all' || listing.foodType === selectedCategory;
      return matchesSearch && matchesCat;
    })
    .sort((a, b) => {
      if (sortBy === 'match') return b.overallScore - a.overallScore;
      if (sortBy === 'urgency') return a.urgencyHoursLeft - b.urgencyHoursLeft;
      if (sortBy === 'quantity') return b.listing.quantity - a.listing.quantity;
      return 0;
    });

  // Requests made by this receiver
  const myRequests = requests.filter(
    (r) => !profile || r.receiverId === profile.uid || profile.role === 'admin'
  );

  const handleRequestCompleted = (data: {
    requestId: string;
    quantity: number;
    foodName: string;
    unit?: string;
    pickupLocation?: string;
    providerName?: string;
  }) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const notifData: ReceiverNotificationData = {
      id: data.requestId,
      foodName: data.foodName,
      quantity: data.quantity,
      unit: data.unit,
      pickupLocation: data.pickupLocation,
      providerName: data.providerName,
      timestamp,
    };

    // 1. Play soft audio chime
    playNotificationChime();

    // 2. Trigger POP-UP NOTIFICATION MODAL directly on the Receiver Board!
    setPopNotification(notifData);
    setIsNotificationModalOpen(true);

    // 3. Keep the live banner active on the board as well
    setActiveBoardNotification({
      id: data.requestId,
      foodName: data.foodName,
      quantity: data.quantity,
      unit: data.unit,
      timestamp,
    });
  };

  const handleScrollToTracker = () => {
    const tracker = document.getElementById('active-claims-tracker');
    if (tracker) {
      tracker.scrollIntoView({ behavior: 'smooth' });
      tracker.classList.add('ring-4', 'ring-blue-400/50', 'transition-all');
      setTimeout(() => {
        tracker.classList.remove('ring-4', 'ring-blue-400/50');
      }, 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pop-up Live Notification Banner in the Receiver Board */}
      {activeBoardNotification && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-2xl p-4 shadow-xl shadow-blue-500/20 border-2 border-blue-400 flex items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 animate-bounce">
              <BellRing className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-blue-100">
                  Receiver Alert
                </span>
                <span className="text-xs text-blue-200">
                  {activeBoardNotification.timestamp}
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-0.5">
                Food Request Submitted for {activeBoardNotification.quantity} {activeBoardNotification.unit || 'units'} of "{activeBoardNotification.foodName}"
              </p>
              <p className="text-xs text-blue-100/90">
                Your request has been dispatched to campus dining. It is listed below under Active Claims.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Open Pop-Up
            </button>
            <button
              onClick={() => setActiveBoardNotification(null)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Dismiss Notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner (Blue Palette) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-800/60 text-blue-200 text-xs font-semibold border border-blue-500/30">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Campus Food Pantry & Receiver Discovery</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Smart Surplus Food Discovery
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            Our AI-grounded SRS algorithm pairs campus dining surpluses with student pantries and food programs based on location, urgency, and capacity.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {filteredMatches.length > 0 && (
              <button
                onClick={() => setRequestingListing(filteredMatches[0].listing)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/30 transition-all hover:scale-102 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                <span>Claim Top Match ({filteredMatches[0].overallScore}% Match)</span>
              </button>
            )}

            {popNotification && (
              <button
                onClick={() => setIsNotificationModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-colors cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 text-yellow-300" />
                <span>Show Recent Pop-Up Notification</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shrink-0 text-center">
          <span className="text-xs font-medium text-blue-200 uppercase tracking-wider block">
            Surplus Available Now
          </span>
          <span className="text-3xl font-black text-white">
            {availableListings.reduce((acc, curr) => acc + curr.quantity, 0)}
          </span>
          <span className="text-[11px] text-blue-200/90 block mt-0.5">
            Meals / servings on campus
          </span>
        </div>
      </div>
      {/* Receiver's Active Claims & Requests Tracker */}
      {myRequests.length > 0 && (
        <div id="active-claims-tracker" className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Your Food Claims & Requests ({myRequests.length})
              </h3>
              <p className="text-xs text-slate-500">Live request status workflow tracking</p>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              {myRequests.filter((r) => r.status === 'requested').length} Pending Provider Decision
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1">
                      {req.foodName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        req.status === 'requested'
                          ? 'bg-amber-100 text-amber-800'
                          : req.status === 'accepted'
                          ? 'bg-blue-100 text-blue-800'
                          : req.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p>
                      Quantity:{' '}
                      <strong>
                        {req.requestedQuantity} {req.quantityUnit || 'units'}
                      </strong>
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      From: {req.providerName || 'Campus Dining'}
                    </p>
                    {req.pickupLocation && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{req.pickupLocation}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Workflow Status Line */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                  {req.status === 'accepted' && (
                    <span className="text-blue-700 font-semibold flex items-center gap-1">
                      <Truck className="w-3 h-3" /> Assigned to Volunteer
                    </span>
                  )}
                  {req.status === 'requested' && (
                    <span className="text-amber-700 font-medium">Awaiting Dining Approval</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Surplus with Smart Matching */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Recommended Campus Surplus</h3>
              <span className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                <Sparkles className="w-3 h-3 text-blue-600" /> SRS Match Ranked
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Ranked with weighted Distance (30%), Quantity (30%), Urgency (25%), and Food Type (15%)
            </p>
          </div>

          {/* Search, Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search food items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="Prepared Meals">Prepared Meals</option>
              <option value="Produce & Fruit">Produce & Fruit</option>
              <option value="Bakery & Bread">Bakery & Bread</option>
              <option value="Dairy & Refrigerated">Dairy & Refrigerated</option>
              <option value="Packaged & Pantry">Packaged & Pantry</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-blue-500"
            >
              <option value="match">Sort: Best Match</option>
              <option value="urgency">Sort: Most Urgent</option>
              <option value="quantity">Sort: Largest Quantity</option>
            </select>
          </div>
        </div>

        {/* Listings Grid */}
        {filteredMatches.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30 text-blue-600" />
            <p className="text-sm font-semibold text-slate-600">No surplus matches currently available</p>
            <p className="text-xs text-slate-400 mt-1">Check back soon as campus dining shifts conclude.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMatches.map((match) => {
              const item = match.listing;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-100 hover:border-blue-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col bg-white"
                >
                  {/* Photo & Match Badge */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    <img
                      src={resolveFoodPhotoUrl(item.imageUrl, item.foodType)}
                      alt={item.foodName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackFoodPhoto; }}
                    />

                    {/* Match Score Badge */}
                    <button
                      onClick={() => setInspectingMatch(match)}
                      className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-xs font-bold shadow-md hover:bg-slate-900 transition-colors cursor-pointer"
                      title="Click to view SRS smart matching breakdown"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>{match.overallScore}% Match</span>
                    </button>

                    {match.urgencyHoursLeft <= 3 && (
                      <div className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <Flame className="w-3 h-3" />
                        <span>{match.urgencyHoursLeft}h Left</span>
                      </div>
                    )}

                    <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-lg">
                      {item.quantity} {item.quantityUnit}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span className="font-semibold text-blue-700">{item.foodType}</span>
                        <span>{item.providerName || 'Dining Services'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{item.foodName}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.description}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 text-slate-500 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{item.pickupLocation}</span>
                        </span>
                        <span className="font-medium text-blue-700 shrink-0">
                          {match.distanceDescription}
                        </span>
                      </div>

                      {/* Factor tags */}
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-1">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100">
                          Qty: {match.quantityScore}%
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100">
                          Urgency: {match.urgencyScore}%
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100">
                          Food: {match.foodCompatibilityScore}%
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => setInspectingMatch(match)}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                      >
                        Explain Score
                      </button>
                      <button
                        onClick={() => setRequestingListing(item)}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Request Food</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <RequestFoodModal
        listing={requestingListing}
        isOpen={Boolean(requestingListing)}
        onClose={() => setRequestingListing(null)}
        onRequested={handleRequestCompleted}
      />

      <SmartMatchDetailModal
        match={inspectingMatch}
        isOpen={Boolean(inspectingMatch)}
        onClose={() => setInspectingMatch(null)}
        onRequestFood={() => {
          if (inspectingMatch) {
            setRequestingListing(inspectingMatch.listing);
          }
        }}
      />

      {/* Pop-Up Notification Dialog directly on the Receiver Board */}
      <ReceiverNotificationModal
        notification={popNotification}
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        onViewTracker={handleScrollToTracker}
      />
    </div>
  );
};

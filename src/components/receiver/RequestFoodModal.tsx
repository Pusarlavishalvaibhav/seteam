import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FoodListing } from '../../types';
import { submitFoodRequest } from '../../services/firestoreService';
import {
  X,
  HeartHandshake,
  AlertCircle,
  CheckCircle,
  MapPin,
  Clock,
  Sparkles,
  Send,
} from 'lucide-react';

interface RequestFoodModalProps {
  listing: FoodListing | null;
  isOpen: boolean;
  onClose: () => void;
  onRequested?: (data: {
    requestId: string;
    quantity: number;
    foodName: string;
    unit?: string;
    pickupLocation?: string;
    providerName?: string;
  }) => void;
}

export const RequestFoodModal: React.FC<RequestFoodModalProps> = ({
  listing,
  isOpen,
  onClose,
  onRequested,
}) => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [requestedQty, setRequestedQty] = useState<number>(listing ? Math.min(30, listing.quantity) : 20);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !listing) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);

    if (requestedQty <= 0) {
      setError('Please request at least 1 unit.');
      return;
    }

    if (requestedQty > listing.quantity) {
      setError(`Cannot request ${requestedQty}. Only ${listing.quantity} available.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const requestId = await submitFoodRequest(
        {
          listingId: listing.id,
          foodName: listing.foodName,
          providerId: listing.providerId,
          providerName: listing.providerName,
          receiverId: profile.uid,
          receiverName: profile.name,
          requestedQuantity: Number(requestedQty),
          quantityUnit: listing.quantityUnit,
          note,
          pickupLocation: listing.pickupLocation,
        },
        profile.email
      );

      // Trigger prominent pop-up notification on the Receiver Board!
      showToast({
        title: '🎉 Food Claim Request Submitted!',
        message: `Your request for ${requestedQty} ${listing.quantityUnit} of "${listing.foodName}" has been routed to ${listing.providerName || 'Dining Services'}. You will receive status alerts as it progresses.`,
        type: 'success',
        details: {
          foodName: listing.foodName,
          quantity: Number(requestedQty),
          unit: listing.quantityUnit,
          status: 'Requested',
        },
      });

      if (onRequested) {
        onRequested({
          requestId,
          quantity: Number(requestedQty),
          foodName: listing.foodName,
          unit: listing.quantityUnit,
          pickupLocation: listing.pickupLocation,
          providerName: listing.providerName,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit food request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-blue-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Request Surplus Food</h3>
              <p className="text-[11px] text-slate-500">Submit claim to campus dining provider</p>
            </div>
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

          {/* Listing Brief Summary */}
          <div className="p-3.5 bg-blue-50/40 border border-blue-200/60 rounded-xl space-y-1.5">
            <h4 className="text-xs font-bold text-slate-900">{listing.foodName}</h4>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{listing.providerName || 'Campus Provider'}</span>
              <span className="font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                {listing.quantity} {listing.quantityUnit} available
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1 border-t border-blue-100/60">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{listing.pickupLocation}</span>
            </div>
          </div>

          {/* Requested Quantity */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Requested Quantity ({listing.quantityUnit}) *
            </label>
            <input
              type="number"
              min={1}
              max={listing.quantity}
              required
              value={requestedQty}
              onChange={(e) => setRequestedQty(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500 focus:border-blue-500 font-semibold text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              You can claim up to {listing.quantity} {listing.quantityUnit}. Partial quantities are welcome.
            </p>
          </div>

          {/* Receiver Note */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Distribution Purpose & Note for Provider
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. For evening student food pantry distribution, arriving at 6:30 PM."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting to Firestore...' : 'Submit Claim Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

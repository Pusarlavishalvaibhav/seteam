import React from 'react';
import {
  BellRing,
  CheckCircle2,
  MapPin,
  Clock,
  ArrowRight,
  X,
  Package,
  Sparkles,
  Building,
} from 'lucide-react';

export interface ReceiverNotificationData {
  id: string;
  foodName: string;
  quantity: number;
  unit?: string;
  providerName?: string;
  pickupLocation?: string;
  timestamp: string;
}

interface ReceiverNotificationModalProps {
  notification: ReceiverNotificationData | null;
  isOpen: boolean;
  onClose: () => void;
  onViewTracker?: () => void;
}

export const ReceiverNotificationModal: React.FC<ReceiverNotificationModalProps> = ({
  notification,
  isOpen,
  onClose,
  onViewTracker,
}) => {
  if (!isOpen || !notification) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border-2 border-blue-400 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Blue Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white text-center relative overflow-hidden">
          {/* Decorative glow rings */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-indigo-500/20 blur-xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-white/90 hover:text-white transition-colors cursor-pointer"
            title="Close Pop-Up"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white text-blue-600 shadow-xl shadow-black/10 flex items-center justify-center border-2 border-blue-200 animate-bounce">
            <BellRing className="w-7 h-7 text-blue-600" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-blue-100 mb-1 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Pop-Up Notification • Receiver Board</span>
          </div>

          <h3 className="text-xl font-black text-white mt-1">
            Food Claim Request Dispatched!
          </h3>
          <p className="text-xs text-blue-100/90 mt-1 max-w-xs mx-auto">
            Your claim has been communicated to campus dining. You will receive live status alerts here on your board.
          </p>
        </div>

        {/* Details Card */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  Requested Surplus Item
                </span>
                <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                  {notification.foodName}
                </h4>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 shrink-0 border border-amber-200">
                Pending Approval
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  Claim Quantity
                </span>
                <span className="font-bold text-blue-700 text-sm">
                  {notification.quantity} {notification.unit || 'units'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  Request Time
                </span>
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {notification.timestamp}
                </span>
              </div>
            </div>

            {notification.pickupLocation && (
              <div className="pt-2 border-t border-blue-100 text-xs flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">Pickup: <strong>{notification.pickupLocation}</strong></span>
              </div>
            )}
          </div>

          {/* Workflow step alert */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>What happens next?</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 pl-6">
              1. Campus dining manager receives this notification and approves the transfer.
              <br />
              2. The pickup task is immediately routed to the campus volunteer network.
              <br />
              3. You can watch step-by-step progress below in your <strong>Active Claims Tracker</strong>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                if (onViewTracker) onViewTracker();
                onClose();
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-101"
            >
              <span>View in Claims & Requests Tracker</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Keep Browsing Surplus Food
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

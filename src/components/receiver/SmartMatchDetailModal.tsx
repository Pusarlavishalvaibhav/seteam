import React from 'react';
import { MatchScoreBreakdown } from '../../types';
import { X, Sparkles, Navigation, Scale, Flame, Utensils, CheckCircle2 } from 'lucide-react';

interface SmartMatchDetailModalProps {
  match: MatchScoreBreakdown | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestFood: () => void;
}

export const SmartMatchDetailModal: React.FC<SmartMatchDetailModalProps> = ({
  match,
  isOpen,
  onClose,
  onRequestFood,
}) => {
  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">SRS Smart Match Analysis</h3>
              <p className="text-xs text-slate-500">Multifactor Weighted Compatibility Breakdown</p>
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
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Overall Score Badge */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                Overall Compatibility Score
              </span>
              <h4 className="text-xl font-black text-slate-900">{match.listing.foodName}</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated according to PlateConnect SRS specification
              </p>
            </div>
            <div className="text-center bg-white px-4 py-2.5 rounded-xl border border-blue-200 shadow-2xs shrink-0">
              <span className="text-3xl font-black text-blue-600">{match.overallScore}%</span>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Match</span>
            </div>
          </div>

          {/* Formula Breakdown Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Weighted Factor Contributions
            </h4>

            {/* 1. Distance (30%) */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Navigation className="w-4 h-4 text-blue-600" />
                  <span>Campus Distance (30% Weight)</span>
                </div>
                <span className="font-extrabold text-blue-700">{match.distanceScore} / 100</span>
              </div>
              <p className="text-xs text-slate-600">{match.explanation.distance}</p>
            </div>

            {/* 2. Quantity (30%) */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  <span>Quantity Compatibility (30% Weight)</span>
                </div>
                <span className="font-extrabold text-indigo-700">{match.quantityScore} / 100</span>
              </div>
              <p className="text-xs text-slate-600">{match.explanation.quantity}</p>
            </div>

            {/* 3. Urgency (25%) */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>Rescue Urgency (25% Weight)</span>
                </div>
                <span className="font-extrabold text-amber-700">{match.urgencyScore} / 100</span>
              </div>
              <p className="text-xs text-slate-600">{match.explanation.urgency}</p>
            </div>

            {/* 4. Food Compatibility (15%) */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Utensils className="w-4 h-4 text-sky-600" />
                  <span>Food Type Compatibility (15% Weight)</span>
                </div>
                <span className="font-extrabold text-sky-700">
                  {match.foodCompatibilityScore} / 100
                </span>
              </div>
              <p className="text-xs text-slate-600">{match.explanation.foodType}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Close Analysis
          </button>
          <button
            onClick={() => {
              onClose();
              onRequestFood();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Proceed to Request Food
          </button>
        </div>
      </div>
    </div>
  );
};

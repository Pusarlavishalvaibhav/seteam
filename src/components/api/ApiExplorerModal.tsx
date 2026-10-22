import React, { useState } from 'react';
import {
  X,
  Code2,
  Play,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Send,
  Sparkles,
  Server,
  Layers,
} from 'lucide-react';

interface ApiExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EndpointDef {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  name: string;
  description: string;
  bodySample?: object;
  defaultQuery?: string;
}

const ENDPOINTS: EndpointDef[] = [
  {
    method: 'GET',
    path: '/api/health',
    name: 'System Health & Metrics',
    description: 'Returns API operational status, active surplus count, and metrics.',
  },
  {
    method: 'GET',
    path: '/api/listings',
    name: 'List Surplus Listings',
    description: 'Fetch food listings with optional query filtering (e.g., status, foodType, urgent).',
    defaultQuery: '?status=available',
  },
  {
    method: 'POST',
    path: '/api/listings',
    name: 'Create Food Listing',
    description: 'Post a surplus food batch (used by dining hall POS or automated kitchens).',
    bodySample: {
      foodName: 'Catered Panini & Soup Batch',
      foodType: 'Prepared Meals',
      description: 'Hot tomato basil soup and assorted grilled paninis in insulated trays.',
      quantity: 25,
      quantityUnit: 'servings',
      pickupLocation: 'South Hall Dining Loading Bay',
      availabilityDeadlineHours: 3,
      storageRequirement: 'Heated',
      dietaryInfo: ['Vegetarian'],
    },
  },
  {
    method: 'GET',
    path: '/api/requests',
    name: 'List Claim Requests',
    description: 'Returns surplus food claim requests submitted by student pantries.',
    defaultQuery: '?status=requested',
  },
  {
    method: 'POST',
    path: '/api/requests',
    name: 'Submit Claim Request',
    description: 'Student pantry submits a claim request with validation against available inventory.',
    bodySample: {
      listingId: 'listing_001',
      requestedQuantity: 20,
      receiverId: 'pantry_central',
      receiverName: 'Bear Food Pantry',
      note: 'Evening student walk-in hours.',
    },
  },
  {
    method: 'GET',
    path: '/api/tasks',
    name: 'Volunteer Pickup Tasks',
    description: 'List campus volunteer couriering tasks (unassigned pool and in-transit).',
    defaultQuery: '?status=unassigned',
  },
  {
    method: 'POST',
    path: '/api/match',
    name: 'SRS Smart Matching Algorithm',
    description: 'Calculates the 30/30/25/15 weighted compatibility score between a listing and recipient.',
    bodySample: {
      listingId: 'listing_001',
      receiverProfile: {
        location: { latitude: 37.7765, longitude: -122.4175, campusZone: 'Central Campus' },
        preferredFoodTypes: ['Prepared Meals', 'Produce & Fruit'],
        capacityMeals: 50,
      },
    },
  },
  {
    method: 'GET',
    path: '/api/analytics',
    name: 'Campus ESG & Sustainability Analytics',
    description: 'Returns real-time totals for rescued meals, CO2 avoided (kg), and active inventory.',
  },
  {
    method: 'GET',
    path: '/api/docs',
    name: 'API Schema Catalogue',
    description: 'Machine-readable OpenAPI catalogue of all available PlateConnect endpoints.',
  },
];

export const ApiExplorerModal: React.FC<ApiExplorerModalProps> = ({ isOpen, onClose }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(ENDPOINTS[0]);
  const [requestBody, setRequestBody] = useState<string>(
    selectedEndpoint.bodySample ? JSON.stringify(selectedEndpoint.bodySample, null, 2) : ''
  );
  const [queryParam, setQueryParam] = useState<string>(selectedEndpoint.defaultQuery || '');
  const [responseOutput, setResponseOutput] = useState<any>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  if (!isOpen) return null;

  const handleSelectEndpoint = (ep: EndpointDef) => {
    setSelectedEndpoint(ep);
    setRequestBody(ep.bodySample ? JSON.stringify(ep.bodySample, null, 2) : '');
    setQueryParam(ep.defaultQuery || '');
    setResponseOutput(null);
    setStatusCode(null);
    setLatencyMs(null);
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setResponseOutput(null);
    const start = performance.now();

    try {
      const fullUrl = `${selectedEndpoint.path}${queryParam}`;
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      };

      if (selectedEndpoint.method !== 'GET' && requestBody.trim()) {
        options.body = requestBody;
      }

      const res = await fetch(fullUrl, options);
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      setStatusCode(res.status);

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setResponseOutput(data);
      } else {
        const text = await res.text();
        setResponseOutput(text);
      }
    } catch (err: any) {
      setStatusCode(500);
      setResponseOutput({ error: err.message || 'Network request failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const generateCurl = () => {
    const fullUrl = `http://localhost:3000${selectedEndpoint.path}${queryParam}`;
    if (selectedEndpoint.method === 'GET') {
      return `curl -X GET "${fullUrl}"`;
    }
    return `curl -X ${selectedEndpoint.method} "${fullUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody.replace(/\n\s*/g, '')}'`;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const methodColors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-800 border-blue-300',
    POST: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    PATCH: 'bg-amber-100 text-amber-800 border-amber-300',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">PlateConnect REST API Explorer</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  /api/*
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interactive documentation and live test console for campus dining, pantries & couriers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Endpoint List Sidebar */}
          <div className="md:col-span-5 border-r border-slate-100 bg-slate-50/60 overflow-y-auto p-3 space-y-1.5">
            <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Available Endpoints ({ENDPOINTS.length})
            </div>
            {ENDPOINTS.map((ep, idx) => {
              const isSelected = selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectEndpoint(ep)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex flex-col gap-1 border cursor-pointer ${
                    isSelected
                      ? 'bg-white border-blue-400 ring-2 ring-blue-500/10 shadow-xs'
                      : 'border-transparent hover:bg-white/80 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md border ${
                        methodColors[ep.method]
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-slate-800 font-semibold truncate text-[11px]">
                      {ep.path}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px] truncate">{ep.name}</span>
                </button>
              );
            })}
          </div>

          {/* Test Runner & Response Panel */}
          <div className="md:col-span-7 flex flex-col overflow-y-auto p-5 space-y-4">
            {/* Endpoint Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                    methodColors[selectedEndpoint.method]
                  }`}
                >
                  {selectedEndpoint.method}
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {selectedEndpoint.path}
                </span>
              </div>
              <p className="text-xs text-slate-600">{selectedEndpoint.description}</p>
            </div>

            {/* Query parameters if GET */}
            {selectedEndpoint.method === 'GET' && (
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Query String
                </label>
                <input
                  type="text"
                  value={queryParam}
                  onChange={(e) => setQueryParam(e.target.value)}
                  placeholder="?status=available"
                  className="w-full font-mono text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-blue-500 bg-white"
                />
              </div>
            )}

            {/* Request Body if POST/PATCH */}
            {selectedEndpoint.method !== 'GET' && (
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Request Payload (JSON)
                </label>
                <textarea
                  rows={6}
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 focus:outline-blue-500 bg-slate-900 text-sky-300"
                />
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExecute}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isLoading ? 'Executing...' : 'Send Live Request'}</span>
              </button>

              <button
                onClick={copyCurl}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Copy as curl"
              >
                {copiedCurl ? (
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <Terminal className="w-3.5 h-3.5" />
                )}
                <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
              </button>

              <a
                href={`${selectedEndpoint.path}${queryParam}`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-xs text-slate-500 hover:text-blue-700 flex items-center gap-1 font-medium"
              >
                <span>Raw Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Response Output Box */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Live Response Output
                </span>
                {statusCode !== null && (
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded ${
                        statusCode >= 200 && statusCode < 300
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      HTTP {statusCode}
                    </span>
                    {latencyMs !== null && (
                      <span className="text-slate-400">{latencyMs} ms</span>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-slate-950 text-slate-200 font-mono text-xs rounded-xl p-3.5 max-h-56 overflow-auto border border-slate-800 shadow-inner">
                {isLoading ? (
                  <span className="text-slate-500 animate-pulse">
                    Calling {selectedEndpoint.path}...
                  </span>
                ) : responseOutput !== null ? (
                  <pre className="text-sky-300 whitespace-pre-wrap">
                    {typeof responseOutput === 'string'
                      ? responseOutput
                      : JSON.stringify(responseOutput, null, 2)}
                  </pre>
                ) : (
                  <span className="text-slate-500">
                    Click "Send Live Request" above to test this endpoint.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>REST API running on port 3000 alongside Vite SPA</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
          >
            Close Explorer
          </button>
        </div>
      </div>
    </div>
  );
};

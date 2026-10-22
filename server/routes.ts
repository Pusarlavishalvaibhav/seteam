import { Router, Request, Response } from 'express';
import {
  INITIAL_FOOD_LISTINGS,
  INITIAL_FOOD_REQUESTS,
  INITIAL_PICKUP_TASKS,
  INITIAL_DISTRIBUTION_RECORDS,
  INITIAL_AUDIT_LOGS,
  DEMO_USERS,
} from '../src/services/sampleData';
import { calculateMatchScore } from '../src/services/matchingService';
import { FoodListing, FoodRequest, PickupTask, DistributionRecord } from '../src/types';

export const apiRouter = Router();

// In-memory server-side state (initialized with campus seed data)
let listingsStore: FoodListing[] = JSON.parse(JSON.stringify(INITIAL_FOOD_LISTINGS));
let requestsStore: FoodRequest[] = JSON.parse(JSON.stringify(INITIAL_FOOD_REQUESTS));
let tasksStore: PickupTask[] = JSON.parse(JSON.stringify(INITIAL_PICKUP_TASKS));
let distributionsStore: DistributionRecord[] = JSON.parse(JSON.stringify(INITIAL_DISTRIBUTION_RECORDS));
let auditLogsStore = [...INITIAL_AUDIT_LOGS];

// 1. Health check & system status
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    system: 'PlateConnect Campus Surplus Food Recovery API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    metrics: {
      activeListings: listingsStore.filter((l) => l.status === 'available').length,
      pendingRequests: requestsStore.filter((r) => r.status === 'requested').length,
      completedDistributions: distributionsStore.length,
    },
  });
});

// 2. GET /api/listings - List all surplus food listings with filtering
apiRouter.get('/listings', (req: Request, res: Response) => {
  const { status, foodType, search, urgent } = req.query;

  let results = [...listingsStore];

  if (status && typeof status === 'string' && status !== 'all') {
    results = results.filter((l) => l.status.toLowerCase() === status.toLowerCase());
  }

  if (foodType && typeof foodType === 'string' && foodType !== 'all') {
    results = results.filter((l) => l.foodType.toLowerCase() === foodType.toLowerCase());
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    results = results.filter(
      (l) =>
        l.foodName.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.pickupLocation.toLowerCase().includes(q)
    );
  }

  if (urgent === 'true') {
    const now = Date.now();
    results = results.filter((l) => {
      const deadline = new Date(l.availabilityDeadline).getTime();
      return deadline - now <= 3 * 3600 * 1000 && l.status === 'available';
    });
  }

  res.json({
    count: results.length,
    data: results,
  });
});

// 3. GET /api/listings/:id - Get specific listing
apiRouter.get('/listings/:id', (req: Request, res: Response) => {
  const listing = listingsStore.find((l) => l.id === req.params.id || l.listingId === req.params.id);
  if (!listing) {
    res.status(404).json({ error: 'Food listing not found' });
    return;
  }
  res.json({ data: listing });
});

// 4. POST /api/listings - Create surplus listing (for automated dining hall POS/kitchen systems)
apiRouter.post('/listings', (req: Request, res: Response) => {
  const {
    foodName,
    foodType,
    description,
    quantity,
    quantityUnit,
    pickupLocation,
    availabilityDeadlineHours,
    storageRequirement,
    dietaryInfo,
    providerId,
    providerName,
    imageUrl,
  } = req.body;

  if (!foodName || !quantity || !pickupLocation) {
    res.status(400).json({ error: 'Missing required fields: foodName, quantity, pickupLocation' });
    return;
  }

  const id = `list_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const hours = availabilityDeadlineHours ? Number(availabilityDeadlineHours) : 4;
  const deadline = new Date(Date.now() + hours * 3600 * 1000).toISOString();

  const newListing: FoodListing = {
    id,
    listingId: id,
    providerId: providerId || 'api_provider',
    providerName: providerName || 'Campus Dining API Client',
    foodName,
    foodType: foodType || 'Prepared Meals',
    description: description || '',
    quantity: Number(quantity),
    quantityUnit: quantityUnit || 'servings',
    pickupLocation,
    pickupLatitude: 37.7749,
    pickupLongitude: -122.4194,
    preparationTime: new Date().toISOString(),
    availabilityDeadline: deadline,
    imageUrl: imageUrl || '/src/assets/images/packed_catering_foil_1792379888094.jpg',
    storageRequirement: storageRequirement || 'Heated',
    dietaryInfo: dietaryInfo || ['Vegetarian'],
    status: 'available',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  listingsStore.unshift(newListing);

  res.status(201).json({
    message: 'Food listing created successfully',
    data: newListing,
  });
});

// 5. PATCH /api/listings/:id/status - Update listing status
apiRouter.patch('/listings/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  const listingIndex = listingsStore.findIndex((l) => l.id === req.params.id || l.listingId === req.params.id);

  if (listingIndex === -1) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  if (!['available', 'reserved', 'completed', 'closed', 'cancelled'].includes(status)) {
    res.status(400).json({ error: `Invalid status: ${status}` });
    return;
  }

  listingsStore[listingIndex].status = status;
  listingsStore[listingIndex].updatedAt = new Date().toISOString();

  res.json({
    message: `Listing status updated to ${status}`,
    data: listingsStore[listingIndex],
  });
});

// 6. GET /api/requests - Get all food requests
apiRouter.get('/requests', (req: Request, res: Response) => {
  const { status, receiverId, providerId } = req.query;
  let results = [...requestsStore];

  if (status && typeof status === 'string') {
    results = results.filter((r) => r.status === status);
  }
  if (receiverId && typeof receiverId === 'string') {
    results = results.filter((r) => r.receiverId === receiverId);
  }
  if (providerId && typeof providerId === 'string') {
    results = results.filter((r) => r.providerId === providerId);
  }

  res.json({
    count: results.length,
    data: results,
  });
});

// 7. POST /api/requests - Submit a surplus food claim request
apiRouter.post('/requests', (req: Request, res: Response) => {
  const { listingId, requestedQuantity, receiverId, receiverName, note } = req.body;

  if (!listingId || !requestedQuantity) {
    res.status(400).json({ error: 'Missing listingId or requestedQuantity' });
    return;
  }

  const listing = listingsStore.find((l) => l.id === listingId || l.listingId === listingId);
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  if (listing.status !== 'available') {
    res.status(400).json({ error: `Listing is not available (status: ${listing.status})` });
    return;
  }

  if (Number(requestedQuantity) > listing.quantity) {
    res.status(400).json({
      error: `Requested quantity (${requestedQuantity}) exceeds available stock (${listing.quantity})`,
    });
    return;
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newRequest: FoodRequest = {
    id: requestId,
    requestId,
    listingId,
    foodName: listing.foodName,
    providerId: listing.providerId,
    providerName: listing.providerName,
    receiverId: receiverId || 'api_receiver',
    receiverName: receiverName || 'Campus Food Pantry Partner',
    requestedQuantity: Number(requestedQuantity),
    quantityUnit: listing.quantityUnit,
    status: 'requested',
    note: note || '',
    pickupLocation: listing.pickupLocation,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  requestsStore.unshift(newRequest);

  res.status(201).json({
    message: 'Food claim request submitted successfully',
    data: newRequest,
  });
});

// 8. PATCH /api/requests/:id/review - Provider accepts or rejects request
apiRouter.patch('/requests/:id/review', (req: Request, res: Response) => {
  const { decision, decisionNotes } = req.body;

  if (!['accepted', 'rejected'].includes(decision)) {
    res.status(400).json({ error: 'decision must be either "accepted" or "rejected"' });
    return;
  }

  const reqIndex = requestsStore.findIndex((r) => r.id === req.params.id || r.requestId === req.params.id);
  if (reqIndex === -1) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  const request = requestsStore[reqIndex];
  request.status = decision;
  request.decisionAt = new Date().toISOString();
  request.decisionNotes = decisionNotes || '';
  request.updatedAt = new Date().toISOString();

  let createdTask: PickupTask | null = null;

  if (decision === 'accepted') {
    // Deduct quantity from listing
    const listing = listingsStore.find((l) => l.id === request.listingId || l.listingId === request.listingId);
    if (listing) {
      listing.quantity = Math.max(0, listing.quantity - request.requestedQuantity);
      if (listing.quantity === 0) listing.status = 'reserved';
    }

    // Auto-generate volunteer pickup task
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    createdTask = {
      id: taskId,
      taskId,
      requestId: request.id,
      listingId: request.listingId,
      foodName: request.foodName,
      providerName: request.providerName,
      receiverName: request.receiverName,
      quantity: request.requestedQuantity,
      quantityUnit: request.quantityUnit,
      pickupDetails: {
        location: request.pickupLocation || 'Kitchen Loading Dock',
        notes: 'Ready for volunteer pickup at kitchen counter',
      },
      deliveryDetails: {
        location: request.receiverName || 'Student Food Pantry',
        notes: decisionNotes || 'Direct delivery to pantry reception',
      },
      status: 'unassigned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasksStore.unshift(createdTask);
  }

  res.json({
    message: `Request marked as ${decision}`,
    data: request,
    pickupTask: createdTask,
  });
});

// 9. GET /api/tasks - List pickup tasks
apiRouter.get('/tasks', (req: Request, res: Response) => {
  const { status, volunteerId } = req.query;
  let results = [...tasksStore];

  if (status && typeof status === 'string') {
    results = results.filter((t) => t.status === status);
  }
  if (volunteerId && typeof volunteerId === 'string') {
    results = results.filter((t) => t.volunteerId === volunteerId);
  }

  res.json({
    count: results.length,
    data: results,
  });
});

// 10. PATCH /api/tasks/:id/progress - Advance volunteer transit status
apiRouter.patch('/tasks/:id/progress', (req: Request, res: Response) => {
  const { status, volunteerId, volunteerName } = req.body;
  const taskIndex = tasksStore.findIndex((t) => t.id === req.params.id || t.taskId === req.params.id);

  if (taskIndex === -1) {
    res.status(404).json({ error: 'Pickup task not found' });
    return;
  }

  const validStatuses = [
    'accepted',
    'en_route_pickup',
    'picked_up',
    'en_route_delivery',
    'delivered',
    'completed',
    'cancelled',
  ];

  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid task status: ${status}` });
    return;
  }

  const task = tasksStore[taskIndex];
  task.status = status;
  task.updatedAt = new Date().toISOString();
  if (volunteerId) task.volunteerId = volunteerId;
  if (volunteerName) task.volunteerName = volunteerName;

  if (status === 'picked_up') task.pickedUpAt = new Date().toISOString();
  if (status === 'delivered') task.deliveredAt = new Date().toISOString();
  if (status === 'completed') {
    task.completedAt = new Date().toISOString();

    // Auto-create distribution record
    const distId = `dist_${Date.now()}`;
    const qty = task.quantity || 30;
    const distRecord: DistributionRecord = {
      id: distId,
      distributionId: distId,
      listingId: task.listingId,
      requestId: task.requestId,
      providerId: 'provider',
      receiverId: 'receiver',
      volunteerId: task.volunteerId,
      foodName: task.foodName,
      quantityDistributed: qty,
      quantityUnit: task.quantityUnit || 'servings',
      estimatedMeals: qty,
      co2SavedKg: Math.round(qty * 1.32 * 10) / 10,
      status: 'verified',
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    distributionsStore.unshift(distRecord);
  }

  res.json({
    message: `Task progress updated to ${status}`,
    data: task,
  });
});

// 11. POST /api/match - SRS Smart Matching calculation endpoint
apiRouter.post('/match', (req: Request, res: Response) => {
  const { listingId, receiverProfile } = req.body;

  const listing = listingsStore.find((l) => l.id === listingId || l.listingId === listingId);
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }

  const receiver = receiverProfile || DEMO_USERS.receiver_1;
  const matchBreakdown = calculateMatchScore(listing, receiver);

  res.json({
    formula: '(distance * 0.30) + (quantity * 0.30) + (urgency * 0.25) + (foodCompatibility * 0.15)',
    score: matchBreakdown.overallScore,
    breakdown: matchBreakdown,
  });
});

// 12. GET /api/analytics - Campus sustainability and ESG statistics
apiRouter.get('/analytics', (req: Request, res: Response) => {
  const totalMeals = distributionsStore.reduce((acc, d) => acc + (d.estimatedMeals || 0), 0);
  const totalCo2Kg = Math.round(
    distributionsStore.reduce((acc, d) => acc + (d.co2SavedKg || 0), 0) * 10
  ) / 10;
  const activeSurplus = listingsStore
    .filter((l) => l.status === 'available')
    .reduce((acc, l) => acc + l.quantity, 0);

  res.json({
    summary: {
      totalMealsRescued: totalMeals,
      co2DivertedKg: totalCo2Kg,
      totalDistributions: distributionsStore.length,
      currentActiveSurplusQuantity: activeSurplus,
      activeListingsCount: listingsStore.filter((l) => l.status === 'available').length,
      pendingRequestsCount: requestsStore.filter((r) => r.status === 'requested').length,
    },
    distributions: distributionsStore,
  });
});

// 13. GET /api/export/csv - ESG report export in CSV format
apiRouter.get('/export/csv', (req: Request, res: Response) => {
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
  const rows = distributionsStore.map((d) => [
    d.distributionId,
    `"${d.foodName || 'Surplus'}"`,
    d.quantityDistributed,
    d.quantityUnit,
    d.estimatedMeals,
    d.co2SavedKg,
    d.status,
    d.completedAt,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="PlateConnect_Report.csv"');
  res.send(csv);
});

// 14. GET /api/docs - API Endpoint Schema Documentation
apiRouter.get('/docs', (req: Request, res: Response) => {
  res.json({
    title: 'PlateConnect Campus Food Recovery REST API',
    description: 'REST API for campus dining halls, student food pantries, couriers, and administrators.',
    endpoints: [
      { method: 'GET', path: '/api/health', description: 'System health, uptime, and quick metrics' },
      { method: 'GET', path: '/api/listings', description: 'List surplus food listings (query: status, foodType, search, urgent)' },
      { method: 'GET', path: '/api/listings/:id', description: 'Get a single food listing by ID' },
      { method: 'POST', path: '/api/listings', description: 'Create a new surplus food listing' },
      { method: 'PATCH', path: '/api/listings/:id/status', description: 'Update listing status (available, closed, cancelled)' },
      { method: 'GET', path: '/api/requests', description: 'List food requests (query: status, receiverId, providerId)' },
      { method: 'POST', path: '/api/requests', description: 'Submit a surplus food claim request' },
      { method: 'PATCH', path: '/api/requests/:id/review', description: 'Provider decision: accept or decline claim' },
      { method: 'GET', path: '/api/tasks', description: 'List volunteer pickup tasks (query: status, volunteerId)' },
      { method: 'PATCH', path: '/api/tasks/:id/progress', description: 'Advance volunteer pickup/delivery status' },
      { method: 'POST', path: '/api/match', description: 'Run PlateConnect SRS 30/30/25/15 smart matching algorithm' },
      { method: 'GET', path: '/api/analytics', description: 'Sustainability ESG metrics (meals rescued, CO2 avoided)' },
      { method: 'GET', path: '/api/export/csv', description: 'Export distribution data as CSV spreadsheet' },
      { method: 'GET', path: '/api/docs', description: 'API schema and documentation catalogue' },
    ],
  });
});

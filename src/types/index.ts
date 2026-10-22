export type UserRole = 'provider' | 'receiver' | 'volunteer' | 'admin';

export type AccountStatus = 'active' | 'pending' | 'suspended';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  contactInformation?: {
    phone?: string;
    departmentOrOrg?: string;
    campusBuilding?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    campusZone?: string;
    addressDescription?: string;
  };
  preferredFoodTypes?: string[];
  capacityMeals?: number; // For receivers (e.g. food pantry capacity)
  createdAt: string | any;
  updatedAt: string | any;
}

export type FoodType =
  | 'Prepared Meals'
  | 'Produce & Fruit'
  | 'Bakery & Bread'
  | 'Dairy & Refrigerated'
  | 'Packaged & Pantry'
  | 'Beverages';

export type QuantityUnit = 'servings' | 'lbs' | 'kg' | 'portions' | 'boxes';

export type ListingStatus = 'available' | 'reserved' | 'completed' | 'closed' | 'cancelled' | 'expired';

export interface FoodListing {
  id: string; // Document ID
  listingId: string;
  providerId: string;
  providerName?: string;
  foodName: string;
  foodType: FoodType;
  description: string;
  quantity: number;
  quantityUnit: QuantityUnit;
  pickupLocation: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  preparationTime: string; // ISO string or formatted
  availabilityDeadline: string; // ISO string
  imageUrl?: string;
  storageRequirement?: 'Room Temp' | 'Refrigerated' | 'Heated';
  dietaryInfo?: string[]; // 'Vegetarian', 'Vegan', 'Halal', 'Gluten-Free', 'Nut-Free'
  status: ListingStatus;
  createdAt: string | any;
  updatedAt: string | any;
}

export type RequestStatus =
  | 'requested'
  | 'accepted'
  | 'rejected'
  | 'picked_up'
  | 'distributed'
  | 'completed'
  | 'cancelled';

export interface FoodRequest {
  id: string;
  requestId: string;
  listingId: string;
  foodName?: string;
  providerId: string;
  providerName?: string;
  receiverId: string;
  receiverName?: string;
  requestedQuantity: number;
  quantityUnit?: QuantityUnit;
  status: RequestStatus;
  pickupLocation?: string;
  note?: string;
  decisionAt?: string | any;
  decisionNotes?: string;
  createdAt: string | any;
  updatedAt: string | any;
}

export type TaskStatus =
  | 'unassigned'
  | 'accepted'
  | 'en_route_pickup'
  | 'picked_up'
  | 'en_route_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export interface PickupTask {
  id: string;
  taskId: string;
  requestId: string;
  listingId: string;
  foodName?: string;
  volunteerId?: string;
  volunteerName?: string;
  providerName?: string;
  receiverName?: string;
  quantity?: number;
  quantityUnit?: QuantityUnit;
  pickupDetails: {
    location: string;
    contactName?: string;
    contactPhone?: string;
    notes?: string;
  };
  deliveryDetails: {
    location: string;
    recipientName?: string;
    recipientPhone?: string;
    notes?: string;
  };
  status: TaskStatus;
  acceptedAt?: string | any;
  pickedUpAt?: string | any;
  deliveredAt?: string | any;
  completedAt?: string | any;
  createdAt: string | any;
  updatedAt: string | any;
}

export type NotificationType =
  | 'request_submitted'
  | 'request_accepted'
  | 'request_rejected'
  | 'task_available'
  | 'task_assigned'
  | 'task_status_update'
  | 'deadline_approaching'
  | 'system_alert';

export interface AppNotification {
  id: string;
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedRecordId?: string;
  relatedRecordType?: 'listing' | 'request' | 'task';
  isRead: boolean;
  createdAt: string | any;
}

export interface DistributionRecord {
  id: string;
  distributionId: string;
  listingId: string;
  requestId: string;
  providerId: string;
  receiverId: string;
  volunteerId?: string;
  foodName?: string;
  quantityDistributed: number;
  quantityUnit: QuantityUnit;
  estimatedMeals: number; // e.g. 1 serving = 1 meal, 1.2 lbs = 1 meal
  co2SavedKg: number; // estimated food waste diversion CO2 equivalent
  status: 'verified' | 'completed' | 'flagged';
  completedAt: string | any;
  createdAt: string | any;
  updatedAt: string | any;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail?: string;
  actorRole?: UserRole;
  action: string;
  targetType: 'user' | 'listing' | 'request' | 'task' | 'distribution' | 'auth';
  targetId: string;
  timestamp: string | any;
  metadata?: Record<string, any>;
}

export interface MatchScoreBreakdown {
  listing: FoodListing;
  overallScore: number; // 0 - 100
  distanceScore: number; // 0 - 100
  quantityScore: number; // 0 - 100
  urgencyScore: number; // 0 - 100
  foodCompatibilityScore: number; // 0 - 100
  distanceKm?: number;
  distanceDescription: string;
  urgencyHoursLeft: number;
  explanation: {
    distance: string;
    quantity: string;
    urgency: string;
    foodType: string;
  };
}

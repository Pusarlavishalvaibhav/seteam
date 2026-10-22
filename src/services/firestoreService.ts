import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  UserProfile,
  FoodListing,
  FoodRequest,
  PickupTask,
  AppNotification,
  DistributionRecord,
  AuditLog,
  UserRole,
  ListingStatus,
  RequestStatus,
  TaskStatus,
} from '../types';
import {
  INITIAL_FOOD_LISTINGS,
  INITIAL_FOOD_REQUESTS,
  INITIAL_PICKUP_TASKS,
  INITIAL_NOTIFICATIONS,
  INITIAL_DISTRIBUTION_RECORDS,
  INITIAL_AUDIT_LOGS,
  DEMO_USERS,
} from './sampleData';

// In-Memory store for when Firebase is unconfigured or in interactive demo mode
class LocalFallbackStore {
  users: Map<string, UserProfile> = new Map(Object.entries(DEMO_USERS));
  listings: Map<string, FoodListing> = new Map(INITIAL_FOOD_LISTINGS.map((l) => [l.id, { ...l }]));
  requests: Map<string, FoodRequest> = new Map(INITIAL_FOOD_REQUESTS.map((r) => [r.id, { ...r }]));
  tasks: Map<string, PickupTask> = new Map(INITIAL_PICKUP_TASKS.map((t) => [t.id, { ...t }]));
  notifications: Map<string, AppNotification> = new Map(INITIAL_NOTIFICATIONS.map((n) => [n.id, { ...n }]));
  distributions: Map<string, DistributionRecord> = new Map(INITIAL_DISTRIBUTION_RECORDS.map((d) => [d.id, { ...d }]));
  auditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];
  listeners: Set<() => void> = new Set();

  notify() {
    this.listeners.forEach((cb) => cb());
  }

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

export const localStore = new LocalFallbackStore();

// ==========================================
// 1. USER PROFILE MANAGEMENT
// ==========================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured || !db) {
    return localStore.users.get(uid) || null;
  }

  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  // CRITICAL SECURITY RULE: Public registration cannot create admin accounts
  if (profile.role === 'admin') {
    throw new Error('Unauthorized: Public registration cannot assign the administrator role.');
  }

  if (!isFirebaseConfigured || !db) {
    localStore.users.set(profile.uid, {
      ...profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    localStore.notify();
    return;
  }

  try {
    const docRef = doc(db, 'users', profile.uid);
    await setDoc(docRef, {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${profile.uid}`);
  }
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  // Prevent unauthorized self-elevation
  if ('role' in updates && updates.role === 'admin') {
    throw new Error('Unauthorized: Cannot grant admin privileges via client profile update.');
  }

  if (!isFirebaseConfigured || !db) {
    const existing = localStore.users.get(uid);
    if (existing) {
      localStore.users.set(uid, {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      localStore.notify();
    }
    return;
  }

  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  if (!isFirebaseConfigured || !db) {
    return Array.from(localStore.users.values());
  }

  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
}

// ==========================================
// 2. FOOD LISTINGS MANAGEMENT
// ==========================================

export async function createFoodListing(
  listingData: Omit<FoodListing, 'id' | 'listingId' | 'createdAt' | 'updatedAt'>,
  actorEmail?: string
): Promise<string> {
  const listingId = `list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (!isFirebaseConfigured || !db) {
    const newListing: FoodListing = {
      ...listingData,
      id: listingId,
      listingId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStore.listings.set(listingId, newListing);
    await createAuditLog({
      actorId: listingData.providerId,
      actorEmail,
      actorRole: 'provider',
      action: 'CREATE_FOOD_LISTING',
      targetType: 'listing',
      targetId: listingId,
      metadata: { foodName: listingData.foodName, quantity: listingData.quantity },
    });
    localStore.notify();
    return listingId;
  }

  try {
    const docRef = doc(db, 'foodListings', listingId);
    await setDoc(docRef, {
      ...listingData,
      id: listingId,
      listingId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await createAuditLog({
      actorId: listingData.providerId,
      actorEmail,
      actorRole: 'provider',
      action: 'CREATE_FOOD_LISTING',
      targetType: 'listing',
      targetId: listingId,
      metadata: { foodName: listingData.foodName, quantity: listingData.quantity },
    });

    return listingId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `foodListings/${listingId}`);
    throw error;
  }
}

export async function updateFoodListingStatus(
  listingId: string,
  status: ListingStatus,
  actorId: string,
  actorEmail?: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const listing = localStore.listings.get(listingId);
    if (listing) {
      listing.status = status;
      listing.updatedAt = new Date().toISOString();
      localStore.listings.set(listingId, listing);
      await createAuditLog({
        actorId,
        actorEmail,
        action: `UPDATE_LISTING_STATUS_${status.toUpperCase()}`,
        targetType: 'listing',
        targetId: listingId,
        metadata: { newStatus: status },
      });
      localStore.notify();
    }
    return;
  }

  try {
    const docRef = doc(db, 'foodListings', listingId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    await createAuditLog({
      actorId,
      actorEmail,
      action: `UPDATE_LISTING_STATUS_${status.toUpperCase()}`,
      targetType: 'listing',
      targetId: listingId,
      metadata: { newStatus: status },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `foodListings/${listingId}`);
  }
}

export function subscribeToFoodListings(callback: (listings: FoodListing[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    callback(Array.from(localStore.listings.values()));
    return localStore.subscribe(() => {
      callback(Array.from(localStore.listings.values()));
    });
  }

  const q = query(collection(db, 'foodListings'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: FoodListing[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as FoodListing;
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'foodListings');
    }
  );
}

// ==========================================
// 3. FOOD REQUEST & APPROVAL WORKFLOW
// ==========================================

export async function submitFoodRequest(
  requestData: {
    listingId: string;
    foodName: string;
    providerId: string;
    providerName?: string;
    receiverId: string;
    receiverName?: string;
    requestedQuantity: number;
    quantityUnit?: any;
    note?: string;
    pickupLocation?: string;
  },
  actorEmail?: string
): Promise<string> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Verification: Listing must be available and quantity must be valid
  if (!isFirebaseConfigured || !db) {
    const listing = localStore.listings.get(requestData.listingId);
    if (!listing) throw new Error('Listing not found');
    if (listing.status !== 'available') throw new Error(`Listing is no longer available (current status: ${listing.status})`);
    if (requestData.requestedQuantity > listing.quantity) {
      throw new Error(`Requested quantity (${requestData.requestedQuantity}) exceeds available quantity (${listing.quantity})`);
    }

    const newReq: FoodRequest = {
      id: requestId,
      requestId,
      listingId: requestData.listingId,
      foodName: requestData.foodName,
      providerId: requestData.providerId,
      providerName: requestData.providerName,
      receiverId: requestData.receiverId,
      receiverName: requestData.receiverName,
      requestedQuantity: requestData.requestedQuantity,
      quantityUnit: requestData.quantityUnit,
      status: 'requested',
      note: requestData.note,
      pickupLocation: requestData.pickupLocation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStore.requests.set(requestId, newReq);

    // Notify Provider
    await createNotification({
      userId: requestData.providerId,
      title: 'New Food Request Received',
      message: `${requestData.receiverName || 'A receiver'} requested ${requestData.requestedQuantity} ${requestData.quantityUnit || 'units'} of ${requestData.foodName}.`,
      type: 'request_submitted',
      relatedRecordId: requestId,
      relatedRecordType: 'request',
    });

    await createAuditLog({
      actorId: requestData.receiverId,
      actorEmail,
      actorRole: 'receiver',
      action: 'SUBMIT_FOOD_REQUEST',
      targetType: 'request',
      targetId: requestId,
      metadata: { requestedQuantity: requestData.requestedQuantity, listingId: requestData.listingId },
    });

    localStore.notify();
    return requestId;
  }

  // Live Firestore with Transaction to avoid race condition on simultaneous requests
  try {
    await runTransaction(db, async (transaction) => {
      const listingRef = doc(db, 'foodListings', requestData.listingId);
      const listingDoc = await transaction.get(listingRef);

      if (!listingDoc.exists()) {
        throw new Error('Listing does not exist.');
      }

      const listingData = listingDoc.data() as FoodListing;
      if (listingData.status !== 'available') {
        throw new Error(`Listing is not available for request (status is ${listingData.status}).`);
      }

      if (requestData.requestedQuantity > listingData.quantity) {
        throw new Error(`Requested amount exceeds available surplus (${listingData.quantity} available).`);
      }

      const reqRef = doc(db, 'foodRequests', requestId);
      transaction.set(reqRef, {
        ...requestData,
        id: requestId,
        requestId,
        status: 'requested',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    // Notify provider
    await createNotification({
      userId: requestData.providerId,
      title: 'New Surplus Request Received',
      message: `${requestData.receiverName || 'A receiver'} requested ${requestData.requestedQuantity} ${requestData.quantityUnit || 'units'} of ${requestData.foodName}.`,
      type: 'request_submitted',
      relatedRecordId: requestId,
      relatedRecordType: 'request',
    });

    await createAuditLog({
      actorId: requestData.receiverId,
      actorEmail,
      actorRole: 'receiver',
      action: 'SUBMIT_FOOD_REQUEST',
      targetType: 'request',
      targetId: requestId,
      metadata: { requestedQuantity: requestData.requestedQuantity, listingId: requestData.listingId },
    });

    return requestId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `foodRequests/${requestId}`);
    throw error;
  }
}

export async function reviewFoodRequest(
  requestId: string,
  decision: 'accepted' | 'rejected',
  providerId: string,
  decisionNotes?: string,
  actorEmail?: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const req = localStore.requests.get(requestId);
    if (!req) throw new Error('Request not found');
    if (req.providerId !== providerId) throw new Error('Unauthorized to review this request');

    req.status = decision;
    req.decisionAt = new Date().toISOString();
    req.decisionNotes = decisionNotes;
    req.updatedAt = new Date().toISOString();
    localStore.requests.set(requestId, req);

    if (decision === 'accepted') {
      // Update listing
      const listing = localStore.listings.get(req.listingId);
      if (listing) {
        listing.quantity = Math.max(0, listing.quantity - req.requestedQuantity);
        if (listing.quantity === 0) {
          listing.status = 'reserved';
        }
        localStore.listings.set(listing.id, listing);
      }

      // Automatically create a Pickup Task for campus volunteers!
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newTask: PickupTask = {
        id: taskId,
        taskId,
        requestId,
        listingId: req.listingId,
        foodName: req.foodName,
        providerName: req.providerName,
        receiverName: req.receiverName,
        quantity: req.requestedQuantity,
        quantityUnit: req.quantityUnit,
        pickupDetails: {
          location: req.pickupLocation || listing?.pickupLocation || 'Dining Hall Kitchen',
          notes: 'Packed and ready for pickup at provider counter.',
        },
        deliveryDetails: {
          location: req.receiverName || 'Student Food Pantry',
          notes: decisionNotes || 'Deliver promptly maintaining food safety guidelines.',
        },
        status: 'unassigned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStore.tasks.set(taskId, newTask);

      // Notify receiver
      await createNotification({
        userId: req.receiverId,
        title: 'Food Request Approved! 🎉',
        message: `${req.providerName || 'Provider'} accepted your request for ${req.foodName}. A volunteer pickup task has been created.`,
        type: 'request_accepted',
        relatedRecordId: requestId,
        relatedRecordType: 'request',
      });
    } else {
      // Notify receiver of rejection
      await createNotification({
        userId: req.receiverId,
        title: 'Food Request Declined',
        message: `${req.providerName || 'Provider'} was unable to fulfill your request: ${decisionNotes || 'Surplus no longer available.'}`,
        type: 'request_rejected',
        relatedRecordId: requestId,
        relatedRecordType: 'request',
      });
    }

    await createAuditLog({
      actorId: providerId,
      actorEmail,
      actorRole: 'provider',
      action: `REVIEW_REQUEST_${decision.toUpperCase()}`,
      targetType: 'request',
      targetId: requestId,
      metadata: { decision, decisionNotes },
    });

    localStore.notify();
    return;
  }

  // In Firestore
  try {
    const reqRef = doc(db, 'foodRequests', requestId);
    const snap = await getDoc(reqRef);
    if (!snap.exists()) throw new Error('Request does not exist');
    const reqData = snap.data() as FoodRequest;

    await updateDoc(reqRef, {
      status: decision,
      decisionAt: serverTimestamp(),
      decisionNotes: decisionNotes || '',
      updatedAt: serverTimestamp(),
    });

    if (decision === 'accepted') {
      // Create pickup task
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const taskRef = doc(db, 'pickupTasks', taskId);
      await setDoc(taskRef, {
        id: taskId,
        taskId,
        requestId,
        listingId: reqData.listingId,
        foodName: reqData.foodName || 'Campus Surplus',
        providerName: reqData.providerName || 'Provider',
        receiverName: reqData.receiverName || 'Receiver',
        quantity: reqData.requestedQuantity,
        quantityUnit: reqData.quantityUnit || 'servings',
        pickupDetails: {
          location: reqData.pickupLocation || 'Provider Kitchen Loading Dock',
          notes: 'Ready for pickup.',
        },
        deliveryDetails: {
          location: reqData.receiverName || 'Student Food Pantry',
          notes: decisionNotes || 'Direct delivery to pantry reception.',
        },
        status: 'unassigned',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update listing quantity
      const listingRef = doc(db, 'foodListings', reqData.listingId);
      const listingSnap = await getDoc(listingRef);
      if (listingSnap.exists()) {
        const lData = listingSnap.data() as FoodListing;
        const newQty = Math.max(0, lData.quantity - reqData.requestedQuantity);
        await updateDoc(listingRef, {
          quantity: newQty,
          status: newQty === 0 ? 'reserved' : lData.status,
          updatedAt: serverTimestamp(),
        });
      }

      await createNotification({
        userId: reqData.receiverId,
        title: 'Food Request Approved!',
        message: `${reqData.providerName || 'Provider'} approved your request. Pickup task has been routed to student volunteers.`,
        type: 'request_accepted',
        relatedRecordId: requestId,
        relatedRecordType: 'request',
      });
    } else {
      await createNotification({
        userId: reqData.receiverId,
        title: 'Food Request Update',
        message: `${reqData.providerName || 'Provider'} was unable to fulfill your request: ${decisionNotes || 'Surplus unavailable.'}`,
        type: 'request_rejected',
        relatedRecordId: requestId,
        relatedRecordType: 'request',
      });
    }

    await createAuditLog({
      actorId: providerId,
      actorEmail,
      actorRole: 'provider',
      action: `REVIEW_REQUEST_${decision.toUpperCase()}`,
      targetType: 'request',
      targetId: requestId,
      metadata: { decision, decisionNotes },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `foodRequests/${requestId}`);
    throw error;
  }
}

export function subscribeToFoodRequests(callback: (requests: FoodRequest[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    callback(Array.from(localStore.requests.values()));
    return localStore.subscribe(() => {
      callback(Array.from(localStore.requests.values()));
    });
  }

  const q = query(collection(db, 'foodRequests'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          ...d,
          id: docSnap.id,
          createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt,
          updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate().toISOString() : d.updatedAt,
        } as FoodRequest;
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'foodRequests');
    }
  );
}

// ==========================================
// 4. VOLUNTEER PICKUP AND DISTRIBUTION
// ==========================================

export async function acceptPickupTask(
  taskId: string,
  volunteerId: string,
  volunteerName: string,
  actorEmail?: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const task = localStore.tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    if (task.status !== 'unassigned') throw new Error('Task is already claimed by another volunteer');

    task.volunteerId = volunteerId;
    task.volunteerName = volunteerName;
    task.status = 'accepted';
    task.acceptedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    localStore.tasks.set(taskId, task);

    await createAuditLog({
      actorId: volunteerId,
      actorEmail,
      actorRole: 'volunteer',
      action: 'ACCEPT_PICKUP_TASK',
      targetType: 'task',
      targetId: taskId,
      metadata: { volunteerName },
    });

    localStore.notify();
    return;
  }

  try {
    const taskRef = doc(db, 'pickupTasks', taskId);
    await updateDoc(taskRef, {
      volunteerId,
      volunteerName,
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await createAuditLog({
      actorId: volunteerId,
      actorEmail,
      actorRole: 'volunteer',
      action: 'ACCEPT_PICKUP_TASK',
      targetType: 'task',
      targetId: taskId,
      metadata: { volunteerName },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `pickupTasks/${taskId}`);
    throw error;
  }
}

export async function updateTaskProgress(
  taskId: string,
  newStatus: TaskStatus,
  volunteerId: string,
  actorEmail?: string
): Promise<void> {
  const timestampField =
    newStatus === 'picked_up'
      ? 'pickedUpAt'
      : newStatus === 'delivered'
      ? 'deliveredAt'
      : newStatus === 'completed'
      ? 'completedAt'
      : undefined;

  if (!isFirebaseConfigured || !db) {
    const task = localStore.tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    task.status = newStatus;
    task.updatedAt = new Date().toISOString();
    if (timestampField) {
      (task as any)[timestampField] = new Date().toISOString();
    }
    localStore.tasks.set(taskId, task);

    // If completed, record distribution!
    if (newStatus === 'completed') {
      const distId = `dist_${Date.now()}`;
      const record: DistributionRecord = {
        id: distId,
        distributionId: distId,
        listingId: task.listingId,
        requestId: task.requestId,
        providerId: 'provider',
        receiverId: 'receiver',
        volunteerId,
        foodName: task.foodName,
        quantityDistributed: task.quantity || 30,
        quantityUnit: task.quantityUnit || 'servings',
        estimatedMeals: task.quantity || 30,
        co2SavedKg: Math.round((task.quantity || 30) * 1.32 * 10) / 10,
        status: 'verified',
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStore.distributions.set(distId, record);
    }

    await createAuditLog({
      actorId: volunteerId,
      actorEmail,
      actorRole: 'volunteer',
      action: `TASK_PROGRESS_${newStatus.toUpperCase()}`,
      targetType: 'task',
      targetId: taskId,
      metadata: { newStatus },
    });

    localStore.notify();
    return;
  }

  try {
    const taskRef = doc(db, 'pickupTasks', taskId);
    const updates: any = {
      status: newStatus,
      updatedAt: serverTimestamp(),
    };
    if (timestampField) {
      updates[timestampField] = serverTimestamp();
    }
    await updateDoc(taskRef, updates);

    if (newStatus === 'completed') {
      const taskSnap = await getDoc(taskRef);
      const tData = taskSnap.data() as PickupTask;
      const distId = `dist_${Date.now()}`;
      const distRef = doc(db, 'distributionRecords', distId);

      const qty = tData.quantity || 30;
      await setDoc(distRef, {
        id: distId,
        distributionId: distId,
        listingId: tData.listingId,
        requestId: tData.requestId,
        providerId: 'provider',
        receiverId: 'receiver',
        volunteerId,
        foodName: tData.foodName || 'Campus Surplus',
        quantityDistributed: qty,
        quantityUnit: tData.quantityUnit || 'servings',
        estimatedMeals: qty,
        co2SavedKg: Math.round(qty * 1.32 * 10) / 10,
        status: 'verified',
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await createAuditLog({
      actorId: volunteerId,
      actorEmail,
      actorRole: 'volunteer',
      action: `TASK_PROGRESS_${newStatus.toUpperCase()}`,
      targetType: 'task',
      targetId: taskId,
      metadata: { newStatus },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `pickupTasks/${taskId}`);
    throw error;
  }
}

export function subscribeToPickupTasks(callback: (tasks: PickupTask[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    callback(Array.from(localStore.tasks.values()));
    return localStore.subscribe(() => {
      callback(Array.from(localStore.tasks.values()));
    });
  }

  const q = query(collection(db, 'pickupTasks'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          ...d,
          id: docSnap.id,
          createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt,
          updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate().toISOString() : d.updatedAt,
        } as PickupTask;
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pickupTasks');
    }
  );
}

// ==========================================
// 5. NOTIFICATIONS
// ==========================================

export async function createNotification(
  notifData: Omit<AppNotification, 'id' | 'notificationId' | 'isRead' | 'createdAt'>
): Promise<string> {
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  if (!isFirebaseConfigured || !db) {
    const notif: AppNotification = {
      ...notifData,
      id: notificationId,
      notificationId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    localStore.notifications.set(notificationId, notif);
    localStore.notify();
    return notificationId;
  }

  try {
    const docRef = doc(db, 'notifications', notificationId);
    await setDoc(docRef, {
      ...notifData,
      id: notificationId,
      notificationId,
      isRead: false,
      createdAt: serverTimestamp(),
    });
    return notificationId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `notifications/${notificationId}`);
    return notificationId;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const n = localStore.notifications.get(notificationId);
    if (n) {
      n.isRead = true;
      localStore.notifications.set(notificationId, n);
      localStore.notify();
    }
    return;
  }

  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    localStore.notifications.forEach((n) => {
      if (n.userId === userId) {
        n.isRead = true;
      }
    });
    localStore.notify();
    return;
  }

  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const snap = await getDocs(q);
    const updates = snap.docs.map((docSnap) =>
      updateDoc(docSnap.ref, { isRead: true })
    );
    await Promise.all(updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications');
  }
}

export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void
): () => void {
  if (!isFirebaseConfigured || !db) {
    const filter = () =>
      Array.from(localStore.notifications.values())
        .filter((n) => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(filter());
    return localStore.subscribe(() => {
      callback(filter());
    });
  }

  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        } as AppNotification;
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    }
  );
}

// ==========================================
// 6. DISTRIBUTION RECORDS & ADMIN METRICS
// ==========================================

export function subscribeToDistributionRecords(
  callback: (records: DistributionRecord[]) => void
): () => void {
  if (!isFirebaseConfigured || !db) {
    callback(Array.from(localStore.distributions.values()));
    return localStore.subscribe(() => {
      callback(Array.from(localStore.distributions.values()));
    });
  }

  const q = query(collection(db, 'distributionRecords'), orderBy('completedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toDate().toISOString() : data.completedAt,
        } as DistributionRecord;
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'distributionRecords');
    }
  );
}

// ==========================================
// 7. AUDIT LOGS
// ==========================================

export async function createAuditLog(
  logData: Omit<AuditLog, 'id' | 'timestamp'>
): Promise<void> {
  const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  if (!isFirebaseConfigured || !db) {
    const log: AuditLog = {
      ...logData,
      id: logId,
      timestamp: new Date().toISOString(),
    };
    localStore.auditLogs.unshift(log);
    localStore.notify();
    return;
  }

  try {
    const docRef = doc(db, 'auditLogs', logId);
    await setDoc(docRef, {
      ...logData,
      id: logId,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // Non-blocking log catch
    console.warn('Audit log write note:', error);
  }
}

export function subscribeToAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    callback([...localStore.auditLogs]);
    return localStore.subscribe(() => {
      callback([...localStore.auditLogs]);
    });
  }

  const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp,
        } as AuditLog;
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
    }
  );
}

// Helper: Seed sample data into live Firestore for first-time administrators
export async function seedInitialFirestoreData(actorEmail: string): Promise<{ success: boolean; message: string }> {
  if (!isFirebaseConfigured || !db) {
    return {
      success: false,
      message: 'Firebase is not configured in .env. Sample data is currently active in guided demo mode.',
    };
  }

  try {
    // Seed sample listings
    for (const listing of INITIAL_FOOD_LISTINGS) {
      await setDoc(doc(db, 'foodListings', listing.id), {
        ...listing,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Seed sample requests
    for (const req of INITIAL_FOOD_REQUESTS) {
      await setDoc(doc(db, 'foodRequests', req.id), {
        ...req,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Seed sample tasks
    for (const task of INITIAL_PICKUP_TASKS) {
      await setDoc(doc(db, 'pickupTasks', task.id), {
        ...task,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Seed distributions
    for (const dist of INITIAL_DISTRIBUTION_RECORDS) {
      await setDoc(doc(db, 'distributionRecords', dist.id), {
        ...dist,
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Log seed event
    await createAuditLog({
      actorId: 'admin',
      actorEmail,
      actorRole: 'admin',
      action: 'ADMIN_SEEDED_INITIAL_DATABASE',
      targetType: 'distribution',
      targetId: 'all',
      metadata: { seededBy: actorEmail },
    });

    return {
      success: true,
      message: 'Campus initial data seeded into Firestore successfully!',
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to seed data: ${error?.message || String(error)}`,
    };
  }
}

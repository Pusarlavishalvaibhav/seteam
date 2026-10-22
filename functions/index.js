const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * Trusted server-side Administrator Role Assignment
 * Validates that only an existing verified administrator can grant the admin role
 */
exports.setAdminRole = onCall(async (request) => {
  // 1. Verify caller authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required to manage user roles.");
  }

  const callerUid = request.auth.uid;
  const callerDoc = await db.collection("users").doc(callerUid).get();

  // 2. Authorize caller
  const callerData = callerDoc.data();
  const isSuperAdminEmail = request.auth.token.email === "vaibhavpusarla@gmail.com";
  if (!isSuperAdminEmail && (!callerDoc.exists || callerData.role !== "admin")) {
    throw new HttpsError("permission-denied", "Unauthorized: Only existing campus administrators can assign admin privileges.");
  }

  const { targetUid, newRole } = request.data;
  if (!targetUid || !newRole) {
    throw new HttpsError("invalid-argument", "targetUid and newRole parameters are required.");
  }

  // 3. Update target user document
  await db.collection("users").doc(targetUid).update({
    role: newRole,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 4. Record privileged audit log
  await db.collection("auditLogs").add({
    actorId: callerUid,
    actorEmail: request.auth.token.email || "admin",
    actorRole: "admin",
    action: "ROLE_ASSIGNMENT_UPDATED",
    targetType: "user",
    targetId: targetUid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    metadata: { assignedRole: newRole },
  });

  return { success: true, message: `Successfully updated user role to ${newRole}` };
});

/**
 * Automated Trigger: Notify Provider when a new Food Request arrives
 */
exports.onFoodRequestCreated = onDocumentCreated("foodRequests/{requestId}", async (event) => {
  const reqData = event.data.data();
  if (!reqData) return;

  const notifRef = db.collection("notifications").doc();
  await notifRef.set({
    notificationId: notifRef.id,
    userId: reqData.providerId,
    title: "New Surplus Food Request",
    message: `${reqData.receiverName || "A campus food pantry"} requested ${reqData.requestedQuantity} ${reqData.quantityUnit || "servings"} of ${reqData.foodName}.`,
    type: "request_submitted",
    relatedRecordId: event.params.requestId,
    isRead: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});

/**
 * Automated Scheduled Job: Check for listings approaching availability deadline
 * Runs every hour to mark expired listings and notify pantry coordinators
 */
exports.checkExpiringListings = onSchedule("every 1 hours", async () => {
  const now = new Date();
  const snapshot = await db.collection("foodListings")
    .where("status", "==", "available")
    .get();

  const batch = db.batch();
  let expiredCount = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.availabilityDeadline && new Date(data.availabilityDeadline) < now) {
      batch.update(docSnap.ref, {
        status: "expired",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      expiredCount++;
    }
  });

  if (expiredCount > 0) {
    await batch.commit();
    console.log(`Marked ${expiredCount} past-deadline listings as expired.`);
  }
});

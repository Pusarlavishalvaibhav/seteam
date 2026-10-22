import { FoodListing, UserProfile, MatchScoreBreakdown } from '../types';

/**
 * Calculates Haversine distance in kilometers between two geo-coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // rounded to 2 decimals
}

/**
 * Smart Matching Engine as defined in the PlateConnect SRS
 * Formula:
 * (distanceScore * 0.30) + (quantityScore * 0.30) + (urgencyScore * 0.25) + (foodCompatibilityScore * 0.15)
 * All individual factor scores normalized 0 - 100.
 */
export function calculateMatchScore(
  listing: FoodListing,
  receiver: UserProfile
): MatchScoreBreakdown {
  // 1. DISTANCE SCORE (30%)
  let distanceScore = 50; // default moderate score if location is unstated
  let distanceKm: number | undefined;
  let distanceDescription = 'Location distance unavailable';
  let distanceExplanation = 'No precise coordinates available on receiver profile.';

  const hasListingCoords =
    listing.pickupLatitude !== undefined &&
    listing.pickupLongitude !== undefined &&
    !isNaN(listing.pickupLatitude);
  const hasReceiverCoords =
    receiver.location?.latitude !== undefined &&
    receiver.location?.longitude !== undefined &&
    !isNaN(receiver.location.latitude);

  if (hasListingCoords && hasReceiverCoords) {
    distanceKm = calculateDistanceKm(
      listing.pickupLatitude!,
      listing.pickupLongitude!,
      receiver.location!.latitude,
      receiver.location!.longitude
    );

    // On a college campus, distances are typically 0.1 - 4 km.
    // 0 km = 100 score; >= 4 km = 20 score; linearly scaled.
    if (distanceKm <= 0.2) {
      distanceScore = 100;
    } else if (distanceKm >= 4.0) {
      distanceScore = 20;
    } else {
      distanceScore = Math.max(20, Math.round(100 - (distanceKm / 4.0) * 80));
    }
    distanceDescription = `${distanceKm} km away`;
    distanceExplanation = `${distanceKm} km between ${listing.pickupLocation} and receiver. Score: ${distanceScore}/100.`;
  } else if (listing.pickupLocation && receiver.location?.campusZone) {
    // Check if in the same campus zone / building
    if (listing.pickupLocation.toLowerCase().includes(receiver.location.campusZone.toLowerCase())) {
      distanceScore = 90;
      distanceDescription = `Same Campus Zone (${receiver.location.campusZone})`;
      distanceExplanation = `Pickup is located within your campus zone (${receiver.location.campusZone}). Score: 90/100.`;
    } else {
      distanceScore = 60;
      distanceDescription = `Campus zone: ${listing.pickupLocation}`;
      distanceExplanation = `Estimated campus proximity. Score: 60/100.`;
    }
  }

  // 2. QUANTITY COMPATIBILITY SCORE (30%)
  // How well the listing fits receiver capacity or typical needs
  let quantityScore = 75;
  let quantityExplanation = '';
  const receiverCapacity = receiver.capacityMeals || 50;

  if (listing.quantity <= 0) {
    quantityScore = 0;
    quantityExplanation = 'Zero surplus available.';
  } else if (listing.quantity <= receiverCapacity) {
    // If listing fits entirely within capacity, score increases as ratio approaches optimal fit (50%-100% capacity)
    const ratio = listing.quantity / receiverCapacity;
    if (ratio >= 0.4 && ratio <= 1.0) {
      quantityScore = 100;
      quantityExplanation = `Optimal quantity (${listing.quantity} ${listing.quantityUnit}) fits perfectly in recipient capacity (${receiverCapacity} capacity). Score: 100/100.`;
    } else {
      quantityScore = Math.round(60 + ratio * 40);
      quantityExplanation = `Surplus of ${listing.quantity} ${listing.quantityUnit} is manageable for ${receiverCapacity} meals capacity. Score: ${quantityScore}/100.`;
    }
  } else {
    // Surplus exceeds capacity, requires partial distribution or multiple pickups
    const excess = listing.quantity / receiverCapacity;
    quantityScore = Math.max(30, Math.round(100 - (excess - 1) * 35));
    quantityExplanation = `Listing quantity (${listing.quantity} ${listing.quantityUnit}) exceeds capacity (${receiverCapacity}); partial claim suggested. Score: ${quantityScore}/100.`;
  }

  // 3. URGENCY SCORE (25%)
  // Closer to availabilityDeadline means higher urgency to rescue food before waste
  let urgencyScore = 50;
  let urgencyHoursLeft = 24;
  let urgencyExplanation = '';

  try {
    const deadlineTime = new Date(listing.availabilityDeadline).getTime();
    const currentTime = Date.now();
    const diffMs = deadlineTime - currentTime;
    urgencyHoursLeft = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);

    if (diffMs <= 0) {
      urgencyScore = 10;
      urgencyExplanation = 'Listing has expired. Immediate action required or close.';
    } else if (urgencyHoursLeft <= 1.5) {
      // Extremely urgent (less than 90 mins remaining)
      urgencyScore = 100;
      urgencyExplanation = `Critical urgency: only ${urgencyHoursLeft} hrs remaining before discard window. Score: 100/100.`;
    } else if (urgencyHoursLeft <= 4) {
      urgencyScore = 90;
      urgencyExplanation = `High urgency: ${urgencyHoursLeft} hrs remaining. Score: 90/100.`;
    } else if (urgencyHoursLeft <= 12) {
      urgencyScore = 75;
      urgencyExplanation = `Moderate urgency: ${urgencyHoursLeft} hrs remaining today. Score: 75/100.`;
    } else {
      urgencyScore = 50;
      urgencyExplanation = `Standard window: ${urgencyHoursLeft} hrs remaining. Score: 50/100.`;
    }
  } catch {
    urgencyScore = 50;
    urgencyExplanation = 'Standard availability window. Score: 50/100.';
  }

  // 4. FOOD TYPE COMPATIBILITY SCORE (15%)
  let foodCompatibilityScore = 70;
  let foodExplanation = '';
  const preferredTypes = receiver.preferredFoodTypes || [];

  if (preferredTypes.length === 0) {
    foodCompatibilityScore = 80;
    foodExplanation = 'Receiver accepts all surplus categories. Score: 80/100.';
  } else if (preferredTypes.includes(listing.foodType)) {
    foodCompatibilityScore = 100;
    foodExplanation = `Matches preferred category: "${listing.foodType}". Score: 100/100.`;
  } else {
    foodCompatibilityScore = 40;
    foodExplanation = `"${listing.foodType}" is outside specified preferences (${preferredTypes.join(', ')}). Score: 40/100.`;
  }

  // FINAL COMPOSITE SCORE (SRS Weighted Formula)
  const finalScore = Math.round(
    distanceScore * 0.3 +
      quantityScore * 0.3 +
      urgencyScore * 0.25 +
      foodCompatibilityScore * 0.15
  );

  return {
    listing,
    overallScore: Math.min(100, Math.max(0, finalScore)),
    distanceScore,
    quantityScore,
    urgencyScore,
    foodCompatibilityScore,
    distanceKm,
    distanceDescription,
    urgencyHoursLeft,
    explanation: {
      distance: distanceExplanation,
      quantity: quantityExplanation,
      urgency: urgencyExplanation,
      foodType: foodExplanation,
    },
  };
}

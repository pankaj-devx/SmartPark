import { apiClient } from '../../lib/apiClient.js';

/**
 * Driver: submit a review for a completed booking.
 * @param {{ bookingId: string, rating: number, comment?: string }} payload
 */
export async function submitReview(payload) {
  const response = await apiClient.post('/reviews', payload);
  return response.data.data.review;
}

/**
 * Driver: fetch all reviews submitted by the current user.
 */
export async function fetchMyReviews() {
  const response = await apiClient.get('/reviews/my-reviews');
  return response.data.data.reviews;
}

/**
 * Driver: check which booking IDs from a list already have a review.
 * @param {string[]} bookingIds
 * @returns {Promise<string[]>} reviewed booking IDs
 */
export async function fetchReviewedBookingIds(bookingIds) {
  const response = await apiClient.post('/reviews/reviewed-bookings', { bookingIds });
  return response.data.data.reviewedBookingIds;
}

/**
 * Public: fetch reviews + stats for a parking listing.
 * @param {string} parkingId
 */
export async function fetchParkingReviews(parkingId) {
  const response = await apiClient.get(`/reviews/parking/${parkingId}`);
  return response.data.data;
}

/**
 * Owner: fetch all reviews for the owner's parkings.
 */
export async function fetchOwnerReviews() {
  const response = await apiClient.get('/reviews/owner');
  return response.data.data;
}

/**
 * Admin: fetch all reviews on the platform.
 */
export async function fetchAllReviews() {
  const response = await apiClient.get('/reviews');
  return response.data.data.reviews;
}

/**
 * Admin: delete a review by ID.
 * @param {string} id
 */
export async function deleteReview(id) {
  const response = await apiClient.delete(`/reviews/${id}`);
  return response.data.data;
}

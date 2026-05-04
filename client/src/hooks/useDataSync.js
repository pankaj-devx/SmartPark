/**
 * Global Data Synchronization Hook
 * Provides centralized data fetching and refresh capabilities
 */

import { useState, useCallback, useEffect } from 'react';
import { fetchMyBookings } from '../features/bookings/bookingApi.js';
import { fetchOwnerBookings } from '../features/owner/ownerApi.js';
import { fetchAdminBookings } from '../features/admin/adminApi.js';
import { fetchParkingById } from '../features/parkings/parkingApi.js';
import { getApiErrorMessage } from '../lib/getApiErrorMessage.js';

/**
 * Hook for user bookings data synchronization
 */
export function useUserBookings() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('[DataSync] Fetching user bookings...');
      const data = await fetchMyBookings();
      setBookings(data);
      console.log('[DataSync] User bookings updated:', data.length, 'bookings');
      return data;
    } catch (err) {
      const errorMsg = getApiErrorMessage(err, 'Unable to load bookings');
      setError(errorMsg);
      console.error('[DataSync] Error fetching user bookings:', errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    bookings,
    isLoading,
    error,
    refetch: fetchData,
    setBookings // Allow manual updates
  };
}

/**
 * Hook for owner bookings data synchronization
 */
export function useOwnerBookings(filters = {}) {
  const [data, setData] = useState({
    bookings: [],
    summary: null,
    parkings: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('[DataSync] Fetching owner bookings with filters:', filters);
      const result = await fetchOwnerBookings(filters);
      setData(result);
      console.log('[DataSync] Owner data updated:', {
        bookings: result.bookings.length,
        parkings: result.parkings.length
      });
      return result;
    } catch (err) {
      const errorMsg = getApiErrorMessage(err, 'Unable to load owner data');
      setError(errorMsg);
      console.error('[DataSync] Error fetching owner bookings:', errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [filters.status, filters.parking]); // Only re-fetch when filters change

  // Auto-fetch on mount and filter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    bookings: data.bookings,
    summary: data.summary,
    parkings: data.parkings,
    isLoading,
    error,
    refetch: fetchData,
    setData // Allow manual updates
  };
}

/**
 * Hook for admin bookings data synchronization
 */
export function useAdminBookings(filters = {}) {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('[DataSync] Fetching admin bookings with filters:', filters);
      const data = await fetchAdminBookings(filters);
      setBookings(data);
      console.log('[DataSync] Admin bookings updated:', data.length, 'bookings');
      return data;
    } catch (err) {
      const errorMsg = getApiErrorMessage(err, 'Unable to load admin bookings');
      setError(errorMsg);
      console.error('[DataSync] Error fetching admin bookings:', errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [filters.status, filters.parking, filters.user]); // Only re-fetch when filters change

  // Auto-fetch on mount and filter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    bookings,
    isLoading,
    error,
    refetch: fetchData,
    setBookings // Allow manual updates
  };
}

/**
 * Hook for parking details data synchronization
 */
export function useParkingDetails(parkingId) {
  const [parking, setParking] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!parkingId) return null;

    setIsLoading(true);
    setError('');
    
    try {
      console.log('[DataSync] Fetching parking details:', parkingId);
      const data = await fetchParkingById(parkingId);
      setParking(data);
      console.log('[DataSync] Parking details updated:', {
        id: data.id,
        availableSlots: data.availableSlots,
        totalSlots: data.totalSlots
      });
      return data;
    } catch (err) {
      const errorMsg = getApiErrorMessage(err, 'Unable to load parking details');
      setError(errorMsg);
      console.error('[DataSync] Error fetching parking details:', errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [parkingId]);

  // Auto-fetch on mount and parkingId change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    parking,
    isLoading,
    error,
    refetch: fetchData,
    setParking // Allow manual updates
  };
}

/**
 * Global refresh trigger hook
 * Use this to trigger refreshes across multiple components
 */
export function useRefreshTrigger() {
  const [refreshFlag, setRefreshFlag] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshFlag(prev => prev + 1);
    console.log('[DataSync] Global refresh triggered');
  }, []);

  return {
    refreshFlag,
    triggerRefresh
  };
}

/**
 * Hook for optimistic updates with automatic rollback on error
 */
export function useOptimisticUpdate(currentData, setData) {
  const performUpdate = useCallback(async (optimisticData, asyncAction) => {
    // Store original data for rollback
    const originalData = currentData;
    
    try {
      // Apply optimistic update immediately
      console.log('[DataSync] Applying optimistic update');
      setData(optimisticData);
      
      // Perform actual async action
      const result = await asyncAction();
      console.log('[DataSync] Optimistic update confirmed');
      
      return result;
    } catch (error) {
      // Rollback on error
      console.error('[DataSync] Optimistic update failed, rolling back:', error);
      setData(originalData);
      throw error;
    }
  }, [currentData, setData]);

  return performUpdate;
}

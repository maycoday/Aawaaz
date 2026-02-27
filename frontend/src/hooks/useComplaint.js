import { useState, useCallback } from 'react';
import apiService from '../services/api';
import { useEncryption } from './useEncryption';

/**
 * useComplaint Hook
 * 
 * Custom hook for handling complaint submission workflow.
 * Manages the complete flow: encryption → API submission → tracking.
 * 
 * @returns {Object} Complaint submission utilities and state
 * @returns {Function} submitComplaint - Submits encrypted complaint to backend
 * @returns {boolean} isSubmitting - Loading state during submission
 * @returns {string|null} trackingId - Reference code for submitted complaint
 * @returns {string|null} error - Error message if submission fails
 * @returns {Function} resetState - Resets submission state to initial values
 * 
 * @example
 * const { submitComplaint, isSubmitting, trackingId, error } = useComplaint();
 * 
 * const handleSubmit = async () => {
 *   const result = await submitComplaint(formData, selectedAuthorities);
 *   if (result.success) {
 *     console.log('Tracking ID:', trackingId);
 *   }
 * };
 */
export const useComplaint = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState(null);
  const [error, setError] = useState(null);

  const { encryptComplaint } = useEncryption();

  /**
   * Submit a complaint with encryption and API call
   * 
   * @param {Object} complaintData - Raw complaint form data
   * @param {Array} authorities - Selected authorities to receive complaint
   * @returns {Promise<Object>} Result object with success status
   */
  const submitComplaint = useCallback(async (complaintData, authorities) => {
    setIsSubmitting(true);
    setError(null);
    setTrackingId(null);

    try {
      // Step 1: Validate input
      if (!complaintData) {
        throw new Error('Complaint data is required');
      }

      if (!authorities || authorities.length === 0) {
        throw new Error('Please select at least one authority');
      }

      // Step 2: Encrypt complaint data
      console.log('🔐 Encrypting complaint data...');
      const encryptedPayload = await encryptComplaint(complaintData, authorities);

      if (!encryptedPayload) {
        throw new Error('Encryption failed. Cannot submit complaint.');
      }

      // Step 3: Submit to backend API
      console.log('📤 Submitting encrypted complaint to server...');
      const result = await apiService.submitComplaint(encryptedPayload);

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit complaint');
      }

      // Step 4: Extract tracking ID
      const referenceCode = result.referenceCode || result.trackingId || result.id;
      
      if (!referenceCode) {
        console.warn('⚠️  No reference code returned from server');
      }

      setTrackingId(referenceCode);
      setIsSubmitting(false);

      console.log('✅ Complaint submitted successfully:', referenceCode);

      return {
        success: true,
        trackingId: referenceCode,
        message: result.message || 'Complaint submitted successfully',
      };

    } catch (err) {
      console.error('❌ Complaint submission error:', err);
      const errorMessage = err.message || 'Failed to submit complaint. Please try again.';
      setError(errorMessage);
      setIsSubmitting(false);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [encryptComplaint]);

  /**
   * Reset submission state to initial values
   * Useful for clearing state after successful submission or cancellation
   */
  const resetState = useCallback(() => {
    setIsSubmitting(false);
    setTrackingId(null);
    setError(null);
  }, []);

  /**
   * Get complaint by tracking ID (for complainant to check status)
   * 
   * @param {string} id - Complaint tracking/reference code
   * @returns {Promise<Object|null>} Complaint data or null on error
   */
  const getComplaintByTrackingId = useCallback(async (id) => {
    try {
      const result = await apiService.getComplaint(id);
      
      if (result.success) {
        return result.complaint;
      } else {
        setError(result.error || 'Failed to fetch complaint');
        return null;
      }
    } catch (err) {
      console.error('❌ Error fetching complaint:', err);
      setError(err.message || 'Failed to fetch complaint');
      return null;
    }
  }, []);

  return {
    submitComplaint,
    isSubmitting,
    trackingId,
    error,
    resetState,
    getComplaintByTrackingId,
  };
};

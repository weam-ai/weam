import { getCurrentUser, setUserData } from './handleAuth';
import { encryptedPersist } from './helper';
import { USER } from './localstorage';
import commonApi from '@/api';
import { MODULE_ACTIONS } from './constant';

/**
 * Onboarding utility functions using database instead of localStorage
 */
export const OnboardingUtils = {
  /**
   * Check if user has seen the onboarding dialog from database
   */
  hasSeenOnboarding: (): boolean => {
    const user = getCurrentUser();
    return user?.onboard === false; // onboard: true means show dialog, onboard: false means hide
  },

  /**
   * Mark onboarding as seen by updating database
   */
  markOnboardingAsSeen: async (): Promise<void> => {
    try {
      const user = getCurrentUser();
      if (!user?._id) {
        return;
      }

      // Update user profile to set onboard: false
      const response = await commonApi({
        action: MODULE_ACTIONS.UPDATE_PROFILE,
        parameters: [user._id],
        data: { onboard: false }
      });

      // Update local user data with the response data
      if (response?.data) {
        const updatedUser = setUserData(response.data);
        encryptedPersist(updatedUser, USER);
      }
      
    } catch (error) {
      throw error; // Re-throw to let caller handle it
    }
  },

  /**
   * Check if onboarding should be shown
   */
  shouldShowOnboarding: (): boolean => {
    const user = getCurrentUser();
    return user?.onboard === true; // Show if onboard is true
  },

  /**
   * Reset onboarding state (useful for testing or admin purposes)
   * This would set onboard back to true in the database
   */
  resetOnboarding: async (): Promise<void> => {
    try {
      const user = getCurrentUser();
      if (!user?._id) {
        return;
      }

      const response = await commonApi({
        action: MODULE_ACTIONS.UPDATE_PROFILE,
        parameters: [user._id],
        data: { onboard: true }
      });

      // Update local user data with the response data
      if (response?.data) {
        const updatedUser = setUserData(response.data);
        encryptedPersist(updatedUser, USER);
      }

    } catch (error) {
      throw error;
    }
  }
};

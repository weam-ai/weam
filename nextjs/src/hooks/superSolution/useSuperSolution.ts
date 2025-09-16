import commonApi from '@/api';
import { UserAppAccess } from '@/types/superSolution';
import { DEFAULT_SORT, MODULE_ACTIONS } from '@/utils/constant';
import { getCurrentUser } from '@/utils/handleAuth';
import { decryptedPersist } from '@/utils/helper';
import { WORKSPACE } from '@/utils/localstorage';
import Toast from '@/utils/toast';
import { useState, useEffect } from 'react';

const useSuperSolution = () => {
  const [userAccess, setUserAccess] = useState<UserAppAccess[]>([]);
  const [availableApps, setAvailableApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = getCurrentUser();
  const selectedWorkSpace = decryptedPersist(WORKSPACE);

  // Fetch available apps
  const fetchAvailableApps = async () => {
    try {
      setLoading(true);
      const response = await commonApi({
        action: MODULE_ACTIONS.LIST,
        prefix: MODULE_ACTIONS.ADMIN_PREFIX,
        module: MODULE_ACTIONS.SUPER_SOLUTION,
        common: true,
        data: {
          options: {
            sort: { createdAt: DEFAULT_SORT },
            pagination: false,
          },
          query: {
            isActive: true,
          },
        },
      });
      
      setAvailableApps(response.data);
    } catch (error) {
      console.log('error: ', error);
      setError('Failed to fetch available apps');
    } finally {
      setLoading(false);
    }
  };

  // Get solution member
  const getSolutionAppMember = async (appId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await commonApi({
        action: MODULE_ACTIONS.GET_MEMBERS_TO_SOLUTION_APP,
        data: {
          appId
        }
      });
      
      return response.data;
    } catch (error) {
      console.log('error: ', error);
    } finally {
      setLoading(false);
    }
  };

  // Get solution teams
  const getSolutionAppTeams = async (appId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await commonApi({
        action: MODULE_ACTIONS.GET_TEAMS_TO_SOLUTION_APP,
        data: {
          appId
        }
      });
      
      return response.data;
    } catch (error) {
      console.log('error: ', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Add multiple members to solution app
  const addMembersToSolutionApp = async (appId: string, members: any[]) => {
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate input
      if (!appId || !members || members.length === 0) {
        throw new Error('App ID and member IDs are required');
      }

      const response = await commonApi({
        action: MODULE_ACTIONS.ADD_MEMBERS_TO_SOLUTION_APP,
        data: {
          appId,
          members,
        }
      });

      Toast(response.message);
      // Refresh member data
      return response.data;
    } catch (error) {
      console.log('error: ', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add members to solution app';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Add teams to solution app
  const addTeamsToSolutionApp = async (appId: string, teams: any[]) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate input
      if (!appId || !teams || teams.length === 0) {
        throw new Error('App ID and team IDs are required');
      }

      const response = await commonApi({
        action: MODULE_ACTIONS.ADD_TEAMS_TO_SOLUTION_APP,
        data: {
          appId,
          teams,
        }
      });

      Toast(response.message);
      return response.data;
    } catch (error) {
      console.log('error: ', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add teams to solution app';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Remove multiple members from solution app
  const removeMembersFromSolutionApp = async (appId: string, memberIds: string[]) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!appId || !memberIds || memberIds.length === 0) {
        throw new Error('App ID and member IDs are required');
      }

      const response = await commonApi({
        action: MODULE_ACTIONS.REMOVE_MEMBERS_FROM_SOLUTION_APP,
        data: {
          appId,
          memberIds,
        }
      });

      Toast(response.message);
      getSolutionAppMember(appId);
      return true;
    } catch (error) {
      console.log('error: ', error);
    } finally {
      setLoading(false);
    }
  };

  // Remove teams from solution app
  const removeTeamsFromSolutionApp = async (appId: string, teamId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!appId || !teamId) {
        throw new Error('App ID and team IDs are required');
      }

      const response = await commonApi({
        action: MODULE_ACTIONS.REMOVE_TEAMS_FROM_SOLUTION_APP,
        data: {
          appId,
          teamId,
        }
      });

      Toast(response.message);
      return true;
    } catch (error) {
      console.log('error: ', error);
    } finally {
      setLoading(false);
    }
  };

  const getSolutionAppByUserId = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      //I will give user id and find in super solution member table in backend which give this user access to which app
      const response = await commonApi({
        action: MODULE_ACTIONS.GET_SOLUTION_APP_BY_USER_ID,
        parameters: [userId],
       
      });

      return response.data;
    }
    catch (error) {
      console.log('error: ', error);
    }
    finally {
      setLoading(false);
    }
  }

  const updateSolution = async (solutionId: string, updateData: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await commonApi({
        action: MODULE_ACTIONS.UPDATE,
        module: MODULE_ACTIONS.SUPER_SOLUTION,
        parameters: [solutionId],
        data: updateData,
      });

      Toast(response.message);
      return response.data;
    } catch (error) {
      console.log('error: ', error);
      Toast('Failed to update solution', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteSolution = async (solutionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await commonApi({
        action: MODULE_ACTIONS.DELETE,
        module: MODULE_ACTIONS.SUPER_SOLUTION,
        parameters: [solutionId],
      });

      Toast(response.message);
      return response.data;
    } catch (error) {
      console.log('error: ', error);
      Toast('Failed to delete solution', 'error');
    } finally {
      setLoading(false);
    }
  };
  return {
    // State
    userAccess,
    loading,
    error,
    availableApps,
    fetchAvailableApps,

    // Member management
    getSolutionAppMember,
    addMembersToSolutionApp,
    removeMembersFromSolutionApp,
    
    // Team management
    getSolutionAppTeams,
    addTeamsToSolutionApp,
    removeTeamsFromSolutionApp,
    getSolutionAppByUserId,
    updateSolution,
    deleteSolution,
    // Clear error
    clearError: () => setError(null)
  };
};

export default useSuperSolution; 
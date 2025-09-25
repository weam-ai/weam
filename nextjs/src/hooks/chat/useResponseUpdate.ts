import { useState, useCallback } from 'react';
import commonApi from '@/api';
import { MODULE_ACTIONS } from '@/utils/constant';
import Toast from '@/utils/toast';
import { encryptedData } from '@/utils/helper';

interface UseResponseUpdateProps {
  onUpdateResponse?: (messageId: string, updatedResponse: string) => void;
  onUpdateConversation?: (updatedConversations: any[]) => void;
}

export const useResponseUpdate = ({ 
  onUpdateResponse, 
  onUpdateConversation 
}: UseResponseUpdateProps = {}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateResponseInDatabase = async (messageId: string, updatedResponse: string) => {
    try {
      const response = await commonApi({
        action: MODULE_ACTIONS.UPDATE_MESSAGE,
        parameters: [messageId],
        data: {
          // Store AI response in encrypted form to match decryption expectations on read
          ai: encryptedData(updatedResponse)
        }
      });

      // Check if the response has the expected structure
      if (response?.data?.success) {
        Toast('Response updated successfully!', 'success');
        return response.data;
      } else if ((response as any)?.success) {
        // Direct response from backend
        Toast('Response updated successfully!', 'success');
        return response;
      } else if (response?.status === 200 || (response as any)?.status === 'SUCCESS') {
        // Fallback for other success indicators
        Toast('Response updated successfully!', 'success');
        return response;
      } else {
        throw new Error('Failed to update response in database');
      }
    } catch (error) {
      throw error;
    }
  };

  const handleResponseUpdate = useCallback(async (messageId: string, updatedResponse: string) => {
    try {
      setIsUpdating(true);
      
      // Update in database first
      await updateResponseInDatabase(messageId, updatedResponse);
      
      // Then update the UI
      if (onUpdateResponse) {
        await onUpdateResponse(messageId, updatedResponse);
      }
      
    } catch (error) {
      throw error; // Re-throw to let the component handle the error
    } finally {
      setIsUpdating(false);
    }
  }, [onUpdateResponse]);

  const updateConversationResponse = useCallback((conversations: any[], messageId: string, updatedResponse: string) => {
    const updatedConversations = conversations.map(conv => {
      if (conv.id === messageId) {
        return {
          ...conv,
          response: updatedResponse
        };
      }
      return conv;
    });

    if (onUpdateConversation) {
      onUpdateConversation(updatedConversations);
    }

    return updatedConversations;
  }, [onUpdateConversation]);

  return {
    handleResponseUpdate,
    updateConversationResponse,
    isUpdating
  };
}; 
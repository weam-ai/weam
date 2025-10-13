import commonApi from '@/api';
import { useState } from 'react';
import { MODULE_ACTIONS } from '@/utils/constant';

const useReport = () => {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [error, setError] = useState(null);
    
    const getAiAdoption = async (startDate?: string, endDate?: string, filters?: any) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await commonApi({
                action: MODULE_ACTIONS.GET_AI_ADOPTION,
                data: {
                    startDate: startDate,
                    endDate: endDate,
                    filters: filters
                },
            });
            
            setReportData(response.data);
            return response.data;
        } catch (error) {
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const clearReportData = () => {
        setReportData(null);
        setError(null);
    };

    return {
        loading,
        reportData,
        error,
        getAiAdoption,
        clearReportData
    };
};

export default useReport;

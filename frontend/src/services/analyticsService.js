import api from './api';

// Get task statistics
export const getTaskStats = async () => {
    try {
        const response = await api.get('/stats/summary');
        return response.data;
    } catch (error) {
        console.error('Error fetching task stats:', error);
        throw error;
    }
};

// Get productivity analysis
export const getProductivityAnalysis = async (period = '7days') => {
    try {
        const response = await api.get(`/stats/productivity?period=${period}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching productivity analysis:', error);
        throw error;
    }
};

export default {
    getTaskStats,
    getProductivityAnalysis
};

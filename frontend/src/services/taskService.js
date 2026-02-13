
import api from './api';

export const taskService = {
    // Get all tasks with optional filters and pagination
    getTasks: async (filters = {}) => {
        const params = new URLSearchParams();

        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
        if (filters.category && filters.category !== 'all') params.append('category', filters.category);
        if (filters.search) params.append('search', filters.search);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.order) params.append('order', filters.order);
        if (filters.page) params.append('page', filters.page);
        if (filters.limit) params.append('limit', filters.limit);

        const response = await api.get(`/tasks?${params.toString()}`);
        return response.data;
    },

    // Get single task
    getTask: async (id) => {
        const response = await api.get(`/tasks/${id}`);
        return response.data;
    },

    // Create new task
    createTask: async (taskData) => {
        const response = await api.post('/tasks', taskData);
        return response.data;
    },

    // Update task
    updateTask: async (id, taskData) => {
        try {
            const response = await api.put(`/tasks/${id}`, taskData);
            return response.data;
        } catch (error) {
            // Enhanced error handling with detailed messages
            if (error.response) {
                const { status, data } = error.response;
                switch (status) {
                    case 400:
                        throw new Error(data?.message || 'Invalid request data');
                    case 401:
                        throw new Error('Authentication required');
                    case 403:
                        throw new Error('Insufficient permissions');
                    case 404:
                        throw new Error('Task not found');
                    case 429:
                        throw new Error('Too many requests. Please try again later.');
                    default:
                        throw new Error(data?.message || `Server error (${status})`);
                }
            } else if (error.request) {
                throw new Error('Network error. Please check your connection.');
            } else {
                throw new Error('An unexpected error occurred');
            }
        }
    },

    // Update task progress (for checkboxes)
    updateTaskProgress: async (id, progress) => {
        try {
            const response = await api.put(`/tasks/${id}`, { progress });
            return response.data;
        } catch (error) {
            if (error.response) {
                const { status, data } = error.response;
                switch (status) {
                    case 400:
                        throw new Error(data?.message || 'Invalid progress data');
                    case 401:
                        throw new Error('Authentication required');
                    case 403:
                        throw new Error('Insufficient permissions to update progress');
                    case 404:
                        throw new Error('Task not found');
                    default:
                        throw new Error(data?.message || `Failed to update progress (${status})`);
                }
            } else if (error.request) {
                throw new Error('Network error. Please check your connection.');
            } else {
                throw new Error('An unexpected error occurred while updating progress');
            }
        }
    },

    // Update specialized category data (Dev, QA, etc.)
    updateSpecializedData: async (id, category, data) => {
        const endpointMap = {
            'DEVELOPMENT': 'development',
            'TESTING': 'testing',
            'MARKETING': 'marketing',
            'DEVOPS': 'devops',
            'DESIGN': 'design'
        };
        const endpoint = endpointMap[category.toUpperCase()];
        if (!endpoint) return null;

        const response = await api.put(`/tasks/${id}/${endpoint}`, data);
        return response.data;
    },

    // Delete task
    deleteTask: async (id) => {
        const response = await api.delete(`/tasks/${id}`);
        return response.data;
    },

    // Get task statistics
    getStats: async () => {
        const response = await api.get('/stats/summary'); // Updated endpoint path
        return response.data;
    },

    // Get productivity
    getProductivity: async () => {
        const response = await api.get('/stats/productivity');
        return response.data;
    },

    // NOTE: Comment endpoints are not yet implemented in backend
    // Temporarily disabled until backend routes are added
    /*
    // Add comment to task
    addComment: async (taskId, content) => {
        const response = await api.post(`/tasks/${taskId}/comments`, { content });
        return response.data;
    },

    // Delete comment
    deleteComment: async (taskId, commentId) => {
        const response = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
        return response.data;
    },
    */

    // Add attachment
    addAttachment: async (taskId, attachmentData) => {
        const response = await api.post(`/tasks/${taskId}/attachments`, attachmentData);
        return response.data;
    },

    // Delete attachment
    deleteAttachment: async (taskId, attachmentId) => {
        const response = await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
        return response.data;
    },

    // Get task history
    getHistory: async (taskId) => {
        const response = await api.get(`/tasks/${taskId}/history`);
        return response.data;
    },

    // Subtask methods
    getSubTasks: async (taskId) => {
        const response = await api.get(`/tasks/${taskId}/subtasks`);
        return response.data;
    },

    createSubTask: async (taskId, subTaskData) => {
        const response = await api.post(`/tasks/${taskId}/subtasks`, subTaskData);
        return response.data;
    },

    updateSubTask: async (taskId, subTaskId, subTaskData) => {
        const response = await api.put(`/tasks/${taskId}/subtasks/${subTaskId}`, subTaskData);
        return response.data;
    },

    deleteSubTask: async (taskId, subTaskId) => {
        const response = await api.delete(`/tasks/${taskId}/subtasks/${subTaskId}`);
        return response.data;
    },

    // Bug Report methods
    getBugReports: async (filters = {}) => {
        const params = new URLSearchParams();

        if (filters.taskId) params.append('taskId', filters.taskId);
        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity);
        if (filters.search) params.append('search', filters.search);

        const response = await api.get(`/tasks/bugs?${params.toString()}`);
        return response.data;
    },

    getBugReport: async (bugId) => {
        const response = await api.get(`/tasks/bugs/${bugId}`);
        return response.data;
    },

    createBugReport: async (bugData) => {
        const response = await api.post('/tasks/bugs', bugData);
        return response.data;
    },

    updateBugReport: async (bugId, bugData) => {
        const response = await api.put(`/tasks/bugs/${bugId}`, bugData);
        return response.data;
    },

    deleteBugReport: async (bugId) => {
        const response = await api.delete(`/tasks/bugs/${bugId}`);
        return response.data;
    },
};

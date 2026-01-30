import api from './api';

export const taskService = {
    // Get all tasks with optional filters
    getTasks: async (filters = {}) => {
        const params = new URLSearchParams();

        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
        if (filters.search) params.append('search', filters.search);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.order) params.append('order', filters.order);

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
        const response = await api.put(`/tasks/${id}`, taskData);
        return response.data;
    },

    // Delete task
    deleteTask: async (id) => {
        const response = await api.delete(`/tasks/${id}`);
        return response.data;
    },

    // Get task statistics
    getStats: async () => {
        const response = await api.get('/tasks/stats/summary');
        return response.data;
    },

    // Add comment to task
    addComment: async (taskId, content) => {
        const response = await api.post(`/tasks/${taskId}/comments`, { content });
        return response.data;
    },

    // Delete comment
    deleteComment: async (taskId, commentId) => {
        const response = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
        return response.data;
    }
};

import api from './api';

export const teamService = {
    // Create new team
    createTeam: async (teamData) => {
        const response = await api.post('/teams', teamData);
        return response.data;
    },

    // Get all teams for current user
    getMyTeams: async () => {
        const response = await api.get('/teams');
        return response.data;
    },

    // Get single team
    getTeam: async (teamId) => {
        const response = await api.get(`/teams/${teamId}`);
        return response.data;
    },

    // Update team
    updateTeam: async (teamId, teamData) => {
        const response = await api.put(`/teams/${teamId}`, teamData);
        return response.data;
    },

    // Delete team
    deleteTeam: async (teamId) => {
        const response = await api.delete(`/teams/${teamId}`);
        return response.data;
    },

    // Add member to team
    addMember: async (teamId, email, role) => {
        const response = await api.post(`/teams/${teamId}/members`, { email, role });
        return response.data;
    },

    // Remove member from team
    removeMember: async (teamId, userId) => {
        const response = await api.delete(`/teams/${teamId}/members/${userId}`);
        return response.data;
    },

    // Update member role
    updateMemberRole: async (teamId, userId, role) => {
        const response = await api.put(`/teams/${teamId}/members/${userId}`, { role });
        return response.data;
    },

    // Get team members
    getTeamMembers: async (teamId) => {
        const response = await api.get(`/teams/${teamId}/members`);
        return response.data;
    },

    // Get team tasks
    getTeamTasks: async (teamId, filters = {}) => {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.order) params.append('order', filters.order);
        
        const response = await api.get(`/teams/${teamId}/tasks?${params.toString()}`);
        return response.data;
    }
};

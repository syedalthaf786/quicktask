import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { teamService } from '../services/teamService';
import { taskService } from '../services/taskService';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';
import {
    ArrowLeft,
    Users,
    Plus,
    Settings,
    Crown,
    UserPlus,
    Trash2,
    Calendar,
    AlertCircle,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isPast, differenceInDays } from 'date-fns';
import './TeamDetails.css';

const TeamDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [team, setTeam] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('tasks');
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all'
    });
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [inviteData, setInviteData] = useState({ email: '', role: 'MEMBER' });
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusReason, setStatusReason] = useState('');
    const [pendingStatus, setPendingStatus] = useState('');
    const [editingTask, setEditingTask] = useState(null);
    const [taskFormData, setTaskFormData] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'Todo',
        dueDate: '',
        assigneeId: ''
    });

    console.log('TeamDetails - Initial render, id:', id);

    useEffect(() => {
        console.log('TeamDetails useEffect triggered, id:', id);
        if (id) {
            console.log('Calling fetchTeamData for team:', id);
            fetchTeamData();
        } else {
            console.warn('TeamDetails - id is undefined or null');
            setLoading(false);
        }
    }, [id, filters]);

    const fetchTeamData = async () => {
        try {
            setLoading(true);
            console.log('Fetching team data for team:', id);
            
            const [teamData, tasksData] = await Promise.all([
                teamService.getTeam(id),
                teamService.getTeamTasks(id, filters)
            ]);

            console.log('Team data response:', teamData);
            console.log('Tasks data response:', tasksData);

            // Validate responses
            if (!teamData || !teamData.success) {
                console.error('Team API error:', teamData);
                throw new Error(teamData?.message || 'Failed to fetch team');
            }

            if (!tasksData || !tasksData.success) {
                console.error('Tasks API error:', tasksData);
                throw new Error(tasksData?.message || 'Failed to fetch team tasks');
            }

            // Set team and tasks
            setTeam(teamData.team);
            setTasks(tasksData.tasks);
            
            console.log('Team set to:', teamData.team);
            console.log('Number of tasks set:', tasksData.tasks.length);
            console.log('Team members count:', teamData.team?.members?.length);
        } catch (error) {
            console.error('Error fetching team data:', error);
            toast.error(error.message || 'Failed to load team data');
        } finally {
            setLoading(false);
        }
    };

    const handleInviteMember = async (e) => {
        e.preventDefault();

        try {
            await teamService.addMember(team.id, inviteData.email, inviteData.role);
            toast.success('Member added successfully');
            setShowMemberModal(false);
            setInviteData({ email: '', role: 'MEMBER' });
            fetchTeamData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add member');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;

        try {
            await teamService.removeMember(team.id, userId);
            toast.success('Member removed successfully');
            fetchTeamData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleTaskStatusChange = async (task, newStatus) => {
        // If marking as not completed (Todo or In Progress), require reason
        if (task.status === 'COMPLETED' && newStatus !== 'Completed') {
            setEditingTask(task);
            setPendingStatus(newStatus);
            setShowStatusModal(true);
        } else {
            // Direct update for other status changes
            try {
                await taskService.updateTask(task.id, { status: newStatus });
                toast.success('Task status updated');
                fetchTeamData();
            } catch (error) {
                toast.error('Failed to update task status');
            }
        }
    };

    const handleStatusWithReason = async () => {
        if (!statusReason.trim()) {
            toast.error('Please provide a reason for status change');
            return;
        }

        try {
            // Update status first
            await taskService.updateTask(editingTask.id, { status: pendingStatus });
            
            // Add comment with reason
            await taskService.addComment(editingTask.id, `Status changed to ${pendingStatus}. Reason: ${statusReason}`);
            
            toast.success('Task updated with reason');
            setShowStatusModal(false);
            setStatusReason('');
            setPendingStatus('');
            setEditingTask(null);
            fetchTeamData();
        } catch (error) {
            toast.error('Failed to update task');
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();

        try {
            await taskService.createTask({
                ...taskFormData,
                teamId: team.id
            });
            toast.success('Task created successfully');
            setShowTaskModal(false);
            setTaskFormData({
                title: '',
                description: '',
                priority: 'Medium',
                status: 'Todo',
                dueDate: '',
                assigneeId: ''
            });
            fetchTeamData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create task');
        }
    };

    const getDueDateStatus = (dueDate, status) => {
        if (status === 'COMPLETED') return 'completed';
        const due = new Date(dueDate);
        if (isPast(due)) return 'overdue';
        const daysLeft = differenceInDays(due, new Date());
        if (daysLeft <= 3) return 'due-soon';
        return 'normal';
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'OWNER':
                return <span className="role-badge owner"><Crown size={12} /> Owner</span>;
            case 'ADMIN':
                return <span className="role-badge admin">Admin</span>;
            default:
                return <span className="role-badge member">Member</span>;
        }
    };

    const taskStats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        todo: tasks.filter(t => t.status === 'TODO').length
    };

    if (loading) {
        return (
            <div className="page-container">
                <Navbar />
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading team...</p>
                </div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="page-container">
                <Navbar />
                <div className="empty-state">
                    <h3>Team not found</h3>
                    <Link to="/teams" className="btn btn-primary">Back to Teams</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <Navbar />
            <div className="page-content">
                <div className="team-details-header">
                    <Link to="/teams" className="back-link">
                        <ArrowLeft size={20} />
                        Back to Teams
                    </Link>
                    
                    <div className="team-header-info">
                        <div>
                            <h1 className="page-title">{team.name}</h1>
                            {team.description && <p className="page-subtitle">{team.description}</p>}
                        </div>
                        <div className="team-header-actions">
                            <button className="btn btn-secondary" onClick={() => setShowMemberModal(true)}>
                                <UserPlus size={18} />
                                Add Member
                            </button>
                            <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
                                <Plus size={18} />
                                New Task
                            </button>
                        </div>
                    </div>
                </div>

                <div className="team-stats-bar">
                    <div className="stat-card">
                        <span className="stat-value">{taskStats.total}</span>
                        <span className="stat-label">Total Tasks</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{taskStats.todo}</span>
                        <span className="stat-label">To Do</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{taskStats.inProgress}</span>
                        <span className="stat-label">In Progress</span>
                    </div>
                    <div className="stat-card completed">
                        <span className="stat-value">{taskStats.completed}</span>
                        <span className="stat-label">Completed</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{team.members?.length || 0}</span>
                        <span className="stat-label">Members</span>
                    </div>
                </div>

                <div className="team-tabs">
                    <button 
                        className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tasks')}
                    >
                        Tasks
                    </button>
                    <button 
                        className={`tab ${activeTab === 'members' ? 'active' : ''}`}
                        onClick={() => setActiveTab('members')}
                    >
                        Members
                    </button>
                </div>

                {activeTab === 'tasks' && (
                    <div className="team-tasks-section">
                        <div className="tasks-filters">
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="filter-select"
                            >
                                <option value="all">All Status</option>
                                <option value="Todo">Todo</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                            </select>

                            <select
                                value={filters.priority}
                                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                                className="filter-select"
                            >
                                <option value="all">All Priority</option>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>

                        {tasks.length === 0 ? (
                            <div className="empty-state">
                                <h3>No tasks found</h3>
                                <p>Create your first team task to get started!</p>
                                <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
                                    <Plus size={20} />
                                    Create Task
                                </button>
                            </div>
                        ) : (
                            <div className="tasks-grid">
                                {tasks.map((task, index) => {
                                    const dueDateStatus = getDueDateStatus(task.dueDate, task.status);
                                    
                                    return (
                                        <motion.div
                                            key={task.id}
                                            className={`task-card card ${dueDateStatus}`}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <div className="task-card-header">
                                                <h3 className="task-title">{task.title}</h3>
                                            </div>

                                            {task.description && (
                                                <p className="task-description">{task.description}</p>
                                            )}

                                            <div className="task-meta">
                                                <div className="task-badges">
                                                    <span className={`badge badge-${task.priority.toLowerCase()}`}>
                                                        {task.priority}
                                                    </span>
                                                    <span className={`badge badge-${task.status.toLowerCase().replace(' ', '-')}`}>
                                                        {task.status.replace('_', ' ')}
                                                    </span>
                                                </div>

                                                <div className={`task-due-date ${dueDateStatus}`}>
                                                    <Calendar size={14} />
                                                    <span>{format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                                                    {dueDateStatus === 'overdue' && <AlertCircle size={14} />}
                                                </div>
                                            </div>

                                            {/* Status Change Actions for Team Members */}
                                            {task.status === 'COMPLETED' && (
                                                <div className="task-actions" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                                    <button 
                                                        className="btn btn-sm"
                                                        onClick={() => handleTaskStatusChange(task, 'In Progress')}
                                                        title="Mark as In Progress"
                                                    >
                                                        <Clock size={14} /> In Progress
                                                    </button>
                                                    <button 
                                                        className="btn btn-sm"
                                                        onClick={() => handleTaskStatusChange(task, 'Todo')}
                                                        title="Mark as Todo"
                                                    >
                                                        <AlertCircle size={14} /> Todo
                                                    </button>
                                                </div>
                                            )}

                                            {task.assignee && (
                                                <div className="task-assignee">
                                                    <div className="assignee-avatar">
                                                        {task.assignee.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span>Assigned to {task.assignee.name}</span>
                                                </div>
                                            )}

                                            {task.creator && (
                                                <div className="task-creator">
                                                    Created by {task.creator.name}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'members' && (
                    <div className="team-members-section">
                        <div className="members-list">
                            {team.members?.map((member) => (
                                <div key={member.id} className="member-card">
                                    <div className="member-info">
                                        <div className="member-avatar large">
                                            {member.user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="member-details">
                                            <h4>{member.user.name}</h4>
                                            <p>{member.user.email}</p>
                                        </div>
                                    </div>
                                    <div className="member-actions">
                                        {getRoleBadge(member.role)}
                                        {member.role !== 'OWNER' && team.ownerId === user?.id && (
                                            <button 
                                                className="btn-icon danger"
                                                onClick={() => handleRemoveMember(member.userId)}
                                                title="Remove Member"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Invite Member Modal */}
                {showMemberModal && (
                    <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Add Team Member</h2>
                                <button className="modal-close" onClick={() => setShowMemberModal(false)}>
                                    ×
                                </button>
                            </div>
                            <form onSubmit={handleInviteMember} className="modal-form">
                                <div className="input-group">
                                    <label className="input-label">Email Address *</label>
                                    <input
                                        type="email"
                                        className="input"
                                        value={inviteData.email}
                                        onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                        required
                                        placeholder="colleague@example.com"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Role</label>
                                    <select
                                        className="input select"
                                        value={inviteData.role}
                                        onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                                    >
                                        <option value="MEMBER">Member</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-outline" onClick={() => setShowMemberModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Send Invite
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Create Task Modal */}
                <AnimatePresence>
                    {showTaskModal && (
                        <motion.div
                            className="modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTaskModal(false)}
                        >
                            <motion.div
                                className="modal"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="modal-header">
                                    <h2>Create Team Task</h2>
                                    <button className="modal-close" onClick={() => setShowTaskModal(false)}>
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleCreateTask} className="modal-form">
                                    <div className="input-group">
                                        <label className="input-label">Title *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={taskFormData.title}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                                            required
                                            placeholder="Enter task title"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Description</label>
                                        <textarea
                                            className="input"
                                            value={taskFormData.description}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                                            placeholder="Add task description (optional)"
                                            rows="3"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label className="input-label">Priority *</label>
                                            <select
                                                className="input select"
                                                value={taskFormData.priority}
                                                onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                                                required
                                            >
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Status *</label>
                                            <select
                                                className="input select"
                                                value={taskFormData.status}
                                                onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
                                                required
                                            >
                                                <option value="Todo">Todo</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Due Date *</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={taskFormData.dueDate}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                                            required
                                            min={format(new Date(), 'yyyy-MM-dd')}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Assign To</label>
                                        <select
                                            className="input select"
                                            value={taskFormData.assigneeId}
                                            onChange={(e) => setTaskFormData({ ...taskFormData, assigneeId: e.target.value })}
                                        >
                                            <option value="">Unassigned</option>
                                            {team.members?.map(member => (
                                                <option key={member.user.id} value={member.user.id}>
                                                    {member.user.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="modal-actions">
                                        <button type="button" className="btn btn-outline" onClick={() => setShowTaskModal(false)}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Create Task
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Status Change Reason Modal */}
                <AnimatePresence>
                    {showStatusModal && (
                        <motion.div
                            className="modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowStatusModal(false)}
                        >
                            <motion.div
                                className="modal"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                style={{ maxWidth: '400px' }}
                            >
                                <div className="modal-header">
                                    <h2>Status Change Reason</h2>
                                    <button className="modal-close" onClick={() => setShowStatusModal(false)}>
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="modal-form">
                                    <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                        Please provide a reason for changing the task status from <strong>Completed</strong> to <strong>{pendingStatus}</strong>.
                                    </p>
                                    <div className="input-group">
                                        <label className="input-label">Reason *</label>
                                        <textarea
                                            className="input"
                                            value={statusReason}
                                            onChange={(e) => setStatusReason(e.target.value)}
                                            placeholder="Explain why the work is not completed..."
                                            rows="3"
                                            required
                                        />
                                    </div>
                                    <div className="modal-actions">
                                        <button type="button" className="btn btn-outline" onClick={() => setShowStatusModal(false)}>
                                            Cancel
                                        </button>
                                        <button type="button" className="btn btn-primary" onClick={handleStatusWithReason}>
                                            Submit Reason
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TeamDetails;

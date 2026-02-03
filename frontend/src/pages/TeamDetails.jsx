
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { teamService } from '../services/teamService';
import { taskService } from '../services/taskService';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import TaskForm from '../components/TaskForm'; // Import TaskForm
import { toast } from 'react-toastify';
import {
    ArrowLeft, Users, Plus, Settings, Crown, UserPlus, Trash2, Calendar, AlertCircle, X, Clock
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
    const [isInviting, setIsInviting] = useState(false);
    const [activeTab, setActiveTab] = useState('tasks');
    const [filters, setFilters] = useState({ status: 'all', priority: 'all' });
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [inviteData, setInviteData] = useState({ email: '', role: 'MEMBER' });
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusReason, setStatusReason] = useState('');
    const [pendingStatus, setPendingStatus] = useState('');
    const [editingTask, setEditingTask] = useState(null);

    useEffect(() => {
        if (id && user) {
            fetchTeamData();
        } else if (!id) {
            setLoading(false);
        }
    }, [id, filters, user]);

    const fetchTeamData = async () => {
        try {
            setLoading(true);
            const [teamData, tasksData] = await Promise.all([
                teamService.getTeam(id),
                teamService.getTeamTasks(id, filters)
            ]);

            if (!teamData?.success) throw new Error(teamData?.message || 'Failed to fetch team');
            if (!tasksData?.success) throw new Error(tasksData?.message || 'Failed to fetch team tasks');

            // Trust backend RBAC - no client-side filtering
            setTeam(teamData.team);
            setTasks(tasksData.tasks);
        } catch (error) {
            console.error('Error fetching team data:', error);
            toast.error(error.message || 'Failed to load team data');
        } finally {
            setLoading(false);
        }
    };

    const handleInviteMember = async (e) => {
        e.preventDefault();

        if (isInviting) return;

        setIsInviting(true);

        try {
            await teamService.addMember(team.id, inviteData.email, inviteData.role);

            // Success - show toast, close modal, refresh
            toast.success('Member added successfully');
            setShowMemberModal(false);
            setInviteData({ email: '', role: 'MEMBER' });
            fetchTeamData();
        } catch (error) {
            // Keep modal open on error
            toast.error(error.response?.data?.message || 'Failed to add member');
            console.error('Add member error:', error);
        } finally {
            setIsInviting(false);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;

        // Optimistic update - remove from UI immediately
        const memberToRemove = team.members.find(m => m.userId === userId);
        setTeam(prev => ({
            ...prev,
            members: prev.members.filter(m => m.userId !== userId)
        }));
        toast.success('Member removed successfully');

        try {
            await teamService.removeMember(team.id, userId);
        } catch (error) {
            // Revert on error
            toast.error(error.response?.data?.message || 'Failed to remove member');
            if (memberToRemove) {
                setTeam(prev => ({
                    ...prev,
                    members: [...prev.members, memberToRemove]
                }));
            }
        }
    };

    const handleTaskStatusChange = async (task, newStatus) => {
        if (task.status === 'COMPLETED' && newStatus !== 'Completed') {
            setEditingTask(task);
            setPendingStatus(newStatus);
            setShowStatusModal(true);
        } else {
            // Optimistic update - update UI immediately
            const previousStatus = task.status;
            setTasks(prev => prev.map(t =>
                t.id === task.id ? { ...t, status: newStatus } : t
            ));
            toast.success('Task status updated');

            try {
                await taskService.updateTask(task.id, { status: newStatus });
            } catch (error) {
                // Revert on error
                toast.error('Failed to update task status');
                setTasks(prev => prev.map(t =>
                    t.id === task.id ? { ...t, status: previousStatus } : t
                ));
            }
        }
    };

    const handleStatusWithReason = async () => {
        if (!statusReason.trim()) {
            toast.error('Please provide a reason');
            return;
        }

        // Optimistic update - update UI immediately
        const previousStatus = editingTask.status;
        setTasks(prev => prev.map(t =>
            t.id === editingTask.id ? { ...t, status: pendingStatus } : t
        ));
        toast.success('Task updated');

        // Close modal immediately
        setShowStatusModal(false);
        setStatusReason('');
        setPendingStatus('');
        setEditingTask(null);

        try {
            await taskService.updateTask(editingTask.id, { status: pendingStatus });
            await taskService.addComment(editingTask.id, `Status changed to ${pendingStatus}. Reason: ${statusReason}`);
        } catch (error) {
            // Revert on error
            toast.error('Failed to update task');
            setTasks(prev => prev.map(t =>
                t.id === editingTask.id ? { ...t, status: previousStatus } : t
            ));
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

    const getRoleBadge = (role, userId, ownerId) => {
        if (userId === ownerId) return <span className="role-badge owner"><Crown size={12} /> Owner</span>;
        return role === 'ADMIN' ? <span className="role-badge admin">Admin</span> : <span className="role-badge member">Member</span>;
    };

    if (loading) return <div className="page-container"><Navbar /><div className="loading-container"><div className="spinner"></div><p>Loading team...</p></div></div>;
    if (!team) return <div className="page-container"><Navbar /><div className="empty-state"><h3>Team not found</h3><Link to="/teams" className="btn btn-primary">Back to Teams</Link></div></div>;

    const taskStats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        todo: tasks.filter(t => t.status === 'TODO').length
    };

    return (
        <div className="page-container">
            <Navbar />
            <div className="page-content">
                <div className="team-details-header">
                    <Link to="/teams" className="back-link"><ArrowLeft size={20} /> Back to Teams</Link>
                    <div className="team-header-info">
                        <div>
                            <h1 className="page-title">{team.name}</h1>
                            {team.description && <p className="page-subtitle">{team.description}</p>}
                        </div>
                        <div className="team-header-actions">
                            <button className="btn btn-secondary" onClick={() => setShowMemberModal(true)}><UserPlus size={18} /> Add Member</button>
                            <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}><Plus size={18} /> New Task</button>
                        </div>
                    </div>
                </div>

                <div className="team-stats-bar">
                    <div className="stat-card"><span className="stat-value">{taskStats.total}</span><span className="stat-label">Total Tasks</span></div>
                    <div className="stat-card"><span className="stat-value">{taskStats.todo}</span><span className="stat-label">To Do</span></div>
                    <div className="stat-card"><span className="stat-value">{taskStats.inProgress}</span><span className="stat-label">In Progress</span></div>
                    <div className="stat-card completed"><span className="stat-value">{taskStats.completed}</span><span className="stat-label">Completed</span></div>
                    <div className="stat-card"><span className="stat-value">{team.members?.length || 0}</span><span className="stat-label">Members</span></div>
                </div>

                <div className="team-tabs">
                    <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Tasks</button>
                    <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members</button>
                </div>

                {activeTab === 'tasks' && (
                    <div className="team-tasks-section">
                        <div className="tasks-filters">
                            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="filter-select">
                                <option value="all">All Status</option>
                                <option value="TODO">Todo</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="BLOCKED">Blocked</option>
                            </select>
                            <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="filter-select">
                                <option value="all">All Priority</option>
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>

                        {tasks.length === 0 ? (
                            <div className="empty-state">
                                <h3>No tasks found</h3>
                                <p>Create your first team task!</p>
                                <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}><Plus size={20} /> Create Task</button>
                            </div>
                        ) : (
                            <div className="tasks-grid">
                                {tasks.map((task, index) => {
                                    const dueDateStatus = getDueDateStatus(task.dueDate, task.status);
                                    return (
                                        <motion.div key={task.id} className={`task-card card ${dueDateStatus}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                                            <div className="task-card-header">
                                                <h3 className="task-title">{task.title}</h3>
                                            </div>
                                            {task.description && <p className="task-description">{task.description}</p>}
                                            <div className="task-meta">
                                                <div className="task-badges">
                                                    <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                                                    <span className={`badge badge-${task.status.toLowerCase().replace(' ', '-')}`}>{task.status.replace('_', ' ')}</span>
                                                </div>
                                                <div className={`task-due-date ${dueDateStatus}`}>
                                                    <Calendar size={14} />
                                                    <span>{format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                                                    {dueDateStatus === 'overdue' && <AlertCircle size={14} />}
                                                </div>
                                            </div>
                                            <div className="task-actions" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                                {task.status !== 'TODO' && (
                                                    <button className="btn btn-sm" onClick={() => handleTaskStatusChange(task, 'TODO')} title="Mark as Todo"><AlertCircle size={14} /> Todo</button>
                                                )}
                                                {task.status !== 'IN_PROGRESS' && (
                                                    <button className="btn btn-sm" onClick={() => handleTaskStatusChange(task, 'IN_PROGRESS')} title="Mark as In Progress"><Clock size={14} /> In Progress</button>
                                                )}
                                                {task.status !== 'COMPLETED' && (
                                                    <button className="btn btn-sm btn-primary" onClick={() => handleTaskStatusChange(task, 'COMPLETED')} title="Mark as Completed">✓ Complete</button>
                                                )}
                                            </div>
                                            {task.assignee && (
                                                <div className="task-assignee">
                                                    <div className="assignee-avatar">{task.assignee.name.charAt(0).toUpperCase()}</div>
                                                    <span>Assigned to {task.assignee.name}</span>
                                                </div>
                                            )}
                                            <div className="task-creator">Created by {task.creator?.name}</div>
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
                                        <div className="member-avatar large">{member.user.name.charAt(0).toUpperCase()}</div>
                                        <div className="member-details"><h4>{member.user.name}</h4><p>{member.user.email}</p></div>
                                    </div>
                                    <div className="member-actions">
                                        {getRoleBadge(member.role, member.userId, team.ownerId)}
                                        {member.userId !== team.ownerId && team.ownerId === user?.id && (
                                            <button className="btn-icon danger" onClick={() => handleRemoveMember(member.userId)} title="Remove Member"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Member Invite Modal - Kept as is */}
                {showMemberModal && (
                    <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header"><h2>Add Team Member</h2><button className="modal-close" onClick={() => setShowMemberModal(false)}>×</button></div>
                            <form onSubmit={handleInviteMember} className="modal-form">
                                <div className="input-group">
                                    <label>Email Address</label>
                                    <input type="email" value={inviteData.email} onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })} required />
                                </div>
                                <div className="input-group">
                                    <label>Role</label>
                                    <select value={inviteData.role} onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}>
                                        <option value="MEMBER">Member</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-outline" onClick={() => setShowMemberModal(false)} disabled={isInviting}>Cancel</button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isInviting}
                                        style={{ opacity: isInviting ? 0.7 : 1, cursor: isInviting ? 'not-allowed' : 'pointer' }}
                                    >
                                        {isInviting ? 'Adding...' : 'Add Member'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Create Task Modal - Replaced with TaskForm */}
                <AnimatePresence>
                    {showTaskModal && (
                        <TaskForm
                            onClose={() => setShowTaskModal(false)}
                            onSuccess={fetchTeamData}
                            teamMembers={team.members.map(m => ({ user: m.user }))} // Format for TaskForm
                            initialData={{ teamId: team.id }}
                        />
                    )}
                </AnimatePresence>

                {/* Status Reason Modal */}
                <AnimatePresence>
                    {showStatusModal && (
                        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStatusModal(false)}>
                            <motion.div className="modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
                                <div className="modal-header"><h2>Status Change Reason</h2><button className="modal-close" onClick={() => setShowStatusModal(false)}><X size={24} /></button></div>
                                <div className="modal-form">
                                    <p>Reason for changing status to <strong>{pendingStatus}</strong>:</p>
                                    <textarea value={statusReason} onChange={e => setStatusReason(e.target.value)} required rows="3" />
                                    <div className="modal-actions">
                                        <button className="btn btn-outline" onClick={() => setShowStatusModal(false)}>Cancel</button>
                                        <button className="btn btn-primary" onClick={handleStatusWithReason}>Submit</button>
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

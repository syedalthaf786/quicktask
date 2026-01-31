import { useState, useEffect } from 'react';
import { taskService } from '../services/taskService';
import { teamService } from '../services/teamService';
import { useAuth } from '../context/AuthContext';
import { exportUtils } from '../utils/exportUtils';
import Navbar from '../components/Navbar';
import SmartTaskCard from '../components/SmartTaskCard';
import BugReportForm from '../components/BugReportForm';
import { toast } from 'react-toastify';
import {
    Plus,
    Search,
    Filter,
    Download,
    Edit2,
    Trash2,
    Calendar,
    AlertCircle,
    X,
    ArrowUpDown,
    User,
    MessageCircle,
    Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isPast, differenceInDays } from 'date-fns';
import './Tasks.css';

const Tasks = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [permissions, setPermissions] = useState(null);
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all',
        search: ''
    });
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'Todo',
        dueDate: '',
        assigneeId: ''
    });

    const [sortBy, setSortBy] = useState('createdAt');
    const [order, setOrder] = useState('desc');

    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);

    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusReason, setStatusReason] = useState('');
    const [pendingStatus, setPendingStatus] = useState('');

    // Bug Report State
    const [showBugForm, setShowBugForm] = useState(false);
    const [selectedTaskForBug, setSelectedTaskForBug] = useState(null);

    const [isFirstRun, setIsFirstRun] = useState(true);

    useEffect(() => {
        if (isFirstRun) {
            fetchTasks();
            fetchTeams();
            setIsFirstRun(false);
        }
    }, [filters, sortBy, order]);

    useEffect(() => {
        if (selectedTeam) {
            fetchTeamMembers(selectedTeam);
        }
    }, [selectedTeam]);

    const fetchTeams = async () => {
        try {
            const data = await teamService.getMyTeams();
            setTeams(data.teams);
        } catch (error) {
            console.error('Failed to fetch teams');
        }
    };

    const fetchTeamMembers = async (teamId) => {
        try {
            const data = await teamService.getTeamMembers(teamId);
            setTeamMembers(data.members);
        } catch (error) {
            console.error('Failed to fetch team members');
            setTeamMembers([]);
        }
    };

    // Auto-fetch members for School ERP team to populate SmartTaskCard dropdowns
    useEffect(() => {
        if (teams.length > 0) {
            const schoolErpTeam = teams.find(t => t.name === 'School ERP') || teams[0];
            if (schoolErpTeam) {
                // Only fetch if not already selecting a specific team
                if (!selectedTeam) {
                    fetchTeamMembers(schoolErpTeam.id);
                }
            }
        }
    }, [teams]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            console.log('Fetching tasks with filters:', filters);

            const data = await taskService.getTasks({
                ...filters,
                sortBy,
                order
            });

            console.log('Tasks response:', data);

            // Validate response
            if (!data || !data.success) {
                console.error('Tasks API error:', data);
                throw new Error(data?.message || 'Failed to fetch tasks');
            }

            setTasks(data.tasks);
            setFilteredTasks(data.tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            toast.error(error.message || 'Failed to fetch tasks');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingTask) {
                // If not creator, only send status
                if (!permissions?.canEdit) {
                    // Check if status is changing
                    if (formData.status !== editingTask.status) {
                        // If marking as not completed (Todo or In Progress), require reason
                        if (formData.status !== 'Completed' && editingTask.status === 'Completed') {
                            setPendingStatus(formData.status);
                            setShowStatusModal(true);
                            return;
                        }
                        await taskService.updateTask(editingTask.id, { status: formData.status });
                    } else {
                        await taskService.updateTask(editingTask.id, { status: formData.status });
                    }
                } else {
                    await taskService.updateTask(editingTask.id, formData);
                }
                toast.success('Task updated successfully');
            } else {
                await taskService.createTask(formData);
                toast.success('Task created successfully');
            }

            closeModal();
            fetchTasks();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save task');
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
            closeModal();
            fetchTasks();
        } catch (error) {
            toast.error('Failed to update task');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;

        try {
            await taskService.deleteTask(id);
            toast.success('Task deleted successfully');
            fetchTasks();
        } catch (error) {
            toast.error('Failed to delete task');
        }
    };

    const openModal = async (task = null) => {
        if (task) {
            // Fetch task details with permissions
            try {
                const data = await taskService.getTask(task.id);
                setEditingTask(data.task);
                setPermissions(data.permissions);
                setComments(data.task.comments || []);

                setFormData({
                    title: data.task.title,
                    description: data.task.description || '',
                    priority: data.task.priority,
                    status: data.task.status,
                    dueDate: format(new Date(data.task.dueDate), 'yyyy-MM-dd'),
                    assigneeId: data.task.assigneeId || ''
                });

                if (data.task.teamId) {
                    setSelectedTeam(data.task.teamId.toString());
                    fetchTeamMembers(data.task.teamId);
                } else {
                    setSelectedTeam(null);
                }
            } catch (error) {
                toast.error('Failed to fetch task details');
                return;
            }
        } else {
            setEditingTask(null);
            setPermissions(null);
            setComments([]);
            setFormData({
                title: '',
                description: '',
                priority: 'Medium',
                status: 'Todo',
                dueDate: '',
                assigneeId: ''
            });
            setSelectedTeam(null);
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTask(null);
        setPermissions(null);
        setComments([]);
        setNewComment('');
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const data = await taskService.addComment(editingTask.id, newComment);
            setComments([data.comment, ...comments]);
            setNewComment('');
            toast.success('Comment added');
        } catch (error) {
            toast.error('Failed to add comment');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Delete this comment?')) return;

        try {
            await taskService.deleteComment(editingTask.id, commentId);
            setComments(comments.filter(c => c.id !== commentId));
            toast.success('Comment deleted');
        } catch (error) {
            toast.error('Failed to delete comment');
        }
    };

    const getDueDateStatus = (dueDate, status) => {
        if (status === 'Completed') return 'completed';
        const due = new Date(dueDate);
        if (isPast(due)) return 'overdue';
        const daysLeft = differenceInDays(due, new Date());
        if (daysLeft <= 3) return 'due-soon';
        return 'normal';
    };

    // Check if current user is creator
    const isCreator = editingTask && permissions?.canEdit;

    return (
        <div className="page-container">
            <Navbar />
            <div className="page-content">
                <div className="tasks-header">
                    <div>
                        <h1 className="page-title">My Tasks</h1>
                        <p className="page-subtitle">Organize and manage your daily tasks</p>
                    </div>
                    <div className="header-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={() => exportUtils.exportToCSV(filteredTasks)}
                            disabled={filteredTasks.length === 0}
                        >
                            <Download size={20} />
                            Export CSV
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => exportUtils.exportToPDF(filteredTasks, user?.name || 'User')}
                            disabled={filteredTasks.length === 0}
                        >
                            <Download size={20} />
                            Export PDF
                        </button>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <Plus size={20} />
                            New Task
                        </button>
                    </div>
                </div>

                <div className="tasks-filters">
                    <div className="search-box">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    <div className="filter-group">
                        <Filter size={20} />
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

                    <div className="filter-group">
                        <ArrowUpDown size={20} />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="filter-select"
                        >
                            <option value="createdAt">Creation Date</option>
                            <option value="dueDate">Due Date</option>
                            <option value="priority">Priority</option>
                            <option value="title">Title</option>
                        </select>

                        <select
                            value={order}
                            onChange={(e) => setOrder(e.target.value)}
                            className="filter-select"
                        >
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Loading tasks...</p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="empty-state">
                        <h3>No tasks found</h3>
                        <p>Create your first task to get started!</p>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <Plus size={20} />
                            Create Task
                        </button>
                    </div>
                ) : (
                    <div className="tasks-grid">
                        {filteredTasks.map((task, index) => {
                            const dueDateStatus = getDueDateStatus(task.dueDate, task.status);

                            // Check for Smart Task (Testing Assignment)
                            const isSmartTask = task.description && task.description.trim().startsWith('{') && !task.title.startsWith('[BUG]');

                            if (isSmartTask) {
                                // Find related bugs for this task
                                const relatedBugs = tasks.filter(t =>
                                    t.title.startsWith('[BUG]') &&
                                    t.description &&
                                    t.description.includes(`Related Task ID:** ${task.id}`)
                                );

                                return (
                                    <SmartTaskCard
                                        key={task.id || task._id}
                                        task={task}
                                        onReportBug={(id, title) => {
                                            setSelectedTaskForBug({ id, title });
                                            setShowBugForm(true);
                                        }}
                                        relatedBugs={relatedBugs}
                                        teamMembers={teamMembers}
                                        currentUser={user}
                                        onAssign={async (taskId, assigneeId) => {
                                            if (user.email !== 'prudvireddy7733@gmail.com') return;
                                            try {
                                                await taskService.updateTask(taskId, { assigneeId });
                                                setTasks(prev => prev.map(t =>
                                                    t.id === taskId
                                                        ? { ...t, assigneeId, assignee: teamMembers.find(m => m.user.id === assigneeId)?.user }
                                                        : t
                                                ));
                                                toast.success('Assignee updated');
                                            } catch (error) {
                                                toast.error('Failed to assign task');
                                            }
                                        }}
                                    />
                                );
                            }

                            return (
                                <motion.div
                                    key={task.id || task._id}
                                    className={`task-card card ${dueDateStatus}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <div className="task-card-header">
                                        <h3 className="task-title">{task.title}</h3>
                                        <div className="task-actions">
                                            <button
                                                className="task-action-btn"
                                                onClick={() => openModal(task)}
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            {task.creatorId === user?.id && (
                                                <button
                                                    className="task-action-btn delete"
                                                    onClick={() => handleDelete(task.id || task._id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
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
                                                {task.status}
                                            </span>
                                        </div>

                                        <div className={`task-due-date ${dueDateStatus}`}>
                                            <Calendar size={14} />
                                            <span>{format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                                            {dueDateStatus === 'overdue' && <AlertCircle size={14} />}
                                        </div>
                                    </div>

                                    {dueDateStatus === 'due-soon' && task.status !== 'Completed' && (
                                        <div className="task-warning">
                                            <AlertCircle size={14} />
                                            Due in {differenceInDays(new Date(task.dueDate), new Date())} days
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
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                <AnimatePresence>
                    {showModal && (
                        <motion.div
                            className="modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModal}
                        >
                            <motion.div
                                className="modal"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="modal-header">
                                    <h2>{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
                                    <button className="modal-close" onClick={closeModal}>
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="modal-form">
                                    {/* Read-only fields for team members */}
                                    <div className="input-group">
                                        <label className="input-label">Title *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            required
                                            placeholder="Enter task title"
                                            disabled={!isCreator}
                                            readOnly={!isCreator}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Description</label>
                                        <textarea
                                            className="input"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Add task description (optional)"
                                            rows="3"
                                            disabled={!isCreator}
                                            readOnly={!isCreator}
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="input-group">
                                            <label className="input-label">Priority *</label>
                                            <select
                                                className="input select"
                                                value={formData.priority}
                                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                                required
                                                disabled={!isCreator}
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
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                            required
                                            min={format(new Date(), 'yyyy-MM-dd')}
                                            disabled={!isCreator}
                                            readOnly={!isCreator}
                                        />
                                    </div>

                                    {/* Team and Assignee Selection */}
                                    {isCreator && (
                                        <div className="form-row">
                                            <div className="input-group">
                                                <label className="input-label">Team (Optional)</label>
                                                <select
                                                    className="input select"
                                                    value={selectedTeam || ''}
                                                    onChange={(e) => {
                                                        setSelectedTeam(e.target.value);
                                                        setFormData({ ...formData, assigneeId: '' });
                                                    }}
                                                >
                                                    <option value="">No Team (Personal Task)</option>
                                                    {teams.map(team => (
                                                        <option key={team.id} value={team.id}>{team.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {selectedTeam && (
                                                <div className="input-group">
                                                    <label className="input-label">Assign To</label>
                                                    <select
                                                        className="input select"
                                                        value={formData.assigneeId}
                                                        onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                                                    >
                                                        <option value="">Unassigned</option>
                                                        {teamMembers.map(member => (
                                                            <option key={member.user.id} value={member.user.id}>
                                                                {member.user.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* For new tasks or team tasks without editing, show team selection */}
                                    {!editingTask && (
                                        <div className="form-row">
                                            <div className="input-group">
                                                <label className="input-label">Team (Optional)</label>
                                                <select
                                                    className="input select"
                                                    value={selectedTeam || ''}
                                                    onChange={(e) => {
                                                        setSelectedTeam(e.target.value);
                                                        setFormData({ ...formData, assigneeId: '' });
                                                    }}
                                                >
                                                    <option value="">No Team (Personal Task)</option>
                                                    {teams.map(team => (
                                                        <option key={team.id} value={team.id}>{team.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {selectedTeam && (
                                                <div className="input-group">
                                                    <label className="input-label">Assign To</label>
                                                    <select
                                                        className="input select"
                                                        value={formData.assigneeId}
                                                        onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                                                    >
                                                        <option value="">Unassigned</option>
                                                        {teamMembers.map(member => (
                                                            <option key={member.user.id} value={member.user.id}>
                                                                {member.user.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="modal-actions">
                                        <button type="button" className="btn btn-outline" onClick={closeModal}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            {editingTask ? 'Update Task' : 'Create Task'}
                                        </button>
                                    </div>
                                </form>

                                {/* Comments Section */}
                                {editingTask && permissions?.canComment && (
                                    <div className="comments-section">
                                        <div className="comments-header">
                                            <MessageCircle size={20} />
                                            <h3>Comments ({comments.length})</h3>
                                        </div>

                                        {/* Add Comment Form */}
                                        <form onSubmit={handleAddComment} className="comment-form">
                                            <div className="input-group">
                                                <textarea
                                                    className="input"
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    placeholder="Add a comment..."
                                                    rows="2"
                                                />
                                            </div>
                                            <button type="submit" className="btn btn-primary btn-sm">
                                                <Send size={16} />
                                                Send
                                            </button>
                                        </form>

                                        {/* Comments List */}
                                        <div className="comments-list">
                                            {comments.length === 0 ? (
                                                <p className="no-comments">No comments yet. Be the first to comment!</p>
                                            ) : (
                                                comments.map(comment => (
                                                    <div key={comment.id} className="comment">
                                                        <div className="comment-header">
                                                            <div className="comment-avatar">
                                                                {comment.user.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="comment-info">
                                                                <span className="comment-author">{comment.user.name}</span>
                                                                <span className="comment-date">
                                                                    {format(new Date(comment.createdAt), 'MMM dd, yyyy HH:mm')}
                                                                </span>
                                                            </div>
                                                            {comment.userId === user?.id && (
                                                                <button
                                                                    className="comment-delete"
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="comment-content">{comment.content}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
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
                                        Please provide a reason for changing the task status to <strong>{pendingStatus}</strong>.
                                    </p>
                                    <div className="input-group">
                                        <label className="input-label">Reason *</label>
                                        <textarea
                                            className="input"
                                            value={statusReason}
                                            onChange={(e) => setStatusReason(e.target.value)}
                                            placeholder="Explain why the status is being changed..."
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

                {/* Bug Report Form */}
                <BugReportForm
                    isOpen={showBugForm} // Use dedicated state
                    onClose={() => setShowBugForm(false)}
                    teamId={selectedTaskForBug?.teamId || tasks[0]?.teamId} // Try to get from selected task
                    onSuccess={fetchTasks}
                    parentTaskId={selectedTaskForBug?.id}
                    parentTaskTitle={selectedTaskForBug?.title}
                />
            </div>
        </div>
    );
};

export default Tasks;

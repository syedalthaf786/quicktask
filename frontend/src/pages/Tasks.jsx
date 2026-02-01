
import React, { useState, useEffect } from 'react';
import { taskService } from '../services/taskService';
import { teamService } from '../services/teamService';
import { useAuth } from '../context/AuthContext';
import { exportUtils } from '../utils/exportUtils';
import Navbar from '../components/Navbar';
import SmartTaskCard from '../components/SmartTaskCard';
import TaskForm from '../components/TaskForm'; // Imported
import { toast } from 'react-toastify';
import {
    Plus, Search, Filter, Download, Edit2, Trash2, Calendar, AlertCircle, ArrowUpDown, ChevronDown, ChevronRight, Bug
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
    const [permissions, setPermissions] = useState(null); // Still useful for card actions
    // Grid view only - removed list view option

    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all',
        category: 'all',
        search: ''
    });

    const [sortBy, setSortBy] = useState('createdAt');
    const [order, setOrder] = useState('desc');

    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);

    // Status Modal State (Legacy/Verify if needed, keeping for checking)
    // Actually TaskForm handles status changes usually, but if we have a quick status change on card...
    // The previous file had `handleStatusWithReason`. I'll keep it if it's used by cards, but wait, it was only in the modal?
    // It was used in a separate modal `showStatusModal`. TaskCards used `openModal`.
    // I will remove `showStatusModal` logic from here and let TaskForm handle updates.
    // If the user wants quick status update from card (drag and drop or dropdown), we might need it, but for now let's rely on TaskForm.





    useEffect(() => {
        if (user) {
            fetchTasks();
            fetchTeams();
        }
    }, [filters, sortBy, order, user]);

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

    // Auto-fetch members for default team
    useEffect(() => {
        if (teams.length > 0) {
            const schoolErpTeam = teams.find(t => t.name === 'School ERP') || teams[0];
            if (schoolErpTeam && !selectedTeam) {
                fetchTeamMembers(schoolErpTeam.id);
            }
        }
    }, [teams, selectedTeam]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await taskService.getTasks({ ...filters, sortBy, order });
            if (!data || !data.success) throw new Error(data?.message || 'Failed to fetch tasks');

            let visibleTasks = data.tasks;
            // Backend now handles hiding bugs and subtasks (parentId=null, isBugReport=false)
            // so we don't need to manually filter here.

            setTasks(visibleTasks);
            setFilteredTasks(visibleTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            toast.error(error.message || 'Failed to fetch tasks');
        } finally {
            setLoading(false);
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
            try {
                // Fetch full details including attachments/history
                const data = await taskService.getTask(task.id);
                setEditingTask(data.task);
                setPermissions(data.permissions);
                if (data.task.teamId) fetchTeamMembers(data.task.teamId);
            } catch (error) {
                toast.error('Failed to fetch task details');
                return;
            }
        } else {
            setEditingTask(null);
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTask(null);
    };

    const getDueDateStatus = (dueDate, status) => {
        if (status === 'Completed') return 'completed';
        const due = new Date(dueDate);
        if (isPast(due)) return 'overdue';
        const daysLeft = differenceInDays(due, new Date());
        if (daysLeft <= 3) return 'due-soon';
        return 'normal';
    };

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
                        <button className="btn btn-secondary" onClick={() => exportUtils.exportToCSV(filteredTasks)} disabled={filteredTasks.length === 0}>
                            <Download size={20} /> Export CSV
                        </button>
                        <button className="btn btn-secondary" onClick={() => exportUtils.exportToPDF(filteredTasks, user?.name || 'User')} disabled={filteredTasks.length === 0}>
                            <Download size={20} /> Export PDF
                        </button>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <Plus size={20} /> New Task
                        </button>
                    </div>
                </div>

                <div className="tasks-filters">
                    <div className="search-box">
                        <Search size={20} />
                        <input type="text" placeholder="Search tasks..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
                    </div>
                    <div className="filter-group">
                        <Filter size={20} />
                        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="filter-select">
                            <option value="all">All Status</option>
                            <option value="Todo">Todo</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                        </select>
                        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="filter-select">
                            <option value="all">All Priority</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="filter-select">
                            <option value="all">All Categories</option>
                            <option value="DEVELOPMENT">Development</option>
                            <option value="TESTING">Testing</option>
                            <option value="DESIGN">Design</option>
                            <option value="MARKETING">Marketing</option>
                            <option value="DEVOPS">DevOps</option>
                            <option value="GENERAL">General</option>
                        </select>
                    </div>



                    <div className="filter-group">
                        <ArrowUpDown size={20} />
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
                            <option value="createdAt">Creation Date</option>
                            <option value="dueDate">Due Date</option>
                            <option value="priority">Priority</option>
                            <option value="title">Title</option>
                        </select>
                        <select value={order} onChange={(e) => setOrder(e.target.value)} className="filter-select">
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-container"><div className="spinner"></div><p>Loading tasks...</p></div>
                ) : filteredTasks.length === 0 ? (
                    <div className="empty-state">
                        <h3>No tasks found</h3>
                        <p>Create your first task to get started!</p>
                        <button className="btn btn-primary" onClick={() => openModal()}><Plus size={20} /> Create Task</button>
                    </div>
                ) : (
                    <div className="tasks-grid">
                        {filteredTasks.map((task, index) => {
                            const dueDateStatus = getDueDateStatus(task.dueDate, task.status);
                        
                            // Smart Task Condition: 
                            // 1. Has JSON description (AI generated)
                            // 2. OR Has explicit subtasks (User created)
                            // 3. OR Has bug reports
                            const isJsonDescription = task.description && task.description.trim().startsWith('{');
                            const hasSubTasks = task.subTasks && task.subTasks.length > 0;
                            const hasBugReports = task.bugReports && task.bugReports.length > 0;
                            const isSmartTask = isJsonDescription || hasSubTasks || hasBugReports;
                        
                            if (isSmartTask) {
                                return (
                                    <SmartTaskCard
                                        key={task.id || task._id}
                                        task={task}
                                        onReportBug={fetchTasks} // Pass the refresh function
                                        teamMembers={teamMembers}
                                        currentUser={user}
                                        onAssign={async (taskId, assigneeId) => {
                                            try {
                                                await taskService.updateTask(taskId, { assigneeId });
                                                fetchTasks(); // Refresh to ensure sync
                                                toast.success('Assignee updated');
                                            } catch (error) { toast.error('Failed to assign task'); }
                                        }}
                                    />
                                );
                            }
                        
                            return (
                                <motion.div key={task.id} className={`task-card card ${dueDateStatus}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                                    <div className="task-card-header">
                                        <h3 className="task-title">{task.title}</h3>
                                        <div className="task-actions">
                                            <button className="task-action-btn" onClick={() => openModal(task)} title="Edit"><Edit2 size={16} /></button>
                                            {task.creatorId === user?.id && (
                                                <button className="task-action-btn delete" onClick={() => handleDelete(task.id)} title="Delete"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    </div>
                                    {task.description && <p className="task-description">{task.description}</p>}
                                    <div className="task-meta">
                                        <div className="task-badges">
                                            <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                                            <span className={`badge badge-${task.status.toLowerCase().replace(' ', '-')}`}>{task.status}</span>
                                        </div>
                                        <div className={`task-due-date ${dueDateStatus}`}>
                                            <Calendar size={14} />
                                            <span>{format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                                            {dueDateStatus === 'overdue' && <AlertCircle size={14} />}
                                        </div>
                                    </div>
                                    {task.assignee && (
                                        <div className="task-assignee">
                                            <div className="assignee-avatar">{task.assignee.name.charAt(0).toUpperCase()}</div>
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
                        <TaskForm
                            task={editingTask}
                            onClose={closeModal}
                            onSuccess={fetchTasks}
                            teamMembers={teamMembers}
                        />
                    )}
                </AnimatePresence>


            </div>
        </div>
    );
};

export default Tasks;

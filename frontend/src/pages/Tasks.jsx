import { useState, useEffect } from 'react';
import { taskService } from '../services/taskService';
import { useAuth } from '../context/AuthContext';
import { exportUtils } from '../utils/exportUtils';
import Navbar from '../components/Navbar';
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
    ArrowUpDown
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
        dueDate: ''
    });

    const [sortBy, setSortBy] = useState('createdAt');
    const [order, setOrder] = useState('desc');

    useEffect(() => {
        fetchTasks();
    }, [filters, sortBy, order]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await taskService.getTasks({
                ...filters,
                sortBy,
                order
            });
            setTasks(data.tasks);
            setFilteredTasks(data.tasks);
        } catch (error) {
            toast.error('Failed to fetch tasks');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingTask) {
                await taskService.updateTask(editingTask.id || editingTask._id, formData);
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

    const openModal = (task = null) => {
        if (task) {
            setEditingTask(task);
            setFormData({
                title: task.title,
                description: task.description || '',
                priority: task.priority,
                status: task.status,
                dueDate: format(new Date(task.dueDate), 'yyyy-MM-dd')
            });
        } else {
            setEditingTask(null);
            setFormData({
                title: '',
                description: '',
                priority: 'Medium',
                status: 'Todo',
                dueDate: ''
            });
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
                                            <button
                                                className="task-action-btn delete"
                                                onClick={() => handleDelete(task.id || task._id)}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
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
                                    <div className="input-group">
                                        <label className="input-label">Title *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            required
                                            placeholder="Enter task title"
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
                                        />
                                    </div>

                                    <div className="modal-actions">
                                        <button type="button" className="btn btn-outline" onClick={closeModal}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            {editingTask ? 'Update Task' : 'Create Task'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Tasks;

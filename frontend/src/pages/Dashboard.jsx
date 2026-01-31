import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskService } from '../services/taskService';
import Navbar from '../components/Navbar';
import TestingDashboard from './TestingDashboard'; // Import the new dashboard
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    TrendingUp,
    ListTodo,
    ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentTasks, setRecentTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSchoolERPTeam, setIsSchoolERPTeam] = useState(false);

    useEffect(() => {
        if (user?.email === 'prudvireddy7733@gmail.com') {
            setIsSchoolERPTeam(true);
        }
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            console.log('Fetching dashboard data...');

            const [statsData, tasksData] = await Promise.all([
                taskService.getStats(),
                taskService.getTasks({ sortBy: 'createdAt', order: 'desc' })
            ]);

            console.log('Stats response:', statsData);
            console.log('Tasks response:', tasksData);

            // Validate stats data
            if (!statsData || !statsData.success) {
                console.error('Stats API error:', statsData);
                throw new Error(statsData?.message || 'Failed to fetch stats');
            }

            // Validate tasks data
            if (!tasksData || !tasksData.success) {
                console.error('Tasks API error:', tasksData);
                throw new Error(tasksData?.message || 'Failed to fetch tasks');
            }

            setStats(statsData.stats);
            setRecentTasks(tasksData.tasks.slice(0, 5));

            // Show alert for overdue tasks
            if (statsData.stats && statsData.stats.overdue > 0) {
                toast.warning(`You have ${statsData.stats.overdue} overdue task(s)!`, {
                    toastId: 'overdue-alert' // Prevent duplicate toasts
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            // toast.error(error.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (isSchoolERPTeam) {
        return <TestingDashboard />;
    }

    const statCards = stats ? [
        {
            title: 'Total Tasks',
            value: stats.total,
            icon: ListTodo,
            color: 'primary',
            gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
        },
        {
            title: 'Completed',
            value: stats.completed,
            icon: CheckCircle2,
            color: 'success',
            gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
        },
        {
            title: 'In Progress',
            value: stats.inProgress,
            icon: Clock,
            color: 'warning',
            gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
        },
        {
            title: 'Overdue',
            value: stats.overdue,
            icon: AlertCircle,
            color: 'danger',
            gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
        }
    ] : [];

    if (loading) {
        return (
            <div className="page-container">
                <Navbar />
                <div className="page-content">
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Loading dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <Navbar />
            <div className="page-content">
                <div className="dashboard-header">
                    <div>
                        <h1 className="page-title">Welcome back, {user?.name}! 👋</h1>
                        <p className="page-subtitle">Here's an overview of your tasks and productivity</p>
                    </div>
                </div>

                <div className="stats-grid">
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.title}
                                className="stat-card card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="stat-icon" style={{ background: stat.gradient }}>
                                    <Icon size={24} />
                                </div>
                                <div className="stat-content">
                                    <p className="stat-label">{stat.title}</p>
                                    <h2 className="stat-value">{stat.value}</h2>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {stats && (
                    <div className="dashboard-grid">
                        <motion.div
                            className="card completion-card"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="card-header">
                                <h3>Completion Rate</h3>
                                <TrendingUp size={20} className="text-success" />
                            </div>
                            <div className="completion-content">
                                <div className="completion-circle">
                                    <svg viewBox="0 0 120 120">
                                        <circle
                                            cx="60"
                                            cy="60"
                                            r="50"
                                            fill="none"
                                            stroke="var(--bg-tertiary)"
                                            strokeWidth="10"
                                        />
                                        <circle
                                            cx="60"
                                            cy="60"
                                            r="50"
                                            fill="none"
                                            stroke="url(#gradient)"
                                            strokeWidth="10"
                                            strokeDasharray={`${stats.completionRate * 3.14} 314`}
                                            strokeLinecap="round"
                                            transform="rotate(-90 60 60)"
                                        />
                                        <defs>
                                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="var(--primary)" />
                                                <stop offset="100%" stopColor="var(--secondary)" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="completion-text">
                                        <span className="completion-percentage">{stats.completionRate}%</span>
                                    </div>
                                </div>
                                <div className="completion-stats">
                                    <div className="completion-stat">
                                        <span className="completion-stat-label">Completed</span>
                                        <span className="completion-stat-value">{stats.completed}</span>
                                    </div>
                                    <div className="completion-stat">
                                        <span className="completion-stat-label">Pending</span>
                                        <span className="completion-stat-value">{stats.pending}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            className="card recent-tasks-card"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <div className="card-header">
                                <h3>Recent Tasks</h3>
                                <Link to="/tasks" className="view-all-link">
                                    View All <ArrowRight size={16} />
                                </Link>
                            </div>
                            <div className="recent-tasks-list">
                                {recentTasks.length > 0 ? (
                                    recentTasks.map((task) => (
                                        <div key={task.id || task._id} className="recent-task-item">
                                            <div className="task-item-content">
                                                <h4 className="task-item-title">{task.title}</h4>
                                                <div className="task-item-meta">
                                                    <span className={`badge badge-${task.priority.toLowerCase()}`}>
                                                        {task.priority}
                                                    </span>
                                                    <span className={`badge badge-${task.status.toLowerCase().replace(' ', '-')}`}>
                                                        {task.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <p>No tasks yet. Create your first task!</p>
                                        <Link to="/tasks" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                                            Create Task
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;

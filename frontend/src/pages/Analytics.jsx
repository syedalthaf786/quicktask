import { useState, useEffect } from 'react';
import analyticsService from '../services/analyticsService';
import Navbar from '../components/Navbar';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { BarChart3, TrendingUp, Target, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import './Analytics.css';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const Analytics = () => {
    const [stats, setStats] = useState(null);
    const [productivity, setProductivity] = useState(null);
    const [period, setPeriod] = useState('7days');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const [statsData, productivityData] = await Promise.all([
                analyticsService.getTaskStats(),
                analyticsService.getProductivityAnalysis(period)
            ]);

            setStats(statsData.stats);
            setProductivity(productivityData.analysis);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <Navbar />
                <div className="page-content">
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Loading analytics...</p>
                    </div>
                </div>
            </div>
        );
    }

    const priorityData = {
        labels: ['Low', 'Medium', 'High'],
        datasets: [{
            data: stats ? [
                stats.priorityDistribution?.Low || stats.priority_distribution?.Low || 0,
                stats.priorityDistribution?.Medium || stats.priority_distribution?.Medium || 0,
                stats.priorityDistribution?.High || stats.priority_distribution?.High || 0
            ] : [0, 0, 0],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
            borderWidth: 0
        }]
    };

    const statusData = {
        labels: ['Todo', 'In Progress', 'Completed'],
        datasets: [{
            label: 'Tasks',
            data: stats ? [
                stats.todo_tasks || stats.todo || 0,
                stats.in_progress_tasks || stats.inProgress || 0,
                stats.completed_tasks || stats.completed || 0
            ] : [0, 0, 0],
            backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'],
            borderRadius: 8
        }]
    };

    const productivityTimelineData = productivity ? {
        labels: productivity.completion_timeline?.map(d => d.date) || [],
        datasets: [{
            label: 'Tasks Completed',
            data: productivity.completion_timeline?.map(d => d.count) || [],
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.4,
            fill: true
        }]
    } : { labels: [], datasets: [] };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    padding: 20,
                    font: { size: 12, weight: '600' },
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()
                }
            }
        }
    };

    return (
        <div className="page-container">
            <Navbar />
            <div className="page-content">
                <div className="analytics-header">
                    <div>
                        <h1 className="page-title">Analytics Dashboard</h1>
                        <p className="page-subtitle">Track your productivity and insights</p>
                    </div>
                    <div className="period-selector">
                        <button
                            className={`period-btn ${period === '7days' ? 'active' : ''}`}
                            onClick={() => setPeriod('7days')}
                        >
                            7 Days
                        </button>
                        <button
                            className={`period-btn ${period === '30days' ? 'active' : ''}`}
                            onClick={() => setPeriod('30days')}
                        >
                            30 Days
                        </button>
                        <button
                            className={`period-btn ${period === '90days' ? 'active' : ''}`}
                            onClick={() => setPeriod('90days')}
                        >
                            90 Days
                        </button>
                    </div>
                </div>

                <div className="analytics-stats-grid">
                    <motion.div
                        className="analytics-stat-card card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="analytics-stat-icon" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <p className="analytics-stat-label">Total Tasks</p>
                            <h3 className="analytics-stat-value">{stats?.total_tasks || stats?.total || 0}</h3>
                        </div>
                    </motion.div>

                    <motion.div
                        className="analytics-stat-card card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="analytics-stat-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                            <Target size={24} />
                        </div>
                        <div>
                            <p className="analytics-stat-label">Completion Rate</p>
                            <h3 className="analytics-stat-value">{stats?.completion_rate || stats?.completionRate || 0}%</h3>
                        </div>
                    </motion.div>

                    <motion.div
                        className="analytics-stat-card card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="analytics-stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="analytics-stat-label">Productivity Trend</p>
                            <h3 className="analytics-stat-value">{productivity?.trend || 'N/A'}</h3>
                        </div>
                    </motion.div>

                    <motion.div
                        className="analytics-stat-card card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="analytics-stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="analytics-stat-label">Avg Completion Time</p>
                            <h3 className="analytics-stat-value">
                                {stats?.avg_completion_time_days ? `${stats.avg_completion_time_days}d` : 'N/A'}
                            </h3>
                        </div>
                    </motion.div>

                    <motion.div
                        className="analytics-stat-card card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="analytics-stat-icon" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}>
                            <Target size={24} />
                        </div>
                        <div>
                            <p className="analytics-stat-label">Peak Productivity Day</p>
                            <h3 className="analytics-stat-value">
                                {productivity?.peak_productivity_day?.date ? format(new Date(productivity.peak_productivity_day.date), 'MMM dd') : 'N/A'}
                            </h3>
                        </div>
                    </motion.div>
                </div>

                <div className="analytics-charts-grid">
                    <motion.div
                        className="chart-card card"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <h3 className="chart-title">Priority Distribution</h3>
                        <div className="chart-container">
                            <Doughnut data={priorityData} options={chartOptions} />
                        </div>
                    </motion.div>

                    <motion.div
                        className="chart-card card"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <h3 className="chart-title">Task Status</h3>
                        <div className="chart-container">
                            <Bar data={statusData} options={chartOptions} />
                        </div>
                    </motion.div>

                    {productivity && productivity.completion_timeline && productivity.completion_timeline.length > 0 && (
                        <motion.div
                            className="chart-card card full-width"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <h3 className="chart-title">Productivity Timeline</h3>
                            <div className="chart-container">
                                <Line data={productivityTimelineData} options={chartOptions} />
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;

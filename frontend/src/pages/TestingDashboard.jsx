import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { taskService } from '../services/taskService';
import Navbar from '../components/Navbar';
import BugReportForm from '../components/BugReportForm';
import SmartTaskCard from '../components/SmartTaskCard';
import {
    Bug,
    ClipboardList,
    CheckCircle2,
    AlertTriangle,
    Plus,
    Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import './Dashboard.css';

const TestingDashboard = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [bugs, setBugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showBugForm, setShowBugForm] = useState(false);
    const [selectedTaskForBug, setSelectedTaskForBug] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        bugs: 0,
        pending: 0
    });

    useEffect(() => {
        fetchTestingData();
    }, []);

    const fetchTestingData = async () => {
        try {
            setLoading(true);
            const response = await taskService.getTasks({ limit: 100 });
            if (response.success) {
                const allTasks = response.tasks;

                // Separate Assignments from Bugs
                const bugTasks = allTasks.filter(t => t.title.startsWith('[BUG]'));
                const assignmentTasks = allTasks.filter(t => !t.title.startsWith('[BUG]') && t.description.startsWith('{'));

                setAssignments(assignmentTasks);
                setBugs(bugTasks);
                calculateStats(assignmentTasks, bugTasks);
            }
        } catch (error) {
            console.error('Error fetching testing data:', error);
            toast.error('Failed to load testing assignments.');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (assigns, bugList) => {
        const total = assigns.length;
        // Check if all subtasks are checked? For now just rely on status
        const completed = assigns.filter(t => t.status === 'COMPLETED').length;
        const bugCount = bugList.length;
        const pending = total - completed;

        setStats({ total, completed, bugs: bugCount, pending });
    };

    const handleReportBug = (taskId = null, taskTitle = null) => {
        if (taskId) {
            setSelectedTaskForBug({ id: taskId, title: taskTitle });
        } else {
            setSelectedTaskForBug(null);
        }
        setShowBugForm(true);
    };

    if (loading) {
        return (
            <div className="page-container">
                <Navbar />
                <div className="page-content">
                    <div className="loading-container"><div className="spinner"></div></div>
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
                        <h1 className="page-title">School ERP Testing Dashboard 🧪</h1>
                        <p className="page-subtitle">Manage testing assignments and report bugs for {user.name}</p>
                    </div>
                    <button
                        className="btn btn-danger"
                        onClick={() => handleReportBug()}
                    >
                        <Bug size={18} style={{ marginRight: '8px' }} />
                        Report General Bug
                    </button>
                </div>

                {/* Stats Row */}
                <div className="stats-grid">
                    <div className="stat-card card">
                        <div className="stat-icon" style={{ background: 'var(--primary)' }}>
                            <ClipboardList size={24} color="white" />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Assignments</p>
                            <h2 className="stat-value">{stats.total}</h2>
                        </div>
                    </div>
                    <div className="stat-card card">
                        <div className="stat-icon" style={{ background: 'var(--danger)' }}>
                            <Bug size={24} color="white" />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Total Bugs</p>
                            <h2 className="stat-value">{stats.bugs}</h2>
                        </div>
                    </div>
                </div>

                {/* Assignments List */}
                <div className="tasks-container" style={{ marginTop: '2rem' }}>
                    <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ClipboardList className="text-primary" /> Active Assignments
                    </h2>

                    {assignments.length === 0 ? (
                        <div className="empty-state">
                            <p>No assignments found.</p>
                        </div>
                    ) : (
                        <div className="task-list">
                            {assignments.map((task) => {
                                // Find related bugs (naive search in description for now, or just implicit linking if we had relations)
                                // Since we store simple "Related Task ID: X" in bug description, we can filter bugs
                                const relatedBugs = bugs.filter(b => b.description.includes(`Related Task ID:** ${task.id}`));

                                return (
                                    <SmartTaskCard
                                        key={task.id}
                                        task={task}
                                        onReportBug={handleReportBug}
                                        relatedBugs={relatedBugs}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Unlinked Bugs (General) */}
                <div className="tasks-container" style={{ marginTop: '3rem' }}>
                    <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertTriangle className="text-warning" /> General / Unlinked Bugs
                    </h2>

                    {bugs.filter(b => !b.description.includes('Related Task ID')).length === 0 ? (
                        <p className="text-muted">No general bugs reported.</p>
                    ) : (
                        <div className="task-list">
                            {bugs.filter(b => !b.description.includes('Related Task ID')).map(bug => (
                                <div key={bug.id} className="card" style={{ padding: '1rem', marginBottom: '0.5rem', borderLeft: '4px solid var(--danger)' }}>
                                    <h4 style={{ margin: 0 }}>{bug.title}</h4>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                        <span className="badge badge-danger">{bug.priority}</span>
                                        <span>{bug.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <BugReportForm
                    isOpen={showBugForm}
                    onClose={() => setShowBugForm(false)}
                    teamId={assignments[0]?.teamId} // Fallback team ID
                    onSuccess={fetchTestingData}
                    parentTaskId={selectedTaskForBug?.id}
                    parentTaskTitle={selectedTaskForBug?.title}
                />
            </div>
        </div>
    );
};

export default TestingDashboard;

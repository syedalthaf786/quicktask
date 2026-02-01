
import React, { useEffect, useState } from 'react';
import { taskService } from '../services/taskService';
import { format } from 'date-fns';
import { History } from 'lucide-react';

const TaskHistoryTimeline = ({ taskId }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await taskService.getHistory(taskId);
                setHistory(data.history || []);
            } catch (error) {
                console.error('Failed to fetch history');
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [taskId]);

    if (loading) return <p>Loading history...</p>;
    if (history.length === 0) return <p>No history yet.</p>;

    return (
        <div className="task-history">
            <h4><History size={16} /> Activity Log</h4>
            <div className="timeline">
                {history.map(item => (
                    <div key={item.id} className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                            <span className="timeline-user">{item.user?.name || 'System'}</span>
                            <span className="timeline-action">
                                {item.action} {item.fieldName ? `- ${item.fieldName}` : ''}
                            </span>
                            {item.oldValue && <span className="timeline-change">from "{item.oldValue}"</span>}
                            {item.newValue && <span className="timeline-change">to "{item.newValue}"</span>}
                            <span className="timeline-date">{format(new Date(item.createdAt), 'MMM dd, HH:mm')}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TaskHistoryTimeline;

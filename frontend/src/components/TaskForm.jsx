
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Paperclip } from 'lucide-react';
import { taskService } from '../services/taskService';
import { toast } from 'react-toastify';
import AttachmentManager from './AttachmentManager';
import { format } from 'date-fns';
import './TaskForm.css';

const TaskForm = ({ task, onClose, onSuccess, teamMembers = [], initialData = {} }) => {
    const [step, setStep] = useState(task ? 'form' : 'category');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        status: 'TODO',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        category: 'GENERAL',
        assigneeId: '',
        estimatedHours: '',
        actualHours: '',
        // specialized
        repoLink: '', branchName: '', techStack: '',
        testType: 'MANUAL', testingEnv: 'STAGING',
        campaignType: 'SOCIAL', platform: '',
        riskLevel: 'LOW', devOpsEnv: 'STAGING',
        designType: 'UI', figmaLink: '',
        // bug meta
        bugMetadata: {
            severity: 'MEDIUM',
            environment: 'STAGING',
            steps: '',
            expected: '',
            actual: ''
        },
        // subtasks
        subTasks: [],
        ...initialData // Apply initial data (e.g. teamId)
    });

    const [taskCreatedId, setTaskCreatedId] = useState(null);

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title,
                description: task.description || '',
                priority: task.priority || 'MEDIUM',
                status: task.status || 'TODO',
                dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                category: task.category || 'GENERAL',
                assigneeId: task.assigneeId || '',
                estimatedHours: task.estimatedHours || '',
                actualHours: task.actualHours || '',
                // Populate specialized if exists
                ...task.developmentData,
                ...task.testingData,
                ...task.marketingData,
                ...task.devOpsData,
                ...task.designData,
                // Bug data
                bugMetadata: task.bugMetadata || formData.bugMetadata,
                subTasks: task.subTasks || []
            });
            setStep('form');
        }
    }, [task]);

    // Handle subtask creation after task is created
    useEffect(() => {
        const createSubtasks = async () => {
            if (taskCreatedId && formData.subTasks && formData.subTasks.length > 0) {
                for (const subtask of formData.subTasks) {
                    try {
                        await taskService.createSubTask(taskCreatedId, subtask);
                    } catch (error) {
                        toast.error(`Failed to create subtask: ${subtask.title}`);
                    }
                }
                setTaskCreatedId(null); // Reset to prevent repeated calls
            }
        };
        
        createSubtasks();
    }, [taskCreatedId, formData.subTasks]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSubmit = { 
                ...formData,
                // Remove fields that don't exist in the backend schema
                repoLink: undefined, 
                branchName: undefined, 
                techStack: undefined,
                testType: undefined, 
                testingEnv: undefined,
                campaignType: undefined, 
                platform: undefined,
                riskLevel: undefined, 
                devOpsEnv: undefined,
                designType: undefined, 
                figmaLink: undefined
            };
            
            // Clean up undefined values
            Object.keys(dataToSubmit).forEach(key => {
                if (dataToSubmit[key] === undefined) {
                    delete dataToSubmit[key];
                }
            });
            
            if (task) {
                await taskService.updateTask(task.id, dataToSubmit);
                // Update specialized
                const specialized = ['DEVELOPMENT', 'TESTING', 'MARKETING', 'DEVOPS', 'DESIGN'];
                if (specialized.includes(formData.category)) {
                    await taskService.updateSpecializedData(task.id, formData.category, dataToSubmit);
                }
                
                // Update subtasks if they exist
                if (formData.subTasks) {
                    // For now, we'll just update the task and handle subtasks separately
                    // In a more complete implementation, we would handle subtask updates
                }
                
                toast.success('Task updated');
            } else {
                const response = await taskService.createTask(dataToSubmit);
                // Store the created task ID to create subtasks after the task is created
                const createdTaskId = response.task.id;
                
                // Mark that we need to create subtasks for this task
                setTaskCreatedId(createdTaskId);
                
                toast.success('Task created');
            }
            
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save task');
        }
    };

    const categories = [
        { id: 'DEVELOPMENT', label: 'Development', icon: '💻', desc: 'Code, API, Features' },
        { id: 'TESTING', label: 'QA / Testing', icon: '🧪', desc: 'Bugs, Manual, Auto' },
        { id: 'DESIGN', label: 'UI/UX Design', icon: '🎨', desc: 'Figma, Mockups' }, // New
        { id: 'MARKETING', label: 'Marketing', icon: '📢', desc: 'Campaigns, Ads' },
        { id: 'DEVOPS', label: 'DevOps', icon: '⚙️', desc: 'CI/CD, Deploy' },
        { id: 'GENERAL', label: 'General', icon: '📝', desc: 'Default tasks' }
    ];

    return (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div className="modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{task ? 'Edit Task' : 'Create New Task'}</h2>
                    <button className="modal-close" onClick={onClose}><X size={24} /></button>
                </div>

                <div className="modal-body">
                    {step === 'category' ? (
                        <div className="category-selection">
                            <h3>Select Category</h3>
                            <div className="category-grid">
                                {categories.map(cat => (
                                    <div key={cat.id} className={`category-card ${formData.category === cat.id ? 'active' : ''}`}
                                        onClick={() => { setFormData({ ...formData, category: cat.id }); setStep('form'); }}>
                                        <span className="category-icon">{cat.icon}</span>
                                        <span className="category-label">{cat.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="modal-form">
                            {!task && <button type="button" onClick={() => setStep('category')}>← Back</button>}

                            <div className="form-row">
                                <div className="input-group">
                                    <label>Title</label>
                                    <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                                </div>
                                <div className="input-group">
                                    <label>Priority</label>
                                    <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="input-group">
                                    <label>Status</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="TODO">Todo</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Assignee</label>
                                    <select value={formData.assigneeId || ''} onChange={e => setFormData({ ...formData, assigneeId: e.target.value })}>
                                        <option value="">Unassigned</option>
                                        {teamMembers && teamMembers.length > 0 ? (
                                            teamMembers.map(member => {
                                                const user = member.user || member;
                                                return <option key={user.id} value={user.id}>{user.name}</option>;
                                            })
                                        ) : null}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="input-group">
                                    <label>Due Date</label>
                                    <input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} required />
                                </div>
                                <div className="input-group">
                                    <label>Estimated Hours</label>
                                    <input type="number" step="0.5" value={formData.estimatedHours} onChange={e => setFormData({ ...formData, estimatedHours: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-row">
                                {task && (
                                    <div className="input-group">
                                        <label>Actual Hours</label>
                                        <input type="number" step="0.5" value={formData.actualHours} onChange={e => setFormData({ ...formData, actualHours: e.target.value })} />
                                    </div>
                                )}
                            </div>

                            {/* Category Specifics */}
                            {formData.category === 'DESIGN' && (
                                <div className="specialized-fields">
                                    <div className="input-group">
                                        <label>Design Type</label>
                                        <select value={formData.designType} onChange={e => setFormData({ ...formData, designType: e.target.value })}>
                                            <option value="UI">UI Design</option>
                                            <option value="UX">UX Research</option>
                                            <option value="GRAPHIC">Graphic Design</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Figma Link</label>
                                        <input type="url" value={formData.figmaLink} onChange={e => setFormData({ ...formData, figmaLink: e.target.value })} placeholder="https://figma.com/..." />
                                    </div>
                                </div>
                            )}

                            <div className="input-group">
                                <label>Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows="3" />
                            </div>

                            {/* Subtasks Checklist (New) */}
                            <div className="subtasks-section" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <label style={{ fontWeight: 600 }}>Subtasks</label>
                                </div>

                                <div className="subtasks-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                                    {formData.subTasks && formData.subTasks.map((st, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px' }}>
                                            <div style={{ flex: 1, fontWeight: 500 }}>{st.title}</div>
                                            <button type="button" onClick={() => {
                                                const newSubtasks = [...formData.subTasks];
                                                newSubtasks.splice(idx, 1);
                                                setFormData({ ...formData, subTasks: newSubtasks });
                                            }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="add-subtask-row" style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Add a subtask..."
                                        id="new-subtask-title"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const title = e.target.value;
                                                if (title.trim()) {
                                                    const newSubtask = { title };
                                                    setFormData({ ...formData, subTasks: [...(formData.subTasks || []), newSubtask] });
                                                    e.target.value = '';
                                                }
                                            }
                                        }}
                                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                                    />
                                    <button type="button" className="btn btn-secondary" onClick={() => {
                                        const titleInput = document.getElementById('new-subtask-title');
                                        if (titleInput.value.trim()) {
                                            const newSubtask = { title: titleInput.value };
                                            setFormData({ ...formData, subTasks: [...(formData.subTasks || []), newSubtask] });
                                            titleInput.value = '';
                                        }
                                    }}>
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>

                            {task && <AttachmentManager taskId={task.id} attachments={task.attachments} readOnly={false} />}

                            <button type="submit" className="btn btn-primary">Save Task</button>
                        </form>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default TaskForm;

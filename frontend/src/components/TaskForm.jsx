
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Paperclip } from 'lucide-react';
import { taskService } from '../services/taskService';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import AttachmentManager from './AttachmentManager';
import { format } from 'date-fns';
import './TaskForm.css';

const TaskForm = ({ task, onClose, onSuccess, teamMembers = [], initialData = {} }) => {
    const [step, setStep] = useState(task ? 'form' : 'category');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user: currentUser } = useAuth();

    // Permission check
    const isCreator = task?.creatorId === currentUser?.id;
    const currentMember = teamMembers?.find(m => (m.user?.id || m.id) === currentUser?.id);
    const isTeamOwner = currentMember?.role === 'OWNER';
    const canEditAll = !task || isCreator || isTeamOwner;
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
        testType: 'MANUAL',
        campaignType: 'SOCIAL', platform: '',
        environment: 'STAGING',
        riskLevel: 'LOW',
        designType: 'UI', figmaLink: '',
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

        // Prevent double submission
        if (isSubmitting) return;

        setIsSubmitting(true);
        const isEditing = !!task;

        try {
            // 1. Separate main task data from specialized category data
            const mainTaskFields = [
                'title', 'description', 'priority', 'status', 'dueDate',
                'category', 'assigneeId', 'estimatedHours', 'actualHours'
            ];

            const taskData = {};
            mainTaskFields.forEach(field => {
                if (formData[field] !== undefined) taskData[field] = formData[field];
            });

            // 2. Extract specialized data based on category
            const categoryData = {};
            if (formData.category === 'DEVELOPMENT') {
                ['repoLink', 'branchName', 'techStack', 'components'].forEach(f => {
                    if (formData[f] !== undefined) categoryData[f] = formData[f];
                });
            } else if (formData.category === 'TESTING') {
                categoryData.testType = formData.testType;
                categoryData.environment = formData.environment || 'STAGING';
                categoryData.expectations = formData.expectations;
            } else if (formData.category === 'MARKETING') {
                ['campaignType', 'budget', 'platforms', 'phase'].forEach(f => {
                    if (formData[f] !== undefined) categoryData[f] = formData[f];
                });
                if (categoryData.budget) categoryData.budget = parseFloat(categoryData.budget);
            } else if (formData.category === 'DEVOPS') {
                categoryData.environment = formData.environment || 'STAGING';
                categoryData.riskLevel = formData.riskLevel;
                categoryData.iacRef = formData.iacRef;
                categoryData.deploymentUrl = formData.deploymentUrl;
            } else if (formData.category === 'DESIGN') {
                ['designType', 'figmaLink', 'assets'].forEach(f => {
                    if (formData[f] !== undefined) categoryData[f] = formData[f];
                });
            }

            if (isEditing) {
                // Update main task
                await taskService.updateTask(task.id, taskData);

                // Update specialized data if applicable
                const specializedCategories = ['DEVELOPMENT', 'TESTING', 'MARKETING', 'DEVOPS', 'DESIGN'];
                if (specializedCategories.includes(formData.category)) {
                    await taskService.updateSpecializedData(task.id, formData.category, categoryData);
                }

                toast.success('Task updated successfully!');
            } else {
                // Construct initial payload with subtasks
                const createData = { ...taskData, subTasks: formData.subTasks };
                const response = await taskService.createTask(createData);

                const createdTaskId = response.task.id;

                // Update specialized data for the new task
                const specializedCategories = ['DEVELOPMENT', 'TESTING', 'MARKETING', 'DEVOPS', 'DESIGN'];
                if (specializedCategories.includes(formData.category)) {
                    await taskService.updateSpecializedData(createdTaskId, formData.category, categoryData);
                }

                toast.success('Task created successfully!');
            }

            // Only close and refresh on success
            if (onSuccess) onSuccess();
            onClose();

        } catch (error) {
            // Show error and keep modal open for user to fix
            toast.error(error.response?.data?.message || 'Failed to save task');
            console.error('Task save error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const categories = [
        { id: 'DEVELOPMENT', label: 'Development', icon: '💻', desc: 'Code, API, Features' },
        { id: 'TESTING', label: 'Quality Assurance', icon: '🧪', desc: 'Test Plans, Manual Testing' },
        { id: 'DESIGN', label: 'UI/UX Design', icon: '🎨', desc: 'Figma, Mockups' },
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
                                    <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required disabled={!canEditAll} />
                                </div>
                                <div className="input-group">
                                    <label>Priority</label>
                                    <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} disabled={!canEditAll}>
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
                                    <label>Due Date</label>
                                    <input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} required disabled={!canEditAll} />
                                </div>
                            </div>

                            {/* Category-specific fields */}
                            {formData.category === 'DEVELOPMENT' && (
                                <>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label>Repository Link</label>
                                            <input type="url" value={formData.repoLink || ''} onChange={e => setFormData({ ...formData, repoLink: e.target.value })} placeholder="https://github.com/..." />
                                        </div>
                                        <div className="input-group">
                                            <label>Branch Name</label>
                                            <input type="text" value={formData.branchName || ''} onChange={e => setFormData({ ...formData, branchName: e.target.value })} placeholder="main, develop, etc." />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label>Tech Stack (comma-separated)</label>
                                            <input type="text" value={formData.techStack || ''} onChange={e => setFormData({ ...formData, techStack: e.target.value })} placeholder="React, Node.js, MongoDB" />
                                        </div>
                                        <div className="input-group">
                                            <label>Components (comma-separated)</label>
                                            <input type="text" value={formData.components || ''} onChange={e => setFormData({ ...formData, components: e.target.value })} placeholder="Header, Footer, Dashboard" />
                                        </div>
                                    </div>
                                </>
                            )}

                            {formData.category === 'TESTING' && (
                                <>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label>Test Type</label>
                                            <select value={formData.testType || 'MANUAL'} onChange={e => setFormData({ ...formData, testType: e.target.value })}>
                                                <option value="MANUAL">Manual</option>
                                                <option value="AUTOMATED">Automated</option>
                                                <option value="REGRESSION">Regression</option>
                                                <option value="SMOKE">Smoke</option>
                                                <option value="PERFORMANCE">Performance</option>
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label>Environment</label>
                                            <select value={formData.environment || 'STAGING'} onChange={e => setFormData({ ...formData, environment: e.target.value })}>
                                                <option value="DEVELOPMENT">Development</option>
                                                <option value="STAGING">Staging</option>
                                                <option value="PRODUCTION">Production</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Test Expectations</label>
                                        <textarea value={formData.expectations || ''} onChange={e => setFormData({ ...formData, expectations: e.target.value })} placeholder="What should be the expected outcome..." rows={3}></textarea>
                                    </div>
                                </>
                            )}

                            {formData.category === 'MARKETING' && (
                                <>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label>Campaign Type</label>
                                            <input type="text" value={formData.campaignType || ''} onChange={e => setFormData({ ...formData, campaignType: e.target.value })} placeholder="Email Campaign, Social Media, etc." />
                                        </div>
                                        <div className="input-group">
                                            <label>Budget</label>
                                            <input type="number" value={formData.budget || ''} onChange={e => setFormData({ ...formData, budget: e.target.value })} placeholder="5000" />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label>Platforms (comma-separated)</label>
                                            <input type="text" value={formData.platforms || ''} onChange={e => setFormData({ ...formData, platforms: e.target.value })} placeholder="Facebook, Instagram, LinkedIn" />
                                        </div>
                                        <div className="input-group">
                                            <label>Campaign Phase</label>
                                            <select value={formData.phase || 'RESEARCH'} onChange={e => setFormData({ ...formData, phase: e.target.value })}>
                                                <option value="RESEARCH">Research</option>
                                                <option value="STRATEGY">Strategy</option>
                                                <option value="CREATIVE">Creative</option>
                                                <option value="EXECUTION">Execution</option>
                                                <option value="ANALYSIS">Analysis</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}

                            {formData.category === 'DEVOPS' && (
                                <>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label>Environment</label>
                                            <select value={formData.environment || 'STAGING'} onChange={e => setFormData({ ...formData, environment: e.target.value })}>
                                                <option value="DEVELOPMENT">Development</option>
                                                <option value="STAGING">Staging</option>
                                                <option value="PRODUCTION">Production</option>
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label>Risk Level</label>
                                            <select value={formData.riskLevel || 'LOW'} onChange={e => setFormData({ ...formData, riskLevel: e.target.value })}>
                                                <option value="LOW">Low</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="HIGH">High</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label>IaC Reference</label>
                                            <input type="text" value={formData.iacRef || ''} onChange={e => setFormData({ ...formData, iacRef: e.target.value })} placeholder="Terraform module, CloudFormation template, etc." />
                                        </div>
                                        <div className="input-group">
                                            <label>Deployment URL</label>
                                            <input type="url" value={formData.deploymentUrl || ''} onChange={e => setFormData({ ...formData, deploymentUrl: e.target.value })} placeholder="https://app.example.com" />
                                        </div>
                                    </div>
                                </>
                            )}

                            {formData.category === 'DESIGN' && (
                                <>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label>Design Type</label>
                                            <input type="text" value={formData.designType || ''} onChange={e => setFormData({ ...formData, designType: e.target.value })} placeholder="UI Design, Logo, Banner, etc." />
                                        </div>
                                        <div className="input-group">
                                            <label>Figma Link</label>
                                            <input type="url" value={formData.figmaLink || ''} onChange={e => setFormData({ ...formData, figmaLink: e.target.value })} placeholder="https://figma.com/file/..." />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Design Assets (comma-separated)</label>
                                        <input type="text" value={formData.assets || ''} onChange={e => setFormData({ ...formData, assets: e.target.value })} placeholder="Logo, Banner, Icons, etc." />
                                    </div>
                                </>
                            )}

                            <div className="input-group">
                                <label>Assignee</label>
                                <select value={formData.assigneeId || ''} onChange={e => setFormData({ ...formData, assigneeId: e.target.value })} disabled={!canEditAll}>
                                    <option value="">Unassigned</option>
                                    {teamMembers && teamMembers.length > 0 ? (
                                        teamMembers.map(member => {
                                            const user = member.user || member;
                                            return <option key={user.id} value={user.id}>{user.name}</option>;
                                        })
                                    ) : null}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="input-group">
                                    <label>Estimated Hours</label>
                                    <input type="number" step="0.5" value={formData.estimatedHours} onChange={e => setFormData({ ...formData, estimatedHours: e.target.value })} disabled={!canEditAll} />
                                </div>
                                {task && (
                                    <div className="input-group">
                                        <label>Actual Hours</label>
                                        <input type="number" step="0.5" value={formData.actualHours} onChange={e => setFormData({ ...formData, actualHours: e.target.value })} />
                                    </div>
                                )}
                            </div>

                            <div className="input-group">
                                <label>Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows="3" disabled={!canEditAll} />
                            </div>

                            {/* Subtasks Section - Improved UI */}
                            <div className="subtasks-section" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <label style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Subtasks</label>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {formData.subTasks?.length || 0} subtask{(formData.subTasks?.length || 0) !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                <div className="subtasks-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                                    {formData.subTasks && formData.subTasks.length > 0 ? (
                                        formData.subTasks.map((st, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    background: 'var(--bg-secondary)',
                                                    padding: '12px 16px',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--border-color)',
                                                    transition: 'all 0.2s'
                                                }}
                                                whileHover={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                            >
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    background: 'var(--primary)',
                                                    flexShrink: 0
                                                }} />
                                                <div style={{ flex: 1, fontWeight: 500, color: 'var(--text-primary)' }}>{st.title}</div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newSubtasks = [...formData.subTasks];
                                                        newSubtasks.splice(idx, 1);
                                                        setFormData({ ...formData, subTasks: newSubtasks });
                                                    }}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        borderRadius: '4px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '20px',
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.9rem',
                                            background: 'var(--bg-secondary)',
                                            borderRadius: '10px',
                                            border: '1px dashed var(--border-color)'
                                        }}>
                                            No subtasks yet. Add one below!
                                        </div>
                                    )}
                                </div>

                                <div className="add-subtask-row" style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Type subtask and press Enter or click +"
                                        id="new-subtask-title"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const title = e.target.value;
                                                if (title.trim()) {
                                                    const newSubtask = { title: title.trim() };
                                                    setFormData({ ...formData, subTasks: [...(formData.subTasks || []), newSubtask] });
                                                    e.target.value = '';
                                                    toast.success('Subtask added!');
                                                }
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border-color)',
                                            fontSize: '0.95rem',
                                            transition: 'all 0.2s'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => {
                                            const titleInput = document.getElementById('new-subtask-title');
                                            if (titleInput.value.trim()) {
                                                const newSubtask = { title: titleInput.value.trim() };
                                                setFormData({ ...formData, subTasks: [...(formData.subTasks || []), newSubtask] });
                                                titleInput.value = '';
                                                toast.success('Subtask added!');
                                            }
                                        }}
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Plus size={18} /> Add
                                    </button>
                                </div>
                            </div>

                            {task && <AttachmentManager taskId={task.id} attachments={task.attachments} readOnly={false} />}

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmitting}
                                style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                            >
                                {isSubmitting ? 'Saving...' : (task ? 'Update Task' : 'Save Task')}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default TaskForm;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AttachmentManager from './AttachmentManager'; // Imported
import BugReportForm from './BugReportForm';
import {
    CheckSquare,
    Square,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    Bug,
    AlertCircle,
    FileText,
    Copy,
    Check,
    Info,
    AlertTriangle,
    ChevronLeft,
    Paperclip,
    CheckCircle,
    Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { taskService } from '../services/taskService';
import { Trash2 } from 'lucide-react';

const SmartTaskCard = ({ task, onRefresh, teamMembers, currentUser, onAssign, onProgressUpdate, onDelete }) => {
    const [showModal, setShowModal] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [checkedItems, setCheckedItems] = useState({});
    const [activeModule, setActiveModule] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showCredentials, setShowCredentials] = useState(true); // Expanded by default
    const [selectedBug, setSelectedBug] = useState(null);
    const [showSubmission, setShowSubmission] = useState(false);
    const [showAttachments, setShowAttachments] = useState(false);
    const [submissionText, setSubmissionText] = useState(task.submission || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Bug Report State
    const [showBugForm, setShowBugForm] = useState(false);

    // Subtask management state
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);
    const [subtaskAssignee, setSubtaskAssignee] = useState('');
    const [syncingSubtasks, setSyncingSubtasks] = useState(new Set());
    const [confirmAction, setConfirmAction] = useState(null); // { title: '', message: '', onConfirm: () => {} }

    // Function to handle subtask creation
    const handleCreateSubtask = async () => {
        if (!newSubtaskTitle.trim()) return;

        setIsAddingSubtask(true);

        // Optimistic update - add subtask to UI immediately
        const optimisticSubtask = {
            id: 'temp-' + Date.now(),
            title: newSubtaskTitle.trim(),
            assignee: subtaskAssignee ? teamMembers.find(m => m.user.id === subtaskAssignee)?.user : null,
            status: 'TODO'
        };

        try {
            // Show success immediately
            toast.success('Subtask created successfully!');
            setNewSubtaskTitle('');
            setSubtaskAssignee('');
            // Keep modal open on success as per UX requirements

            // Create on server in background
            await taskService.createSubTask(task.id, {
                title: optimisticSubtask.title,
                assigneeId: subtaskAssignee || null
            });

            // Parent will refresh with real data
            if (onRefresh) onRefresh();
        } catch (error) {
            toast.error('Failed to create subtask: ' + error.message);
        } finally {
            setIsAddingSubtask(false);
        }
    };

    // Function to handle subtask update
    const handleUpdateSubtask = async (subtaskId, updateData) => {
        // Optimistic update for status changes
        const isStatusUpdate = updateData.status;
        const previousStatus = task.subTasks?.find(st => st.id === subtaskId)?.status;

        if (isStatusUpdate) {
            // Update UI immediately
            toast.success('Subtask updated successfully!');
            // Keep modal open
            setSyncingSubtasks(prev => new Set(prev).add(subtaskId));
        }

        try {
            // Sync with server in background
            await taskService.updateSubTask(task.id, subtaskId, updateData);
            if (onRefresh) onRefresh();
        } catch (error) {
            // Revert on error
            if (isStatusUpdate) {
                toast.error('Failed to update subtask: ' + error.message);
            }
            console.error('Subtask update failed:', error);
        } finally {
            setSyncingSubtasks(prev => {
                const next = new Set(prev);
                next.delete(subtaskId);
                return next;
            });
        }
    };

    // Function to handle subtask deletion
    const handleDeleteSubtask = async (subtaskId) => {
        setConfirmAction({
            title: 'Delete Subtask',
            message: 'Are you sure you want to delete this subtask? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await taskService.deleteSubTask(task.id, subtaskId);
                    toast.success('Subtask deleted successfully!');
                    if (onRefresh) onRefresh();
                } catch (error) {
                    toast.error('Failed to delete subtask: ' + error.message);
                }
            }
        });
    };

    const parseBugDescription = (bug) => {
        // Handle both old format (structured description) and new format (separate fields)
        if (!bug) return {};

        // If bug has separate fields (new format), use them directly
        if (bug.description !== undefined || bug.steps !== undefined || bug.expected !== undefined || bug.actual !== undefined) {
            return {
                severity: bug.severity || 'Medium',
                browser: bug.environment || 'Unknown',
                description: bug.description || 'No description provided.',
                steps: bug.steps || 'N/A',
                expected: bug.expected || 'N/A',
                actual: bug.actual || 'N/A'
            };
        }

        // Otherwise, parse from structured description (old format)
        if (!bug.description) return {};
        const desc = bug.description;
        const extract = (header) => {
            const regex = new RegExp(`\\*\\*${header}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|$)`, 'i');
            const match = desc.match(regex);
            return match ? match[1].trim() : '';
        };
        return {
            severity: extract('Severity'),
            browser: extract('Browser'),
            description: extract('Description'),
            steps: extract('Steps to Reproduce'),
            expected: extract('Expected Result'),
            actual: extract('Actual Result')
        };
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        try {
            // Load progress from category-specific data or description
            let progressData = null;

            // Try to get progress from category-specific data first
            if (task.category === 'DEVELOPMENT' && task.developmentData?.progress) {
                progressData = task.developmentData.progress;
            } else if (task.category === 'TESTING' && task.testingData?.testCases) {
                progressData = task.testingData.testCases;
            } else if (task.category === 'MARKETING' && task.marketingData?.progress) {
                progressData = task.marketingData.progress;
            } else if (task.category === 'DEVOPS' && task.devOpsData?.progress) {
                progressData = task.devOpsData.progress;
            } else if (task.category === 'DESIGN' && task.designData?.progress) {
                progressData = task.designData.progress;
            }
            // Fallback to description parsing for legacy data
            else if (task.description && task.description.startsWith('{')) {
                const data = JSON.parse(task.description);
                setParsedData(data);
            }

            // Set progress from any source
            if (progressData) {
                setCheckedItems(progressData);
            } else {
                // Try localStorage as fallback
                const savedProgress = localStorage.getItem(`task-progress-${task.id}`);
                if (savedProgress) {
                    setCheckedItems(JSON.parse(savedProgress));
                }
            }
        } catch (e) {
            console.error("Failed to load task progress", e);
        }
    }, [task]);

    const handleCheck = (moduleIndex, caseIndex) => {
        const key = `${moduleIndex}-${caseIndex}`;
        const newChecked = { ...checkedItems, [key]: !checkedItems[key] };

        // Optimistic update - update UI immediately
        setCheckedItems(newChecked);

        // Update parent state if callback provided
        if (onProgressUpdate) {
            onProgressUpdate(task.id, newChecked);
        }

        // Show appropriate feedback
        if (newChecked[key]) {
            toast.success('Progress saved', { autoClose: 1500, position: 'bottom-right' });
        }

        // Sync with server in background using the dedicated progress endpoint
        taskService.updateTaskProgress(task.id, newChecked).catch(error => {
            // Revert on error
            console.error('Failed to sync progress:', error);
            const revertedChecked = { ...newChecked, [key]: !newChecked[key] };
            setCheckedItems(revertedChecked);

            // Update parent state with reverted value
            if (onProgressUpdate) {
                onProgressUpdate(task.id, revertedChecked);
            }

            toast.error('Failed to save progress', { autoClose: 2000 });
        });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    const handleSubmission = async () => {
        if (!submissionText.trim()) return;

        // Optimistic update - show success immediately
        const previousSubmission = task.submission;
        setIsSubmitting(true);

        try {
            // Update UI optimistically
            toast.success("Deliverable submitted successfully!");
            // Keep panel open

            // Sync with server in background
            await taskService.updateTask(task.id, { submission: submissionText });
        } catch (error) {
            // Revert on error
            toast.error("Failed to submit deliverable");
            setShowSubmission(true);
            console.error('Submission failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Normalize modules for all task categories
    const rawModules = parsedData ? (parsedData.testing_modules || parsedData.data_seeding_tasks || []) : [];

    // Create category-specific modules based on task category
    const getCategoryModules = () => {
        const modules = [];

        switch (task.category) {
            case 'DEVELOPMENT':
                if (task.developmentData?.components) {
                    modules.push({
                        module: 'Components',
                        tasks: task.developmentData.components.map((comp, idx) => ({
                            id: `comp-${idx}`,
                            title: comp,
                            description: `Work on ${comp} component`
                        }))
                    });
                }
                if (task.developmentData?.techStack) {
                    const techItems = Array.isArray(task.developmentData.techStack)
                        ? task.developmentData.techStack
                        : [task.developmentData.techStack];
                    modules.push({
                        module: 'Tech Stack',
                        tasks: techItems.map((tech, idx) => ({
                            id: `tech-${idx}`,
                            title: tech,
                            description: `Implement ${tech} technology`
                        }))
                    });
                }
                break;

            case 'TESTING':
                if (task.testingData?.testCases) {
                    const testCases = Array.isArray(task.testingData.testCases)
                        ? task.testingData.testCases
                        : [];
                    modules.push({
                        module: 'Test Cases',
                        test_cases: testCases.map((testCase, idx) => ({
                            id: testCase.id || `test-${idx}`,
                            description: testCase.description || `Test case ${idx + 1}`,
                            checked: testCase.checked || false
                        }))
                    });
                }
                // Add legacy parsed data if exists
                if (parsedData?.testing_modules) {
                    modules.push(...parsedData.testing_modules);
                }
                break;

            case 'MARKETING':
                if (task.marketingData?.platforms) {
                    const platforms = Array.isArray(task.marketingData.platforms)
                        ? task.marketingData.platforms
                        : [task.marketingData.platforms];
                    modules.push({
                        module: 'Platforms',
                        tasks: platforms.map((platform, idx) => ({
                            id: `platform-${idx}`,
                            title: platform,
                            description: `Marketing on ${platform}`
                        }))
                    });
                }
                if (task.marketingData?.campaignType) {
                    modules.push({
                        module: 'Campaign',
                        tasks: [{
                            id: 'campaign-setup',
                            title: 'Setup Campaign',
                            description: `Setup ${task.marketingData.campaignType} campaign`
                        }]
                    });
                }
                break;

            case 'DEVOPS':
                modules.push({
                    module: 'Deployment',
                    tasks: [
                        {
                            id: 'env-setup',
                            title: 'Environment Setup',
                            description: `Setup ${task.devOpsData?.environment || 'Staging'} environment`
                        },
                        {
                            id: 'deployment',
                            title: 'Deploy Application',
                            description: 'Deploy to target environment'
                        }
                    ]
                });
                if (task.devOpsData?.iacRef) {
                    modules.push({
                        module: 'Infrastructure',
                        tasks: [{
                            id: 'iac-update',
                            title: 'Update IaC',
                            description: 'Update infrastructure as code'
                        }]
                    });
                }
                break;

            case 'DESIGN':
                if (task.designData?.assets) {
                    const assets = Array.isArray(task.designData.assets)
                        ? task.designData.assets
                        : [task.designData.assets];
                    modules.push({
                        module: 'Design Assets',
                        tasks: assets.map((asset, idx) => ({
                            id: `asset-${idx}`,
                            title: asset,
                            description: `Create ${asset} design asset`
                        }))
                    });
                }
                if (task.designData?.designType) {
                    modules.push({
                        module: 'Design Work',
                        tasks: [{
                            id: 'design-main',
                            title: task.designData.designType,
                            description: `Complete ${task.designData.designType} design`
                        }]
                    });
                }
                break;

            default:
                // For GENERAL or legacy tasks, use parsed data
                if (parsedData?.testing_modules || parsedData?.data_seeding_tasks) {
                    modules.push(...(parsedData.testing_modules || parsedData.data_seeding_tasks || []));
                }
                break;
        }

        return modules;
    };

    // Get modules for current task category
    const categoryModules = getCategoryModules();

    // Combine with legacy modules and subtasks
    const modules = [...categoryModules, ...rawModules];

    if (task.subTasks && task.subTasks.length > 0) {
        // Map subtasks to the "module" structure for unified rendering
        modules.unshift({
            module: 'Subtasks',
            matchSubTasks: true, // Marker to render differently if needed
            tasks: task.subTasks.map(st => ({
                id: st.id,
                title: st.title,
                status: st.status,
                assignee: st.assignee
            }))
        });
    }

    // Normalize credentials (array or object)
    const credentialsList = parsedData?.credentials
        ? (Array.isArray(parsedData.credentials) ? parsedData.credentials : [parsedData.credentials])
        : [];

    const calculateProgress = () => {
        let total = 0;
        let checked = 0;

        // Count progress from modules/test cases
        if (modules && modules.length > 0) {
            modules.forEach((mod, mIdx) => {
                const items = mod.tasks || mod.test_cases || [];
                items.forEach((item, cIdx) => {
                    total++;
                    // Check if completed (either via checkItems or actual status)
                    if (mod.matchSubTasks) {
                        if (item.status === 'COMPLETED') checked++;
                    } else if (checkedItems[`${mIdx}-${cIdx}`]) {
                        checked++;
                    }
                });
            });
        }

        // Count progress from subtasks
        if (task.subTasks) {
            task.subTasks.forEach(subtask => {
                total++;
                if (subtask.status === 'COMPLETED') checked++;
            });
        }

        return total === 0 ? 0 : Math.round((checked / total) * 100);
    };

    // Safely get progress
    const progress = calculateProgress();
    const priorityColors = {
        HIGH: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
        MEDIUM: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        LOW: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    };

    const categoryGradients = {
        DEVELOPMENT: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
        TESTING: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
        DESIGN: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
        MARKETING: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        DEVOPS: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        GENERAL: 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
    };

    const categoryIcons = {
        DEVELOPMENT: '💻',
        TESTING: '🧪',
        DESIGN: '🎨',
        MARKETING: '📢',
        DEVOPS: '⚙️',
        GENERAL: '📝'
    };

    const categoryColors = {
        DEVELOPMENT: '#6366f1',
        TESTING: '#ec4899',
        DESIGN: '#f97316',
        MARKETING: '#8b5cf6',
        DEVOPS: '#06b6d4',
        GENERAL: '#64748b'
    };

    const activeCategoryColor = categoryColors[task.category] || categoryColors.GENERAL;
    const activeCategoryGradient = categoryGradients[task.category] || categoryGradients.GENERAL;
    const activeCategoryIcon = categoryIcons[task.category] || categoryIcons.GENERAL;

    // Fallback if data is invalid, BUT proceed if we have subtasks to show
    // We only fallback to simple view if we have NEITHER parsed data NOR real subtasks
    const hasSubTasks = task.subTasks && task.subTasks.length > 0;



    if (!parsedData && !hasSubTasks) {
        return (
            <motion.div
                layout
                className="smart-task-card"
                style={{
                    marginBottom: '1rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>{task.title}</h3>
                    <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{task.description}</p>
            </motion.div>
        );
    }

    // For UI toggles, check if user is the global owner or has an appropriate role
    const currentMember = teamMembers?.find(m => m.user.id === currentUser?.id);
    const isOwner = currentMember?.role === 'OWNER';
    const isAssignee = task.assignee?.id === currentUser?.id;

    return (
        <>
            {/* Card Preview (Collapsed) */}
            <motion.div
                layout
                whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                className="smart-task-card"
                onClick={() => setShowModal(true)}
                style={{
                    marginBottom: '1.5rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative'
                }}
            >
                <div style={{ padding: '1.5rem', position: 'relative' }}>
                    {/* Glassmorphic Category Badge */}
                    <div style={{
                        position: 'absolute',
                        top: 0, right: 0,
                        background: activeCategoryGradient,
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '0 0 0 12px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <span>{activeCategoryIcon}</span>
                        <span>{task.category || 'GENERAL'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                            <span style={{
                                background: priorityColors[task.priority] || '#666',
                                color: 'white',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'inline-block',
                                marginBottom: '8px'
                            }}>
                                {task.priority}
                            </span>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.4 }}>{task.title}</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginRight: '80px' }}>
                            {task.assignee && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '12px' }}>
                                    <div style={{ width: '20px', height: '20px', background: activeCategoryColor, borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                        {task.assignee.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{task.assignee.name}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Specialized Metadata Preview */}
                    <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {task.developmentData?.repoLink && (
                            <div style={{ fontSize: '0.75rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px', background: '#eef2ff', padding: '2px 8px', borderRadius: '4px' }}>
                                <FileText size={12} /> Repo: {new URL(task.developmentData.repoLink).pathname.split('/').pop()}
                            </div>
                        )}
                        {task.testingData?.environment && (
                            <div style={{ fontSize: '0.75rem', color: '#ec4899', display: 'flex', alignItems: 'center', gap: '4px', background: '#fdf2f8', padding: '2px 8px', borderRadius: '4px' }}>
                                <AlertCircle size={12} /> Env: {task.testingData.environment}
                            </div>
                        )}
                        {task.devOpsData?.riskLevel && (
                            <div style={{ fontSize: '0.75rem', color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '4px', background: '#ecfeff', padding: '2px 8px', borderRadius: '4px' }}>
                                <AlertTriangle size={12} /> Risk: {task.devOpsData.riskLevel}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    style={{ height: '100%', background: activeCategoryColor }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {progress}% Complete
                                    {task.bugReports && task.bugReports.length > 0 && <span style={{ color: '#ef4444', marginLeft: '10px' }}>• {task.bugReports.length} Issues</span>}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Premium Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: isMobile ? '10px' : '2rem'
                        }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setShowModal(false);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            style={{
                                width: '100%',
                                maxWidth: '1000px',
                                height: '85vh',
                                background: 'var(--bg-primary)',
                                borderRadius: '24px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                padding: '1.5rem 2rem',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'var(--bg-secondary)',
                                flexWrap: 'wrap',
                                gap: '1rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                    <div style={{
                                        background: activeCategoryGradient,
                                        width: '40px', height: '40px',
                                        borderRadius: '12px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.2rem', color: 'white',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                    }}>
                                        {activeCategoryIcon}
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.3rem' }}>{task.title}</h2>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>{task.category || 'GENERAL'} WORKFLOW</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {/* Assignment Control (Owner Only) */}
                                    {isOwner ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assign To:</span>
                                            <select
                                                value={task.assigneeId || ""}
                                                onChange={async (e) => {
                                                    const newAssigneeId = e.target.value;

                                                    // Optimistic update - update UI immediately
                                                    if (onAssign) {
                                                        onAssign(task.id, newAssigneeId);
                                                    }

                                                    // Sync with server in background (already handled by onAssign)
                                                }}
                                                style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.9rem', outline: 'none', cursor: 'pointer', maxWidth: '150px' }}
                                            >
                                                <option value="">Unassigned</option>
                                                {teamMembers.length > 0 ? (
                                                    teamMembers.map(member => (
                                                        <option key={member.user.id} value={member.user.id}>
                                                            {member.user.name}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option disabled value="">No team members loaded</option>
                                                )}
                                            </select>
                                        </div>
                                    ) : (
                                        task.assignee && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 12px', borderRadius: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 600 }}>
                                                    {task.assignee.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{task.assignee.name}</span>
                                            </div>
                                        )
                                    )}

                                    <button
                                        onClick={() => setShowModal(false)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        className="hover-bg-secondary"
                                    >
                                        <ChevronDown size={24} style={{ transform: 'rotate(180deg)', color: 'var(--text-secondary)' }} />
                                    </button>
                                </div>
                            </div>

                            {/* Toolbar (Credentials & Actions) */}
                            <div style={{
                                padding: '1rem 2rem',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                background: 'rgba(var(--primary-rgb), 0.02)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '1rem' }}>

                                    {/* Action Buttons */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isMobile ? '6px' : '10px',
                                        flexWrap: 'wrap',
                                        width: '100%'
                                    }}>
                                        {/* Delete Button - Only for owners/creators */}
                                        {(isOwner || task.creatorId === currentUser?.id) && onDelete && (
                                            <button
                                                className="btn btn-outline btn-sm"
                                                onClick={() => {
                                                    setConfirmAction({
                                                        title: 'Delete Task',
                                                        message: 'Are you sure you want to delete this task? This will permanently remove all subtasks and bug reports associated with it.',
                                                        onConfirm: () => onDelete(task.id)
                                                    });
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    color: 'var(--danger)',
                                                    borderColor: 'var(--danger)',
                                                    background: 'rgba(239, 68, 68, 0.05)',
                                                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                                                    padding: isMobile ? '6px 12px' : '8px 16px'
                                                }}
                                            >
                                                <Trash2 size={16} /> Delete
                                            </button>
                                        )}

                                        <button
                                            className={`btn ${showAttachments ? 'btn-primary' : 'btn-outline'} btn-sm`}
                                            onClick={() => setShowAttachments(!showAttachments)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                fontSize: isMobile ? '0.75rem' : '0.85rem',
                                                padding: isMobile ? '6px 12px' : '8px 16px'
                                            }}
                                        >
                                            <Paperclip size={16} /> {task.attachments?.length || 0} Attachments
                                        </button>

                                        {task.developmentData?.repoLink && (
                                            <a
                                                href={task.developmentData.repoLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-outline btn-sm"
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none',
                                                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                                                    padding: isMobile ? '6px 12px' : '8px 16px'
                                                }}
                                            >
                                                <FileText size={16} /> Repo
                                            </a>
                                        )}
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => setShowSubmission(!showSubmission)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                fontSize: isMobile ? '0.75rem' : '0.85rem',
                                                padding: isMobile ? '6px 12px' : '8px 16px'
                                            }}
                                        >
                                            <CheckCircle size={16} /> {task.submission ? 'Update' : 'Submit'}
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => setShowBugForm(true)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
                                                fontSize: isMobile ? '0.75rem' : '0.85rem',
                                                padding: isMobile ? '6px 12px' : '8px 16px'
                                            }}
                                        >
                                            <Bug size={16} /> Report Bug
                                        </button>
                                        {credentialsList && credentialsList.length > 0 && (
                                            <button
                                                className={`btn ${showCredentials ? 'btn-primary' : 'btn-outline'} btn-sm`}
                                                onClick={() => setShowCredentials(!showCredentials)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
                                                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                                                    padding: isMobile ? '6px 12px' : '8px 16px'
                                                }}
                                            >
                                                <FileText size={16} /> {showCredentials ? 'Hide' : 'Show'} Credentials
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Submission Panel */}
                                <AnimatePresence>
                                    {showSubmission && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ padding: '1.5rem 2rem', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', overflow: 'hidden' }}
                                        >
                                            <div style={{ maxWidth: '600px' }}>
                                                <h4 style={{ margin: '0 0 10px 0', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <CheckCircle size={18} /> Deliverable Submission
                                                </h4>
                                                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#16a34a' }}>
                                                    Provide the finished work link (PR, Vercel, Figma) or a summary of completion.
                                                </p>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        placeholder="Paste your link or confirmation here..."
                                                        value={submissionText}
                                                        onChange={(e) => setSubmissionText(e.target.value)}
                                                        style={{ flex: 1, borderColor: '#86efac' }}
                                                    />
                                                    <button
                                                        className="btn btn-success"
                                                        onClick={handleSubmission}
                                                        disabled={isSubmitting}
                                                    >
                                                        {isSubmitting ? 'Saving...' : 'Submit'}
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Attachments Panel */}
                                <AnimatePresence>
                                    {showAttachments && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ overflow: 'hidden', borderTop: '1px dashed var(--border-color)', marginTop: '1rem', paddingTop: '1rem' }}
                                        >
                                            <AttachmentManager
                                                taskId={task.id}
                                                attachments={task.attachments || []}
                                                readOnly={!isOwner && !task.assignee} // Allow owner or assignee to upload
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Collapsible Credentials Section */}
                                <AnimatePresence>
                                    {showCredentials && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div style={{
                                                display: 'flex', gap: '10px', flexWrap: 'wrap',
                                                paddingTop: '0.5rem', paddingBottom: '0.5rem',
                                                borderTop: '1px dashed var(--border-color)'
                                            }}>
                                                {credentialsList.map((cred, idx) => (
                                                    <div key={idx} style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        background: 'var(--bg-primary)', padding: '8px 16px',
                                                        borderRadius: '10px', border: '1px solid var(--border-color)',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                                                    }}>
                                                        {cred.role && (
                                                            <span className="badge badge-sm" style={{ marginRight: '5px' }}>{cred.role}</span>
                                                        )}
                                                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ color: 'var(--text-secondary)' }}>Email:</span>
                                                                <strong style={{ fontFamily: 'monospace' }}>{cred.email}</strong>
                                                                <button onClick={() => copyToClipboard(cred.email)} className="icon-btn-sm"><Copy size={12} /></button>
                                                            </div>
                                                            {cred.password && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                                    <span style={{ color: 'var(--text-secondary)' }}>Pass:</span>
                                                                    <strong style={{ fontFamily: 'monospace' }}>{cred.password}</strong>
                                                                    <button onClick={() => copyToClipboard(cred.password)} className="icon-btn-sm"><Copy size={12} /></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Modal Body */}
                            <div style={{
                                display: 'flex',
                                flexDirection: isMobile ? 'column' : 'row',
                                flex: 1,
                                overflow: 'hidden'
                            }}>
                                {/* Sidebar (Modules) */}
                                <div style={{
                                    width: isMobile ? '100%' : '260px',
                                    borderRight: isMobile ? 'none' : '1px solid var(--border-color)',
                                    borderBottom: isMobile ? '1px solid var(--border-color)' : 'none',
                                    background: 'var(--bg-secondary)',
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: isMobile ? 'row' : 'column',
                                    padding: '1rem',
                                    gap: '8px'
                                }}>
                                    {modules.map((mod, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveModule(idx)}
                                            style={{
                                                textAlign: 'left',
                                                padding: '12px 16px',
                                                background: activeModule === idx ? 'var(--bg-primary)' : 'transparent',
                                                borderRadius: '8px',
                                                border: '1px solid',
                                                borderColor: activeModule === idx ? 'var(--border-color)' : 'transparent',
                                                cursor: 'pointer',
                                                fontWeight: activeModule === idx ? 600 : 400,
                                                color: activeModule === idx ? 'var(--primary)' : 'var(--text-secondary)',
                                                transition: 'all 0.2s',
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                minWidth: isMobile ? '200px' : 'auto',
                                                boxShadow: activeModule === idx ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                            }}
                                        >
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' }}>{mod.module}</span>
                                            {!isMobile && activeModule === idx && <ChevronRight size={16} />}
                                        </button>
                                    ))}
                                </div>

                                {/* Main Content (Test Cases) */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', background: 'var(--bg-primary)' }}>
                                    {/* Subtask Management Section */}

                                    {task.bugReports && task.bugReports.length > 0 && (
                                        <div style={{ marginBottom: '2rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1rem' }}>
                                            <h4 style={{ color: '#b91c1c', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <AlertCircle size={18} /> Bug Reports ({task.bugReports.length})
                                            </h4>

                                            {(task.bugReports || []).length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#b91c1c', opacity: 0.6 }}>
                                                    <Bug size={32} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                                                    <div style={{ fontSize: '0.85rem' }}>No issues reported yet.</div>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {task.bugReports.map(bug => {
                                                        const reporterName = bug.reporter?.name || bug.creator?.name || 'Unknown';
                                                        return (
                                                            <button
                                                                key={bug.id}
                                                                onClick={() => setSelectedBug(bug)}
                                                                style={{
                                                                    width: '100%', textAlign: 'left',
                                                                    background: 'white', border: '1px solid #fecaca',
                                                                    padding: '12px 14px', borderRadius: '10px',
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                                    color: '#991b1b', fontSize: '0.9rem',
                                                                    boxShadow: '0 2px 4px rgba(153, 27, 27, 0.05)'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background = '#fff5f5';
                                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background = 'white';
                                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        {bug.title.replace('[BUG]', '').replace(`Issue in ${task.title}:`, '').replace(`${task.title}:`, '').trim() || bug.title}
                                                                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c', fontWeight: 600 }}>
                                                                            {bug.severity || 'Medium'}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <div style={{ width: '14px', height: '14px', background: '#cbd5e1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: 'white' }}>
                                                                            {reporterName.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        Reported by {reporterName}
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span className="badge badge-sm" style={{
                                                                        background: bug.status === 'RESOLVED' ? '#dcfce7' : bug.status === 'IN_PROGRESS' ? '#fef3c7' : '#fecaca',
                                                                        color: bug.status === 'RESOLVED' ? '#14532d' : bug.status === 'IN_PROGRESS' ? '#92400e' : '#991b1b',
                                                                        border: 'none',
                                                                        fontWeight: 700
                                                                    }}>
                                                                        {bug.status}
                                                                    </span>
                                                                    <ChevronRight size={14} style={{ opacity: 0.5 }} />
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {modules[activeModule] && (
                                        <motion.div
                                            key={activeModule}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '4px', letterSpacing: '1px' }}>Module</div>
                                                <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-primary)' }}>
                                                    {modules[activeModule].module}
                                                </h2>
                                                {modules[activeModule].page && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                                        <Info size={16} /> Page: <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>{modules[activeModule].page}</code>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {((modules[activeModule].tasks || modules[activeModule].test_cases || []).length === 0) ? (
                                                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                                                        <CheckSquare size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                                        <p style={{ margin: 0, fontSize: '0.95rem' }}>No items in this module yet.</p>
                                                    </div>
                                                ) : (modules[activeModule].tasks || modules[activeModule].test_cases || []).map((item, cIdx) => {
                                                    const isSubTask = modules[activeModule].matchSubTasks;
                                                    const label = isSubTask ? item.title : item;
                                                    const canToggle = isSubTask ? (isOwner || (item.assignee?.id === currentUser?.id)) : true;

                                                    // For subtasks, check status. For regular items, check local state.
                                                    const isChecked = isSubTask
                                                        ? item.status === 'COMPLETED'
                                                        : checkedItems[`${activeModule}-${cIdx}`];

                                                    return (
                                                        <motion.div
                                                            key={`${activeModule}-${cIdx}`}
                                                            whileHover={{ scale: 1.01, background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(var(--primary-rgb), 0.03)' }}
                                                            whileTap={{ scale: 0.99 }}
                                                            onClick={() => {
                                                                if (isSubTask) {
                                                                    if (canToggle) {
                                                                        const newStatus = item.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
                                                                        handleUpdateSubtask(item.id, { status: newStatus });
                                                                    } else {
                                                                        toast.info("Only the assignee or owner can toggle this subtask", { autoClose: 2000 });
                                                                    }
                                                                } else {
                                                                    handleCheck(activeModule, cIdx);
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '1.2rem',
                                                                borderRadius: '12px',
                                                                border: isChecked ? '2px solid #10b981' : '1px solid var(--border-color)',
                                                                background: isChecked ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)' : 'var(--bg-primary)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '16px',
                                                                cursor: (isSubTask && !canToggle) ? 'default' : 'pointer',
                                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                boxShadow: isChecked
                                                                    ? '0 4px 12px rgba(16, 185, 129, 0.15)'
                                                                    : '0 2px 8px rgba(0,0,0,0.04)',
                                                                transform: isChecked ? 'translateX(4px)' : 'translateX(0)'
                                                            }}
                                                        >
                                                            <motion.div
                                                                style={{
                                                                    width: '28px', height: '28px',
                                                                    borderRadius: '8px',
                                                                    border: isChecked ? 'none' : '2px solid #cbd5e1',
                                                                    background: isChecked ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'white',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    flexShrink: 0,
                                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                    boxShadow: isChecked ? '0 2px 8px rgba(16, 185, 129, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)'
                                                                }}
                                                                animate={{
                                                                    scale: isChecked ? [1, 1.1, 1] : 1,
                                                                    rotate: isChecked ? [0, 5, -5, 0] : 0
                                                                }}
                                                                transition={{ duration: 0.4 }}
                                                            >
                                                                {isChecked ? (
                                                                    <motion.div
                                                                        initial={{ scale: 0, opacity: 0 }}
                                                                        animate={{ scale: 1, opacity: 1 }}
                                                                        transition={{ delay: 0.1, duration: 0.2 }}
                                                                    >
                                                                        <Check size={18} color="white" strokeWidth={3} />
                                                                    </motion.div>
                                                                ) : syncingSubtasks.has(item.id) && (
                                                                    <motion.div
                                                                        animate={{ rotate: 360 }}
                                                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                                    >
                                                                        <Loader2 size={16} color="#94a3b8" />
                                                                    </motion.div>
                                                                )}
                                                            </motion.div>

                                                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <motion.span
                                                                    style={{
                                                                        color: isChecked ? 'var(--text-secondary)' : 'var(--text-primary)',
                                                                        textDecoration: isChecked ? 'line-through' : 'none',
                                                                        fontWeight: isChecked ? 400 : 600,
                                                                        fontSize: '1.05rem',
                                                                        lineHeight: '1.5'
                                                                    }}
                                                                    animate={{
                                                                        opacity: isChecked ? 0.7 : 1
                                                                    }}
                                                                    transition={{ duration: 0.3 }}
                                                                >
                                                                    {label}
                                                                </motion.span>

                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    {/* Assignee for Subtasks */}
                                                                    {isSubTask && item.assignee && (
                                                                        <div title={`Assigned to ${item.assignee.name}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                                                                {item.assignee.name.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{item.assignee.name.split(' ')[0]}</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Subtask Delete - Only show for owners */}
                                                                    {isSubTask && isOwner && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteSubtask(item.id);
                                                                            }}
                                                                            style={{
                                                                                background: '#fee2e2',
                                                                                border: 'none',
                                                                                borderRadius: '6px',
                                                                                padding: '6px',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                transition: 'background 0.2s'
                                                                            }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}
                                                                        >
                                                                            <Trash2 size={14} color="#ef4444" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bug Details Modal */}
            <AnimatePresence>
                {selectedBug && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(5px)',
                            zIndex: 1200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setSelectedBug(null);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            style={{
                                width: '100%', maxWidth: '700px',
                                maxHeight: '90vh', overflowY: 'auto',
                                background: 'white', borderRadius: '16px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                display: 'flex', flexDirection: 'column'
                            }}
                        >
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', background: '#fee2e2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                        <Bug size={18} />
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Bug Details</h2>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{selectedBug.title.replace('[BUG]', '').trim()}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {task.bugReports && task.bugReports.length > 1 && (
                                        <div style={{ display: 'flex', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', marginRight: '1rem' }}>
                                            <button
                                                disabled={task.bugReports.findIndex(b => b.id === selectedBug.id) === 0}
                                                onClick={() => {
                                                    const idx = task.bugReports.findIndex(b => b.id === selectedBug.id);
                                                    if (idx > 0) setSelectedBug(task.bugReports[idx - 1]);
                                                }}
                                                style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', opacity: task.bugReports.findIndex(b => b.id === selectedBug.id) === 0 ? 0.3 : 1 }}
                                            >
                                                <ChevronLeft size={20} />
                                            </button>
                                            <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                                            <button
                                                disabled={task.bugReports.findIndex(b => b.id === selectedBug.id) === task.bugReports.length - 1}
                                                onClick={() => {
                                                    const idx = task.bugReports.findIndex(b => b.id === selectedBug.id);
                                                    if (idx < task.bugReports.length - 1) setSelectedBug(task.bugReports[idx + 1]);
                                                }}
                                                style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', opacity: task.bugReports.findIndex(b => b.id === selectedBug.id) === task.bugReports.length - 1 ? 0.3 : 1 }}
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                    )}
                                    <button onClick={() => setSelectedBug(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%' }} className="hover-bg-gray">
                                        <ChevronDown size={20} style={{ transform: 'rotate(180deg)' }} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ padding: '2rem' }}>
                                {(() => {
                                    const details = parseBugDescription(selectedBug);
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Severity</label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{
                                                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600,
                                                            background: details.severity === 'Critical' ? '#fee2e2' : details.severity === 'High' ? '#ffedd5' : '#e0f2fe',
                                                            color: details.severity === 'Critical' ? '#b91c1c' : details.severity === 'High' ? '#c2410c' : '#0369a1'
                                                        }}>
                                                            {details.severity || 'Medium'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Environment</label>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#334155' }}>{details.browser || 'Unknown'}</div>
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                                                    <FileText size={16} /> Description
                                                </label>
                                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>
                                                    {details.description || 'No description provided.'}
                                                </div>
                                            </div>

                                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
                                                <div style={{ marginBottom: '1.5rem' }}>
                                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Steps to Reproduce</label>
                                                    <div style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>{details.steps || 'N/A'}</div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                                                    <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#047857', marginBottom: '4px' }}>
                                                            <Check size={14} /> Expected
                                                        </label>
                                                        <div style={{ fontSize: '0.9rem', color: '#064e3b' }}>{details.expected || 'N/A'}</div>
                                                    </div>
                                                    <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#b91c1c', marginBottom: '4px' }}>
                                                            <AlertCircle size={14} /> Actual
                                                        </label>
                                                        <div style={{ fontSize: '0.9rem', color: '#7f1d1d' }}>{details.actual || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                                <button
                                    onClick={() => setSelectedBug(null)}
                                    style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 600, cursor: 'pointer', color: '#475569' }}
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        window.open(`/tasks`, '_blank');
                                    }}
                                    style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Open in Tasks
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bug Report Form */}
            <BugReportForm
                isOpen={showBugForm}
                onClose={() => setShowBugForm(false)}
                parentTaskId={task.id}
                parentTaskTitle={task.title}
                teamId={task.teamId}
                onSuccess={() => {
                    // Refresh the task data to include the new bug report
                    setShowModal(false);
                    setShowBugForm(false);

                    // Call the parent's refresh function if provided
                    if (onRefresh) {
                        onRefresh();
                    }
                }}
            />
            {/* Custom Confirmation Modal */}
            <AnimatePresence>
                {confirmAction && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                            zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                        }}
                        onClick={() => setConfirmAction(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                width: '100%', maxWidth: '400px', background: 'white', borderRadius: '16px',
                                padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                                textAlign: 'center'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{
                                width: '56px', height: '56px', background: '#fee2e2', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.5rem', color: '#ef4444'
                            }}>
                                <AlertTriangle size={32} />
                            </div>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', color: '#111827' }}>{confirmAction.title}</h3>
                            <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.95rem' }}>{confirmAction.message}</p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setConfirmAction(null)}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db',
                                        background: 'white', fontWeight: 600, cursor: 'pointer', color: '#374151'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        confirmAction.onConfirm();
                                        setConfirmAction(null);
                                    }}
                                    style={{
                                        flex: 2, padding: '10px', borderRadius: '8px', border: 'none',
                                        background: '#ef4444', color: 'white', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    Confirm Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default SmartTaskCard;

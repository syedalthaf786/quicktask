import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    ChevronLeft
} from 'lucide-react';
import { toast } from 'react-toastify';

const SmartTaskCard = ({ task, onReportBug, relatedBugs = [], teamMembers = [], onAssign, currentUser }) => {
    const [showModal, setShowModal] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [checkedItems, setCheckedItems] = useState({});
    const [activeModule, setActiveModule] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showCredentials, setShowCredentials] = useState(false); // Collapsed by default
    const [selectedBug, setSelectedBug] = useState(null);

    const parseBugDescription = (desc) => {
        if (!desc) return {};
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
            if (task.description && task.description.startsWith('{')) {
                const data = JSON.parse(task.description);
                setParsedData(data);
                const savedProgress = localStorage.getItem(`task-progress-${task.id}`);
                if (savedProgress) {
                    setCheckedItems(JSON.parse(savedProgress));
                }
            }
        } catch (e) {
            console.error("Failed to parse task description", e);
        }
    }, [task]);

    const handleCheck = (moduleIndex, caseIndex) => {
        const key = `${moduleIndex}-${caseIndex}`;
        const newChecked = { ...checkedItems, [key]: !checkedItems[key] };
        setCheckedItems(newChecked);
        localStorage.setItem(`task-progress-${task.id}`, JSON.stringify(newChecked));
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    // Normalize modules (handle both testing_modules and data_seeding_tasks)
    const modules = parsedData ? (parsedData.testing_modules || parsedData.data_seeding_tasks || []) : [];

    // Normalize credentials (array or object)
    const credentialsList = parsedData?.credentials
        ? (Array.isArray(parsedData.credentials) ? parsedData.credentials : [parsedData.credentials])
        : [];

    const calculateProgress = () => {
        if (!modules.length) return 0;
        let total = 0;
        let checked = 0;
        modules.forEach((mod, mIdx) => {
            const tasks = mod.test_cases || mod.tasks || []; // Handle 'tasks' field in data seeding
            tasks.forEach((_, cIdx) => {
                total++;
                if (checkedItems[`${mIdx}-${cIdx}`]) checked++;
            });
        });
        return total === 0 ? 0 : Math.round((checked / total) * 100);
    };

    // Safely get progress
    const progress = calculateProgress();
    const priorityColors = {
        HIGH: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
        MEDIUM: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        LOW: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    };

    // Fallback if data is invalid
    if (!parsedData) {
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

    const isOwner = currentUser?.email?.toLowerCase().trim() === 'prudvireddy7733@gmail.com';

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
                <div style={{ padding: '1.5rem' }}>
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
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {task.assignee && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '12px' }}>
                                    <div style={{ width: '20px', height: '20px', background: 'var(--primary)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                                        {task.assignee.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{task.assignee.name}</span>
                                </div>
                            )}
                            {relatedBugs.length > 0 && (
                                <div style={{ background: '#fef2f2', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Bug size={14} /> {relatedBugs.length}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    style={{ height: '100%', background: progress === 100 ? '#10b981' : '#3b82f6' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{progress}% Complete</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>View Details →</span>
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
                                        background: priorityColors[task.priority],
                                        width: '12px', height: '12px',
                                        borderRadius: '50%',
                                        boxShadow: '0 0 10px rgba(0,0,0,0.2)'
                                    }} />
                                    <h2 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.3rem' }}>{task.title}</h2>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {/* Assignment Control (Owner Only) */}
                                    {isOwner ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assign To:</span>
                                            <select
                                                value={task.assigneeId || ""}
                                                onChange={(e) => onAssign && onAssign(task.id, e.target.value)}
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
                                                <div style={{ width: '24px', height: '24px', background: 'var(--primary)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11rem', fontWeight: 600 }}>
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

                                    {credentialsList.length > 0 && (
                                        <button
                                            onClick={() => setShowCredentials(!showCredentials)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                background: 'white', border: '1px solid var(--border-color)',
                                                padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                                                color: 'var(--text-primary)', fontWeight: 500,
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            {showCredentials ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            {showCredentials ? 'Hide Credentials' : `Show ${credentialsList.length} Login Credentials`}
                                        </button>
                                    )}

                                    <button
                                        className="btn btn-danger"
                                        onClick={() => onReportBug(task.id, task.title, task.teamId)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
                                    >
                                        <Bug size={18} /> Report Bug
                                    </button>
                                </div>

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
                                    {relatedBugs.length > 0 && (
                                        <div style={{ marginBottom: '2rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1rem' }}>
                                            <h4 style={{ color: '#b91c1c', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <AlertCircle size={18} /> Known Issues ({relatedBugs.length})
                                            </h4>

                                            {Object.entries(relatedBugs.reduce((acc, bug) => {
                                                const name = bug.creator?.name || 'Unknown Reporter';
                                                if (!acc[name]) acc[name] = [];
                                                acc[name].push(bug);
                                                return acc;
                                            }, {})).map(([reporterName, bugs]) => (
                                                <div key={reporterName} style={{ marginBottom: '1rem' }}>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <div style={{ width: '18px', height: '18px', background: '#cbd5e1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'white' }}>
                                                            {reporterName.charAt(0).toUpperCase()}
                                                        </div>
                                                        {reporterName}
                                                    </div>
                                                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                                        {bugs.map(bug => (
                                                            <li key={bug.id} style={{ marginBottom: '8px' }}>
                                                                <button
                                                                    onClick={() => setSelectedBug(bug)}
                                                                    style={{
                                                                        width: '100%', textAlign: 'left',
                                                                        background: 'white', border: '1px solid #fecaca',
                                                                        padding: '10px 14px', borderRadius: '8px',
                                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                        cursor: 'pointer', transition: 'all 0.2s',
                                                                        color: '#991b1b', fontSize: '0.9rem',
                                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fff5f5'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                                                >
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontWeight: 600 }}>{bug.title.replace('[BUG]', '').replace(task.title, '').trim() || bug.title}</span>
                                                                        <span style={{ fontSize: '0.75rem', color: '#b91c1c', opacity: 0.8 }}>Click to view details</span>
                                                                    </div>
                                                                    <span className="badge badge-sm" style={{ background: '#fecaca', color: '#991b1b', border: 'none' }}>{bug.status}</span>
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
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
                                                {(modules[activeModule].test_cases || modules[activeModule].tasks || []).map((testCase, cIdx) => {
                                                    const isChecked = checkedItems[`${activeModule}-${cIdx}`];
                                                    return (
                                                        <motion.div
                                                            key={cIdx}
                                                            whileHover={{ scale: 1.01 }}
                                                            whileTap={{ scale: 0.99 }}
                                                            onClick={() => handleCheck(activeModule, cIdx)}
                                                            style={{
                                                                padding: '1.2rem',
                                                                borderRadius: '12px',
                                                                border: isChecked ? '1px solid var(--success)' : '1px solid var(--border-color)',
                                                                background: isChecked ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-primary)',
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                gap: '16px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                boxShadow: isChecked ? 'none' : '0 2px 4px rgba(0,0,0,0.02)'
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: '24px', height: '24px',
                                                                borderRadius: '8px',
                                                                border: isChecked ? 'none' : '2px solid #cbd5e1',
                                                                background: isChecked ? 'var(--success)' : 'white',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                flexShrink: 0,
                                                                marginTop: '2px', // Align with text top
                                                                transition: 'all 0.2s'
                                                            }}>
                                                                {isChecked && <Check size={16} color="white" strokeWidth={3} />}
                                                            </div>
                                                            <span style={{
                                                                flex: 1,
                                                                color: isChecked ? 'var(--text-secondary)' : 'var(--text-primary)',
                                                                textDecoration: isChecked ? 'line-through' : 'none',
                                                                fontWeight: 500,
                                                                fontSize: '1.05rem',
                                                                lineHeight: '1.5'
                                                            }}>
                                                                {testCase}
                                                            </span>
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
                                    {relatedBugs.length > 1 && (
                                        <div style={{ display: 'flex', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', marginRight: '1rem' }}>
                                            <button
                                                disabled={relatedBugs.findIndex(b => b.id === selectedBug.id) === 0}
                                                onClick={() => {
                                                    const idx = relatedBugs.findIndex(b => b.id === selectedBug.id);
                                                    if (idx > 0) setSelectedBug(relatedBugs[idx - 1]);
                                                }}
                                                style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', opacity: relatedBugs.findIndex(b => b.id === selectedBug.id) === 0 ? 0.3 : 1 }}
                                            >
                                                <ChevronLeft size={20} />
                                            </button>
                                            <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                                            <button
                                                disabled={relatedBugs.findIndex(b => b.id === selectedBug.id) === relatedBugs.length - 1}
                                                onClick={() => {
                                                    const idx = relatedBugs.findIndex(b => b.id === selectedBug.id);
                                                    if (idx < relatedBugs.length - 1) setSelectedBug(relatedBugs[idx + 1]);
                                                }}
                                                style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', opacity: relatedBugs.findIndex(b => b.id === selectedBug.id) === relatedBugs.length - 1 ? 0.3 : 1 }}
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
                                    const details = parseBugDescription(selectedBug.description);
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
        </>
    );
};

export default SmartTaskCard;

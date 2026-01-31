import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Upload, Bug, Layout, FileText, CheckCircle, AlertTriangle, Monitor, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import { taskService } from '../services/taskService';

const BugReportForm = ({ isOpen, onClose, teamId, onSuccess, parentTaskId, parentTaskTitle }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: parentTaskTitle ? `Issue in ${parentTaskTitle}: ` : '',
        description: '',
        stepsToReproduce: '',
        expectedResult: '',
        actualResult: '',
        severity: 'Medium',
        browser: 'Chrome 120',
        priority: 'MEDIUM',
    });

    useEffect(() => {
        if (parentTaskTitle && isOpen) {
            setFormData(prev => ({ ...prev, title: `Issue in ${parentTaskTitle}: ` }));
        }
    }, [parentTaskTitle, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const mapSeverityToPriority = (severity) => {
        switch (severity) {
            case 'Critical': return 'HIGH';
            case 'High': return 'HIGH';
            case 'Medium': return 'MEDIUM';
            case 'Low': return 'LOW';
            default: return 'MEDIUM';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const fullDescription = `
**BUG REPORT**
**Severity:** ${formData.severity}
**Browser:** ${formData.browser}
${parentTaskId ? `**Related Task ID:** ${parentTaskId}` : ''}

**Description:**
${formData.description}

**Steps to Reproduce:**
${formData.stepsToReproduce}

**Expected Result:**
${formData.expectedResult}

**Actual Result:**
${formData.actualResult}
            `.trim();

            const taskData = {
                title: `[BUG] ${formData.title}`,
                description: fullDescription,
                priority: mapSeverityToPriority(formData.severity),
                status: 'TODO',
                teamId: teamId,
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
            };

            await taskService.createTask(taskData);
            toast.success('Bug reported successfully!');
            onSuccess && onSuccess();
            onClose();
            // Reset form
            setFormData({
                title: '',
                description: '',
                stepsToReproduce: '',
                expectedResult: '',
                actualResult: '',
                severity: 'Medium',
                browser: 'Chrome 120',
                priority: 'MEDIUM',
            });
        } catch (error) {
            console.error('Error reporting bug:', error);
            toast.error(error.message || 'Failed to report bug');
        } finally {
            setLoading(false);
        }
    };

    const severityColors = {
        Critical: { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
        High: { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
        Medium: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
        Low: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.65)', zIndex: 1100, backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 30, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    style={{
                        width: '100%', maxWidth: '800px', maxHeight: '90vh',
                        background: 'var(--bg-primary)', borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        overflow: 'hidden', display: 'flex', flexDirection: 'column'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '1.5rem 2rem',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'var(--bg-secondary)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)'
                            }}>
                                <Bug size={20} color="white" />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Report Issue</h2>
                                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Found a bug? Help us squash it by providing details below.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent', border: '1px solid transparent',
                                width: '36px', height: '36px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s', color: 'var(--text-tertiary)'
                            }}
                            className="hover-bg-secondary"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Form Body */}
                    <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                        <form onSubmit={handleSubmit}>

                            {/* Title Input */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Bug Report Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Briefly summarize the issue..."
                                    className="form-control"
                                    style={{
                                        width: '100%', padding: '12px 16px', fontSize: '1.1rem',
                                        borderRadius: '12px', border: '1px solid var(--border-color)',
                                        background: 'var(--bg-primary)', fontWeight: 500
                                    }}
                                    autoFocus
                                />
                            </div>

                            {/* Two Col Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                                {/* Severity Selector */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Severity</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {['Critical', 'High', 'Medium', 'Low'].map((level) => (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, severity: level }))}
                                                style={{
                                                    flex: 1, padding: '8px 4px', borderRadius: '8px',
                                                    border: formData.severity === level ? `1px solid ${severityColors[level].color}` : '1px solid var(--border-color)',
                                                    background: formData.severity === level ? severityColors[level].bg : 'var(--bg-primary)',
                                                    color: formData.severity === level ? severityColors[level].color : 'var(--text-secondary)',
                                                    fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Browser Input */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Environment</label>
                                    <div style={{ position: 'relative' }}>
                                        <Monitor size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                        <input
                                            type="text"
                                            name="browser"
                                            value={formData.browser}
                                            onChange={handleChange}
                                            className="form-control"
                                            style={{
                                                width: '100%', padding: '10px 10px 10px 36px',
                                                borderRadius: '10px', border: '1px solid var(--border-color)',
                                                background: 'var(--bg-primary)'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Description */}
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    <FileText size={16} /> Detailed Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Explain the context and what happened..."
                                    rows={3}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: '12px',
                                        border: '1px solid var(--border-color)', background: 'var(--bg-primary)',
                                        resize: 'vertical', minHeight: '80px', fontFamily: 'inherit'
                                    }}
                                />
                            </div>

                            {/* Structured Evidence Section */}
                            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Evidence & Steps</h3>

                                <div style={{ marginBottom: '1.2rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        <Layout size={14} /> Steps to Reproduce
                                    </label>
                                    <textarea
                                        name="stepsToReproduce"
                                        value={formData.stepsToReproduce}
                                        onChange={handleChange}
                                        placeholder="1. Go to page...&#10;2. Click button..."
                                        rows={3}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#059669' }}>
                                            <CheckCircle size={14} /> Expected Behavior
                                        </label>
                                        <textarea
                                            name="expectedResult"
                                            value={formData.expectedResult}
                                            onChange={handleChange}
                                            placeholder="What should have happened..."
                                            rows={2}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #a7f3d0', background: '#ecfdf5', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#dc2626' }}>
                                            <ShieldAlert size={14} /> Actual Behavior
                                        </label>
                                        <textarea
                                            name="actualResult"
                                            value={formData.actualResult}
                                            onChange={handleChange}
                                            placeholder="What actually happened..."
                                            rows={2}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                </div>
                            </div>

                        </form>
                    </div>

                    {/* Footer Actions */}
                    <div style={{
                        padding: '1.2rem 2rem',
                        borderTop: '1px solid var(--border-color)',
                        background: 'var(--bg-primary)',
                        display: 'flex', justifyContent: 'flex-end', gap: '12px'
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-color)',
                                background: 'transparent', fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !formData.title}
                            style={{
                                padding: '10px 24px', borderRadius: '10px', border: 'none',
                                background: 'var(--primary)', color: 'white', fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: '0 4px 6px -1px rgba(var(--primary-rgb), 0.3)'
                            }}
                        >
                            {loading ? 'Submitting...' : <><Bug size={18} /> Submit Bug Report</>}
                        </button>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default BugReportForm;

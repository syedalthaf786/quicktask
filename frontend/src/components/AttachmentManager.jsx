
import React, { useState } from 'react';
import { Trash2, Paperclip, ExternalLink, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { taskService } from '../services/taskService';

const AttachmentManager = ({ taskId, attachments = [], onUpdate, readOnly = false }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [newFileName, setNewFileName] = useState('');

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!newUrl || !newFileName) return;

        setIsUploading(true);
        try {
            // Simulate file type detection or basic logic
            const fileType = newFileName.split('.').pop().toUpperCase() || 'FILE';

            await taskService.addAttachment(taskId, {
                fileName: newFileName,
                url: newUrl,
                fileType,
                fileSize: 1024 // Dummy size
            });

            toast.success('Attachment added');
            setNewUrl('');
            setNewFileName('');
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to add attachment');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (attId) => {
        if (!window.confirm('Delete this attachment?')) return;
        try {
            await taskService.deleteAttachment(taskId, attId);
            toast.success('Attachment deleted');
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to delete attachment');
        }
    };

    return (
        <div className="attachment-manager">
            <h4 className="section-title">
                <Paperclip size={16} /> Attachments ({attachments.length})
            </h4>

            <div className="attachments-list">
                {attachments.map(att => (
                    <div key={att.id} className="attachment-item">
                        <div className="att-info">
                            <span className="att-name">{att.fileName}</span>
                            <span className="att-meta">{att.fileType} • {new Date(att.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="att-actions">
                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Open">
                                <ExternalLink size={14} />
                            </a>
                            {!readOnly && (
                                <button className="btn-icon delete" onClick={() => handleDelete(att.id)} title="Delete">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {attachments.length === 0 && <p className="text-muted">No attachments yet.</p>}
            </div>

            {!readOnly && (
                <form onSubmit={handleUpload} className="upload-form">
                    <input
                        type="text"
                        placeholder="File Name"
                        value={newFileName}
                        onChange={e => setNewFileName(e.target.value)}
                        className="input-sm"
                        required
                    />
                    <input
                        type="url"
                        placeholder="File URL (e.g. Drive/S3 link)"
                        value={newUrl}
                        onChange={e => setNewUrl(e.target.value)}
                        className="input-sm"
                        required
                    />
                    <button type="submit" className="btn btn-secondary btn-sm" disabled={isUploading}>
                        <Plus size={14} /> Add
                    </button>
                </form>
            )}
        </div>
    );
};

export default AttachmentManager;

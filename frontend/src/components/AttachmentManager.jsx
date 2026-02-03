
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

        // Optimistic update - add to UI immediately
        const optimisticAttachment = {
            id: 'temp-' + Date.now(),
            fileName: newFileName,
            url: newUrl,
            fileType: newFileName.split('.').pop().toUpperCase() || 'FILE',
            fileSize: 1024,
            createdAt: new Date().toISOString()
        };

        // Update UI optimistically
        if (onUpdate) {
            onUpdate([...attachments, optimisticAttachment]);
        }

        toast.success('Attachment added');
        setNewUrl('');
        setNewFileName('');

        try {
            await taskService.addAttachment(taskId, {
                fileName: optimisticAttachment.fileName,
                url: optimisticAttachment.url,
                fileType: optimisticAttachment.fileType,
                fileSize: optimisticAttachment.fileSize
            });

            // Refresh with real data
            if (onUpdate) onUpdate();
        } catch (error) {
            // Revert on error
            toast.error('Failed to add attachment');
            if (onUpdate) {
                onUpdate(attachments); // Revert to original
            }
        }
    };

    const handleDelete = async (attId) => {
        if (!window.confirm('Delete this attachment?')) return;

        // Optimistic update - remove from UI immediately
        const attachmentToDelete = attachments.find(att => att.id === attId);
        const updatedAttachments = attachments.filter(att => att.id !== attId);

        if (onUpdate) {
            onUpdate(updatedAttachments);
        }

        toast.success('Attachment deleted');

        try {
            await taskService.deleteAttachment(taskId, attId);
        } catch (error) {
            // Revert on error
            toast.error('Failed to delete attachment');
            if (onUpdate && attachmentToDelete) {
                onUpdate([...updatedAttachments, attachmentToDelete]);
            }
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
                <div className="upload-form">
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
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={isUploading}
                        onClick={handleUpload}
                    >
                        <Plus size={14} /> Add
                    </button>
                </div>
            )}
        </div>
    );
};

export default AttachmentManager;

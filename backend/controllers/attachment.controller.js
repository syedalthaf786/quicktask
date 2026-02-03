const prisma = require('../lib/prisma');
const accessService = require('../services/access.service');

exports.addAttachment = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const { fileName, fileType, fileSize, url } = req.body;
        const userId = req.user.id;

        // Check if user has access to the task
        const taskAccess = await accessService.checkTaskAccess(taskId, userId);
        if (!taskAccess) {
            return res.status(404).json({ success: false, message: 'Task not found or access denied' });
        }

        const attachment = await prisma.attachment.create({
            data: {
                fileName,
                fileType,
                fileSize: parseInt(fileSize),
                url,
                taskId,
                uploadedBy: req.user.id
            }
        });

        // Log history
        await prisma.taskHistory.create({
            data: {
                action: 'UPLOADED',
                fieldName: 'attachment',
                newValue: fileName,
                taskId,
                userId: req.user.id
            }
        });

        res.status(201).json({ success: true, attachment });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteAttachment = async (req, res) => {
    try {
        const { id, taskId } = req.params;
        const userId = req.user.id;

        // Check ownership of attachment
        const att = await prisma.attachment.findUnique({ where: { id } });
        if (!att) return res.status(404).json({ success: false, message: 'Not found' });

        // Check task access
        const taskAccess = await accessService.checkTaskAccess(att.taskId, userId);
        if (!taskAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Allow deletion if uploader, task creator, or team owner
        const isUploader = att.uploadedBy === userId;
        const isTaskCreator = taskAccess.creatorId === userId;

        let isTeamOwner = false;
        if (taskAccess.teamId) {
            const team = await prisma.team.findUnique({ where: { id: taskAccess.teamId } });
            if (team && team.ownerId === userId) isTeamOwner = true;
        }

        if (!isUploader && !isTaskCreator && !isTeamOwner) {
            return res.status(403).json({ success: false, message: 'Unauthorized to delete this attachment' });
        }

        await prisma.attachment.delete({ where: { id } });
        res.status(200).json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

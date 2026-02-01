
const prisma = require('../lib/prisma');

exports.addAttachment = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const { fileName, fileType, fileSize, url } = req.body;

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
        const { id } = req.params;
        // Check ownership
        const att = await prisma.attachment.findUnique({ where: { id } });
        if (!att) return res.status(404).json({ success: false, message: 'Not found' });

        if (att.uploadedBy !== req.user.id) {
            // Allow task owner too? For now strict uploader or admin.
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await prisma.attachment.delete({ where: { id } });
        res.status(200).json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

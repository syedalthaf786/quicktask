
const prisma = require('../lib/prisma');

exports.getTaskHistory = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const history = await prisma.taskHistory.findMany({
            where: { taskId },
            include: {
                user: { select: { name: true, avatar: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

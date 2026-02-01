const prisma = require('../lib/prisma');
const { validationResult } = require('express-validator');

// Helper access check for bug reports
async function checkBugAccess(bugId, userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    
    const bug = await prisma.bugReport.findUnique({ 
        where: { id: bugId },
        include: { task: true }
    });

    if (!bug) return null;

    // Check if user is the reporter, assignee, or has access to the parent task
    if (bug.reporterId === userId || bug.assigneeId === userId) return bug;
    
    // Check task access (reuse existing task access logic)
    const taskAccess = await checkTaskAccess(bug.taskId, userId);
    if (taskAccess) return bug;

    // Check team membership through the task
    if (bug.task.teamId) {
        const member = await prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId: bug.task.teamId, userId } }
        });
        if (member) return bug;
    }

    return null;
}

// Import task access helper
async function checkTaskAccess(taskId, userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (!task) return null;

    // Check if user is the team owner of the task's team
    let isTeamOwner = false;
    if (task.teamId) {
        const team = await prisma.team.findUnique({ where: { id: task.teamId } });
        if (team && team.ownerId === userId) isTeamOwner = true;
    }

    if (isTeamOwner) return task;
    if (task.creatorId === userId || task.assigneeId === userId) return task;

    // Check team membership
    if (task.teamId) {
        const member = await prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId: task.teamId, userId } }
        });
        if (member) return task;
    }

    return null;
}

exports.getBugReports = async (req, res) => {
    try {
        const { taskId, status, severity, search } = req.query;
        const userId = req.user.id;

        let where = {};

        // Filter by task if specified
        if (taskId) {
            // Check if user has access to this task
            const taskAccess = await checkTaskAccess(taskId, userId);
            if (!taskAccess) {
                return res.status(404).json({ success: false, message: 'Task not found or access denied' });
            }
            where.taskId = taskId;
        } else {
            // Get bugs for tasks user has access to
            const accessibleTasks = await prisma.task.findMany({
                where: {
                    OR: [
                        { creatorId: userId },
                        { assigneeId: userId },
                        { team: { members: { some: { userId } } } }
                    ]
                },
                select: { id: true }
            });
            
            const taskIds = accessibleTasks.map(t => t.id);
            where.taskId = { in: taskIds };
        }

        if (status && status !== 'all') where.status = status.toUpperCase().replace(' ', '_');
        if (severity && severity !== 'all') where.severity = severity.toUpperCase();
        if (search) where.title = { contains: search, mode: 'insensitive' };

        const bugs = await prisma.bugReport.findMany({
            where,
            include: {
                task: { select: { id: true, title: true } },
                reporter: { select: { id: true, name: true, email: true, avatar: true } },
                assignee: { select: { id: true, name: true, email: true, avatar: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ success: true, count: bugs.length, bugs });
    } catch (error) {
        console.error('Get bug reports error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getBugReportById = async (req, res) => {
    try {
        const bugId = req.params.id;
        const userId = req.user.id;
        
        const bug = await checkBugAccess(bugId, userId);
        if (!bug) {
            return res.status(404).json({ success: false, message: 'Bug report not found or access denied' });
        }

        const fullBug = await prisma.bugReport.findUnique({
            where: { id: bugId },
            include: {
                task: { select: { id: true, title: true, teamId: true } },
                reporter: { select: { id: true, name: true, email: true, avatar: true } },
                assignee: { select: { id: true, name: true, email: true, avatar: true } }
            }
        });

        res.status(200).json({ success: true, bug: fullBug });
    } catch (error) {
        console.error('Get bug report error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.createBugReport = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { taskId, title, description, severity, environment, steps, expected, actual, priority } = req.body;
        const userId = req.user.id;

        // Check if user has access to the task
        const taskAccess = await checkTaskAccess(taskId, userId);
        if (!taskAccess) {
            return res.status(404).json({ success: false, message: 'Task not found or access denied' });
        }

        const bugData = {
            title: title || `Bug in ${taskAccess.title}`,
            description: description || '',
            severity: severity || 'MEDIUM',
            environment: environment || 'STAGING',
            steps: steps || '',
            expected: expected || '',
            actual: actual || '',
            priority: priority ? priority.toUpperCase() : 'MEDIUM',
            status: 'TODO',
            taskId: taskId,
            reporterId: userId,
            teamId: taskAccess.teamId || null
        };

        const bug = await prisma.bugReport.create({
            data: bugData,
            include: {
                task: { select: { id: true, title: true } },
                reporter: { select: { id: true, name: true, email: true, avatar: true } },
                assignee: { select: { id: true, name: true, email: true, avatar: true } }
            }
        });

        // Create history entry
        await prisma.taskHistory.create({
            data: {
                action: 'CREATED',
                fieldName: 'bug_report',
                newValue: title,
                taskId: taskId,
                userId: userId
            }
        });

        res.status(201).json({ success: true, message: 'Bug report created successfully', bug });
    } catch (error) {
        console.error('Create bug report error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.updateBugReport = async (req, res) => {
    try {
        const bugId = req.params.id;
        const userId = req.user.id;
        
        const bug = await checkBugAccess(bugId, userId);
        if (!bug) {
            return res.status(404).json({ success: false, message: 'Bug report not found or access denied' });
        }

        const updateData = {};
        const allowedFields = ['title', 'description', 'severity', 'environment', 'steps', 'expected', 'actual', 'resolutionNotes', 'status', 'priority', 'assigneeId'];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        // Handle status changes and resolution tracking
        if (updateData.status === 'COMPLETED') {
            updateData.resolvedAt = new Date();
        } else if (updateData.status && updateData.status !== 'COMPLETED' && bug.status === 'COMPLETED') {
            updateData.resolvedAt = null;
        }

        const updatedBug = await prisma.bugReport.update({
            where: { id: bugId },
            data: updateData,
            include: {
                task: { select: { id: true, title: true } },
                reporter: { select: { id: true, name: true, email: true, avatar: true } },
                assignee: { select: { id: true, name: true, email: true, avatar: true } }
            }
        });

        // Log history for status change
        if (updateData.status && updateData.status !== bug.status) {
            await prisma.taskHistory.create({
                data: {
                    action: 'UPDATED',
                    fieldName: 'bug_status',
                    oldValue: bug.status,
                    newValue: updateData.status,
                    taskId: bug.taskId,
                    userId: userId
                }
            });
        }

        res.status(200).json({ success: true, bug: updatedBug });
    } catch (error) {
        console.error('Update bug report error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.deleteBugReport = async (req, res) => {
    try {
        const bugId = req.params.id;
        const userId = req.user.id;
        
        const bug = await checkBugAccess(bugId, userId);
        if (!bug) {
            return res.status(404).json({ success: false, message: 'Bug report not found or access denied' });
        }

        // Only reporter or task creator/team owner can delete
        const isReporter = bug.reporterId === userId;
        const taskAccess = await checkTaskAccess(bug.taskId, userId);
        const isTaskOwner = taskAccess && (taskAccess.creatorId === userId || 
                          (taskAccess.teamId && (await prisma.team.findUnique({ 
                              where: { id: taskAccess.teamId } 
                          })).ownerId === userId));

        if (!isReporter && !isTaskOwner) {
            return res.status(403).json({ success: false, message: 'Unauthorized to delete this bug report' });
        }

        await prisma.bugReport.delete({ where: { id: bugId } });
        
        res.status(200).json({ success: true, message: 'Bug report deleted successfully' });
    } catch (error) {
        console.error('Delete bug report error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
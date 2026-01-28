const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/tasks
// @desc    Get all tasks for current user with filtering, sorting, and search
// @access  Private
router.get('/', async (req, res) => {
    try {
        const { status, priority, search, sortBy, order } = req.query;

        // Build where clause
        const where = {
            userId: req.user.id
        };

        // Filter by status
        if (status && status !== 'all') {
            where.status = status.toUpperCase().replace(' ', '_');
        }

        // Filter by priority
        if (priority && priority !== 'all') {
            where.priority = priority.toUpperCase();
        }

        // Search by title
        if (search) {
            where.title = {
                contains: search,
                mode: 'insensitive'
            };
        }

        // Build order by
        let orderBy = {};
        if (sortBy) {
            orderBy[sortBy] = order === 'asc' ? 'asc' : 'desc';
        } else {
            orderBy.createdAt = 'desc';
        }

        // Execute query
        const tasks = await prisma.task.findMany({
            where,
            orderBy
        });

        res.status(200).json({
            success: true,
            count: tasks.length,
            tasks
        });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/tasks/stats/summary
// @desc    Get task statistics for current user
// @access  Private
router.get('/stats/summary', async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all tasks for aggregation
        const tasks = await prisma.task.findMany({
            where: { userId }
        });

        // Calculate statistics
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'COMPLETED').length;
        const pending = total - completed;
        const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
        const todo = tasks.filter(t => t.status === 'TODO').length;

        // Priority distribution
        const priorityDistribution = {
            Low: tasks.filter(t => t.priority === 'LOW').length,
            Medium: tasks.filter(t => t.priority === 'MEDIUM').length,
            High: tasks.filter(t => t.priority === 'HIGH').length
        };

        // Completion rate
        const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

        // Overdue tasks
        const now = new Date();
        const overdue = tasks.filter(t =>
            t.status !== 'COMPLETED' && new Date(t.dueDate) < now
        ).length;

        res.status(200).json({
            success: true,
            stats: {
                total,
                completed,
                pending,
                inProgress,
                todo,
                overdue,
                completionRate: parseFloat(completionRate),
                priorityDistribution
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/tasks/analytics/productivity
// @desc    Get productivity analysis for current user
// @access  Private
router.get('/analytics/productivity', async (req, res) => {
    try {
        const { period = '7days' } = req.query;
        const userId = req.user.id;

        // Calculate date range
        const now = new Date();
        let startDate;

        switch (period) {
            case '7days':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30days':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90days':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(2000, 0, 1); // Very old date to get all tasks
        }

        // Get completed tasks in period
        const completedTasks = await prisma.task.findMany({
            where: {
                userId,
                status: 'COMPLETED',
                completedAt: { gte: startDate }
            },
            orderBy: { completedAt: 'asc' }
        });

        // Create daily completion map
        const dailyCompletions = {};
        for (const task of completedTasks) {
            const dateKey = new Date(task.completedAt).toISOString().split('T')[0];
            if (!dailyCompletions[dateKey]) {
                dailyCompletions[dateKey] = {
                    count: 0,
                    priorities: { Low: 0, Medium: 0, High: 0 }
                };
            }
            dailyCompletions[dateKey].count += 1;
            dailyCompletions[dateKey].priorities[task.priority.toLowerCase().charAt(0).toUpperCase() + task.priority.slice(1).toLowerCase()] += 1;
        }

        // Convert to sorted array
        const completionTimeline = Object.entries(dailyCompletions)
            .map(([date, data]) => ({
                date,
                count: data.count,
                priorities: data.priorities
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Calculate insights
        const totalCompleted = completedTasks.length;

        let peakDay = null;
        let avgDailyCompletions = 0;

        if (completionTimeline.length > 0) {
            // Find peak productivity day
            peakDay = completionTimeline.reduce((max, day) =>
                day.count > max.count ? day : max
            , completionTimeline[0]);

            avgDailyCompletions = parseFloat(
                (totalCompleted / completionTimeline.length).toFixed(1)
            );
        }

        // Calculate trend
        let trend = 'insufficient_data';
        if (completionTimeline.length >= 2) {
            const recentTasks = completionTimeline.slice(-3);
            const olderTasks = completionTimeline.slice(0, 3);

            const recentAvg = recentTasks.reduce((sum, d) => sum + d.count, 0) / recentTasks.length;
            const olderAvg = olderTasks.reduce((sum, d) => sum + d.count, 0) / olderTasks.length;

            if (recentAvg > olderAvg * 1.2) {
                trend = 'increasing';
            } else if (recentAvg < olderAvg * 0.8) {
                trend = 'decreasing';
            } else {
                trend = 'stable';
            }
        }

        // Priority breakdown
        const priorityBreakdown = {
            Low: completedTasks.filter(t => t.priority === 'LOW').length,
            Medium: completedTasks.filter(t => t.priority === 'MEDIUM').length,
            High: completedTasks.filter(t => t.priority === 'HIGH').length
        };

        res.status(200).json({
            success: true,
            period,
            analysis: {
                totalCompletedInPeriod: totalCompleted,
                avgDailyCompletions,
                trend,
                peakProductivityDay: peakDay,
                completionTimeline,
                priorityBreakdown
            }
        });
    } catch (error) {
        console.error('Get productivity error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/tasks/:id
// @desc    Get single task
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const task = await prisma.task.findFirst({
            where: {
                id: parseInt(req.params.id),
                userId: req.user.id
            }
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        res.status(200).json({
            success: true,
            task
        });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   POST /api/tasks
// @desc    Create new task
// @access  Private
router.post('/', [
    body('title').trim().notEmpty().withMessage('Title is required')
        .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('description').optional().isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('priority').optional().isIn(['Low', 'Medium', 'High'])
        .withMessage('Priority must be Low, Medium, or High'),
    body('status').optional().isIn(['Todo', 'In Progress', 'Completed'])
        .withMessage('Status must be Todo, In Progress, or Completed'),
    body('dueDate').notEmpty().withMessage('Due date is required')
        .isISO8601().withMessage('Due date must be a valid date')
], async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { title, description, priority, status, dueDate } = req.body;

        // Map frontend values to database enum values
        const priorityMap = { Low: 'LOW', Medium: 'MEDIUM', High: 'HIGH' };
        const statusMap = { Todo: 'TODO', 'In Progress': 'IN_PROGRESS', Completed: 'COMPLETED' };

        // Create task
        const task = await prisma.task.create({
            data: {
                title,
                description,
                priority: priority ? priorityMap[priority] : 'MEDIUM',
                status: status ? statusMap[status] : 'TODO',
                dueDate: new Date(dueDate),
                userId: req.user.id
            }
        });

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            task
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put('/:id', [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty')
        .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('description').optional().isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('priority').optional().isIn(['Low', 'Medium', 'High'])
        .withMessage('Priority must be Low, Medium, or High'),
    body('status').optional().isIn(['Todo', 'In Progress', 'Completed'])
        .withMessage('Status must be Todo, In Progress, or Completed'),
    body('dueDate').optional().isISO8601().withMessage('Due date must be a valid date')
], async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        // Find task
        const existingTask = await prisma.task.findFirst({
            where: {
                id: parseInt(req.params.id),
                userId: req.user.id
            }
        });

        if (!existingTask) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const { title, description, priority, status, dueDate } = req.body;

        // Map frontend values to database enum values
        const priorityMap = { Low: 'LOW', Medium: 'MEDIUM', High: 'HIGH' };
        const statusMap = { Todo: 'TODO', 'In Progress': 'IN_PROGRESS', Completed: 'COMPLETED' };

        // Build update data
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (priority !== undefined) updateData.priority = priorityMap[priority];
        if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);

        // Handle status change
        if (status !== undefined) {
            updateData.status = statusMap[status];
            // Set completedAt if status is COMPLETED
            if (status === 'Completed') {
                updateData.completedAt = new Date();
            } else {
                updateData.completedAt = null;
            }
        }

        // Update task
        const task = await prisma.task.update({
            where: { id: parseInt(req.params.id) },
            data: updateData
        });

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            task
        });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        // Find task
        const task = await prisma.task.findFirst({
            where: {
                id: parseInt(req.params.id),
                userId: req.user.id
            }
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Delete task
        await prisma.task.delete({
            where: { id: parseInt(req.params.id) }
        });

        res.status(200).json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;

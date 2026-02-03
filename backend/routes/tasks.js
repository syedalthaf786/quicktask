
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const taskController = require('../controllers/task.controller');
const bugController = require('../controllers/bug.controller');
const attachmentController = require('../controllers/attachment.controller');
const historyController = require('../controllers/task-history.controller');
const analyticsController = require('../controllers/analytics.controller');

router.use(protect);

// Core Task Routes
router.get('/', taskController.getTasks);
router.post('/', [
    body('title').trim().notEmpty().withMessage('Title is required')
], taskController.createTask);

router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Category Extensions
// Map categories to update endpoint
router.put('/:id/development', (req, res, next) => { req.params.category = 'development'; next(); }, taskController.updateCategoryData);
router.put('/:id/testing', (req, res, next) => { req.params.category = 'testing'; next(); }, taskController.updateCategoryData);
router.put('/:id/marketing', (req, res, next) => { req.params.category = 'marketing'; next(); }, taskController.updateCategoryData);
router.put('/:id/devops', (req, res, next) => { req.params.category = 'devops'; next(); }, taskController.updateCategoryData);
router.put('/:id/design', (req, res, next) => { req.params.category = 'design'; next(); }, taskController.updateCategoryData);

// Sub-resources
router.post('/:taskId/attachments', attachmentController.addAttachment);
router.delete('/:taskId/attachments/:id', attachmentController.deleteAttachment);
router.get('/:taskId/history', historyController.getTaskHistory);

// Subtask routes
router.get('/:taskId/subtasks', taskController.getSubTasks);
router.post('/:taskId/subtasks', taskController.createSubTask);
router.put('/:taskId/subtasks/:subTaskId', taskController.updateSubTask);
router.delete('/:taskId/subtasks/:subTaskId', taskController.deleteSubTask);

// Bug Report routes
router.get('/bugs', bugController.getBugReports);
router.post('/bugs', [
    body('taskId').trim().notEmpty().withMessage('Task ID is required'),
    body('title').trim().notEmpty().withMessage('Title is required')
], bugController.createBugReport);
router.get('/bugs/:id', bugController.getBugReportById);
router.put('/bugs/:id', bugController.updateBugReport);
router.delete('/bugs/:id', bugController.deleteBugReport);

// Submissions
router.post('/:id/submissions', [
    body('content').trim().notEmpty().withMessage('Submission content is required')
        .isLength({ max: 5000 }).withMessage('Content cannot exceed 5000 characters'),
    body('fileUrls').optional().isArray().withMessage('File URLs must be an array'),
    body('feedback').optional().isLength({ max: 1000 }).withMessage('Feedback cannot exceed 1000 characters')
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

        const taskId = req.params.id;
        const userId = req.user.id;

        // Check if task exists and user has access
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { team: true }
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Verify user has access to submit (assignee or team member)
        let hasAccess = false;
        if (task.assigneeId === userId || task.creatorId === userId) {
            hasAccess = true;
        } else if (task.teamId) {
            const membership = await prisma.teamMember.findUnique({
                where: {
                    teamId_userId: {
                        teamId: task.teamId,
                        userId: userId
                    }
                }
            });
            hasAccess = !!membership;
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to submit to this task'
            });
        }

        const { content, fileUrls, feedback } = req.body;

        const submission = await prisma.submission.create({
            data: {
                taskId: taskId,
                userId: userId,
                content,
                fileUrls: fileUrls || [],
                feedback: feedback || null
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, avatar: true }
                }
            }
        });

        res.status(201).json({
            success: true,
            message: 'Submission created successfully',
            submission
        });
    } catch (error) {
        console.error('Create submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating submission'
        });
    }
});

module.exports = router;

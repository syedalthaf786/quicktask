
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
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
router.post('/:id/submissions', async (req, res) => {
    try {
        const { content, fileUrls, feedback } = req.body;
        const sub = await prisma.submission.create({
            data: {
                taskId: req.params.id,
                userId: req.user.id,
                content,
                fileUrls: fileUrls || [],
                feedback
            }
        });
        res.status(201).json({ success: true, submission: sub });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

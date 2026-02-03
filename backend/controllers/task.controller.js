
const prisma = require('../lib/prisma');
const { validationResult } = require('express-validator');
const accessService = require('../services/access.service');

exports.getTasks = async (req, res) => {
    try {
        const { status, priority, search, sortBy, order, category, teamId } = req.query;
        const userId = req.user.id;

        // Use centralized visibility filter
        let where = await accessService.getTaskVisibilityFilter(userId);

        // With the new SubTask model, subtasks are stored separately and won't appear in main task list
        // No need to filter by parentId since it doesn't exist in the schema

        // Filter bugs if specific category is requested
        if (category === 'TESTING') {
            // Explicit fetch for testing tasks/bugs
        }

        if (status && status !== 'all') where.status = status.toUpperCase().replace(' ', '_');
        if (priority && priority !== 'all') where.priority = priority.toUpperCase();
        if (category && category !== 'all') where.category = category.toUpperCase();
        if (teamId) where.teamId = teamId;
        if (search) where.title = { contains: search, mode: 'insensitive' };

        let orderBy = {};
        if (sortBy) orderBy[sortBy] = order === 'asc' ? 'asc' : 'desc';
        else orderBy.createdAt = 'desc';

        const tasks = await prisma.task.findMany({
            where,
            orderBy,
            include: {
                creator: { select: { id: true, name: true, email: true, avatar: true } },
                assignee: { select: { id: true, name: true, email: true, avatar: true } },
                team: { select: { id: true, name: true, avatar: true, ownerId: true } },
                developmentData: true,
                testingData: true,
                marketingData: true,
                devOpsData: true,
                designData: true,
                attachments: true,
                subTasks: true,
                bugReports: { include: { reporter: { select: { id: true, name: true, email: true, avatar: true } }, assignee: { select: { id: true, name: true, email: true, avatar: true } } } },
                _count: { select: { comments: true, attachments: true } }
            }
        });

        // Post-filtering is no longer necessary as the `where` clause handles:
        // - Creator/Assignee visibility
        // - Team Member visibility
        // - Team Owner visibility
        // - Bug visibility (currently checking if isBugReport is true)

        const filteredTasks = tasks;

        res.status(200).json({ success: true, count: filteredTasks.length, tasks: filteredTasks });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getTaskById = async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        const task = await accessService.checkTaskAccess(taskId, userId);

        if (!task) return res.status(404).json({ success: false, message: 'Task not found or access denied' });

        const fullTask = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                creator: { select: { id: true, name: true, email: true, avatar: true } },
                assignee: { select: { id: true, name: true, email: true, avatar: true } },
                team: { select: { id: true, name: true, avatar: true, ownerId: true } },
                developmentData: true,
                testingData: true,
                marketingData: true,
                devOpsData: true,
                designData: true,
                attachments: { include: { user: { select: { id: true, name: true } } } },
                subTasks: { include: { assignee: { select: { name: true, avatar: true } } } }, // Subtasks
                bugReports: { include: { reporter: { select: { id: true, name: true, email: true, avatar: true } }, assignee: { select: { id: true, name: true, email: true, avatar: true } } } },
                history: {
                    include: { user: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                },
                submissions: {
                    include: { user: { select: { id: true, name: true, avatar: true } } },
                    orderBy: { createdAt: 'desc' }
                },
                comments: {
                    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        // Calculate permissions using centralized service
        const permissions = await accessService.getTaskPermissions(fullTask, userId);

        res.status(200).json({
            success: true,
            task: fullTask,
            permissions
        });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.createTask = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const { title, description, priority, status, dueDate, category, assigneeId, teamId, estimatedHours } = req.body;

        // Validate required fields
        if (!title || title.trim() === '') {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        if (!dueDate) {
            return res.status(400).json({ success: false, message: 'Due date is required' });
        }

        // Parse dueDate safely
        const parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid due date format' });
        }

        // Auto-categorization
        const titleLower = title.toLowerCase();
        const descLower = (description || '').toLowerCase();
        let finalCategory = category || 'GENERAL';

        if (!category) {
            if (titleLower.includes('design') || titleLower.includes('ui')) finalCategory = 'DESIGN';
            else if (titleLower.includes('dev') || descLower.includes('backend')) finalCategory = 'DEVELOPMENT';
            else if (titleLower.includes('market')) finalCategory = 'MARKETING';
            else if (titleLower.includes('deploy')) finalCategory = 'DEVOPS';
        }

        const taskData = {
            title,
            description,
            priority: priority ? priority.toUpperCase() : 'MEDIUM',
            status: status ? status.toUpperCase().replace(' ', '_') : 'TODO',
            category: finalCategory,
            dueDate: parsedDueDate,
            estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
            creatorId: req.user.id,
            assigneeId: assigneeId || null,
            teamId: teamId || null
        };

        // Handle subtasks creation
        if (req.body.subTasks && Array.isArray(req.body.subTasks) && req.body.subTasks.length > 0) {
            taskData.subTasks = {
                create: req.body.subTasks.map(st => ({
                    title: st.title,
                    description: st.description || '',
                    priority: st.priority || 'MEDIUM',
                    status: st.status || 'TODO',
                    assigneeId: st.assigneeId || null,
                    dueDate: st.dueDate ? (new Date(st.dueDate) || null) : (dueDate ? parsedDueDate : null)
                }))
            };
        }

        // Note: bugMetadata and isBugReport fields are not in the Prisma schema
        // Bug reports should be created as separate BugReport records linked to tasks

        const task = await prisma.$transaction(async (tx) => {
            const createdTask = await tx.task.create({
                data: taskData,
                include: { creator: true, assignee: true }
            });

            // Create initial history entry
            await tx.taskHistory.create({
                data: {
                    action: 'CREATED',
                    fieldName: 'task',
                    newValue: title,
                    taskId: createdTask.id,
                    userId: req.user.id
                }
            });

            // Initialize specialized category model
            const subData = { taskId: createdTask.id };
            switch (finalCategory) {
                case 'DEVELOPMENT': await tx.developmentTask.create({ data: subData }); break;
                case 'TESTING': await tx.testingTask.create({ data: subData }); break;
                case 'MARKETING': await tx.marketingTask.create({ data: subData }); break;
                case 'DEVOPS': await tx.devOpsTask.create({ data: subData }); break;
                case 'DESIGN': await tx.designTask.create({ data: subData }); break;
            }

            return createdTask;
        });

        res.status(201).json({ success: true, message: `Task created as ${finalCategory}`, task });
    } catch (error) {
        console.error('Create task error:', error);
        console.error('Error name:', error.name);
        console.error('Error code:', error.code);
        console.error('Error meta:', JSON.stringify(error.meta || {}));

        // Handle specific Prisma errors
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'A task with this title already exists' });
        }
        if (error.code === 'P2003') {
            return res.status(400).json({ success: false, message: 'Invalid reference to related data (user or team not found)' });
        }
        if (error.code === 'P2025') {
            return res.status(400).json({ success: false, message: 'Record not found - may be deleted or not yet created' });
        }

        res.status(500).json({ success: false, message: 'Server error', error: error.message, errorCode: error.code });
    }
};

exports.updateTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        const existingTask = await accessService.checkTaskAccess(taskId, userId);
        if (!existingTask) return res.status(404).json({ success: false, message: 'Not found' });

        let isTeamOwner = false;
        if (existingTask.teamId) {
            const team = await prisma.team.findUnique({ where: { id: existingTask.teamId } });
            if (team && team.ownerId === userId) isTeamOwner = true;
        }
        const isOwner = isTeamOwner;
        const isCreator = existingTask.creatorId === userId;

        const updateData = {};
        const allowedFields = ['title', 'description', 'priority', 'status', 'dueDate', 'assigneeId', 'teamId', 'estimatedHours', 'actualHours', 'progress'];

        // Logic for permissions (simplified)
        if (isOwner || isCreator) {
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) updateData[field] = req.body[field];
            });
        } else {
            // Assignees can update status, actualHours and progress
            if (req.body.status) updateData.status = req.body.status.toUpperCase().replace(' ', '_');
            if (req.body.actualHours) updateData.actualHours = parseFloat(req.body.actualHours);
            if (req.body.progress !== undefined) updateData.progress = req.body.progress;
        }

        if (updateData.status === 'COMPLETED') updateData.completedAt = new Date();
        else if (updateData.status && updateData.status !== 'COMPLETED') updateData.completedAt = null;

        // Handle progress updates for all task categories
        if (req.body.progress !== undefined) {
            // Store progress in the appropriate category-specific table
            switch (existingTask.category) {
                case 'DEVELOPMENT':
                    await prisma.developmentTask.update({
                        where: { taskId },
                        data: { progress: req.body.progress }
                    });
                    break;
                case 'TESTING':
                    await prisma.testingTask.update({
                        where: { taskId },
                        data: { testCases: req.body.progress }
                    });
                    break;
                case 'MARKETING':
                    await prisma.marketingTask.update({
                        where: { taskId },
                        data: { progress: req.body.progress }
                    });
                    break;
                case 'DEVOPS':
                    await prisma.devOpsTask.update({
                        where: { taskId },
                        data: { progress: req.body.progress }
                    });
                    break;
                case 'DESIGN':
                    await prisma.designTask.update({
                        where: { taskId },
                        data: { progress: req.body.progress }
                    });
                    break;
                default:
                    // For GENERAL tasks, store in main task model if needed
                    // Or ignore if not applicable
                    break;
            }
        }

        const updatedTask = await prisma.$transaction(async (tx) => {
            const result = await tx.task.update({
                where: { id: taskId },
                data: updateData
            });

            // Log history for status change
            if (updateData.status && updateData.status !== existingTask.status) {
                await tx.taskHistory.create({
                    data: {
                        action: 'UPDATED',
                        fieldName: 'status',
                        oldValue: existingTask.status,
                        newValue: updateData.status,
                        taskId,
                        userId
                    }
                });
            }

            return result;
        });

        res.status(200).json({ success: true, task: updatedTask });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        const isOwner = false; // We will check below when we have the task details


        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) return res.status(404).json({ success: false, message: 'Not found' });

        let isTeamOwner = false;
        if (task.teamId) {
            const team = await prisma.team.findUnique({ where: { id: task.teamId } });
            if (team && team.ownerId === userId) isTeamOwner = true;
        }

        if (task.creatorId !== userId && !isTeamOwner) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await prisma.task.delete({ where: { id: taskId } });
        res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Subtask Methods
exports.getSubTasks = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const userId = req.user.id;

        // First check if user has access to the parent task
        const parentTask = await accessService.checkTaskAccess(taskId, userId);
        if (!parentTask) {
            return res.status(404).json({ success: false, message: 'Parent task not found or access denied' });
        }

        const subTasks = await prisma.subTask.findMany({
            where: { taskId: taskId },
            include: {
                assignee: { select: { id: true, name: true, email: true, avatar: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ success: true, subTasks });
    } catch (error) {
        console.error('Get subtasks error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.createSubTask = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const userId = req.user.id;

        // Check if user has access to the parent task
        const parentTask = await accessService.checkTaskAccess(taskId, userId);
        if (!parentTask) {
            return res.status(404).json({ success: false, message: 'Parent task not found or access denied' });
        }

        const { title, description, status, priority, assigneeId, dueDate } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required for subtask' });
        }

        // Check if assignee exists and is part of the team
        if (assigneeId) {
            if (parentTask.teamId) {
                const teamMember = await prisma.teamMember.findUnique({
                    where: { teamId_userId: { teamId: parentTask.teamId, userId: assigneeId } }
                });
                if (!teamMember) {
                    return res.status(400).json({ success: false, message: 'Assignee must be a member of the parent task\'s team' });
                }
            } else {
                // For personal tasks, allow assigning to anyone
            }
        }

        const subTask = await prisma.subTask.create({
            data: {
                title,
                description: description || '',
                status: status || 'TODO',
                priority: priority || 'MEDIUM',
                assigneeId: assigneeId || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                taskId: taskId
            },
            include: {
                assignee: { select: { id: true, name: true, email: true, avatar: true } }
            }
        });

        res.status(201).json({ success: true, subTask });
    } catch (error) {
        console.error('Create subtask error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.updateSubTask = async (req, res) => {
    try {
        const subTaskId = req.params.subTaskId;
        const taskId = req.params.taskId;
        const userId = req.user.id;

        // Check if user has access to the parent task
        const parentTask = await accessService.checkTaskAccess(taskId, userId);
        if (!parentTask) {
            return res.status(404).json({ success: false, message: 'Parent task not found or access denied' });
        }

        // Check if the subtask belongs to the parent task
        const existingSubTask = await prisma.subTask.findUnique({
            where: { id: subTaskId },
            include: { assignee: true }
        });

        if (!existingSubTask || existingSubTask.taskId !== taskId) {
            return res.status(404).json({ success: false, message: 'Subtask not found' });
        }

        // Check permissions: only assignee, creator of parent task, or team owner can update
        const isAssignee = existingSubTask.assigneeId === userId;
        const isCreator = parentTask.creatorId === userId;

        let isTeamOwner = false;
        if (parentTask.teamId) {
            const team = await prisma.team.findUnique({ where: { id: parentTask.teamId } });
            if (team && team.ownerId === userId) isTeamOwner = true;
        }

        if (!isAssignee && !isCreator && !isTeamOwner) {
            return res.status(403).json({ success: false, message: 'Unauthorized to update this subtask' });
        }

        const { title, description, status, priority, assigneeId, dueDate } = req.body;

        // Check if assignee exists and is part of the team
        if (assigneeId) {
            if (parentTask.teamId) {
                const teamMember = await prisma.teamMember.findUnique({
                    where: { teamId_userId: { teamId: parentTask.teamId, userId: assigneeId } }
                });
                if (!teamMember) {
                    return res.status(400).json({ success: false, message: 'Assignee must be a member of the parent task\'s team' });
                }
            } else {
                // For personal tasks, allow assigning to anyone
            }
        }

        // Handle status changes and completion tracking
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;
        if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

        // If status is COMPLETED, set completedAt
        if (status === 'COMPLETED') {
            updateData.completedAt = new Date();
        } else if (status && status !== 'COMPLETED' && existingSubTask.status === 'COMPLETED') {
            // If changing from COMPLETED to another status, clear completedAt
            updateData.completedAt = null;
        }

        const updatedSubTask = await prisma.subTask.update({
            where: { id: subTaskId },
            data: updateData,
            include: {
                assignee: { select: { id: true, name: true, email: true, avatar: true } }
            }
        });

        res.status(200).json({ success: true, subTask: updatedSubTask });
    } catch (error) {
        console.error('Update subtask error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.deleteSubTask = async (req, res) => {
    try {
        const subTaskId = req.params.subTaskId;
        const taskId = req.params.taskId;
        const userId = req.user.id;

        // Check if user has access to the parent task
        const parentTask = await accessService.checkTaskAccess(taskId, userId);
        if (!parentTask) {
            return res.status(404).json({ success: false, message: 'Parent task not found or access denied' });
        }

        // Check if the subtask belongs to the parent task
        const existingSubTask = await prisma.subTask.findUnique({ where: { id: subTaskId } });

        if (!existingSubTask || existingSubTask.taskId !== taskId) {
            return res.status(404).json({ success: false, message: 'Subtask not found' });
        }

        // Only creator of parent task or team owner can delete subtasks
        const isCreator = parentTask.creatorId === userId;

        let isTeamOwner = false;
        if (parentTask.teamId) {
            const team = await prisma.team.findUnique({ where: { id: parentTask.teamId } });
            if (team && team.ownerId === userId) isTeamOwner = true;
        }

        if (!isCreator && !isTeamOwner) {
            return res.status(403).json({ success: false, message: 'Unauthorized to delete this subtask' });
        }

        await prisma.subTask.delete({ where: { id: subTaskId } });

        res.status(200).json({ success: true, message: 'Subtask deleted successfully' });
    } catch (error) {
        console.error('Delete subtask error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// Sub-controllers for specialized data
exports.updateCategoryData = async (req, res) => {
    const { category, id: taskId } = req.params;
    const userId = req.user.id;

    const modelMap = {
        development: 'developmentTask',
        testing: 'testingTask',
        marketing: 'marketingTask',
        devops: 'devOpsTask',
        design: 'designTask'
    };

    const modelName = modelMap[category.toLowerCase()];
    if (!modelName) return res.status(400).json({ success: false, message: 'Invalid category endpoint' });

    try {
        // Access Check
        const task = await accessService.checkTaskAccess(taskId, userId);
        if (!task) return res.status(403).json({ success: false, message: 'Unauthorized access to task' });

        // Handle array fields properly if they come as strings
        const data = { ...req.body };
        if (data.components && typeof data.components === 'string') data.components = [data.components];
        if (data.assets && typeof data.assets === 'string') data.assets = [data.assets];
        if (data.platforms && typeof data.platforms === 'string') data.platforms = [data.platforms];

        // Use upsert to handle migration safety (older tasks without specialized records)
        const updated = await prisma[modelName].upsert({
            where: { taskId },
            update: data,
            create: { ...data, taskId }
        });

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        console.error(`Update ${category} error [Task: ${taskId}]:`, error);
        res.status(500).json({ success: false, message: 'Failed to update specialized task data', error: error.message });
    }
};

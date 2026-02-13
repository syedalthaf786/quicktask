
const prisma = require('../lib/prisma');
const { validationResult } = require('express-validator');
const accessService = require('../services/access.service');

exports.getTasks = async (req, res) => {
    try {
        const { status, priority, search, sortBy, order, category, teamId, page = 1, limit = 20 } = req.query;
        const userId = req.user.id;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        // Validate pagination parameters
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ success: false, message: 'Invalid page number' });
        }
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({ success: false, message: 'Limit must be between 1 and 100' });
        }

        // Use centralized visibility filter
        let where = await accessService.getTaskVisibilityFilter(userId);

        // Apply filters
        if (status && status !== 'all') where.status = status.toUpperCase().replace(' ', '_');
        if (priority && priority !== 'all') where.priority = priority.toUpperCase();
        if (category && category !== 'all') where.category = category.toUpperCase();
        if (teamId) where.teamId = teamId;
        if (search) where.title = { contains: search, mode: 'insensitive' };

        // Build order by clause
        let orderBy = {};
        if (sortBy) orderBy[sortBy] = order === 'asc' ? 'asc' : 'desc';
        else orderBy.createdAt = 'desc';

        // Execute paginated query
        const [tasks, totalCount] = await Promise.all([
            prisma.task.findMany({
                where,
                orderBy,
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
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
                    bugReports: {
                        include: {
                            reporter: { select: { id: true, name: true, email: true, avatar: true } },
                            assignee: { select: { id: true, name: true, email: true, avatar: true } }
                        }
                    },
                    _count: { select: { comments: true, attachments: true } }
                }
            }),
            prisma.task.count({ where })
        ]);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalCount / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        res.status(200).json({
            success: true,
            tasks,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                hasNextPage,
                hasPrevPage,
                limit: limitNum
            }
        });
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

        // Get user permissions to determine what data to fetch
        const permissions = await accessService.getTaskPermissions(task, userId);

        // Build selective includes based on permissions and query parameters
        const include = {
            creator: { select: { id: true, name: true, email: true, avatar: true } },
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            team: { select: { id: true, name: true, avatar: true, ownerId: true } },
            developmentData: true,
            testingData: true,
            marketingData: true,
            devOpsData: true,
            designData: true,
            attachments: { include: { user: { select: { id: true, name: true } } } },
            subTasks: { include: { assignee: { select: { name: true, avatar: true } } } }
        };

        // Only fetch heavy relations if user has permission
        if (permissions.canViewHistory) {
            include.history = {
                include: { user: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 20
            };
        }

        if (permissions.canViewSubmissions) {
            include.submissions = {
                include: { user: { select: { id: true, name: true, avatar: true } } },
                orderBy: { createdAt: 'desc' }
            };
        }

        // Always fetch comments but limit the amount
        include.comments = {
            include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit comments to prevent excessive data
        };

        // Only fetch bug reports if the task has them
        if (task.category === 'TESTING') {
            include.bugReports = {
                include: {
                    reporter: { select: { id: true, name: true, email: true, avatar: true } },
                    assignee: { select: { id: true, name: true, email: true, avatar: true } }
                }
            };
        }

        const fullTask = await prisma.task.findUnique({
            where: { id: taskId },
            include
        });

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
        if (!existingTask) {
            return res.status(404).json({ success: false, message: 'Task not found or access denied' });
        }

        // Get detailed permissions for this user
        const permissions = await accessService.getTaskPermissions(existingTask, userId);

        // Validate and sanitize input data
        const updateData = {};
        const errors = [];

        // Define field permissions based on user role
        const fieldPermissions = {
            // Creator and Team Owner can update all fields
            canEditAll: ['title', 'description', 'priority', 'status', 'dueDate', 'assigneeId', 'teamId', 'estimatedHours'],
            // Assignees can update limited fields
            canEditLimited: ['status', 'actualHours', 'progress', 'assigneeId'],
            // Everyone can update progress
            canUpdateProgress: ['progress']
        };

        const allowedFields = permissions.canEdit
            ? fieldPermissions.canEditAll
            : permissions.canUpdateStatus
                ? fieldPermissions.canEditLimited
                : fieldPermissions.canUpdateProgress;

        // Validate each field
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                const value = req.body[field];

                switch (field) {
                    case 'title':
                        if (typeof value !== 'string' || value.trim().length === 0) {
                            errors.push('Title must be a non-empty string');
                        } else {
                            updateData.title = value.trim();
                        }
                        break;
                    case 'description':
                        updateData.description = typeof value === 'string' ? value : null;
                        break;
                    case 'priority':
                        const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
                        const priority = value.toUpperCase();
                        if (validPriorities.includes(priority)) {
                            updateData.priority = priority;
                        } else {
                            errors.push('Invalid priority value');
                        }
                        break;
                    case 'status':
                        const validStatuses = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'];
                        const status = value.toUpperCase().replace(' ', '_');
                        if (validStatuses.includes(status)) {
                            updateData.status = status;
                        } else {
                            errors.push('Invalid status value');
                        }
                        break;
                    case 'dueDate':
                        const date = new Date(value);
                        if (isNaN(date.getTime())) {
                            errors.push('Invalid due date format');
                        } else {
                            updateData.dueDate = date;
                        }
                        break;
                    case 'estimatedHours':
                    case 'actualHours':
                        const numValue = parseFloat(value);
                        if (isNaN(numValue) || numValue < 0) {
                            errors.push(`${field} must be a positive number`);
                        } else {
                            updateData[field] = numValue;
                        }
                        break;
                    case 'assigneeId':
                        // Allow assignee to reassign to themselves or unassign
                        if (value === null || value === '' || value === userId) {
                            updateData.assigneeId = value || null;
                        } else if (permissions.canAssign) {
                            // Only creators/owners can assign to others
                            updateData.assigneeId = value;
                        } else {
                            errors.push('You can only assign tasks to yourself');
                        }
                        break;
                    case 'progress':
                        // Progress validation handled separately for category-specific storage
                        break;
                }
            }
        }

        // Return validation errors
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Handle status completion timestamp
        if (updateData.status === 'COMPLETED') {
            updateData.completedAt = new Date();
        } else if (updateData.status && updateData.status !== 'COMPLETED') {
            updateData.completedAt = null;
        }

        // Handle progress updates with proper category-specific storage
        let progressUpdatePromise = Promise.resolve();
        if (req.body.progress !== undefined) {
            const progressData = req.body.progress;

            // Validate progress data structure
            if (typeof progressData !== 'object' && !Array.isArray(progressData) && typeof progressData !== 'number') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid progress data format'
                });
            }

            // Store progress in the appropriate category-specific table
            const progressFieldMap = {
                'DEVELOPMENT': 'progress',
                'TESTING': 'testCases',
                'MARKETING': 'progress',
                'DEVOPS': 'progress',
                'DESIGN': 'progress'
            };

            const progressField = progressFieldMap[existingTask.category];
            if (progressField) {
                const modelNameMap = {
                    'DEVELOPMENT': 'developmentTask',
                    'TESTING': 'testingTask',
                    'MARKETING': 'marketingTask',
                    'DEVOPS': 'devOpsTask',
                    'DESIGN': 'designTask'
                };

                const modelName = modelNameMap[existingTask.category];
                if (modelName) {
                    progressUpdatePromise = prisma[modelName].upsert({
                        where: { taskId },
                        update: { [progressField]: progressData },
                        create: { taskId, [progressField]: progressData }
                    }).catch(err => {
                        console.error(`Progress update failed for ${modelName}:`, err);
                        // Don't fail the entire operation if progress update fails
                    });
                }
            }
        }

        // Execute update in transaction with proper history logging
        const updatedTask = await prisma.$transaction(async (tx) => {
            // Update main task
            const result = await tx.task.update({
                where: { id: taskId },
                data: updateData
            });

            // Log history for all changed fields
            const historyPromises = [];
            for (const [field, newValue] of Object.entries(updateData)) {
                if (field !== 'completedAt') { // Don't log auto-generated timestamps
                    historyPromises.push(
                        tx.taskHistory.create({
                            data: {
                                action: 'UPDATED',
                                fieldName: field,
                                oldValue: existingTask[field]?.toString() || null,
                                newValue: newValue?.toString() || null,
                                taskId,
                                userId
                            }
                        })
                    );
                }
            }

            await Promise.all(historyPromises);
            await progressUpdatePromise;

            return result;
        });

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            task: updatedTask
        });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update task',
            error: error.message
        });
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

        // Check if the parent task exists
        const parentTask = await prisma.task.findUnique({ where: { id: taskId } });

        if (!parentTask) {
            return res.status(404).json({ success: false, message: 'Parent task not found' });
        }

        // Check permissions: only creator of parent task, team owner, or team admin can create subtasks
        const isCreator = parentTask.creatorId === userId;
        const isTaskAssignee = parentTask.assigneeId === userId;

        let isTeamOwner = false;
        let isTeamAdmin = false;

        if (parentTask.teamId) {
            const team = await prisma.team.findUnique({ where: { id: parentTask.teamId } });
            if (team && team.ownerId === userId) {
                isTeamOwner = true;
            } else {
                // Check if user is team admin
                const membership = await prisma.teamMember.findUnique({
                    where: {
                        teamId_userId: {
                            teamId: parentTask.teamId,
                            userId: userId
                        }
                    }
                });
                isTeamAdmin = membership?.role === 'ADMIN';
            }
        }

        if (!isCreator && !isTeamOwner && !isTeamAdmin && !isTaskAssignee) {
            return res.status(403).json({ success: false, message: 'Unauthorized to create subtasks for this task' });
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

        // Check if the subtask exists and belongs to the parent task
        const existingSubTask = await prisma.subTask.findUnique({
            where: { id: subTaskId },
            include: { assignee: true }
        });

        if (!existingSubTask || existingSubTask.taskId !== taskId) {
            return res.status(404).json({ success: false, message: 'Subtask not found' });
        }

        // Get the parent task details
        const parentTask = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!parentTask) {
            return res.status(404).json({ success: false, message: 'Parent task not found' });
        }

        // DEBUG: Log the relevant information to help troubleshoot
        console.log('DEBUG - Subtask update permissions:');
        console.log('  Subtask ID:', subTaskId);
        console.log('  Parent Task ID:', taskId);
        console.log('  User ID:', userId);
        console.log('  Existing Subtask assigneeId:', existingSubTask.assigneeId);
        console.log('  Parent Task creatorId:', parentTask.creatorId);
        console.log('  Parent Task teamId:', parentTask.teamId);
        console.log('  Is Subtask Assignee:', existingSubTask.assigneeId === userId);
        console.log('  Is Creator:', parentTask.creatorId === userId);

        // Check permissions: only subtask assignee, creator of parent task, team owner, or team admin can update
        const isSubtaskAssignee = existingSubTask.assigneeId && existingSubTask.assigneeId === userId;
        const isCreator = parentTask.creatorId === userId;
        const isTaskAssignee = parentTask.assigneeId === userId;

        let isTeamOwner = false;
        let isTeamAdmin = false;

        if (parentTask.teamId) {
            const team = await prisma.team.findUnique({ where: { id: parentTask.teamId } });
            if (team && team.ownerId === userId) {
                isTeamOwner = true;
            } else {
                // Check if user is team admin
                const membership = await prisma.teamMember.findUnique({
                    where: {
                        teamId_userId: {
                            teamId: parentTask.teamId,
                            userId: userId
                        }
                    }
                });
                isTeamAdmin = membership?.role === 'ADMIN';
            }
        }

        console.log('  Is Team Owner:', isTeamOwner);
        console.log('  Is Team Admin:', isTeamAdmin);
        console.log('  Is Task Assignee:', isTaskAssignee);
        console.log('  Final permission check (any true):', isSubtaskAssignee || isCreator || isTeamOwner || isTeamAdmin || isTaskAssignee);

        if (!isSubtaskAssignee && !isCreator && !isTeamOwner && !isTeamAdmin && !isTaskAssignee) {
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

        // Check if the subtask exists and belongs to the parent task
        const existingSubTask = await prisma.subTask.findUnique({ where: { id: subTaskId } });

        if (!existingSubTask || existingSubTask.taskId !== taskId) {
            return res.status(404).json({ success: false, message: 'Subtask not found' });
        }

        // Get the parent task details
        const parentTask = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!parentTask) {
            return res.status(404).json({ success: false, message: 'Parent task not found' });
        }

        // Check permissions: only subtask assignee, creator of parent task, team owner, or team admin can delete
        const isSubtaskAssignee = existingSubTask.assigneeId && existingSubTask.assigneeId === userId;
        const isCreator = parentTask.creatorId === userId;
        const isTaskAssignee = parentTask.assigneeId === userId;

        let isTeamOwner = false;
        let isTeamAdmin = false;

        if (parentTask.teamId) {
            const team = await prisma.team.findUnique({ where: { id: parentTask.teamId } });
            if (team && team.ownerId === userId) {
                isTeamOwner = true;
            } else {
                // Check if user is team admin
                const membership = await prisma.teamMember.findUnique({
                    where: {
                        teamId_userId: {
                            teamId: parentTask.teamId,
                            userId: userId
                        }
                    }
                });
                isTeamAdmin = membership?.role === 'ADMIN';
            }
        }

        if (!isSubtaskAssignee && !isCreator && !isTeamOwner && !isTeamAdmin && !isTaskAssignee) {
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

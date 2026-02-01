const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   POST /api/teams
// @desc    Create new team
// @access  Private
router.post('/', [
    body('name').trim().notEmpty().withMessage('Team name is required')
        .isLength({ max: 100 }).withMessage('Team name cannot exceed 100 characters'),
    body('description').optional().isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters')
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

        const { name, description } = req.body;

        // Create team with owner as first member
        const team = await prisma.team.create({
            data: {
                name,
                description,
                ownerId: req.user.id,
                members: {
                    create: {
                        userId: req.user.id,
                        role: 'OWNER'
                    }
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        res.status(201).json({
            success: true,
            message: 'Team created successfully',
            team
        });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/teams
// @desc    Get all teams for current user
// @access  Private
router.get('/', async (req, res) => {
    try {
        const teams = await prisma.team.findMany({
            where: {
                members: {
                    some: {
                        userId: req.user.id
                    }
                }
            },
            include: {
                owner: {
                    select: { id: true, name: true, email: true }
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                },
                _count: {
                    select: { tasks: true, members: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            count: teams.length,
            teams
        });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/teams/:id
// @desc    Get single team
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const teamId = req.params.id;
        const userId = req.user.id;
        // Find membership first to check role
        const membership = await prisma.teamMember.findUnique({
            where: {
                teamId_userId: { teamId, userId }
            }
        });

        if (!membership) {
            return res.status(404).json({
                success: false,
                message: 'Team not found or access denied'
            });
        }

        const isAdminOrOwner = membership.role === 'OWNER' || membership.role === 'ADMIN';

        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                tasks: {
                    where: isAdminOrOwner ? {} : {
                        OR: [
                            { creatorId: userId },
                            { assigneeId: userId },
                            {
                                title: { startsWith: '[BUG]' },
                                description: { contains: 'Related Task ID:**' }
                            }
                        ]
                    },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        creator: { select: { id: true, name: true, email: true } },
                        assignee: { select: { id: true, name: true, email: true } }
                    }
                },
                _count: {
                    select: { tasks: true, members: true }
                }
            }
        });

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        // Post-filter bugs for non-admins if needed (though 'where' covers most)
        if (!isAdminOrOwner) {
            const filteredTasks = await Promise.all(team.tasks.map(async (task) => {
                if (task.creatorId === userId || task.assigneeId === userId) return task;
                if (task.title.startsWith('[BUG]')) {
                    const parentMatch = task.description?.match(/Related Task ID:\*\* (\d+)/);
                    if (parentMatch) {
                        const parentTaskId = parseInt(parentMatch[1]);
                        const parentTask = await prisma.task.findUnique({ where: { id: parentTaskId } });
                        if (parentTask && parentTask.assigneeId === userId) return task;
                    }
                }
                return null;
            }));
            team.tasks = filteredTasks.filter(t => t !== null);
        }

        res.status(200).json({
            success: true,
            team
        });
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   PUT /api/teams/:id
// @desc    Update team
// @access  Private (Owner only)
router.put('/:id', [
    body('name').optional().trim().notEmpty().withMessage('Team name cannot be empty')
        .isLength({ max: 100 }).withMessage('Team name cannot exceed 100 characters'),
    body('description').optional().isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters')
], async (req, res) => {
    try {
        // Find team and check ownership
        const existingTeam = await prisma.team.findFirst({
            where: {
                id: req.params.id,
                ownerId: req.user.id
            }
        });

        if (!existingTeam) {
            return res.status(404).json({
                success: false,
                message: 'Team not found or you are not the owner'
            });
        }

        const { name, description } = req.body;

        const team = await prisma.team.update({
            where: { id: req.params.id },
            data: {
                name: name || existingTeam.name,
                description: description !== undefined ? description : existingTeam.description
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        res.status(200).json({
            success: true,
            message: 'Team updated successfully',
            team
        });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   DELETE /api/teams/:id
// @desc    Delete team
// @access  Private (Owner only)
router.delete('/:id', async (req, res) => {
    try {
        // Find team and check ownership
        const team = await prisma.team.findFirst({
            where: {
                id: req.params.id,
                ownerId: req.user.id
            }
        });

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found or you are not the owner'
            });
        }

        // Delete team (cascade will delete members and tasks)
        await prisma.team.delete({
            where: { id: parseInt(req.params.id) }
        });

        res.status(200).json({
            success: true,
            message: 'Team deleted successfully'
        });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   POST /api/teams/:id/members
// @desc    Add member to team
// @access  Private (Admin/Owner only)
router.post('/:id/members', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('role').optional().isIn(['ADMIN', 'MEMBER']).withMessage('Role must be ADMIN or MEMBER')
], async (req, res) => {
    try {
        const { email, role } = req.body;
        const teamId = req.params.id;

        // Check if user is admin or owner
        const membership = await prisma.teamMember.findFirst({
            where: {
                teamId,
                userId: req.user.id,
                role: { in: ['OWNER', 'ADMIN'] }
            }
        });

        if (!membership) {
            return res.status(403).json({
                success: false,
                message: 'You must be an admin or owner to add members'
            });
        }

        // Find user by email
        const userToAdd = await prisma.user.findUnique({
            where: { email }
        });

        if (!userToAdd) {
            return res.status(404).json({
                success: false,
                message: 'User not found with this email'
            });
        }

        // Check if already a member
        const existingMember = await prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId,
                    userId: userToAdd.id
                }
            }
        });

        if (existingMember) {
            return res.status(400).json({
                success: false,
                message: 'User is already a member of this team'
            });
        }

        // Add member
        const teamMember = await prisma.teamMember.create({
            data: {
                teamId,
                userId: userToAdd.id,
                role: role || 'MEMBER'
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        res.status(201).json({
            success: true,
            message: 'Member added successfully',
            member: teamMember
        });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   DELETE /api/teams/:id/members/:userId
// @desc    Remove member from team
// @access  Private (Admin/Owner only, or self)
router.delete('/:id/members/:userId', async (req, res) => {
    try {
        const teamId = req.params.id;
        const targetUserId = req.params.userId;
        const currentUserId = req.user.id;

        // Check if removing self or is admin/owner
        const membership = await prisma.teamMember.findFirst({
            where: {
                teamId,
                userId: currentUserId,
                role: { in: ['OWNER', 'ADMIN'] }
            }
        });

        if (!membership && currentUserId !== targetUserId) {
            return res.status(403).json({
                success: false,
                message: 'You can only remove yourself or must be an admin/owner'
            });
        }

        // Check if removing owner
        const team = await prisma.team.findUnique({
            where: { id: teamId }
        });

        if (team.ownerId === targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove the team owner. Transfer ownership first.'
            });
        }

        // Remove member
        await prisma.teamMember.delete({
            where: {
                teamId_userId: {
                    teamId,
                    userId: targetUserId
                }
            }
        });

        res.status(200).json({
            success: true,
            message: 'Member removed successfully'
        });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   PUT /api/teams/:id/members/:userId
// @desc    Update member role
// @access  Private (Owner only)
router.put('/:id/members/:userId', [
    body('role').isIn(['ADMIN', 'MEMBER']).withMessage('Role must be ADMIN or MEMBER')
], async (req, res) => {
    try {
        const teamId = req.params.id;
        const targetUserId = req.params.userId;
        const { role } = req.body;

        // Check if current user is owner
        const team = await prisma.team.findUnique({
            where: { id: teamId }
        });

        if (!team || team.ownerId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Only the owner can change member roles'
            });
        }

        // Cannot change owner's role
        if (team.ownerId === targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot change the role of the team owner'
            });
        }

        // Update member role
        const teamMember = await prisma.teamMember.update({
            where: {
                teamId_userId: {
                    teamId,
                    userId: targetUserId
                }
            },
            data: { role },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        res.status(200).json({
            success: true,
            message: 'Member role updated successfully',
            member: teamMember
        });
    } catch (error) {
        console.error('Update member role error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/teams/:id/tasks
// @desc    Get all tasks for a team
// @access  Private (Team members only)
router.get('/:id/tasks', async (req, res) => {
    try {
        const teamId = req.params.id;
        const { status, priority, sortBy, order } = req.query;
        const userId = req.user.id;

        console.log(`Fetching team ${teamId} tasks for user: ${userId}`);

        // Check if user is team member
        const membership = await prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId,
                    userId: req.user.id
                }
            }
        });

        if (!membership) {
            return res.status(403).json({
                success: false,
                message: 'You are not a member of this team'
            });
        }

        // Build where clause
        const where = { teamId };

        // Filter by status
        if (status && status !== 'all') {
            where.status = status.toUpperCase().replace(' ', '_');
        }

        // Filter by priority
        if (priority && priority !== 'all') {
            where.priority = priority.toUpperCase();
        }

        // Build order by
        let orderBy = {};
        if (sortBy) {
            orderBy[sortBy] = order === 'asc' ? 'asc' : 'desc';
        } else {
            orderBy.createdAt = 'desc';
        }

        const tasks = await prisma.task.findMany({
            where,
            orderBy,
            include: {
                creator: {
                    select: { id: true, name: true, email: true }
                },
                assignee: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        console.log(`Found ${tasks.length} tasks for team ${teamId}`);

        res.status(200).json({
            success: true,
            count: tasks.length,
            tasks
        });
    } catch (error) {
        console.error('Get team tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/teams/:id/members
// @desc    Get team members
// @access  Private (Team members only)
router.get('/:id/members', async (req, res) => {
    try {
        const teamId = req.params.id;

        // Check if user is team member
        const membership = await prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId,
                    userId: req.user.id
                }
            }
        });

        if (!membership) {
            return res.status(403).json({
                success: false,
                message: 'You are not a member of this team'
            });
        }

        const members = await prisma.teamMember.findMany({
            where: { teamId },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { joinedAt: 'asc' }
        });

        res.status(200).json({
            success: true,
            count: members.length,
            members
        });
    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;

const prisma = require('../lib/prisma');

/**
 * Centralized Access Control Service
 * Provides consistent RBAC checks across the application
 */

/**
 * Check if user has access to a specific task
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Task object if access granted, null otherwise
 */
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

    // Access granted if: team owner, creator, or assignee
    if (isTeamOwner || task.creatorId === userId || task.assigneeId === userId) {
        return task;
    }

    return null;
}

/**
 * Check if user has access to a team
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Team membership if access granted, null otherwise
 */
async function checkTeamAccess(teamId, userId) {
    const membership = await prisma.teamMember.findUnique({
        where: {
            teamId_userId: { teamId, userId }
        },
        include: {
            team: true
        }
    });

    return membership;
}

/**
 * Check if user is team owner or admin
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if user is owner or admin
 */
async function isTeamAdminOrOwner(teamId, userId) {
    const membership = await checkTeamAccess(teamId, userId);
    if (!membership) return false;

    return membership.role === 'OWNER' || membership.role === 'ADMIN';
}

/**
 * Build task visibility filter for getTasks queries
 * Returns a Prisma where clause that respects RBAC
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Prisma where clause
 */
async function getTaskVisibilityFilter(userId) {
    // Get teams owned by user
    const ownedTeams = await prisma.team.findMany({
        where: { ownerId: userId },
        select: { id: true }
    });
    const ownedTeamIds = ownedTeams.map(t => t.id);

    // Build visibility filter:
    // 1. Creator = me
    // 2. Assignee = me
    // 3. Team Owner = me (all tasks in owned teams)
    return {
        OR: [
            { creatorId: userId },
            { assigneeId: userId },
            { teamId: { in: ownedTeamIds } }
        ]
    };
}

/**
 * Calculate detailed permissions for a task based on user role
 * @param {Object} task - Task object with team relationship
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Permissions object
 */
async function getTaskPermissions(task, userId) {
    let isTeamOwner = false;
    let isTeamAdmin = false;
    
    if (task.teamId) {
        const team = await prisma.team.findUnique({ where: { id: task.teamId } });
        if (team) {
            isTeamOwner = team.ownerId === userId;
            
            if (!isTeamOwner) {
                // Check if user is team admin
                const membership = await prisma.teamMember.findUnique({
                    where: {
                        teamId_userId: {
                            teamId: task.teamId,
                            userId: userId
                        }
                    }
                });
                isTeamAdmin = membership?.role === 'ADMIN';
            }
        }
    }

    const isCreator = task.creatorId === userId;
    const isAssignee = task.assigneeId === userId;
    
    // Enhanced permission levels
    const canEdit = isTeamOwner || isTeamAdmin || isCreator;
    const canUpdateStatus = canEdit || isAssignee;
    const canUpdateProgress = canUpdateStatus; // Assignees and above can update progress
    const canUpdateAssignee = canEdit || (isAssignee && task.assigneeId === userId); // Assignees can reassign to themselves
    const canDelete = isTeamOwner || isTeamAdmin || isCreator;
    const canAssign = canEdit;
    const canComment = true; // All authenticated users can comment
    const canViewHistory = canEdit || isAssignee;
    const canViewSubmissions = canEdit || isAssignee;
    
    return {
        // Core permissions
        canEdit,
        canUpdateStatus,
        canUpdateProgress,
        canUpdateAssignee,
        canDelete,
        canAssign,
        canComment,
        canViewHistory,
        canViewSubmissions,
        
        // Role indicators
        isOwner: isTeamOwner,
        isAdmin: isTeamAdmin,
        isCreator,
        isAssignee,
        
        // Permission details for debugging
        permissionLevel: isTeamOwner ? 'OWNER' : 
                        isTeamAdmin ? 'ADMIN' : 
                        isCreator ? 'CREATOR' : 
                        isAssignee ? 'ASSIGNEE' : 'VIEWER'
    };
}

/**
 * Check field-level access for a specific user on a task
 * @param {Object} task - Task object
 * @param {string} userId - User ID
 * @param {string} field - Field name to check access for
 * @returns {Promise<boolean>} Whether user can access the field
 */
async function canAccessField(task, userId, field) {
    const permissions = await getTaskPermissions(task, userId);
    
    const fieldAccessMap = {
        'title': permissions.canEdit,
        'description': permissions.canEdit,
        'priority': permissions.canEdit,
        'status': permissions.canUpdateStatus,
        'dueDate': permissions.canEdit,
        'assigneeId': permissions.canUpdateAssignee,
        'teamId': permissions.canEdit,
        'estimatedHours': permissions.canEdit,
        'actualHours': permissions.canUpdateStatus,
        'progress': permissions.canUpdateProgress,
        'category': permissions.canEdit
    };
    
    return fieldAccessMap[field] || false;
}

/**
 * Log permission violation attempts
 * @param {string} userId - User ID
 * @param {string} taskId - Task ID
 * @param {string} action - Action attempted
 * @param {string} field - Field involved (optional)
 */
async function logPermissionViolation(userId, taskId, action, field = null) {
    try {
        await prisma.taskHistory.create({
            data: {
                action: 'PERMISSION_VIOLATION',
                fieldName: field || 'access_denied',
                oldValue: null,
                newValue: `${action} attempted by user ${userId}`,
                taskId,
                userId
            }
        });
    } catch (error) {
        console.error('Failed to log permission violation:', error);
    }
}

/**
 * Check if user can access a bug report
 * @param {string} bugId - Bug report ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Bug report if access granted, null otherwise
 */
async function checkBugAccess(bugId, userId) {
    const bug = await prisma.bugReport.findUnique({
        where: { id: bugId },
        include: { task: true }
    });

    if (!bug) return null;

    // Check access to parent task
    const taskAccess = await checkTaskAccess(bug.taskId, userId);
    if (!taskAccess) return null;

    return bug;
}

module.exports = {
    checkTaskAccess,
    checkTeamAccess,
    isTeamAdminOrOwner,
    getTaskVisibilityFilter,
    getTaskPermissions,
    checkBugAccess,
    canAccessField,
    logPermissionViolation
};

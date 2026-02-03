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
 * Calculate permissions for a task based on user role
 * @param {Object} task - Task object with team relationship
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Permissions object
 */
async function getTaskPermissions(task, userId) {
    let isTeamOwner = false;
    if (task.teamId) {
        const team = await prisma.team.findUnique({ where: { id: task.teamId } });
        if (team && team.ownerId === userId) isTeamOwner = true;
    }

    const isCreator = task.creatorId === userId;
    const isAssignee = task.assigneeId === userId;

    return {
        canEdit: isTeamOwner || isCreator,
        canUpdateStatus: isTeamOwner || isCreator || isAssignee,
        canComment: true, // All authenticated users can comment
        canDelete: isTeamOwner || isCreator,
        canAssign: isTeamOwner || isCreator,
        isOwner: isTeamOwner,
        isCreator,
        isAssignee
    };
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
    checkBugAccess
};

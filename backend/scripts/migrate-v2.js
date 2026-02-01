const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/**
 * World-Class Smart Mapping Logic for QuickTask v2
 * This script demonstrates how conceptual "existing" data is categorized
 * and migrated into the new structure with UUIDs and specialized Categories.
 */

const existingData = {
    users: [
        { name: 'Prudvi', email: 'prudvireddy7733@gmail.com', password: 'password123' },
        { name: 'Demo User', email: 'demo@quicktask.com', password: 'password123' },
        { name: 'Omesh', email: 'omesha92020@gmail.com', password: 'omesh123' }
    ],
    teams: [
        { name: 'School ERP', description: 'Institutional Management System', ownerEmail: 'prudvireddy7733@gmail.com' }
    ],
    tasks: [
        {
            title: '[BUG] Login fails on mobile',
            description: 'The login button is unresponsive on Safari iOS.\n**Severity:** Critical\n**Environment:** Production\n**Steps:** 1. Open Safari 2. Click Login\n**Expected:** Works\n**Actual:** Spins forever',
            priority: 'HIGH',
            status: 'TODO',
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            teamName: 'School ERP'
        },
        {
            title: 'Set up CI/CD pipeline',
            description: 'Configure GitHub Actions for the new repo.',
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            teamName: 'School ERP'
        },
        {
            title: 'Design UI Mockups',
            description: 'Create Figma designs for the student dashboard.',
            priority: 'MEDIUM',
            status: 'TODO',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            teamName: 'School ERP'
        }
    ]
};

async function migrate() {
    console.log('🚀 Starting Smart Migration v2...');

    try {
        // 1. Create Users
        const userMap = {};
        for (const u of existingData.users) {
            const hashedPassword = await bcrypt.hash(u.password, 10);
            const user = await prisma.user.upsert({
                where: { email: u.email },
                update: {},
                create: { ...u, password: hashedPassword }
            });
            userMap[u.email] = user.id;
        }
        console.log('✅ Users synced');

        // 2. Create Teams
        const teamMap = {};
        for (const t of existingData.teams) {
            const ownerId = userMap[t.ownerEmail];
            const team = await prisma.team.create({
                data: {
                    name: t.name,
                    description: t.description,
                    ownerId: ownerId,
                    members: {
                        create: { userId: ownerId, role: 'OWNER' }
                    }
                }
            });
            teamMap[t.name] = team.id;
        }
        console.log('✅ Teams created');

        // 3. Smart Task Categorization
        for (const task of existingData.tasks) {
            const titleLower = task.title.toLowerCase();
            const descLower = (task.description || '').toLowerCase();
            const isBugReport = titleLower.startsWith('[bug]');

            let category = 'GENERAL';
            if (isBugReport) {
                category = 'TESTING';
            } else if (titleLower.includes('design') || descLower.includes('mockup')) {
                category = 'DESIGN';
            } else if (titleLower.includes('pipeline') || titleLower.includes('deploy')) {
                category = 'DEVOPS';
            } else if (titleLower.includes('dev') || descLower.includes('api')) {
                category = 'DEVELOPMENT';
            }

            const taskData = {
                title: task.title,
                description: task.description,
                priority: task.priority,
                status: task.status,
                category: category,
                isBugReport,
                dueDate: task.dueDate,
                creatorId: userMap['prudvireddy7733@gmail.com'],
                teamId: teamMap[task.teamName]
            };

            // Intelligent Metadata Extraction for Bugs
            if (isBugReport && task.description) {
                const extract = (header) => {
                    const regex = new RegExp(`\\*\\*${header}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|$)`, 'i');
                    const match = task.description.match(regex);
                    return match ? match[1].trim() : '';
                };

                taskData.bugMetadata = {
                    severity: extract('Severity') || 'MEDIUM',
                    environment: extract('Environment') || 'PRODUCTION',
                    steps: extract('Steps'),
                    expected: extract('Expected'),
                    actual: extract('Actual')
                };
            }

            await prisma.task.create({
                data: taskData
            });
        }
        console.log('✅ Smart Categorization & Task Migration Complete');

    } catch (e) {
        console.error('❌ Migration failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();

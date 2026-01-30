const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Sample personal tasks
const sampleTasks = [
    {
        title: 'Complete project documentation',
        description: 'Write comprehensive README and API documentation',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    },
    {
        title: 'Review pull requests',
        description: 'Review and merge pending pull requests from team',
        priority: 'MEDIUM',
        status: 'TODO',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    },
    {
        title: 'Update dependencies',
        description: 'Update all npm packages to latest versions',
        priority: 'LOW',
        status: 'TODO',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    {
        title: 'Fix bug in authentication',
        description: 'JWT token expiration issue needs to be resolved',
        priority: 'HIGH',
        status: 'COMPLETED',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
        title: 'Design new landing page',
        description: 'Create mockups for the new marketing landing page',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    },
    {
        title: 'Prepare for team meeting',
        description: 'Prepare presentation slides and status report',
        priority: 'HIGH',
        status: 'TODO',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
    }
];

// Users
const users = [
    { name: 'Demo User', email: 'demo@quicktask.com', password: 'password123' },
    { name: 'Omesh', email: 'omesha92020@gmail.com', password: 'omesh123' },
    { name: 'akhila', email: 'vadlaakhila122@gmail.com', password: 'akhila123' },
    { name: 'manideep', email: 'msai6027@gmail.com', password: 'mani123' },
    { name: 'Devi', email: 'devimeher2930@gmail.com', password: 'devi123' },
    { name: 'pavan', email: 'pavanmirudoddi46@gmail.com', password: 'pavan123' }
];

const seedDatabase = async () => {
    try {
        console.log('🌱 Starting database seeding...');

        // Clear DB (order matters)
        await prisma.comment.deleteMany();
        await prisma.task.deleteMany();
        await prisma.teamMember.deleteMany();
        await prisma.teamInvite.deleteMany();
        await prisma.team.deleteMany();
        await prisma.user.deleteMany();
        console.log('🗑️  Cleared existing data');

        // Create users with hashed passwords
        const createdUsers = [];

        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            const createdUser = await prisma.user.create({
                data: {
                    name: user.name,
                    email: user.email,
                    password: hashedPassword
                }
            });
            createdUsers.push(createdUser);
        }

        console.log(`👤 Created ${createdUsers.length} users`);

        const demoUser = createdUsers.find(u => u.email === 'demo@quicktask.com');
        const omeshUser = createdUsers.find(u => u.email === 'omesha92020@gmail.com');
        const akhilaUser = createdUsers.find(u => u.email === 'vadlaakhila122@gmail.com');
        const manideepUser = createdUsers.find(u => u.email === 'msai6027@gmail.com');
        const deviUser = createdUsers.find(u => u.email === 'devimeher2930@gmail.com');
        const pavanUser = createdUsers.find(u => u.email === 'pavanmirudoddi46@gmail.com');

        // Create a sample team
        console.log('🏢 Creating sample team...');
        const team = await prisma.team.create({
            data: {
                name: 'QuickTask Development Team',
                description: 'The main development team for QuickTask',
                ownerId: demoUser.id,
                members: {
                    create: [
                        { userId: demoUser.id, role: 'OWNER' },
                        { userId: omeshUser.id, role: 'MEMBER' },
                        { userId: akhilaUser.id, role: 'MEMBER' },
                        { userId: manideepUser.id, role: 'MEMBER' },
                        { userId: deviUser.id, role: 'ADMIN' },
                        { userId: pavanUser.id, role: 'MEMBER' }
                    ]
                }
            }
        });
        console.log('✅ Team created with members');

        // Create personal tasks for Demo User
        await prisma.task.createMany({
            data: sampleTasks.map(task => ({
                ...task,
                creatorId: demoUser.id
            }))
        });
        console.log(`📝 Created ${sampleTasks.length} personal tasks for Demo User`);

        // Create team tasks assigned to different members
        const teamTasks = [
            {
                title: 'Set up CI/CD pipeline',
                description: 'Configure GitHub Actions for automated testing and deployment',
                priority: 'HIGH',
                status: 'IN_PROGRESS',
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                teamId: team.id,
                assigneeId: omeshUser.id,
                creatorId: demoUser.id
            },
            {
                title: 'Design database schema',
                description: 'Create ER diagram and Prisma schema for new features',
                priority: 'HIGH',
                status: 'TODO',
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                teamId: team.id,
                assigneeId: manideepUser.id,
                creatorId: demoUser.id
            },
            {
                title: 'Implement user authentication',
                description: 'Add OAuth login with Google and GitHub',
                priority: 'MEDIUM',
                status: 'IN_PROGRESS',
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                teamId: team.id,
                assigneeId: akhilaUser.id,
                creatorId: demoUser.id
            },
            {
                title: 'Create API documentation',
                description: 'Document all REST API endpoints with examples',
                priority: 'MEDIUM',
                status: 'TODO',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                teamId: team.id,
                assigneeId: pavanUser.id,
                creatorId: demoUser.id
            },
            {
                title: 'Fix mobile responsiveness',
                description: 'Ensure all pages work well on mobile devices',
                priority: 'LOW',
                status: 'COMPLETED',
                dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                teamId: team.id,
                assigneeId: deviUser.id,
                creatorId: demoUser.id
            },
            {
                title: 'Write unit tests',
                description: 'Add Jest tests for all utility functions',
                priority: 'MEDIUM',
                status: 'TODO',
                dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                teamId: team.id,
                assigneeId: omeshUser.id,
                creatorId: demoUser.id
            }
        ];

        await prisma.task.createMany({
            data: teamTasks
        });
        console.log(`📋 Created ${teamTasks.length} team tasks`);

        console.log('\n✨ Database seeded successfully!');
        console.log('\n📧 Demo Login (Team Owner):');
        console.log('Email: demo@quicktask.com');
        console.log('Password: password123');
        console.log('\n👤 Team Member Login:');
        console.log('Email: omesha92020@gmail.com');
        console.log('Password: omesh123\n');

    } catch (error) {
        console.error('❌ Seeding error:', error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
};

seedDatabase();

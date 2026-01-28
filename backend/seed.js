const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Sample data
const sampleTasks = [
    {
        title: 'Complete project documentation',
        description: 'Write comprehensive README and API documentation',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
    },
    {
        title: 'Review pull requests',
        description: 'Review and merge pending pull requests from team',
        priority: 'MEDIUM',
        status: 'TODO',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
    },
    {
        title: 'Update dependencies',
        description: 'Update all npm packages to latest versions',
        priority: 'LOW',
        status: 'TODO',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
    },
    {
        title: 'Fix bug in authentication',
        description: 'JWT token expiration issue needs to be resolved',
        priority: 'HIGH',
        status: 'COMPLETED',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
        title: 'Design new landing page',
        description: 'Create mockups for the new marketing landing page',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
    },
    {
        title: 'Prepare for team meeting',
        description: 'Prepare presentation slides and status report',
        priority: 'HIGH',
        status: 'TODO',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // Tomorrow
    }
];

const seedDatabase = async () => {
    try {
        console.log('🌱 Starting database seeding...');

        // Clear existing data
        await prisma.task.deleteMany({});
        await prisma.user.deleteMany({});
        console.log('🗑️  Cleared existing data');

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        // Create sample user
        const user = await prisma.user.create({
            data: {
                name: 'Demo User',
                email: 'demo@quicktask.com',
                password: hashedPassword
            }
        });
        console.log('👤 Created sample user:', user.email);

        // Create sample tasks
        const tasks = await prisma.task.createMany({
            data: sampleTasks.map(task => ({
                ...task,
                userId: user.id
            }))
        });
        console.log(`📝 Created ${sampleTasks.length} sample tasks`);

        console.log('\n✨ Database seeded successfully!');
        console.log('\n📧 Login credentials:');
        console.log('   Email: demo@quicktask.com');
        console.log('   Password: password123\n');

        await prisma.$disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
};

seedDatabase();

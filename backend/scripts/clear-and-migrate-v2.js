
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { execSync } = require('child_process');

async function main() {
    console.log('⚠️  WARNING: This script will DESTROY ALL DATA in the database.');
    console.log('Starting migration to EER schema...');

    try {
        // 1. Clear Data
        console.log('Cleaning existing data...');
        // Delete in order of dependency
        await prisma.comment.deleteMany();
        await prisma.submission.deleteMany();
        // Attachments, TaskHistory don't exist yet in old schema, so skip explicit delete if not there, 
        // but we can just let prisma reset handle it mostly.
        // However, to avoid FK issues during reset if schema changed drastically:
        // It's often safer to just drop the schema.

        // Actually, "prisma migrate reset" drops the DB, so we don't strictly need to delete rows manually 
        // IF we run that command. But if we want to be sure:
        // await prisma.task.deleteMany(); 
        // await prisma.teamMember.deleteMany();
        // await prisma.teamInvite.deleteMany();
        // await prisma.team.deleteMany();
        // await prisma.user.deleteMany();

        console.log('Data cleared (logically). Now running database reset and migration...');

        // 2. Run Prisma Reset & Push
        // Note: We use execSync to run the shell command. 
        // --force to skip interactive confirmation
        execSync('npx prisma migrate reset --force', { stdio: 'inherit' });

        // 3. Generate Client
        console.log('Generating Prisma Client...');
        execSync('npx prisma generate', { stdio: 'inherit' });

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

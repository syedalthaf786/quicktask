// ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠
// DANGER: DESTRUCTIVE MIGRATION SCRIPT
// This script will PERMANENTLY DELETE ALL DATA in the database
// Only use this for development or staging environments
// ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { execSync } = require('child_process');
const readline = require('readline');

async function main() {
    // Safety Check 1: Prevent running in production
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ BLOCKED: This script cannot run in production!');
        console.error('Set NODE_ENV to something else if you really know what you\'re doing.');
        process.exit(1);
    }

    // Safety Check 2: Require explicit permission via environment variable
    if (process.env.ALLOW_DESTRUCTIVE_MIGRATION !== 'true') {
        console.error('❌ BLOCKED: Destructive migration not authorized.');
        console.error('To run this script, set: ALLOW_DESTRUCTIVE_MIGRATION=true');
        console.error('Example: SET ALLOW_DESTRUCTIVE_MIGRATION=true && node backend/scripts/clear-and-migrate-v2.js');
        process.exit(1);
    }

    console.log('\n⚠️⚠️⚠️  DESTRUCTIVE ACTION WARNING  ⚠️⚠️⚠️\n');
    console.log('This script will:');
    console.log('  1. DROP the entire database schema');
    console.log('  2. DELETE all data permanently');
    console.log('  3. Recreate tables from scratch');
    console.log('  4. You will LOSE ALL existing data\n');
    console.log(`Current Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'Not set'}\n`);

    // Safety Check 3: Interactive confirmation
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const confirmed = await new Promise((resolve) => {
        rl.question('Type "DELETE ALL DATA" to confirm (case-sensitive): ', (answer) => {
            rl.close();
            resolve(answer === 'DELETE ALL DATA');
        });
    });

    if (!confirmed) {
        console.log('\n❌ Migration cancelled. No changes made.');
        process.exit(0);
    }

    try {
        console.log('\n🗑️  Starting destructive migration...');

        // Clear data first (optional, reset will do this anyway)
        console.log('Cleaning existing data...');
        await prisma.comment.deleteMany();
        await prisma.submission.deleteMany();

        console.log('Data cleared. Running database reset and migration...');

        // Run Prisma Reset & Push
        // --force to skip interactive confirmation (we already did our own)
        execSync('npx prisma migrate reset --force', { stdio: 'inherit' });

        // Generate Client
        console.log('Generating Prisma Client...');
        execSync('npx prisma generate', { stdio: 'inherit' });

        console.log('\n✅ Migration completed successfully!');
        console.log('💡 Tip: Run "npm run seed" to populate with sample data\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

# Legacy Models Directory

This directory contains **deprecated** Mongoose models from the pre-Prisma era of QuickTask.

⚠️ **DO NOT USE THESE FILES** ⚠️

These files are kept for historical reference only. The project has migrated to Prisma ORM and PostgreSQL.

## Current Database Solution
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Schema**: See `prisma/schema.prisma`

## Migration History
- Migrated from MongoDB + Mongoose to PostgreSQL + Prisma
- Date: January 2026
- Reason: Better type safety, performance, and relation management

If you need to reference old data structures, these files can help understand the previous schema. However, all new development should use Prisma models.

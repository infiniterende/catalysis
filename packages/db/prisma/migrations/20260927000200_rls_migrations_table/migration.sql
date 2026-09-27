-- Prisma's own bookkeeping table is in the public schema too; close it to the Data API as well.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

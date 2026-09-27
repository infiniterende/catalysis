-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'member';

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "prayerId" TEXT,
    "scripture" TEXT,
    "answeredOn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TikTokVideo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'Faith',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "screening" TEXT,
    "submittedById" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "TikTokVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TikTokCreator" (
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TikTokCreator_pkey" PRIMARY KEY ("handle")
);

-- CreateIndex
CREATE INDEX "JournalEntry_userId_date_idx" ON "JournalEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "TikTokVideo_status_reviewedAt_idx" ON "TikTokVideo"("status", "reviewedAt");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Keep Supabase's Data API closed to the new tables as well.
ALTER TABLE "JournalEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TikTokVideo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TikTokCreator" ENABLE ROW LEVEL SECURITY;

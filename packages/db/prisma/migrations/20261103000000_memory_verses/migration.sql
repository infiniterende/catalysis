-- CreateTable
CREATE TABLE "MemoryVerse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseStart" INTEGER NOT NULL,
    "verseEnd" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "box" INTEGER NOT NULL DEFAULT 0,
    "dueOn" TEXT NOT NULL,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedOn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryVerse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemoryVerse_userId_dueOn_idx" ON "MemoryVerse"("userId", "dueOn");

-- AddForeignKey
ALTER TABLE "MemoryVerse" ADD CONSTRAINT "MemoryVerse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Only the server reads and writes this table; Supabase's public API gets nothing.
ALTER TABLE "MemoryVerse" ENABLE ROW LEVEL SECURITY;

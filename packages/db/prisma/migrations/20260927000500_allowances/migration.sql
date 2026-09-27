-- CreateTable
CREATE TABLE "Allowance" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Allowance_pkey" PRIMARY KEY ("key")
);


-- Keep Supabase's Data API closed to the new table as well.
ALTER TABLE "Allowance" ENABLE ROW LEVEL SECURITY;

-- CreateTable
CREATE TABLE "HourText" (
    "date" TEXT NOT NULL,
    "hour" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'en',
    "day" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HourText_pkey" PRIMARY KEY ("date","hour","lang")
);


-- Keep Supabase's Data API closed to the new table as well.
ALTER TABLE "HourText" ENABLE ROW LEVEL SECURITY;

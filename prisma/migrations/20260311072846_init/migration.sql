-- CreateTable
CREATE TABLE "Patient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "originalPriority" INTEGER NOT NULL,
    "boosted" BOOLEAN NOT NULL DEFAULT false,
    "boostReason" TEXT,
    "enqueuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "treatedAt" DATETIME,
    "waitSeconds" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'waiting'
);

-- CreateTable
CREATE TABLE "BoostEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientName" TEXT NOT NULL,
    "oldPriority" INTEGER NOT NULL,
    "newPriority" INTEGER NOT NULL,
    "reason" TEXT NOT NULL
);

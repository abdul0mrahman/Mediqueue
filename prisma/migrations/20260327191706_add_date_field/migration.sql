-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BoostEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientName" TEXT NOT NULL,
    "oldPriority" INTEGER NOT NULL,
    "newPriority" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_BoostEvent" ("id", "newPriority", "oldPriority", "patientName", "reason", "time") SELECT "id", "newPriority", "oldPriority", "patientName", "reason", "time" FROM "BoostEvent";
DROP TABLE "BoostEvent";
ALTER TABLE "new_BoostEvent" RENAME TO "BoostEvent";
CREATE TABLE "new_Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientUserId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Notification" ("createdAt", "id", "message", "patientUserId", "read") SELECT "createdAt", "id", "message", "patientUserId", "read" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE TABLE "new_Patient" (
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
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "patientUserId" INTEGER,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Patient" ("boostReason", "boosted", "condition", "enqueuedAt", "id", "name", "originalPriority", "patientUserId", "priority", "status", "treatedAt", "waitSeconds") SELECT "boostReason", "boosted", "condition", "enqueuedAt", "id", "name", "originalPriority", "patientUserId", "priority", "status", "treatedAt", "waitSeconds" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE TABLE "new_VisitHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientUserId" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisitHistory_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "PatientUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_VisitHistory" ("condition", "createdAt", "id", "patientUserId", "priority") SELECT "condition", "createdAt", "id", "patientUserId", "priority" FROM "VisitHistory";
DROP TABLE "VisitHistory";
ALTER TABLE "new_VisitHistory" RENAME TO "VisitHistory";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

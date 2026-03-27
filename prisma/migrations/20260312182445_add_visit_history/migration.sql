-- CreateTable
CREATE TABLE "VisitHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientUserId" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisitHistory_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "PatientUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

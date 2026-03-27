-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "patientUserId" INTEGER;

-- CreateTable
CREATE TABLE "PatientUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "bloodType" TEXT NOT NULL,
    "emergencyContact" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientUser_username_key" ON "PatientUser"("username");

import { PrismaClient } from '../app/generated/prisma';

const prisma = new PrismaClient();

async function clearAllData() {
  console.log('Starting to clear all data...');
  
  // Delete in order to avoid foreign key errors
  console.log('Deleting visit history...');
  await prisma.visitHistory.deleteMany();
  
  console.log('Deleting notifications...');
  await prisma.notification.deleteMany();
  
  console.log('Deleting patients...');
  await prisma.patient.deleteMany();
  
  console.log('Deleting boost events...');
  await prisma.boostEvent.deleteMany();
  
  console.log('Deleting patient users...');
  const result = await prisma.patientUser.deleteMany();
  
  console.log(`✅ Done! Deleted ${result.count} patient users and all related data.`);
  console.log('Database is now completely empty.');
}

clearAllData()
  .catch((error) => {
    console.error('❌ Error:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
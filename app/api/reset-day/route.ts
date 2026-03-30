import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to get today's start time
function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export async function POST() {
  try {
    console.log('Starting new day reset...');
    
    const today = getTodayStart();
    
    // Only delete TODAY'S data - preserve historical data
    await prisma.visitHistory.deleteMany({
      where: {
        date: {
          gte: today
        }
      }
    });
    
    await prisma.notification.deleteMany({
      where: {
        date: {
          gte: today
        }
      }
    });
    
    await prisma.patient.deleteMany({
      where: {
        date: {
          gte: today
        }
      }
    });
    
    await prisma.boostEvent.deleteMany({
      where: {
        date: {
          gte: today
        }
      }
    });
    
    // Don't delete patient users - they should persist across days
    // Only unlink them from today's patients if needed
    await prisma.patient.updateMany({
      where: {
        date: {
          gte: today
        },
        patientUserId: {
          not: null
        }
      },
      data: {
        patientUserId: null
      }
    });
    
    console.log('New day reset completed successfully - today\'s data cleared');
    
    return NextResponse.json({ 
      success: true, 
      message: 'New day started! Today\'s data cleared. Token numbers reset.' 
    });
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reset day' },
      { status: 500 }
    );
  }
}
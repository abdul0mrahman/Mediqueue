import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { type } = await req.json();
    
    if (type === "queue") {
      // Delete all active queue patients
      await prisma.patient.deleteMany({
        where: {
          treatedAt: null // Only delete patients still in queue (not treated)
        }
      });
      return NextResponse.json({ success: true, message: "Queue cleared" });
    }
    
    if (type === "treated") {
      // Delete all treated patients
      await prisma.patient.deleteMany({
        where: {
          treatedAt: { not: null } // Delete only treated patients
        }
      });
      return NextResponse.json({ success: true, message: "Treated patients cleared" });
    }
    
    if (type === "boosts") {
      // Delete all boost events
      await prisma.boostEvent.deleteMany({});
      return NextResponse.json({ success: true, message: "Boost history cleared" });
    }
    
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Clear data error:", error);
    return NextResponse.json({ error: "Failed to clear data" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
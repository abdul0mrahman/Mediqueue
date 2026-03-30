import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/history?patientUserId=1
export async function GET(req: NextRequest) {
  const patientUserId = Number(req.nextUrl.searchParams.get("patientUserId"));
  if (!patientUserId) return NextResponse.json({ error: "Missing patientUserId" }, { status: 400 });

  try {
    const visits = await prisma.visitHistory.findMany({
      where: { patientUserId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ visits });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

// POST /api/history
// body: { patientUserId, condition, priority }
export async function POST(req: NextRequest) {
  try {
    const { patientUserId, condition, priority } = await req.json();
    if (!patientUserId || !condition || !priority) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const visit = await prisma.visitHistory.create({
      data: { patientUserId, condition, priority },
    });
    return NextResponse.json({ visit });
  } catch (e) {
    return NextResponse.json({ error: "Failed to save visit" }, { status: 500 });
  }
}
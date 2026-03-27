import { NextRequest } from "next/server";
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

// GET /api/notify?patientUserId=1
// Patient portal polls this every 3s
export async function GET(req: NextRequest) {
  const patientUserId = Number(req.nextUrl.searchParams.get("patientUserId"));
  if (!patientUserId) return Response.json({ error: "Missing patientUserId" }, { status: 400 });

  try {
    const notification = await prisma.notification.findFirst({
      where: { patientUserId, read: false },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ notification });
  } catch {
    return Response.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST /api/notify
// Admin calls this to notify a patient
// body: { patientUserId, message }
export async function POST(req: NextRequest) {
  try {
    const { patientUserId, message } = await req.json();
    if (!patientUserId || !message)
      return Response.json({ error: "Missing fields" }, { status: 400 });

    const notification = await prisma.notification.create({
      data: { patientUserId, message },
    });
    return Response.json({ notification });
  } catch {
    return Response.json({ error: "Failed to create" }, { status: 500 });
  }
}

// PATCH /api/notify
// Patient marks notification as read
// body: { id }
export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json();
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to update" }, { status: 500 });
  }
}
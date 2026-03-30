// app/api/queue/route.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STARVATION_MS = 20000;

const CONDITIONS = [
  { condition: "Chest pain", priority: 5 },
  { condition: "Cardiac arrest", priority: 5 },
  { condition: "Severe trauma", priority: 4 },
  { condition: "Stroke symptoms", priority: 4 },
  { condition: "High fever", priority: 3 },
  { condition: "Broken bone", priority: 3 },
  { condition: "Deep laceration", priority: 3 },
  { condition: "Sprained ankle", priority: 2 },
  { condition: "Mild allergic reaction", priority: 2 },
  { condition: "Headache", priority: 1 },
  { condition: "Minor bruise", priority: 1 },
];

const NAMES = ["Ali Hassan", "Sara Khan", "John Doe", "Maria Garcia", "Ahmed Raza",
  "Priya Patel", "Omar Sheikh", "Li Wei", "Emma Wilson", "Carlos Ruiz"];

async function applyStarvationPrevention() {
  const now = new Date();
  const waitingPatients = await prisma.patient.findMany({
    where: { status: "waiting" },
  });

  for (const p of waitingPatients) {
    const waitMs = now.getTime() - p.enqueuedAt.getTime();
    if (waitMs > STARVATION_MS && p.priority < 5 && !p.boosted) {
      const newPriority = p.priority + 1;
      const reason = `Waited over ${Math.floor(waitMs / 1000)}s`;
      await prisma.patient.update({
        where: { id: p.id },
        data: { priority: newPriority, boosted: true, boostReason: reason },
      });
      await prisma.boostEvent.create({
        data: {
          patientName: p.name,
          oldPriority: p.priority,
          newPriority,
          reason,
        },
      });
    }
  }
}

async function getAnalytics() {
  const totalAdmitted = await prisma.patient.count();
  const totalTreated = await prisma.patient.count({ where: { status: "treated" } });

  const treatmentLog = await prisma.patient.findMany({
    where: { status: "treated" },
    orderBy: { treatedAt: "desc" },
    take: 30,
    select: { treatedAt: true, priority: true, waitSeconds: true, name: true },
  });

  const boostEvents = await prisma.boostEvent.findMany({
    orderBy: { time: "desc" },
    take: 20,
  });

  return {
    totalAdmitted,
    totalTreated,
    treatmentLog: treatmentLog.map(t => ({
      time: t.treatedAt?.getTime() ?? 0,
      severity: t.priority,
      waitSeconds: t.waitSeconds,
      name: t.name,
    })),
    boostEvents: boostEvents.map(b => ({
      time: b.time.getTime(),
      patientName: b.patientName,
      oldPriority: b.oldPriority,
      newPriority: b.newPriority,
      reason: b.reason,
    })),
  };
}

function serializePatient(p: any) {
  return {
    ...p,
    enqueuedAt: p.enqueuedAt.getTime(),
    treatedAt: p.treatedAt?.getTime() ?? undefined,
  };
}

export async function GET() {
  await applyStarvationPrevention();

  const now = Date.now();
  const queue = await prisma.patient.findMany({
    where: { status: "waiting" },
    orderBy: [{ priority: "desc" }, { enqueuedAt: "asc" }],
  });

  const treated = await prisma.patient.findMany({
    where: { status: "treated" },
    orderBy: { treatedAt: "desc" },
    take: 50,
  });

  const analytics = await getAnalytics();

  return Response.json({
    queue: queue.map(p => ({
      ...serializePatient(p),
      waitSeconds: Math.floor((now - p.enqueuedAt.getTime()) / 1000),
    })),
    treated: treated.map(serializePatient),
    analytics,
  });
}

export async function POST(req: Request) {
  const data = await req.json();

  const queueCount = await prisma.patient.count({ where: { status: "waiting" } });

  if (data.simulate) {
    if (queueCount >= 10) return Response.json({ error: "Queue full" }, { status: 429 });
    const pick = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const patient = await prisma.patient.create({
      data: {
        name,
        condition: pick.condition,
        priority: pick.priority,
        originalPriority: pick.priority,
        boosted: false,
        status: "waiting",
      },
    });
    await applyStarvationPrevention();
    const queue = await prisma.patient.findMany({
      where: { status: "waiting" },
      orderBy: [{ priority: "desc" }, { enqueuedAt: "asc" }],
    });
    return Response.json({ message: "Simulated patient added", patient: serializePatient(patient), queue: queue.map(serializePatient) });
  }

  if (!data.name || !data.condition || !data.priority)
    return Response.json({ error: "name, condition, and priority are required" }, { status: 400 });
  if (data.priority < 1 || data.priority > 5)
    return Response.json({ error: "Priority must be 1–5" }, { status: 400 });
  if (queueCount >= 10)
    return Response.json({ error: "Queue full. Max 10 patients." }, { status: 429 });

  const patient = await prisma.patient.create({
    data: {
      name: data.name,
      condition: data.condition,
      priority: Number(data.priority),
      originalPriority: Number(data.priority),
      boosted: false,
      status: "waiting",
      patientUserId: data.patientUserId ? Number(data.patientUserId) : null, // ✅ FIX 1: save patientUserId
    },
  });

  await applyStarvationPrevention();
  const queue = await prisma.patient.findMany({
    where: { status: "waiting" },
    orderBy: [{ priority: "desc" }, { enqueuedAt: "asc" }],
  });

  // ✅ FIX 2: return as "entry" so frontend can read entry.id as the token
  return Response.json({ message: "Patient added", entry: serializePatient(patient), queue: queue.map(serializePatient) });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (body.override) {
    const { id, newPriority, reason } = body;
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return Response.json({ error: "Patient not found" }, { status: 404 });

    await prisma.patient.update({
      where: { id },
      data: { priority: newPriority, boosted: true, boostReason: reason || "Doctor override" },
    });
    await prisma.boostEvent.create({
      data: {
        patientName: patient.name,
        oldPriority: patient.priority,
        newPriority,
        reason: reason || "Doctor override",
      },
    });

    await applyStarvationPrevention();
    const queue = await prisma.patient.findMany({
      where: { status: "waiting" },
      orderBy: [{ priority: "desc" }, { enqueuedAt: "asc" }],
    });
    return Response.json({ message: "Priority overridden", queue: queue.map(serializePatient) });
  }

  await applyStarvationPrevention();

  let patient;
  if (body.treatById) {
    patient = await prisma.patient.findUnique({ where: { id: body.treatById } });
    if (!patient) return Response.json({ error: "Patient not found" }, { status: 404 });
  } else {
    const queue = await prisma.patient.findMany({
      where: { status: "waiting" },
      orderBy: [{ priority: "desc" }, { enqueuedAt: "asc" }],
      take: 1,
    });
    if (queue.length === 0) return Response.json({ error: "Queue is empty" }, { status: 404 });
    patient = queue[0];
  }

  const waitSeconds = Math.floor((Date.now() - patient.enqueuedAt.getTime()) / 1000);
  const treatedPatient = await prisma.patient.update({
    where: { id: patient.id },
    data: { status: "treated", treatedAt: new Date(), waitSeconds },
  });

  return Response.json({ message: "Patient treated", treatedPatient: serializePatient(treatedPatient) });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) return Response.json({ error: "Patient not found" }, { status: 404 });

  await prisma.patient.update({ where: { id }, data: { status: "removed" } });
  return Response.json({ message: "Patient removed" });
}
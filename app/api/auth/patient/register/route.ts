import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { username, password, name, age, gender, phone, bloodType, emergencyContact } = await req.json();

    if (!username || !password || !name || !age || !gender || !phone || !bloodType || !emergencyContact) {
      return Response.json({ error: "All fields are required." }, { status: 400 });
    }

    const existing = await prisma.patientUser.findUnique({ where: { username } });
    if (existing) {
      return Response.json({ error: "Username already taken." }, { status: 409 });
    }

    const patient = await prisma.patientUser.create({
      data: { username, password, name, age: parseInt(age), gender, phone, bloodType, emergencyContact },
    });

    return Response.json({
      patient: { id: patient.id, name: patient.name, username: patient.username, age: patient.age, gender: patient.gender, bloodType: patient.bloodType, phone: patient.phone, emergencyContact: patient.emergencyContact }
    });
  } catch (error) {
    console.error("Register error:", error);
    return Response.json({ error: "Registration failed." }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
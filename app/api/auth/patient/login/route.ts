import { PrismaClient } from "../../../../generated/prisma";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: "Username and password required." }, { status: 400 });
    }

    const patient = await prisma.patientUser.findUnique({ where: { username } });

    if (!patient || patient.password !== password) {
      return Response.json({ error: "Invalid username or password." }, { status: 401 });
    }

    return Response.json({
      patient: { id: patient.id, name: patient.name, username: patient.username, age: patient.age, gender: patient.gender, bloodType: patient.bloodType, phone: patient.phone, emergencyContact: patient.emergencyContact }
    });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ error: "Login failed." }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
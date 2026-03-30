import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_ACCOUNT = {
  id: 0,
  username: "Abood",
  password: "Saima",
  name: "Demo Patient",
  age: 20,  
  gender: "Male",
  bloodType: "A+",
  phone: "8019299010",
  emergencyContact: "Saima Mahveen 6300384938"
};

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: "Username and password required." }, { status: 400 });
    }

    // Demo account shortcut
    if (username === DEMO_ACCOUNT.username && password === DEMO_ACCOUNT.password) {
      const { password: _, ...demoPatient } = DEMO_ACCOUNT;
      return Response.json({ patient: demoPatient });
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
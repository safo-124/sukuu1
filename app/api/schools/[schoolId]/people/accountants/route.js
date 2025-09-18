import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAccountantSchema } from "@/validators/academics.validators";

// Helper: ensure user is authenticated and has access to the school
async function authorize(request, params) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // Superadmin can access any school.
  if (session.user.role === "SUPERADMIN") {
    return { session };
  }

  const schoolId = (await params).schoolId;
  if (!schoolId) {
    return { error: NextResponse.json({ error: "School ID missing" }, { status: 400 }) };
  }

  // If user is staff of this school allow.
  if (session.user.schoolId === schoolId) {
    return { session };
  }

  return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

export async function GET(request, paramsPromise) {
  try {
    const { error } = await authorize(request, paramsPromise);
    if (error) return error;

    const schoolId = (await paramsPromise).schoolId;

    const accountants = await prisma.staff.findMany({
      where: { schoolId, role: "ACCOUNTANT" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        profilePictureUrl: true,
        staffIdNumber: true,
        jobTitle: true,
        qualification: true,
        departmentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: accountants });
  } catch (err) {
    console.error("GET /accountants error", err);
    return NextResponse.json({ error: "Failed to fetch accountants" }, { status: 500 });
  }
}

export async function POST(request, paramsPromise) {
  try {
    const { session, error } = await authorize(request, paramsPromise);
    if (error) return error;

    const schoolId = (await paramsPromise).schoolId;
    const json = await request.json();
    const parsed = createAccountantSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Ensure email uniqueness within school staff
    const existing = await prisma.staff.findFirst({
      where: { email: parsed.data.email, schoolId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    // Create staff record; password hashing delegated to middleware/hook if exists, else hash here.
    // For now, perform simple hashing if bcrypt available else store as-is (NOT RECOMMENDED for production)
    let passwordHash = parsed.data.password;
    try {
      const bcrypt = await import("bcryptjs").catch(() => null);
      if (bcrypt && bcrypt.hashSync) {
        passwordHash = bcrypt.hashSync(parsed.data.password, 10);
      }
    } catch (_) {}

    const staff = await prisma.staff.create({
      data: {
        schoolId,
        role: "ACCOUNTANT",
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        password: passwordHash,
        phoneNumber: parsed.data.phoneNumber || null,
        profilePictureUrl: parsed.data.profilePictureUrl || null,
        staffIdNumber: parsed.data.staffIdNumber,
        jobTitle: parsed.data.jobTitle || "Accountant",
        qualification: parsed.data.qualification || null,
        departmentId: parsed.data.departmentId || null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        staffIdNumber: true,
        jobTitle: true,
        qualification: true,
        departmentId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: staff }, { status: 201 });
  } catch (err) {
    console.error("POST /accountants error", err);
    return NextResponse.json({ error: "Failed to create accountant" }, { status: 500 });
  }
}

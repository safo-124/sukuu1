import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createLibrarianSchema } from "@/validators/academics.validators";

async function authorize(schoolId) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  // SUPER_ADMIN must not access in-school people management
  if (!schoolId || typeof schoolId !== 'string') return { error: NextResponse.json({ error: "Invalid or missing school ID" }, { status: 400 }) };
  if (session.user.schoolId === schoolId && ["SCHOOL_ADMIN","HR_MANAGER","SECRETARY"].includes(session.user.role)) return { session };
  return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

export async function GET(request, { params }) {
  try {
    const { schoolId } = params;
    const { error } = await authorize(schoolId);
    if (error) return error;

    const staffRows = await prisma.staff.findMany({
      where: { schoolId, user: { role: 'LIBRARIAN' } },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, profilePictureUrl: true, role: true } },
        department: { select: { id: true, name: true } }
      }
    });

    const librarians = staffRows.map(s => ({
      id: s.id,
      userId: s.userId,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      email: s.user.email,
      phoneNumber: s.user.phoneNumber,
      profilePictureUrl: s.user.profilePictureUrl,
      role: s.user.role,
      staffIdNumber: s.staffIdNumber,
      jobTitle: s.jobTitle,
      qualification: s.qualification,
      departmentId: s.departmentId,
      department: s.department ? { id: s.department.id, name: s.department.name } : null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json({ data: librarians });
  } catch (err) {
    console.error("GET /librarians error", err);
    return NextResponse.json({ error: "Failed to fetch librarians" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { schoolId } = params;
    const { session, error } = await authorize(schoolId);
    if (error) return error;
    const json = await request.json();
    const parsed = createLibrarianSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { firstName, lastName, email, password, phoneNumber, profilePictureUrl, staffIdNumber, jobTitle, qualification, departmentId } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findFirst({ where: { email, schoolId } });
      if (existingUser) throw new Error('Email already in use');

      const existingStaffId = await tx.staff.findUnique({ where: { schoolId_staffIdNumber: { schoolId, staffIdNumber } } });
      if (existingStaffId) throw new Error('Staff ID number already exists');

      let hashed = password;
      try {
        const bcrypt = await import('bcryptjs').catch(() => null);
        if (bcrypt?.hashSync) hashed = bcrypt.hashSync(password, 10);
      } catch (_) {}

      const user = await tx.user.create({
        data: {
          email,
          hashedPassword: hashed,
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
          profilePictureUrl: profilePictureUrl || null,
          role: 'LIBRARIAN',
          schoolId,
        },
        select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, profilePictureUrl: true, role: true }
      });

      const staff = await tx.staff.create({
        data: {
          userId: user.id,
          schoolId,
          staffIdNumber,
          jobTitle: jobTitle || 'Librarian',
          qualification: qualification || null,
          departmentId: departmentId || null,
        },
        select: { id: true, staffIdNumber: true, jobTitle: true, qualification: true, departmentId: true, createdAt: true }
      });

      return { user, staff };
    });

    const response = {
      id: result.staff.id,
      userId: result.user.id,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      email: result.user.email,
      phoneNumber: result.user.phoneNumber,
      profilePictureUrl: result.user.profilePictureUrl,
      role: result.user.role,
      staffIdNumber: result.staff.staffIdNumber,
      jobTitle: result.staff.jobTitle,
      qualification: result.staff.qualification,
      departmentId: result.staff.departmentId,
      createdAt: result.staff.createdAt,
    };

    return NextResponse.json({ data: response }, { status: 201 });
  } catch (err) {
    console.error("POST /librarians error", err);
    const msg = err?.message === 'Email already in use' || err?.message === 'Staff ID number already exists'
      ? err.message
      : 'Failed to create librarian';
    const status = msg === err?.message ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

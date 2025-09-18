import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateAccountantSchema } from "@/validators/academics.validators";

async function authorize(request, params) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (session.user.role === "SUPERADMIN") return { session };

  const schoolId = (await params).schoolId;
  if (!schoolId) return { error: NextResponse.json({ error: "School ID missing" }, { status: 400 }) };
  if (session.user.schoolId === schoolId) return { session };
  return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

export async function PATCH(request, paramsPromise) {
  try {
    const { session, error } = await authorize(request, paramsPromise);
    if (error) return error;
    const { schoolId, accountantId } = await paramsPromise;

    const json = await request.json();
    const parsed = updateAccountantSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Email uniqueness if email is being updated
    if (parsed.data.email) {
      const exists = await prisma.staff.findFirst({
        where: { email: parsed.data.email, schoolId, NOT: { id: accountantId } },
        select: { id: true },
      });
      if (exists) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    const updateData = { ...parsed.data };
    // Password hashing if provided
    if (updateData.password) {
      try {
        const bcrypt = await import("bcryptjs").catch(() => null);
        if (bcrypt && bcrypt.hashSync) {
          updateData.password = bcrypt.hashSync(updateData.password, 10);
        }
      } catch (_) {}
    }

    const updated = await prisma.staff.update({
      where: { id: accountantId },
      data: updateData,
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
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("PATCH /accountants/[id] error", err);
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Accountant not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update accountant" }, { status: 500 });
  }
}

export async function DELETE(request, paramsPromise) {
  try {
    const { session, error } = await authorize(request, paramsPromise);
    if (error) return error;
    const { accountantId } = await paramsPromise;

    await prisma.staff.delete({ where: { id: accountantId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /accountants/[id] error", err);
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Accountant not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete accountant" }, { status: 500 });
  }
}

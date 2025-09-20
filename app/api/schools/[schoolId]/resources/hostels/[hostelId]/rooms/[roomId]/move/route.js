// app/api/schools/[schoolId]/resources/hostels/[hostelId]/rooms/[roomId]/move/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, hostelIdSchema, hostelRoomIdSchema, moveStudentRoomSchema } from '@/validators/resources.validators';

// POST: Move student from current room (roomId) to another room (toRoomId)
export async function POST(request, { params }) {
  const { schoolId, hostelId, roomId } = params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','HOSTEL_WARDEN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    hostelIdSchema.parse(hostelId);
    hostelRoomIdSchema.parse(roomId);
    const parsed = moveStudentRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }
    const { studentId, toRoomId } = parsed.data;

    // Validate rooms and student
    const [fromRoom, toRoom, student] = await Promise.all([
      prisma.hostelRoom.findFirst({ where: { id: roomId, hostelId, schoolId } }),
      prisma.hostelRoom.findFirst({ where: { id: toRoomId, schoolId } }),
      prisma.student.findFirst({ where: { id: studentId, schoolId }, select: { id: true, hostelRoomId: true } }),
    ]);
    if (!fromRoom) return NextResponse.json({ error: 'Source room not found' }, { status: 404 });
    if (!toRoom) return NextResponse.json({ error: 'Destination room not found' }, { status: 404 });
    if (student?.hostelRoomId !== roomId) return NextResponse.json({ error: 'Student is not allocated to the source room.' }, { status: 400 });

    // Enforce capacity on destination room
    if (toRoom.currentOccupancy >= toRoom.bedCapacity) {
      return NextResponse.json({ error: 'Destination room is at full capacity.' }, { status: 409 });
    }

    // Ensure destination room's hostel gender rules if different hostel
    const [fromHostel, toHostel, studentGender] = await Promise.all([
      prisma.hostel.findFirst({ where: { id: fromRoom.hostelId, schoolId }, select: { genderPreference: true } }),
      prisma.hostel.findFirst({ where: { id: toRoom.hostelId, schoolId }, select: { genderPreference: true } }),
      prisma.student.findFirst({ where: { id: studentId }, select: { gender: true }})
    ]);
    if (toHostel?.genderPreference && toHostel.genderPreference !== 'Mixed') {
      if (!studentGender?.gender || studentGender.gender.toUpperCase() !== toHostel.genderPreference.toUpperCase()) {
        return NextResponse.json({ error: `Destination hostel restricted to ${toHostel.genderPreference}.` }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.student.update({ where: { id: studentId }, data: { hostelRoomId: toRoomId } });
      await tx.hostelRoom.update({ where: { id: roomId }, data: { currentOccupancy: { decrement: 1 } } });
      await tx.hostelRoom.update({ where: { id: toRoomId }, data: { currentOccupancy: { increment: 1 } } });
    });

    return NextResponse.json({ success: true, message: 'Student moved to destination room.' }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: err.issues }, { status: 400 });
    }
    console.error('Move student error', err);
    return NextResponse.json({ error: 'Failed to move student' }, { status: 500 });
  }
}

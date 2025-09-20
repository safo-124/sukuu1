// app/api/schools/[schoolId]/resources/hostels/[hostelId]/rooms/[roomId]/allocations/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, hostelIdSchema, hostelRoomIdSchema, allocateStudentToRoomSchema, unassignStudentFromRoomSchema } from '@/validators/resources.validators';

// POST: Allocate a student to a room
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
    const parsed = allocateStudentToRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }
    const { studentId } = parsed.data;

    // Validate room and student belong to same school and room belongs to hostel
    const [room, student] = await Promise.all([
      prisma.hostelRoom.findFirst({ where: { id: roomId, hostelId, schoolId } }),
      prisma.student.findFirst({ where: { id: studentId, schoolId }, select: { id: true, gender: true } })
    ]);
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    // Fetch hostel for gender preference enforcement
    const hostel = await prisma.hostel.findFirst({ where: { id: hostelId, schoolId }, select: { genderPreference: true } });

    // Enforce capacity
    if (room.currentOccupancy >= room.bedCapacity) {
      return NextResponse.json({ error: 'Room is at full capacity.' }, { status: 409 });
    }

    // Enforce gender preference if set (skip if Mixed or null)
    if (hostel?.genderPreference && hostel.genderPreference !== 'Mixed') {
      if (!student.gender || student.gender.toUpperCase() !== hostel.genderPreference.toUpperCase()) {
        return NextResponse.json({ error: `Hostel restricted to ${hostel.genderPreference}.` }, { status: 400 });
      }
    }

    // If the student is already in another room, prevent duplicate assignment
    const existing = await prisma.student.findUnique({ where: { id: studentId }, select: { hostelRoomId: true } });
    if (existing?.hostelRoomId && existing.hostelRoomId !== roomId) {
      return NextResponse.json({ error: 'Student already allocated to a different room. Use move API.' }, { status: 409 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.student.update({ where: { id: studentId }, data: { hostelRoomId: roomId } });
      const updatedRoom = await tx.hostelRoom.update({ where: { id: roomId }, data: { currentOccupancy: { increment: 1 } } });
      return updatedRoom;
    });

    return NextResponse.json({ success: true, room: updated, message: 'Student allocated to room.' }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: err.issues }, { status: 400 });
    }
    console.error('Allocate student error', err);
    return NextResponse.json({ error: 'Failed to allocate student' }, { status: 500 });
  }
}

// DELETE: Unassign a student from a room
export async function DELETE(request, { params }) {
  const { schoolId, hostelId, roomId } = params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.schoolId !== schoolId || !['SCHOOL_ADMIN','HOSTEL_WARDEN'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = unassignStudentFromRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }
    const { studentId } = parsed.data;

    schoolIdSchema.parse(schoolId);
    hostelIdSchema.parse(hostelId);
    hostelRoomIdSchema.parse(roomId);

    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId }, select: { id: true, hostelRoomId: true } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    if (student.hostelRoomId !== roomId) return NextResponse.json({ error: 'Student is not allocated to this room.' }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.student.update({ where: { id: studentId }, data: { hostelRoomId: null } });
      await tx.hostelRoom.update({ where: { id: roomId }, data: { currentOccupancy: { decrement: 1 } } });
    });

    return NextResponse.json({ success: true, message: 'Student unassigned from room.' }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: err.issues }, { status: 400 });
    }
    console.error('Unassign student error', err);
    return NextResponse.json({ error: 'Failed to unassign student' }, { status: 500 });
  }
}

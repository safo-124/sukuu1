// app/api/schools/[schoolId]/resources/routes/[routeId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, updateRouteSchema, routeIdSchema } from '@/validators/resources.validators'; // Import schemas

// GET /api/schools/[schoolId]/resources/routes/[routeId]
// Fetches a single route by ID
export async function GET(request, { params }) {
  const { schoolId, routeId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TRANSPORT_MANAGER' && session.user?.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    routeIdSchema.parse(routeId);

    const route = await prisma.route.findUnique({
      where: { id: routeId, schoolId: schoolId },
    });

    if (!route) {
      return NextResponse.json({ error: 'Route not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ route }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET Route by ID) - Error for school ${schoolId}, route ${routeId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve route.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// PUT /api/schools/[schoolId]/resources/routes/[routeId]
// Updates an existing route
export async function PUT(request, { params }) {
  const { schoolId, routeId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TRANSPORT_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);
    routeIdSchema.parse(routeId);
    const validation = updateRouteSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (PUT Route) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const existingRoute = await prisma.route.findUnique({
      where: { id: routeId, schoolId: schoolId },
    });

    if (!existingRoute) {
      return NextResponse.json({ error: 'Route not found or does not belong to this school.' }, { status: 404 });
    }

    const updatedRoute = await prisma.route.update({
      where: { id: routeId },
      data: validation.data, // Use validated data directly
    });

    return NextResponse.json({ route: updatedRoute, message: 'Route updated successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (PUT Route) - Detailed error for school ${schoolId}, route ${routeId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation (P2002) if name is updated to conflict
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('name')) {
        return NextResponse.json({ error: 'A route with this name already exists for this school.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update route.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// DELETE /api/schools/[schoolId]/resources/routes/[routeId]
// Deletes a route
export async function DELETE(request, { params }) {
  const { schoolId, routeId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TRANSPORT_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);
    routeIdSchema.parse(routeId);

    const existingRoute = await prisma.route.findUnique({
      where: { id: routeId, schoolId: schoolId },
    });

    if (!existingRoute) {
      return NextResponse.json({ error: 'Route not found or does not belong to this school.' }, { status: 404 });
    }

    await prisma.route.delete({
      where: { id: routeId },
    });

    return NextResponse.json({ message: 'Route deleted successfully.' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    // Handle foreign key constraint failure (e.g., if vehicle assignments or student enrollments are linked to this route)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete route: it has associated vehicles or student enrollments. Please reassign or delete them first.' }, { status: 409 });
    }
    console.error(`API (DELETE Route) - Detailed error for school ${schoolId}, route ${routeId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to delete route.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

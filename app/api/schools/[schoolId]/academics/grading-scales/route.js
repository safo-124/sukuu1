// app/api/schools/[schoolId]/academics/grading-scales/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { schoolIdSchema, createGradingScaleSchema } from '@/validators/academics.validators'; // Import schemas

// GET /api/schools/[schoolId]/academics/grading-scales
// Fetches all grading scales for a specific school
export async function GET(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN' && session.user?.role !== 'TEACHER' && session.user?.role !== 'SECRETARY')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    schoolIdSchema.parse(schoolId);

    const gradingScales = await prisma.gradingScale.findMany({
      where: { schoolId: schoolId },
      include: {
        gradeDetails: {
          orderBy: { minPercentage: 'desc' } // Order details from highest to lowest percentage
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ gradingScales }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', issues: error.issues }, { status: 400 });
    }
    console.error(`API (GET GradingScales) - Error for school ${schoolId}:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Failed to retrieve grading scales.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/academics/grading-scales
// Creates a new grading scale with its associated grade details
export async function POST(request, { params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    schoolIdSchema.parse(schoolId);

    const validation = createGradingScaleSchema.safeParse(body);

    if (!validation.success) {
      console.error("API (POST GradingScale) - Validation failed:", JSON.stringify(validation.error.issues, null, 2));
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, description, gradeDetails } = validation.data;

    const newGradingScale = await prisma.$transaction(async (tx) => {
      // 1. Create the Grading Scale
      const createdScale = await tx.gradingScale.create({
        data: {
          name,
          description: description || null,
          schoolId: schoolId,
        },
      });

      // 2. Create associated Grade Details
      const gradeDetailsData = gradeDetails.map(detail => ({
        ...detail,
        gradingScaleId: createdScale.id,
        schoolId: schoolId, // Denormalize schoolId for security/querying on GradeDetail
      }));

      await tx.gradeDetail.createMany({
        data: gradeDetailsData,
      });

      return createdScale;
    });

    // Fetch the new scale with its details for comprehensive response
    const fetchedNewScale = await prisma.gradingScale.findUnique({
        where: { id: newGradingScale.id },
        include: {
            gradeDetails: { orderBy: { minPercentage: 'desc' } }
        }
    });

    return NextResponse.json({ gradingScale: fetchedNewScale, message: 'Grading scale created successfully.' }, { status: 201 });
  } catch (error) {
    console.error(`API (POST GradingScale) - Detailed error for school ${schoolId}:`, {
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
    // Handle unique constraint violation (P2002) for scale name or grade details overlap/duplicates
    if (error.code === 'P2002') {
      const targetField = error.meta?.target ? (Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target) : 'unknown field(s)';
      if (targetField.includes('name')) {
        return NextResponse.json({ error: 'A grading scale with this name already exists for this school.' }, { status: 409 });
      }
      if (targetField.includes('grade') && targetField.includes('gradingScaleId')) {
        return NextResponse.json({ error: 'Duplicate grade label found within the grading scale.' }, { status: 409 });
      }
      return NextResponse.json({ error: `A unique constraint was violated. Conflict on: ${targetField}.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create grading scale.', details: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}

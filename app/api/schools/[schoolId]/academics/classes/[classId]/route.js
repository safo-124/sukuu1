// app/api/schools/[schoolId]/academics/classes/[classId]/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Define roles that are allowed to access class details
const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'TEACHER']; // Or adjust as per your requirements

/**
 * @swagger
 * /api/schools/{schoolId}/academics/classes/{classId}:
 * get:
 * summary: Retrieve a specific class by its ID
 * tags: [Classes]
 * parameters:
 * - in: path
 * name: schoolId
 * required: true
 * description: The ID of the school.
 * schema:
 * type: string
 * - in: path
 * name: classId
 * required: true
 * description: The ID of the class to retrieve.
 * schema:
 * type: string
 * responses:
 * 200:
 * description: Details of the class.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * class:
 * type: object # Define class structure here based on your include
 * 401:
 * description: Unauthorized.
 * 403:
 * description: Forbidden (user does not have permission for this specific class/school).
 * 404:
 * description: Class not found or does not belong to the school.
 * 500:
 * description: Internal server error.
 */
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { schoolId, classId } = params;

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: No session found.' }, { status: 401 });
    }

    if (session.user.schoolId !== schoolId || !ALLOWED_ROLES.includes(session.user.role)) {
      console.warn(`Forbidden access attempt to GET class ${classId} for school ${schoolId} by user ${session.user.email}`);
      return NextResponse.json({ error: 'Forbidden: You do not have permission to access this resource.' }, { status: 403 });
    }

    if (!classId) {
        return NextResponse.json({ error: 'Class ID is required.' }, { status: 400 });
    }

    const classDetails = await prisma.class.findUnique({
      where: {
        id: classId,
        schoolId: schoolId, // Ensures the class belongs to the specified school
      },
      include: {
        schoolLevel: { 
          select: { id: true, name: true } 
        },
        academicYear: { 
          select: { id: true, name: true, startDate: true, endDate: true } 
        },
        sections: { // Include sections for this class
            select: {
                id: true,
                name: true,
                maxCapacity: true,
                classTeacher: {
                    select: {
                        id: true,
                        user: { select: { id: true, firstName: true, lastName: true, email: true}}
                    }
                },
                _count: {
                    select: { studentEnrollments: true }
                }
            },
            orderBy: { name: 'asc'}
        },
        subjects: { // Optionally include subjects linked to this class
            select: { id: true, name: true, subjectCode: true },
            orderBy: { name: 'asc'}
        },
        _count: { // Count of sections directly on the class if not including full section details
          select: { sections: true }
        }
      }
    });

    if (!classDetails) {
      return NextResponse.json({ error: 'Class not found or does not belong to this school.' }, { status: 404 });
    }

    return NextResponse.json({ class: classDetails }, { status: 200 });

  } catch (error) {
    console.error(`API_ERROR (GET /classes/${params.classId}): Failed to fetch class for school ${params.schoolId}. Error:`, error);
    // Log the actual error for server-side debugging
    // Avoid sending detailed error messages to the client in production
    return NextResponse.json({ error: 'Failed to fetch class details. Please try again later.' }, { status: 500 });
  }
}

// You would add PATCH (update) and DELETE handlers in this same file for managing this specific class.
// For example:
// export async function PATCH(request, { params }) { /* ... update logic ... */ }
// export async function DELETE(request, { params }) { /* ... delete logic ... */ }
// app/api/schools/[schoolId]/academics/subjects/[subjectId]/route.js
import prisma from '@/lib/prisma';
// Assuming updateSubjectSchema is in academics.validators.js and includes weeklyHours
import { updateSubjectSchema } from '@/validators/academics.validators'; 
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET handler to fetch a single subject's details
export async function GET(request, { params }) {
  const { schoolId, subjectId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId, schoolId: schoolId },
      include: {
        department: { select: { id: true, name: true } },
        schoolLevelLinks: { // To pre-populate selected school levels in edit form
          select: { schoolLevelId: true }
        },
        staffSubjectLevels: { // To pre-populate assigned teacher(s) for specific levels
          select: { 
            staffId: true, 
            schoolLevelId: true 
            // Note: This structure might need adjustment based on how you want to edit teacher assignments.
            // For simplicity, we might just fetch the first teacher assigned overall, or handle complex assignments separately.
          },
          // take: 1 // If only showing one primary teacher in the edit form for now
        }
      }
    });

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found.' }, { status: 404 });
    }
    return NextResponse.json({ subject }, { status: 200 });
  } catch (error) {
    console.error(`API (GET Subject/${subjectId}) - Error for school ${schoolId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch subject details.' }, { status: 500 });
  }
}

// PUT handler to update a subject's details
export async function PUT(request, { params }) {
  const { schoolId, subjectId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // updateSubjectSchema from your validator should handle optional fields and weeklyHours
    const validation = updateSubjectSchema.safeParse(body); 

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const dataToUpdate = validation.data;
    // Filter out undefined fields so Prisma only updates provided fields
    Object.keys(dataToUpdate).forEach(key => {
        if (dataToUpdate[key] === undefined) {
            delete dataToUpdate[key];
        } else if ((key === 'description' || key === 'subjectCode' || key === 'departmentId') && dataToUpdate[key] === '') {
            dataToUpdate[key] = null; // Allow clearing optional string fields
        } else if (key === 'weeklyHours' && (dataToUpdate[key] === '' || dataToUpdate[key] === null)) {
            dataToUpdate[key] = null; // Allow clearing weeklyHours
        }
    });
    
    if (Object.keys(dataToUpdate).length === 0) {
        return NextResponse.json({ error: "No data provided for update." }, { status: 400 });
    }

    // Note: This PUT handler updates only the direct fields of the Subject model
    // as defined in updateSubjectSchema. Managing the many-to-many links for
    // schoolLevelLinks and staffSubjectLevels (teacher assignments) in an update
    // is more complex and typically handled by either:
    // 1. Sending the complete new set of links and diffing/replacing them on the server.
    // 2. Having separate API endpoints to add/remove individual links.
    // For now, this PUT only updates Subject's own fields.

    const updatedSubject = await prisma.subject.update({
      where: { id: subjectId, schoolId: schoolId },
      data: dataToUpdate,
      include: { // Return the updated subject with some relations for confirmation
          department: { select: { id: true, name: true }},
          schoolLevelLinks: { select: { schoolLevel: { select: { id: true, name: true }}}},
          staffSubjectLevels: { 
              select: { staff: { select: { user: {select: {firstName: true, lastName: true}}}}, schoolLevel: {select: {name: true}}},
              // take: 1 
          }
      }
    });

    return NextResponse.json({ success: true, subject: updatedSubject }, { status: 200 });

  } catch (error) {
    console.error(`API (PUT Subject/${subjectId}) - Error for school ${schoolId}:`, error);
    if (error.code === 'P2002') { // Unique constraint violation
      let field = "name or subject code";
      if (error.meta?.target?.includes('name')) field = "name";
      if (error.meta?.target?.includes('subjectCode')) field = "subject code";
      return NextResponse.json({ error: `A subject with this ${field} already exists.` }, { status: 409 });
    }
    if (error.code === 'P2025') { // Record to update not found
        return NextResponse.json({ error: 'Subject not found for update.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update subject.' }, { status: 500 });
  }
}

// DELETE handler to delete a subject
export async function DELETE(request, { params }) {
  const { schoolId, subjectId } = params;
  const session = await getServerSession(authOptions);

  if (!session || session.user?.schoolId !== schoolId || (session.user?.role !== 'SCHOOL_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Before deleting a subject, Prisma will (by default if relations are set up with onDelete: Cascade)
    // also delete related records in SubjectSchoolLevel and StaffSubjectLevel.
    // If you have other dependencies that are NOT set to cascade, you'd check them here.
    // For example, if Assignments or Grades directly link to Subject and don't cascade,
    // you'd count them and prevent deletion if they exist.

    // Example check (if needed, assuming direct link from Assignment to Subject)
    // const assignmentsCount = await prisma.assignment.count({ where: { subjectId: subjectId, schoolId: schoolId }});
    // if (assignmentsCount > 0) {
    //   return NextResponse.json({ error: `Cannot delete subject. It is linked to ${assignmentsCount} assignment(s).`}, { status: 409 });
    // }

    await prisma.subject.delete({
      where: { id: subjectId, schoolId: schoolId },
    });
    return NextResponse.json({ success: true, message: 'Subject deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API (DELETE Subject/${subjectId}) - Error for school ${schoolId}:`, error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Subject not found for deletion.' }, { status: 404 });
    }
    // P2003: Foreign key constraint failed. This means the subject is still linked to other records
    // that don't have onDelete: Cascade set up for the subject relation.
    if (error.code === 'P2003'){
        return NextResponse.json({ error: 'Cannot delete this subject. It is still referenced by other records (e.g., assignments, grades, timetable entries). Please remove these links first.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to delete subject.' }, { status: 500 });
  }
}

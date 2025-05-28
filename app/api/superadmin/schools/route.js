// app/api/superadmin/schools/route.js
import prisma from '@/lib/prisma';
import { createSchoolSchema } from '@/validators/school.validators';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// POST handler (create school) remains the same as previously defined...
export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = createSchoolSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', issues: validation.error.issues }, { status: 400 });
    }

    const { name, subdomain, address, contactInfo, logoUrl, isActive, ...featureFlags } = validation.data;

    const existingSchoolBySubdomain = await prisma.school.findUnique({ where: { subdomain } });
    if (existingSchoolBySubdomain) {
      return NextResponse.json({ error: 'Subdomain already exists.' }, { status: 409 });
    }
    const existingSchoolByName = await prisma.school.findUnique({ where: { name } });
    if (existingSchoolByName) {
      return NextResponse.json({ error: 'School name already exists.' }, { status: 409 });
    }

    const newSchool = await prisma.school.create({
      data: {
        name,
        subdomain,
        address: address || null,
        contactInfo: contactInfo || null,
        logoUrl: logoUrl || null,
        isActive: isActive !== undefined ? isActive : true, // Default to true if not provided
        ...featureFlags // Spread the rest of the validated boolean feature flags
      },
    });

    return NextResponse.json({ success: true, school: newSchool }, { status: 201 });

  } catch (error) {
    console.error('Failed to create school:', error);
    if (error.code === 'P2002') {
        let field = 'field';
        if (error.meta?.target?.includes('subdomain')) field = 'Subdomain';
        if (error.meta?.target?.includes('name')) field = 'School name';
        return NextResponse.json({ error: `${field} already exists.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create school. An internal error occurred.' }, { status: 500 });
  }
}


// Enhanced GET handler for listing all schools with pagination, search, and sort
export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  const skip = (page - 1) * limit;

  const whereClause = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } }, // mode: 'insensitive' for case-insensitive search (check DB compatibility)
      { subdomain: { contains: search, mode: 'insensitive' } },
    ],
  } : {};

  const orderByClause = {
    [sortBy]: sortOrder,
  };

  try {
    const schools = await prisma.school.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: orderByClause,
    });

    const totalSchools = await prisma.school.count({ where: whereClause });
    const totalPages = Math.ceil(totalSchools / limit);

    return NextResponse.json({
      schools,
      pagination: {
        currentPage: page,
        totalPages,
        totalSchools,
        limit,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch schools:', error);
    return NextResponse.json({ error: 'Failed to fetch schools.' }, { status: 500 });
  }
}
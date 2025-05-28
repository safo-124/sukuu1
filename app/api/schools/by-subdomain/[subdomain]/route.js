// app/api/schools/by-subdomain/[subdomain]/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { subdomain } = params;
    if (!subdomain) {
        return NextResponse.json({ error: 'Subdomain is required' }, { status: 400 });
    }
    try {
        const school = await prisma.school.findUnique({
            where: { subdomain },
            select: { id: true, name: true, isActive: true /* other relevant fields */ }
        });
        if (!school || !school.isActive) { // Also check if school is active
            return NextResponse.json({ error: 'School not found or inactive' }, { status: 404 });
        }
        return NextResponse.json({ school });
    } catch (error) {
        console.error("Error fetching school by subdomain:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
// lib/auth.js
import { PrismaClient } from '@prisma/client';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs'; // Import bcryptjs for password comparison

const prisma = new PrismaClient();

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        subdomain: { label: 'Subdomain', type: 'hidden' },
      },
      async authorize(credentials) {
        if (!credentials) {
          throw new Error('No credentials provided.');
        }

        const { email, password, subdomain } = credentials;

        if (!email || !password || !subdomain) {
          throw new Error('Email, password, and subdomain are required.');
        }

        // 1. Find the school by subdomain
        const school = await prisma.school.findUnique({
          where: { subdomain: subdomain },
        });

        if (!school || !school.isActive) {
          throw new Error('Invalid school or school is inactive.');
        }

        // 2. Find the user by email within that school
        const user = await prisma.user.findFirst({
          where: {
            email: email,
            schoolId: school.id, // Crucial: user must belong to this school
          },
          include: {
            staffProfile: {
              select: { id: true, jobTitle: true }
            }
          }
        });

        if (!user) {
          throw new Error('No user found with this email in this school.');
        }

        // 3. Verify password
        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

        if (!isPasswordValid) {
          throw new Error('Invalid password.');
        }

        // No role check here, allow all roles to log in through this provider.
        // Role-based redirection will happen in the layout.
        // If you want a provider specifically for teachers, you'd add:
        // if (user.role !== 'TEACHER') { throw new Error('Access denied: Only teachers can log in via this portal.'); }

        // Update last login time (optional)
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        // Return user object. This object will be available in the 'jwt' callback.
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          role: user.role, // Include role in the returned user object
          schoolId: user.schoolId,
          schoolSubdomain: school.subdomain,
          staffProfileId: user.staffProfile?.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role; // Ensure role is passed to token
        token.schoolId = user.schoolId;
        token.schoolSubdomain = user.schoolSubdomain;
        token.staffProfileId = user.staffProfileId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role; // Ensure role is passed to session
        session.user.schoolId = token.schoolId;
        session.user.schoolSubdomain = token.schoolSubdomain;
        session.user.staffProfileId = token.staffProfileId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login', // Generic fallback, actual redirects happen in layout
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

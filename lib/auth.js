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
        subdomain: { label: 'Subdomain', type: 'hidden' }, // The subdomain from the login page
      },
      async authorize(credentials) {
        if (!credentials) {
          console.error("AUTH_DEBUG: No credentials object provided.");
          throw new Error('No credentials provided.');
        }

        const { email, password, subdomain } = credentials;

        // Debugging: Log received credentials (mask password)
        console.log("AUTH_DEBUG: Received credentials -", { email, subdomain, passwordProvided: !!password });

        // First, check for email and password (always required)
        if (!email || !password) {
          console.error("AUTH_DEBUG: Missing email or password -", { email: !!email, password: !!password });
          throw new Error('Email and password are required.');
        }

        // Try to find the user by email first
        const user = await prisma.user.findFirst({
          where: { email: email },
          include: {
            staffProfile: {
              select: { id: true, jobTitle: true }
            }
          }
        });

        if (!user) {
          console.error(`AUTH_DEBUG: No user found with email: ${email}`);
          throw new Error('No user found with this email.');
        }
        console.log(`AUTH_DEBUG: User found: ${user.email} (Role: ${user.role}, User schoolId: ${user.schoolId})`);

        // Check password AFTER finding user
        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
          console.error(`AUTH_DEBUG: Invalid password for user: ${user.email}`);
          throw new Error('Invalid password.');
        }
        console.log(`AUTH_DEBUG: Password is valid for user: ${user.email}`);


        // --- IMPORTANT FIX: Conditional subdomain check for Super Admin ---
        let school = null;
        if (user.role !== 'SUPER_ADMIN') {
          // For non-Super Admins, subdomain and school association is mandatory
          if (!subdomain) {
            console.error("AUTH_DEBUG: Non-SUPER_ADMIN user requires a subdomain but none was provided.");
            throw new Error('Subdomain is required for this account type.');
          }
          school = await prisma.school.findUnique({
            where: { subdomain: subdomain },
          });

          if (!school) {
            console.error(`AUTH_DEBUG: School not found for subdomain: ${subdomain}`);
            throw new Error('Invalid school domain.');
          }
          if (!school.isActive) {
            console.error(`AUTH_DEBUG: School is inactive for subdomain: ${subdomain}`);
            throw new Error('School is inactive.');
          }
          if (user.schoolId !== school.id) {
            console.error(`AUTH_DEBUG: Access denied: User ${user.email} (Role: ${user.role}) is not associated with school ${school.name} (ID: ${school.id}). User's schoolId: ${user.schoolId}`);
            throw new Error(`Access denied: This account is not associated with ${school.name}.`);
          }
          console.log(`AUTH_DEBUG: School found and active for non-SUPER_ADMIN: ${school.name} (ID: ${school.id})`);

        } else {
          // For SUPER_ADMIN, subdomain is not strictly required for validation,
          // but if provided and exists, we can grab the school data.
          // This allows them to log in from any subdomain-specific page.
          console.log(`AUTH_DEBUG: User ${user.email} is SUPER_ADMIN, bypassing strict subdomain check.`);
          if (subdomain) {
              const foundSchool = await prisma.school.findUnique({ where: { subdomain: subdomain } });
              if (foundSchool) {
                  school = foundSchool;
                  console.log(`AUTH_DEBUG: SUPER_ADMIN logging in from subdomain: ${subdomain} (School ID: ${school.id})`);
              } else {
                  console.log(`AUTH_DEBUG: SUPER_ADMIN provided invalid subdomain: ${subdomain}`);
                  // Do not throw error, allow global login
              }
          }
        }
        // --- END IMPORTANT FIX ---


        // Update last login time (optional)
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });
        console.log(`AUTH_DEBUG: Last login updated for user: ${user.email}`);

        // Return user object for session and JWT
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          role: user.role,
          // For SUPER_ADMIN, user.schoolId might be null, but school.id is available if they logged into a specific school
          schoolId: user.schoolId || school?.id || null, // Prioritize user's schoolId, then current school's ID if logged in via its subdomain
          schoolSubdomain: user.schoolId ? (school?.subdomain || null) : (school?.subdomain || null), // Ensure subdomain is set correctly for SUPER_ADMIN when landing on a school dashboard
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
        token.role = user.role;
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
        session.user.role = token.role;
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

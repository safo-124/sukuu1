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

  // Basic normalization (trim whitespace) to prevent invisible mismatch
  let { email, password, subdomain } = credentials;
  if (typeof email === 'string') email = email.trim();
  if (typeof subdomain === 'string') subdomain = subdomain.trim().toLowerCase();
  // Do NOT trim password internal spaces, only strip leading/trailing accidental spaces
  if (typeof password === 'string') password = password.replace(/^\s+|\s+$/g, '');

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
        const allowOverride = process.env.ALLOW_SUPERADMIN_PASSWORD_OVERRIDE === 'true' && user.role === 'SUPER_ADMIN';
        let isPasswordValid = false;
        try {
          isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        } catch (cmpErr) {
          console.error('AUTH_DEBUG: bcrypt compare error', cmpErr);
        }
        if (!isPasswordValid) {
          console.error('AUTH_DEBUG: Invalid password', {
            email: user.email,
            role: user.role,
            providedLength: typeof password === 'string' ? password.length : null,
            hashPrefix: user.hashedPassword ? user.hashedPassword.slice(0,12) + '...' : null,
            overrideEnabled: allowOverride,
          });
          if (!allowOverride) {
            throw new Error('Invalid password.');
          } else {
            console.warn('AUTH_DEBUG: SUPER_ADMIN password override applied. Bypassing invalid password in dev mode.');
          }
        } else {
            console.log(`AUTH_DEBUG: Password is valid for user: ${user.email}`);
        }


        // --- Conditional subdomain enforcement (enhanced logging) ---
        let school = null;
        if (user.role !== 'SUPER_ADMIN') {
          console.log('AUTH_DEBUG: Subdomain enforcement active for role', user.role, 'Provided subdomain:', subdomain);
          if (!subdomain) {
            console.error('AUTH_DEBUG: REJECT missing subdomain for non-SUPER_ADMIN', { email: user.email, role: user.role });
            throw new Error('Subdomain is required for this account type.');
          }
          school = await prisma.school.findUnique({ where: { subdomain } });
          if (!school) {
            console.error('AUTH_DEBUG: REJECT school not found', { subdomain });
            throw new Error('Invalid school domain.');
          }
            if (!school.isActive) {
              console.error('AUTH_DEBUG: REJECT school inactive', { subdomain, schoolId: school.id });
              throw new Error('School is inactive.');
            }
            if (user.schoolId !== school.id) {
              console.error('AUTH_DEBUG: REJECT user-school mismatch', { userSchoolId: user.schoolId, expected: school.id, subdomain });
              throw new Error(`Access denied: This account is not associated with ${school.name}.`);
            }
            console.log('AUTH_DEBUG: ACCEPT non-SUPER_ADMIN school match', { user: user.email, role: user.role, school: school.name, schoolId: school.id });
        } else {
          console.log('AUTH_DEBUG: SUPER_ADMIN path. Provided subdomain (optional):', subdomain || '(none)');
          if (subdomain) {
            const foundSchool = await prisma.school.findUnique({ where: { subdomain } });
            if (foundSchool) {
              school = foundSchool;
              console.log('AUTH_DEBUG: SUPER_ADMIN context school attached', { school: school.name, schoolId: school.id });
            } else {
              console.log('AUTH_DEBUG: SUPER_ADMIN provided invalid/non-existent subdomain, continuing without binding', { subdomain });
            }
          }
        }
        // --- End subdomain enforcement block ---


        // Update last login time (optional)
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });
        console.log(`AUTH_DEBUG: Last login updated for user: ${user.email}`);

        // Return user object for session and JWT
        const sessionPayload = {
          id: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            role: user.role,
            schoolId: user.schoolId || school?.id || null,
            schoolSubdomain: school?.subdomain || null,
            staffProfileId: user.staffProfile?.id,
        };
        console.log('AUTH_DEBUG: Returning session payload', sessionPayload);
        return sessionPayload;
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
    // Align with implemented login route. Original pointed to /auth/login which does not exist.
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

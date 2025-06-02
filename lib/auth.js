// lib/auth.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma"; // Your Prisma client instance
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        subdomain_context: { label: "Subdomain", type: "text", optional: true },
      },
      async authorize(credentials) {
        console.log("AUTHORIZE: Attempting authorization with credentials:", { 
            email: credentials?.email, 
            subdomain_context: credentials?.subdomain_context 
            // Do not log password
        });

        if (!credentials?.email || !credentials.password) {
          console.error("AUTHORIZE_FAIL: Missing email or password in credentials.");
          return null;
        }

        const { email, password, subdomain_context } = credentials;

        try {
          const user = await prisma.user.findUnique({
            where: { email },
            include: { school: true } // Include school to get subdomain if needed for Super Admin later
          });

          if (!user) {
            console.error(`AUTHORIZE_FAIL: No user found with email: ${email}`);
            return null;
          }
          console.log("AUTHORIZE: User found:", { id: user.id, email: user.email, role: user.role, schoolId: user.schoolId });

          const isValidPassword = await bcrypt.compare(
            password,
            user.hashedPassword
          );

          if (!isValidPassword) {
            console.error(`AUTHORIZE_FAIL: Invalid password for email: ${email}`);
            return null;
          }
          console.log(`AUTHORIZE: Password valid for ${email}`);

          // Handle School Admin login (when subdomain_context is provided)
          if (subdomain_context) {
            console.log(`AUTHORIZE: Attempting School Admin login for subdomain: ${subdomain_context}`);
            if (user.role === 'SCHOOL_ADMIN' && user.schoolId) {
              // Fetch the school by subdomain to ensure it matches the user's assigned school AND is active
              const school = await prisma.school.findUnique({ // Use findUnique if subdomain is unique
                where: { 
                  subdomain: subdomain_context,
                },
              });

              if (school && school.isActive && user.schoolId === school.id) {
                console.log(`AUTHORIZE_SUCCESS: School Admin ${email} login successful for school: ${school.name} (ID: ${school.id}, Subdomain: ${school.subdomain})`);
                return {
                  id: user.id,
                  email: user.email,
                  name: user.firstName || user.email,
                  role: user.role,
                  schoolId: user.schoolId,
                  schoolSubdomain: school.subdomain,
                  schoolName: school.name,
                };
              } else {
                if (!school) console.error(`AUTHORIZE_FAIL: School with subdomain '${subdomain_context}' not found.`);
                else if (!school.isActive) console.error(`AUTHORIZE_FAIL: School '${school.name}' is inactive.`);
                else if (user.schoolId !== school.id) console.error(`AUTHORIZE_FAIL: User's schoolId (${user.schoolId}) does not match school found by subdomain (${school.id}).`);
                return null;
              }
            } else {
              console.error(`AUTHORIZE_FAIL: User ${email} is not a SCHOOL_ADMIN or missing schoolId, but subdomain_context ('${subdomain_context}') was provided.`);
              return null;
            }
          } 
          // Handle Super Admin login (no subdomain_context)
          else if (user.role === 'SUPER_ADMIN' && !user.schoolId) { // Super Admins are not tied to a schoolId
            console.log(`AUTHORIZE_SUCCESS: Super Admin ${email} login successful.`);
            return {
              id: user.id,
              email: user.email,
              name: user.firstName || user.email,
              role: user.role,
              // No schoolId or schoolSubdomain for SUPER_ADMIN
            };
          }

          // If neither condition above was met (e.g., a SCHOOL_ADMIN trying to log in without subdomain_context, or other roles)
          console.error(`AUTHORIZE_FAIL: Role/context mismatch for user ${email}. Role: ${user.role}, Subdomain Context: ${subdomain_context}`);
          return null;

        } catch (error) {
          console.error("AUTHORIZE_ERROR: Exception during authorization:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Persist the user's role and other details to the token right after signin
      if (user) {
        token.id = user.id;
        token.role = user.role;
        if (user.schoolId) token.schoolId = user.schoolId;
        if (user.schoolSubdomain) token.schoolSubdomain = user.schoolSubdomain;
        if (user.schoolName) token.schoolName = user.schoolName;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user id from a provider.
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        if (token.schoolId) session.user.schoolId = token.schoolId;
        if (token.schoolSubdomain) session.user.schoolSubdomain = token.schoolSubdomain;
        if (token.schoolName) session.user.schoolName = token.schoolName;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login', // Your global or superadmin login page
    // You might want a custom error page:
    // error: '/auth/error', 
  },
  secret: process.env.NEXTAUTH_SECRET,
  // debug: process.env.NODE_ENV === 'development', // Enable for more verbose NextAuth logs
};

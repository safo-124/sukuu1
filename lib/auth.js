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
        if (!credentials?.email || !credentials.password) {
          console.log("Authorize: Missing credentials");
          return null;
        }

        const { email, password, subdomain_context } = credentials;

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            console.log(`Authorize: No user found with email: ${email}`);
            return null;
          }

          const isValidPassword = await bcrypt.compare(
            password,
            user.hashedPassword
          );

          if (!isValidPassword) {
            console.log(`Authorize: Invalid password for email: ${email}`);
            return null;
          }

          if (subdomain_context) {
            if (user.role === 'SCHOOL_ADMIN' && user.schoolId) {
              const school = await prisma.school.findFirst({
                where: {
                  id: user.schoolId,
                  subdomain: subdomain_context,
                  isActive: true
                },
              });

              if (school) {
                console.log(`Authorize: School Admin ${email} login successful for school: ${school.name}`);
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
                console.log(`Authorize: School Admin ${email} not matched with active school for subdomain: ${subdomain_context}`);
                return null;
              }
            } else {
              console.log(`Authorize: User ${email} is not a School Admin or no schoolId for subdomain context: ${subdomain_context}`);
              return null;
            }
          } else if (user.role === 'SUPER_ADMIN' && !user.schoolId) {
            console.log(`Authorize: Super Admin ${email} login successful.`);
            return {
              id: user.id,
              email: user.email,
              name: user.firstName || user.email,
              role: user.role,
            };
          }

          console.log(`Authorize: Role mismatch or context issue for ${email}`);
          return null;

        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
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
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  // debug: process.env.NODE_ENV === 'development',
};
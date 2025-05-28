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
        email: { label: "Email", type: "email", placeholder: "john.doe@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          console.log("Missing credentials");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            console.log("No user found with that email");
            return null;
          }

          // IMPORTANT: Only allow SUPER_ADMIN to log in via this general login for now
          // Later, you might have different login pages or logic for other roles
          if (user.role !== 'SUPER_ADMIN') {
            console.log("User is not a SUPER_ADMIN");
            return null; // Or throw an error to show a specific message
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          );

          if (!isValidPassword) {
            console.log("Invalid password");
            return null;
          }

          console.log("Super Admin login successful for:", user.email);
          return {
            id: user.id,
            email: user.email,
            name: user.firstName || user.email, // Use email as fallback for name
            role: user.role,
          };
        } catch (error) {
          console.error("Error in authorize function:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt", // Using JSON Web Tokens for session management
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add role and id to the JWT token
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Add role and id to the session object
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login', // Redirect users to this page for login
    // signOut: '/auth/signout', // (Optional) Custom signout page
    // error: '/auth/error', // (Optional) Custom error page for auth errors
  },
  secret: process.env.NEXTAUTH_SECRET, // IMPORTANT: Set this in your .env file
};

const handler = NextAuth(authOptions);
export default handler; // Export the handler directly if you're not also exporting authOptions separately for getServerSession elsewhere
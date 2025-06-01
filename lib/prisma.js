// lib/prisma.js
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

// Helper type for the global object
// declare global {
//   // eslint-disable-next-line no-var
//   var prisma: PrismaClient | undefined;
// }
// Using 'globalThis' is often preferred for wider compatibility
const globalForPrisma = globalThis;


let prismaInstance; // Use 'let' as this will be conditionally assigned

// Function to create a new Prisma client instance and extend it with Accelerate
const getExtendedPrismaClient = () => {
  console.log("Creating new Prisma Client instance with Accelerate.");
  return new PrismaClient({
    // Optional: configure logging based on environment
    // log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : [],
  }).$extends(withAccelerate());
};


if (process.env.NODE_ENV === 'production') {
  prismaInstance = getExtendedPrismaClient();
} else {
  // Ensure that 'globalForPrisma.prisma' is also an instance with Accelerate
  if (!globalForPrisma.prisma) {
    console.log("Development: Creating new global Prisma Client with Accelerate.");
    globalForPrisma.prisma = getExtendedPrismaClient();
  } else {
    console.log("Development: Using existing global Prisma Client.");
    // You might want to ensure the global instance is the one with Accelerate,
    // though if this file is the only place it's set, the above 'if' handles it.
  }
  prismaInstance = globalForPrisma.prisma;
}

export default prismaInstance;
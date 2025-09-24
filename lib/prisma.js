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
  // In dev, reuse a single global client, but recreate if models changed
  const needsNewClient =
    !globalForPrisma.prisma ||
    // Ensure newly added models (like PlatformSetting) exist on the client
    typeof globalForPrisma.prisma.platformSetting === 'undefined';

  if (needsNewClient) {
    console.log(
      needsNewClient && globalForPrisma.prisma
        ? "Development: Detected schema change, recreating Prisma Client."
        : "Development: Creating new global Prisma Client with Accelerate."
    );
    globalForPrisma.prisma = getExtendedPrismaClient();
  } else {
    console.log("Development: Using existing global Prisma Client.");
  }
  prismaInstance = globalForPrisma.prisma;
}

export default prismaInstance;
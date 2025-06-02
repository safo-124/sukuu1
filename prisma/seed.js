// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@example.com'; // Change as needed
  const password = 'kantanka1'; // Change to a strong password

  console.log(`Checking for existing user: ${email}`);
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    console.log(`User ${email} already exists. Skipping.`);
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    const superAdmin = await prisma.user.create({
      data: {
        email: email,
        hashedPassword: hashedPassword,
        role: 'SUPER_ADMIN',
        firstName: 'Super',
        lastName: 'Admin',
        isActive: true,
        // schoolId will be null by default for SUPER_ADMIN
      },
    });
    console.log('Created SUPER_ADMIN user:', superAdmin);
  }
}

main()
  .catch((e) => {
    console.error("Error in seed script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
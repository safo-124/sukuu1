// scripts/set-password.js
// Directly set (or reset) a user's password by email.
// Usage (PowerShell):
//   node scripts/set-password.js superadmin@example.com NewSecret123!
// Optionally supply a third arg for role verification (e.g., SUPER_ADMIN).

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  try {
    const [,, emailArg, newPassword, expectedRole] = process.argv;
    if (!emailArg || !newPassword) {
      console.error('Usage: node scripts/set-password.js <email> <newPassword> [expectedRole]');
      process.exit(1);
    }
    const email = emailArg.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error('User not found:', email);
      process.exit(1);
    }
    if (expectedRole && user.role !== expectedRole) {
      console.error(`Role mismatch. Expected ${expectedRole} but user has role ${user.role}`);
      process.exit(1);
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { hashedPassword: hash } });
    console.log(`Password updated for ${email} (role: ${user.role}). Length=${newPassword.length}`);
  } catch (e) {
    console.error('Error updating password:', e);
  } finally {
    await prisma.$disconnect();
  }
})();

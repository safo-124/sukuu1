// scripts/inspect-superadmin.js
// Quick diagnostic tool to verify the stored hash for the superadmin and test candidate passwords.
// Usage (PowerShell):
//   node scripts/inspect-superadmin.js ChangeMe123! OtherPassword123!
// If no candidate passwords supplied, it will test defaults and env-based.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  try {
    const email = process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@example.com';
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('Superadmin user not found for email:', email);
      process.exit(0);
    }
    console.log('User found:', { email: user.email, role: user.role, hashPrefix: user.hashedPassword.slice(0,12) + '...' });

    const candidates = process.argv.slice(2);
    const defaults = [
      process.env.SEED_SUPERADMIN_PASSWORD,
      'ChangeMe123!',
      'changeme123!',
      'Admin123!',
    ].filter(Boolean);

    const unique = Array.from(new Set([...candidates, ...defaults]));
    if (unique.length === 0) {
      console.log('No password candidates provided. Pass some as CLI args.');
      process.exit(0);
    }

    for (const pw of unique) {
      try {
        const match = await bcrypt.compare(pw, user.hashedPassword);
        console.log(`Test password '${pw}': ${match ? 'MATCH' : 'no match'}`);
      } catch (e) {
        console.log('Error comparing candidate', pw, e.message);
      }
    }
  } catch (e) {
    console.error('Inspection error:', e);
  } finally {
    await prisma.$disconnect();
  }
})();

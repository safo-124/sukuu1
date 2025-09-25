// lib/platformSettings.js
// Helper functions to access platform-wide settings with sensible defaults.
import prisma from '@/lib/prisma';

const DEFAULTS = {
  studentQuarterFee: 10,
  parentQuarterFee: 5,
};

export async function getAllPlatformSettings() {
  try {
    if (prisma.platformSetting) {
      const rows = await prisma.platformSetting.findMany();
      const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
      return { ...DEFAULTS, ...map };
    }
    // Fallback raw query
    const rows = await prisma.$queryRaw`SELECT "key", "value" FROM "PlatformSetting"`;
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return { ...DEFAULTS, ...map };
  } catch (e) {
    console.warn('getAllPlatformSettings fallback defaults due to error:', e);
    return { ...DEFAULTS };
  }
}

export async function getPlatformSetting(key) {
  const all = await getAllPlatformSettings();
  return all[key];
}

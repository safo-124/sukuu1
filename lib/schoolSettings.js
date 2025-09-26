// lib/schoolSettings.js
// Lightweight per-school settings stored in PlatformSetting with namespaced keys
import prisma from '@/lib/prisma';

const nsKey = (schoolId, key) => `school:${schoolId}:${key}`;

export async function getSchoolSetting(schoolId, key, defaultValue = null) {
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key: nsKey(schoolId, key) } });
    if (!row) return defaultValue;
    // Value stored as Json; allow primitives
    return row.value ?? defaultValue;
  } catch (e) {
    console.warn('getSchoolSetting failed', e);
    return defaultValue;
  }
}

export async function setSchoolSetting(schoolId, key, value) {
  try {
    const row = await prisma.platformSetting.upsert({
      where: { key: nsKey(schoolId, key) },
      create: { key: nsKey(schoolId, key), value },
      update: { value },
    });
    return row;
  } catch (e) {
    console.error('setSchoolSetting failed', e);
    throw e;
  }
}

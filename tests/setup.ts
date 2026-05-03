import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function clearDatabase() {
  const tables = [
    'credit_transactions',
    'feedback',
    'feedback_requests',
    'ai_analyses',
    'presentations',
    'users',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
}

export async function closeDatabase() {
  await prisma.$disconnect();
}

export { prisma as testDb };

import { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';

describe('Database client', () => {
  it('should export a PrismaClient instance', () => {
    expect(db).toBeInstanceOf(PrismaClient);
  });

  it('should reuse the same instance', () => {
    const db2 = require('@/lib/db').db;
    expect(db).toBe(db2);
  });
});

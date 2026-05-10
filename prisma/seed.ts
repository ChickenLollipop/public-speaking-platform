import { PrismaClient, SkillLevel, CreditTransactionType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const testUsers = [
  {
    email: 'alice@test.com',
    password: 'password123',
    name: 'Alice Johnson',
    skillLevel: SkillLevel.BEGINNER,
    goals: ['Overcome stage fright', 'Improve eye contact'],
    creditBalance: 50,
  },
  {
    email: 'bob@test.com',
    password: 'password123',
    name: 'Bob Martinez',
    skillLevel: SkillLevel.INTERMEDIATE,
    goals: ['Better storytelling', 'Engage large audiences'],
    creditBalance: 120,
  },
  {
    email: 'carol@test.com',
    password: 'password123',
    name: 'Carol Chen',
    skillLevel: SkillLevel.ADVANCED,
    goals: ['Conference keynotes', 'Executive presentations'],
    creditBalance: 200,
  },
];

async function main() {
  console.log('Seeding test users...');

  for (const userData of testUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      console.log(`  Skipping ${userData.email} (already exists)`);
      continue;
    }

    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: userData.email,
          passwordHash,
          name: userData.name,
          skillLevel: userData.skillLevel,
          goals: userData.goals,
          creditBalance: userData.creditBalance,
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: created.id,
          amount: userData.creditBalance,
          type: CreditTransactionType.INITIAL_BONUS,
          balanceAfter: userData.creditBalance,
        },
      });

      return created;
    });

    console.log(`  Created ${user.name} (${user.email})`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

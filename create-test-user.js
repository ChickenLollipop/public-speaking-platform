const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('Creating test user...');

    // Hash password
    const passwordHash = await bcrypt.hash('testpass123', 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: passwordHash,
        name: 'Test User',
        skillLevel: 'BEGINNER',
        goals: [],
        creditBalance: 50,
      },
    });

    console.log('✅ User created:', user.email);
    console.log('   ID:', user.id);
    console.log('   Credits:', user.creditBalance);

    // Create initial credit transaction
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: 50,
        type: 'INITIAL_BONUS',
        balanceAfter: 50,
      },
    });

    console.log('✅ Initial credits added');
    console.log('\nLogin credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: testpass123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();

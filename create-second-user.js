const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createSecondUser() {
  try {
    // Check if second user exists
    const existing = await prisma.user.findUnique({
      where: { email: 'reviewer@example.com' }
    });

    if (existing) {
      console.log('✅ Reviewer user already exists');
      console.log('Email: reviewer@example.com');
      console.log('Password: Testpass123');
      console.log('Credits:', existing.creditBalance);
      return;
    }

    // Create second user
    const passwordHash = await bcrypt.hash('Testpass123', 10);

    const user = await prisma.user.create({
      data: {
        email: 'reviewer@example.com',
        passwordHash: passwordHash,
        name: 'Feedback Reviewer',
        creditBalance: 0, // Starts with 0, will earn credits by giving feedback
        skillLevel: 'INTERMEDIATE'
      }
    });

    // Create initial credit transaction
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: 50,
        type: 'INITIAL_BONUS',
        balanceAfter: 50
      }
    });

    // Update user balance
    await prisma.user.update({
      where: { id: user.id },
      data: { creditBalance: 50 }
    });

    console.log('✅ Created reviewer user:');
    console.log('Email: reviewer@example.com');
    console.log('Password: Testpass123');
    console.log('Credits: 50');
    console.log('\nYou can now:');
    console.log('1. Login as reviewer@example.com');
    console.log('2. Go to http://localhost:3000/feedback/give');
    console.log('3. Claim and review the feedback request');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSecondUser();

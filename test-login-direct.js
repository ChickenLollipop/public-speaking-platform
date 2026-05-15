const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jose = require('jose');

const prisma = new PrismaClient();

async function testLogin() {
  try {
    console.log('Testing login flow...\n');

    // Step 1: Find user
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', user.email);
    console.log('   ID:', user.id);
    console.log('   Credits:', user.creditBalance);

    // Step 2: Verify password
    const isValid = await bcrypt.compare('Testpass123', user.passwordHash);
    console.log('✅ Password valid:', isValid);

    if (!isValid) {
      console.log('❌ Password incorrect');
      return;
    }

    // Step 3: Generate JWT
    const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new jose.SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15d')
      .sign(JWT_SECRET);

    console.log('✅ Token generated');
    console.log('');
    console.log('='.repeat(60));
    console.log('LOGIN SUCCESSFUL!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Token:', token.substring(0, 50) + '...');
    console.log('');
    console.log('The login API should work now.');
    console.log('Try logging in via the browser.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();

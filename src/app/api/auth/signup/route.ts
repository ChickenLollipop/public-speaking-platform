import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import { signupSchema } from '@/lib/validation/schemas';
import { CreditTransactionType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, skillLevel, goals } = validation.data;

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user and initial credit transaction in a transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          skillLevel,
          goals,
          creditBalance: 50,
        },
      });

      // Create initial credit transaction
      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          amount: 50,
          type: CreditTransactionType.INITIAL_BONUS,
          balanceAfter: 50,
        },
      });

      return user;
    });

    // Generate JWT token
    const token = await signToken({
      userId: result.id,
      email: result.email,
    });

    // Return user data (without password hash)
    const { passwordHash: _, ...userWithoutPassword } = result;

    return NextResponse.json(
      {
        token,
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

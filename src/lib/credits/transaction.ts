import { db } from '@/lib/db';
import { CreditTransactionType } from '@prisma/client';

export async function createCreditTransaction(
  userId: string,
  amount: number,
  type: CreditTransactionType,
  relatedId?: string
) {
  // Use transaction to ensure atomicity
  return db.$transaction(async (tx) => {
    // Get current user balance
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const newBalance = user.creditBalance + amount;

    // Prevent negative balances for spending operations
    if (amount < 0 && newBalance < 0) {
      throw new Error('Insufficient credits');
    }

    // Update user balance
    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: newBalance },
    });

    // Create transaction record
    const transaction = await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        relatedId,
        balanceAfter: newBalance,
      },
    });

    return transaction;
  });
}

export async function getUserCredits(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user.creditBalance;
}

/**
 * Deduct credits from a user's balance
 */
export async function deductCredits(
  userId: string,
  amount: number,
  type: CreditTransactionType,
  relatedId?: string
) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  return createCreditTransaction(userId, -amount, type, relatedId);
}

/**
 * Add credits to a user's balance
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: CreditTransactionType,
  relatedId?: string
) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  return createCreditTransaction(userId, amount, type, relatedId);
}

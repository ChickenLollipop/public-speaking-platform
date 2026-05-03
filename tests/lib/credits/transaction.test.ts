import { clearDatabase, testDb } from '../../setup';
import { createCreditTransaction, getUserCredits } from '@/lib/credits/transaction';
import { CreditTransactionType } from '@prisma/client';

describe('Credit transaction service', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('createCreditTransaction', () => {
    it('should create transaction and update user balance', async () => {
      const user = await testDb.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
          name: 'Test User',
          creditBalance: 50,
        },
      });

      const transaction = await createCreditTransaction(
        user.id,
        10,
        CreditTransactionType.FEEDBACK_GIVEN
      );

      expect(transaction.amount).toBe(10);
      expect(transaction.balanceAfter).toBe(60);
      expect(transaction.type).toBe(CreditTransactionType.FEEDBACK_GIVEN);

      const updatedUser = await testDb.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.creditBalance).toBe(60);
    });

    it('should handle negative amounts (spending)', async () => {
      const user = await testDb.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
          name: 'Test User',
          creditBalance: 50,
        },
      });

      const transaction = await createCreditTransaction(
        user.id,
        -5,
        CreditTransactionType.AI_ANALYSIS
      );

      expect(transaction.amount).toBe(-5);
      expect(transaction.balanceAfter).toBe(45);

      const updatedUser = await testDb.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.creditBalance).toBe(45);
    });

    it('should store relatedId when provided', async () => {
      const user = await testDb.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
          name: 'Test User',
          creditBalance: 50,
        },
      });

      const relatedId = 'presentation-123';
      const transaction = await createCreditTransaction(
        user.id,
        -3,
        CreditTransactionType.AI_ANALYSIS,
        relatedId
      );

      expect(transaction.relatedId).toBe(relatedId);
    });

    it('should throw error if user not found', async () => {
      await expect(
        createCreditTransaction(
          'non-existent',
          10,
          CreditTransactionType.FEEDBACK_GIVEN
        )
      ).rejects.toThrow('User not found');
    });
  });

  describe('getUserCredits', () => {
    it('should return current credit balance', async () => {
      const user = await testDb.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hash',
          name: 'Test User',
          creditBalance: 75,
        },
      });

      const credits = await getUserCredits(user.id);
      expect(credits).toBe(75);
    });

    it('should throw error if user not found', async () => {
      await expect(getUserCredits('non-existent')).rejects.toThrow('User not found');
    });
  });
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createFeedbackRequest() {
  try {
    // Get a presentation that's COMMUNITY_SHARED and READY
    const presentation = await prisma.presentation.findFirst({
      where: {
        status: 'READY',
        visibility: 'COMMUNITY_SHARED'
      }
    });

    if (!presentation) {
      console.log('No COMMUNITY_SHARED presentations found. Need to update a presentation first.');

      // Update one presentation to be COMMUNITY_SHARED
      const anyPresentation = await prisma.presentation.findFirst({
        where: { status: 'READY' }
      });

      if (anyPresentation) {
        await prisma.presentation.update({
          where: { id: anyPresentation.id },
          data: {
            visibility: 'COMMUNITY_SHARED',
            duration: 180, // 3 minutes
            description: 'A practice presentation about public speaking tips'
          }
        });
        console.log('Updated presentation to COMMUNITY_SHARED');

        // Use this presentation
        presentation = await prisma.presentation.findUnique({
          where: { id: anyPresentation.id }
        });
      }
    }

    if (!presentation) {
      console.log('No presentations available');
      return;
    }

    // Create a feedback request
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const feedbackRequest = await prisma.feedbackRequest.create({
      data: {
        presentationId: presentation.id,
        requesterId: presentation.userId,
        type: 'COMMUNITY_FEEDBACK',
        creditsOffered: 10,
        status: 'PENDING',
        expiresAt: expiresAt
      }
    });

    console.log('✅ Created feedback request:');
    console.log(JSON.stringify(feedbackRequest, null, 2));

    // Deduct credits from user
    await prisma.user.update({
      where: { id: presentation.userId },
      data: {
        creditBalance: { decrement: 10 }
      }
    });

    // Create credit transaction
    const user = await prisma.user.findUnique({
      where: { id: presentation.userId }
    });

    await prisma.creditTransaction.create({
      data: {
        userId: presentation.userId,
        amount: -10,
        type: 'FEEDBACK_RECEIVED',
        relatedId: feedbackRequest.id,
        balanceAfter: user.creditBalance
      }
    });

    console.log('✅ Credits deducted and transaction recorded');
    console.log('Now you can view this request at: http://localhost:3000/feedback/give');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createFeedbackRequest();

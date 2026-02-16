
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const deal = await prisma.deal.findFirst({
            orderBy: { id: 'desc' },
            include: { payment: true }
        });

        if (deal) {
            console.log(`Latest Deal ID: ${deal.id}`);
            console.log(`Status: ${deal.status}`);
            console.log(`CreatedAt: ${deal.createdAt.toISOString()}`);
            console.log(`LastActivityAt: ${deal.lastActivityAt.toISOString()}`);
            if (deal.payment) {
                console.log(`Payment Status: ${deal.payment.status}`);
                console.log(`Payment Wallet: ${deal.payment.escrowWallet}`);
            }
        } else {
            console.log('No deals found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

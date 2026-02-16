
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const payment = await prisma.payment.findUnique({
            where: { dealId: 22 }
        });

        if (payment) {
            console.log(`Payment for Deal 22:`);
            console.log(`  Status: ${payment.status}`);
            console.log(`  Wallet: ${payment.escrowWallet}`);
            console.log(`  Amount: ${payment.amount}`);
            console.log(`  ReleasedAt: ${payment.releasedAt}`);
        } else {
            console.log('Payment not found for Deal 22');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

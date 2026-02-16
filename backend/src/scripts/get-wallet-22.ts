
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const payment = await prisma.payment.findUnique({
            where: { dealId: 22 }
        });

        if (payment) {
            console.log(`FULL_WALLET_ADDRESS:${payment.escrowWallet}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

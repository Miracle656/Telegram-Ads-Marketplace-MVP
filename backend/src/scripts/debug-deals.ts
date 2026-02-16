
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const ids = [19, 20];
    console.log(`Checking deals: ${ids.join(', ')}`);

    const payments = await prisma.payment.findMany({
        where: { dealId: { in: ids } },
        include: { deal: true }
    });

    for (const p of payments) {
        console.log(`\nDeal ID: ${p.dealId}`);
        console.log(`- Status: ${p.deal.status}`);
        console.log(`- Payment Status: ${p.status}`);
        console.log(`- Amount: ${p.amount} TON`);
        console.log(`- Escrow Wallet: ${p.escrowWallet}`);
        console.log(`- Encrypted Key (exists): ${!!p.encryptedKey}`);
        console.log(`- Created At: ${p.createdAt}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

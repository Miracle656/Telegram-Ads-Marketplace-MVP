
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const deal = await prisma.deal.findUnique({ where: { id: 11 } });
        if (deal) {
            console.log(`ID:${deal.id}|LastAct:${deal.lastActivityAt.toISOString()}|Created:${deal.createdAt.toISOString()}|Status:${deal.status}`);
        } else {
            console.log('Deal 11 not found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

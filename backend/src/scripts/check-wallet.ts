
import { TonClient, Address, fromNano } from '@ton/ton';

async function main() {
    const endpoint = 'https://testnet.toncenter.com/api/v2/jsonRPC';
    const client = new TonClient({ endpoint });

    const walletAddress = 'EQBnQN__FEBuzErCOhpsDCxrqBwJoWPRe0lc1Y9bbFOg0cZM';
    console.log(`Checking balance for: ${walletAddress}`);

    try {
        const balance = await client.getBalance(Address.parse(walletAddress));
        console.log(`Balance: ${balance.toString()} nanotons`);
        console.log(`Balance: ${fromNano(balance)} TON`);
    } catch (e) {
        console.error('Error:', e);
    }
}

main();

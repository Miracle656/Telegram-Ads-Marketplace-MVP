
import { TonClient, WalletContractV4, internal, toNano } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    // 1. Initialize Client
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: process.env.TON_API_KEY
    });

    // 2. Get Master Wallet
    const mnemonic = (process.env.WALLET_MNEMONIC || '').split(' ');
    if (mnemonic.length < 24) {
        console.error('❌ WALLET_MNEMONIC not found or invalid in .env');
        return;
    }

    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const contract = client.open(wallet);

    console.log(`Master Wallet: ${wallet.address.toString({ testOnly: true })}`);

    // 3. Check Balance
    const balance = await client.getBalance(wallet.address);
    console.log(`Balance: ${balance.toString()} nanotons (${Number(balance) / 1e9} TON)`);

    if (balance < toNano('1.5')) {
        console.error('❌ Insufficient balance in Master Wallet (need > 1.5 TON)');
        return;
    }

    // 4. Fund Escrow Wallet
    const escrowAddress = 'EQBnQN__FEBuzErCOhpsDCxrqBwJoWPRe0lc1Y9bbFOg0cZM';
    console.log(`\n🚀 Funding Escrow Wallet: ${escrowAddress} with 1.1 TON...`);

    const seqno = await contract.getSeqno();
    console.log(`Seqno: ${seqno}`);

    await contract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
            internal({
                to: escrowAddress,
                value: toNano('1.1'),
                bounce: false, // Important: Don't bounce if undeployed
                body: 'Funding Escrow for Debugging'
            })
        ]
    });

    console.log('✅ Transfer sent! Waiting 10s for propagation...');
    await new Promise(r => setTimeout(r, 10000));
}

main().catch(console.error);

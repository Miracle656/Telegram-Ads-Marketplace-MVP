import { Address, TonClient, WalletContractV4, internal, fromNano, toNano } from '@ton/ton';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-this';

export class TonService {
    private client: TonClient;

    constructor() {
        const endpoint = process.env.TON_NETWORK === 'mainnet'
            ? 'https://toncenter.com/api/v2/jsonRPC'
            : 'https://testnet.toncenter.com/api/v2/jsonRPC';

        this.client = new TonClient({
            endpoint,
            apiKey: process.env.TON_API_KEY
        });
    }

    /**
     * Generate a new wallet for a deal
     */
    async generateDealWallet(): Promise<{ address: string; encryptedKey: string }> {
        try {
            // Generate new mnemonic
            const mnemonic = await mnemonicNew();
            const mnemonicString = mnemonic.join(' ');

            // Derive key pair
            const keyPair = await mnemonicToPrivateKey(mnemonic);

            // Create wallet contract
            const wallet = WalletContractV4.create({
                workchain: 0,
                publicKey: keyPair.publicKey
            });

            const address = wallet.address.toString();

            // Encrypt the mnemonic
            const encryptedKey = CryptoJS.AES.encrypt(mnemonicString, ENCRYPTION_KEY).toString();

            return {
                address,
                encryptedKey
            };
        } catch (error) {
            console.error('Error generating wallet:', error);
            throw new Error('Failed to generate wallet');
        }
    }

    /**
     * Get wallet balance
     */
    async getBalance(address: string): Promise<bigint> {
        try {
            const balance = await this.client.getBalance(Address.parse(address));
            return balance;
        } catch (error) {
            console.error('Error fetching balance:', error);
            throw new Error('Failed to fetch balance');
        }
    }

    /**
     * Check if payment has been received
     */
    async checkPayment(address: string, expectedAmount: bigint): Promise<boolean> {
        try {
            const balance = await this.getBalance(address);
            return balance >= expectedAmount;
        } catch (error) {
            console.error('Error checking payment:', error);
            return false;
        }
    }

    /**
     * Release funds from escrow to channel owner
     */
    async releaseFunds(
        escrowAddress: string,
        encryptedKey: string,
        recipientAddress: string,
        amount: bigint
    ): Promise<string> {
        try {
            // Decrypt the mnemonic
            const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
            const mnemonicString = bytes.toString(CryptoJS.enc.Utf8);
            const mnemonic = mnemonicString.split(' ');

            // Derive key pair
            const keyPair = await mnemonicToPrivateKey(mnemonic);

            // Create wallet contract
            const wallet = WalletContractV4.create({
                workchain: 0,
                publicKey: keyPair.publicKey
            });

            // Open wallet
            const contract = this.client.open(wallet);

            // Send transaction
            const seqno = await contract.getSeqno();

            await contract.sendTransfer({
                seqno,
                secretKey: keyPair.secretKey,
                messages: [
                    internal({
                        to: recipientAddress,
                        value: amount,
                        bounce: false
                    })
                ]
            });

            // Wait for transaction to be processed
            let currentSeqno = seqno;
            while (currentSeqno === seqno) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                currentSeqno = await contract.getSeqno();
            }

            return 'success';
        } catch (error) {
            console.error('Error releasing funds:', error);
            throw new Error('Failed to release funds');
        }
    }

    /**
     * Refund funds to advertiser
     */
    async refundFunds(
        escrowAddress: string,
        encryptedKey: string,
        advertiserAddress: string,
        amount: bigint
    ): Promise<string> {
        // Same implementation as releaseFunds
        return this.releaseFunds(escrowAddress, encryptedKey, advertiserAddress, amount);
    }

    /**
     * Convert TON to smallest unit (nanoton)
     */
    toNanoton(ton: number): bigint {
        return toNano(ton.toString());
    }

    /**
     * Convert nanoton to TON
     */
    fromNanoton(nanoton: bigint): string {
        return fromNano(nanoton);
    }
}

export const tonService = new TonService();

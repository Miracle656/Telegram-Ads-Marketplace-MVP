import { Address, TonClient, WalletContractV4, internal, external, storeMessage, fromNano, toNano, beginCell, Cell, SendMode } from '@ton/ton';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-this';

// Escrow contract deployed on testnet
const ESCROW_CONTRACT_ADDRESS = 'kQDhMrwyCrN4nfvROwnyp4xDCkt8UwacuXiDy4IXSpwjAxVR';

// Escrow status constants matching the contract
export const EscrowStatus = {
    EMPTY: 0,
    FUNDED: 1,
    RELEASED: 2,
    REFUNDED: 3,
} as const;

export type EscrowStatusType = typeof EscrowStatus[keyof typeof EscrowStatus];

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
     * Get escrow wallet for a deal
     * Uses a single master escrow wallet that's already deployed
     */
    /**
     * Generate a new unique escrow wallet for a deal
     */
    async generateDealWallet(): Promise<{ address: string; encryptedKey: string }> {
        // Generate new random mnemonic
        const mnemonic = await mnemonicNew(24);

        // Derive key pair and wallet
        const keyPair = await mnemonicToPrivateKey(mnemonic);
        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey
        });

        // Get non-bounceable address (important for uninitialized wallets!)
        const isTestnet = process.env.TON_NETWORK !== 'mainnet';
        const address = wallet.address.toString({
            testOnly: isTestnet,
            bounceable: false
        });

        // Encrypt mnemonic
        const encryptedKey = CryptoJS.AES.encrypt(mnemonic.join(' '), ENCRYPTION_KEY).toString();

        return {
            address,
            encryptedKey
        };
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

    private sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    private async retry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
        try {
            return await fn();
        } catch (error: any) {
            // Check for rate limit error (429)
            const isRateLimit = error.response?.status === 429 ||
                error.code === 429 ||
                (error.message && error.message.includes('429'));

            if (retries > 0 && isRateLimit) {
                console.warn(`Rate limited, retrying in ${delay}ms... (${retries} left)`);
                await this.sleep(delay);
                return this.retry(fn, retries - 1, delay * 2);
            }
            throw error;
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
            let mnemonic: string[];

            if (!encryptedKey || encryptedKey === 'EMPTY') {
                // Use master wallet mnemonic from env
                const mnemonicStr = process.env.WALLET_MNEMONIC;
                if (!mnemonicStr) {
                    throw new Error('No encrypted key and WALLET_MNEMONIC not set');
                }
                mnemonic = mnemonicStr.split(' ');
            } else {
                // Decrypt the mnemonic
                const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
                const mnemonicString = bytes.toString(CryptoJS.enc.Utf8);
                mnemonic = mnemonicString.split(' ');
            }

            // Derive key pair
            const keyPair = await mnemonicToPrivateKey(mnemonic);

            // Create wallet contract
            const wallet = WalletContractV4.create({
                workchain: 0,
                publicKey: keyPair.publicKey
            });

            // Open wallet
            const contract = this.client.open(wallet);
            const isTestnet = process.env.TON_NETWORK !== 'mainnet';
            const friendlyAddress = wallet.address.toString({ testOnly: isTestnet, bounceable: false });

            console.log(`[TonService] Releasing funds from wallet: ${friendlyAddress}`);

            // Check if contract is deployed
            const isDeployed = await this.retry(() => this.client.isContractDeployed(wallet.address));

            // Check balance
            const balance = await this.retry(() => this.client.getBalance(wallet.address));
            console.log(`[TonService] Wallet balance: ${fromNano(balance)} TON`);

            if (balance === 0n) {
                const isTestnet = process.env.TON_NETWORK !== 'mainnet';
                const friendlyAddress = wallet.address.toString({ testOnly: isTestnet, bounceable: false });
                throw new Error(`Escrow wallet ${friendlyAddress} is empty (0 TON). Cannot release funds.`);
            }

            let seqno = 0;
            if (isDeployed) {
                const contract = this.client.open(wallet);
                try {
                    seqno = await this.retry(() => contract.getSeqno());
                } catch (e) {
                    console.warn('[TonService] Failed to get seqno, assuming 0:', e);
                }
            }

            console.log(`[TonService] Processing release. Deployed: ${isDeployed}, Seqno: ${seqno}`);

            // Create transfer message (signed body)
            const transfer = wallet.createTransfer({
                seqno,
                secretKey: keyPair.secretKey,
                messages: [
                    internal({
                        to: recipientAddress,
                        value: 0n,
                        bounce: false,
                        body: 'Release Funds'
                    })
                ],
                sendMode: SendMode.CARRY_ALL_REMAINING_BALANCE
            });

            // Construct external message with StateInit if needed (for uninitialized wallets)
            const ext = external({
                to: wallet.address,
                init: isDeployed ? null : wallet.init,
                body: transfer
            });

            // Serialize and send
            const msgCell = beginCell().storeWritable(storeMessage(ext)).endCell();
            await this.retry(() => this.client.sendFile(msgCell.toBoc()));

            // Wait for transaction to be processed (with less aggressive polling)
            let currentSeqno = seqno;
            let retries = 0;
            const maxRetries = 20; // Wait up to ~100 seconds

            while (currentSeqno === seqno && retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                try {
                    currentSeqno = await contract.getSeqno();
                } catch (e) {
                    console.warn('Error checking seqno, retrying...', e);
                    // Ignore transient errors during polling
                }
                retries++;
            }

            return 'success';
        } catch (error: any) {
            console.error('Error releasing funds:', error);
            const errorMessage = error.message || (typeof error === 'string' ? error : 'Unknown error');
            throw new Error(`Failed to release funds: ${errorMessage}`);
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

    // ==================== ESCROW CONTRACT METHODS ====================

    /**
     * Get the escrow contract address
     */
    getEscrowContractAddress(): string {
        return ESCROW_CONTRACT_ADDRESS;
    }

    /**
     * Get escrow contract status
     */
    async getEscrowStatus(): Promise<EscrowStatusType> {
        const contractAddress = Address.parse(ESCROW_CONTRACT_ADDRESS);
        const result = await this.client.runMethod(contractAddress, 'getStatus');
        return result.stack.readNumber() as EscrowStatusType;
    }

    /**
     * Get escrow deal ID
     */
    async getEscrowDealId(): Promise<bigint> {
        const contractAddress = Address.parse(ESCROW_CONTRACT_ADDRESS);
        const result = await this.client.runMethod(contractAddress, 'getDealId');
        return result.stack.readBigNumber();
    }

    /**
     * Get escrow amount
     */
    async getEscrowAmount(): Promise<bigint> {
        const contractAddress = Address.parse(ESCROW_CONTRACT_ADDRESS);
        const result = await this.client.runMethod(contractAddress, 'getAmount');
        return result.stack.readBigNumber();
    }

    /**
     * Get status name from status code
     */
    getEscrowStatusName(status: EscrowStatusType): string {
        switch (status) {
            case EscrowStatus.EMPTY: return 'Empty';
            case EscrowStatus.FUNDED: return 'Funded';
            case EscrowStatus.RELEASED: return 'Released';
            case EscrowStatus.REFUNDED: return 'Refunded';
            default: return 'Unknown';
        }
    }

    /**
     * Build InitEscrow message body for the contract
     */
    buildInitEscrowMessage(
        dealId: bigint,
        advertiserAddress: string,
        beneficiaryAddress: string,
        amountNano: bigint
    ): Cell {
        return beginCell()
            .storeUint(0x01, 8) // opcode: InitEscrow
            .storeUint(dealId, 64)
            .storeAddress(Address.parse(advertiserAddress))
            .storeAddress(Address.parse(beneficiaryAddress))
            .storeCoins(amountNano)
            .endCell();
    }

    /**
     * Build Deposit message body
     */
    buildDepositMessage(): Cell {
        return beginCell()
            .storeUint(0x02, 8) // opcode: Deposit
            .endCell();
    }

    /**
     * Build Release message body
     */
    buildReleaseMessage(): Cell {
        return beginCell()
            .storeUint(0x03, 8) // opcode: Release
            .endCell();
    }

    /**
     * Build Refund message body
     */
    buildRefundMessage(): Cell {
        return beginCell()
            .storeUint(0x04, 8) // opcode: Refund
            .endCell();
    }

    /**
     * Generate a deposit link for the advertiser
     */
    generateDepositLink(amountTon: number): string {
        const amountNano = toNano(amountTon.toString());
        const body = this.buildDepositMessage();
        const bodyBase64 = body.toBoc().toString('base64');
        return `ton://transfer/${ESCROW_CONTRACT_ADDRESS}?amount=${amountNano}&bin=${bodyBase64}`;
    }
}

export const tonService = new TonService();

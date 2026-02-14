import { Address, TonClient, WalletContractV4, internal, fromNano, toNano, beginCell, Cell } from '@ton/ton';
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
    async generateDealWallet(): Promise<{ address: string; encryptedKey: string }> {
        // Use the master escrow wallet address (already deployed and can receive funds)
        // For testnet, this should be YOUR wallet address that you control
        const masterWallet = process.env.MASTER_ESCROW_WALLET || 'EQDhMrwyCrN4nfvROwnyp4xDCkt8UwacuXiDy4IXSpwjAxVR';

        return {
            address: masterWallet,
            encryptedKey: '' // No key needed since we're using a single master wallet
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

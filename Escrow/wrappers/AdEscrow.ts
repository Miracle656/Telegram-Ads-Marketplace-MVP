import {
    Address,
    beginCell,
    Cell,
    Contract,
    ContractABI,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano
} from '@ton/core';

export type AdEscrowConfig = {
    owner: Address;
};

export function adEscrowConfigToCell(config: AdEscrowConfig): Cell {
    return beginCell()
        .storeAddress(config.owner)      // owner (arbiter)
        .storeUint(0, 64)                 // dealId
        .storeAddress(null)               // advertiser (empty initially)
        .storeAddress(null)               // beneficiary (empty initially)
        .storeCoins(0)                    // amount
        .storeUint(0, 8)                  // status = EMPTY
        .endCell();
}

export class AdEscrow implements Contract {
    abi: ContractABI = { name: 'AdEscrow' }

    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) { }

    static createFromAddress(address: Address) {
        return new AdEscrow(address);
    }

    static createFromConfig(config: AdEscrowConfig, code: Cell, workchain = 0) {
        const data = adEscrowConfigToCell(config);
        const init = { code, data };
        return new AdEscrow(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    // Initialize escrow for a specific deal
    async sendInitEscrow(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            dealId: bigint;
            advertiser: Address;
            beneficiary: Address;
            amount: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x01, 8)                  // opcode: InitEscrow
                .storeUint(opts.dealId, 64)          // dealId
                .storeAddress(opts.advertiser)       // advertiser
                .storeAddress(opts.beneficiary)      // beneficiary
                .storeCoins(opts.amount)             // amount
                .endCell(),
        });
    }

    // Deposit funds (called by advertiser)
    async sendDeposit(
        provider: ContractProvider,
        via: Sender,
        opts: { value: bigint }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x02, 8)  // opcode: Deposit
                .endCell(),
        });
    }

    // Release funds to beneficiary (called by owner/arbiter)
    async sendRelease(
        provider: ContractProvider,
        via: Sender,
        opts: { value: bigint }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x03, 8)  // opcode: Release
                .endCell(),
        });
    }

    // Refund to advertiser (called by owner/arbiter)
    async sendRefund(
        provider: ContractProvider,
        via: Sender,
        opts: { value: bigint }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x04, 8)  // opcode: Refund
                .endCell(),
        });
    }

    // Getter methods
    async getStatus(provider: ContractProvider): Promise<number> {
        const result = await provider.get('getStatus', []);
        return result.stack.readNumber();
    }

    async getDealId(provider: ContractProvider): Promise<bigint> {
        const result = await provider.get('getDealId', []);
        return result.stack.readBigNumber();
    }

    async getAmount(provider: ContractProvider): Promise<bigint> {
        const result = await provider.get('getAmount', []);
        return result.stack.readBigNumber();
    }

    async getAdvertiser(provider: ContractProvider): Promise<Address> {
        const result = await provider.get('getAdvertiser', []);
        return result.stack.readAddress();
    }

    async getBeneficiary(provider: ContractProvider): Promise<Address> {
        const result = await provider.get('getBeneficiary', []);
        return result.stack.readAddress();
    }

    async getOwner(provider: ContractProvider): Promise<Address> {
        const result = await provider.get('getOwner', []);
        return result.stack.readAddress();
    }
}

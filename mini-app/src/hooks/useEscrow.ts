import { useState, useCallback } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { beginCell, toNano } from '@ton/core';
import { api } from '../services/api';

export interface EscrowStatus {
    status: number;
    statusName: string;
    isFunded: boolean;
    isCompleted: boolean;
}

export function useEscrow() {
    const [tonConnectUI] = useTonConnectUI();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Send deposit transaction to escrow contract
     */
    const deposit = useCallback(async (amountTon: number) => {
        setLoading(true);
        setError(null);

        try {
            // Get contract address from backend (or hardcode if needed, but backend is safer)
            const { data } = await api.payments.getContractAddress();
            const contractAddress = data.data.contractAddress;

            // Construct payload: opcode 0x02 (Deposit)
            // IMPORTANT: Contract expects 8-bit opcode, not 32-bit
            // struct(0x02) Deposit {}
            const body = beginCell()
                .storeUint(0x02, 8) // opcode: Deposit (8 bits, matches contract)
                .endCell();

            const amountNano = toNano(amountTon.toString());

            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
                messages: [
                    {
                        address: contractAddress,
                        amount: amountNano.toString(),
                        payload: body.toBoc().toString('base64')
                    }
                ]
            };

            const result = await tonConnectUI.sendTransaction(transaction);
            return result;
        } catch (err: any) {
            console.error('Deposit error:', err);
            setError(err.message || 'Failed to send deposit transaction');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [tonConnectUI]);

    /**
     * Check escrow status
     */
    const checkStatus = useCallback(async () => {
        try {
            const { data } = await api.payments.getEscrowStatus();
            return data.data as EscrowStatus;
        } catch (err) {
            console.error('Error checking status:', err);
            return null;
        }
    }, []);

    return {
        deposit,
        checkStatus,
        loading,
        error
    };
}

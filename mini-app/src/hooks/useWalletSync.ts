import { useEffect } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { api } from '../services/api';

/**
 * Hook to sync TON wallet address to backend when connected
 */
export function useWalletSync() {
    const [tonConnectUI] = useTonConnectUI();
    const walletAddress = useTonAddress();

    useEffect(() => {
        const syncWallet = async () => {
            if (walletAddress) {
                try {
                    await api.user.updateWallet(walletAddress);
                    console.log('Wallet synced to backend:', walletAddress);
                } catch (error) {
                    console.error('Failed to sync wallet:', error);
                }
            }
        };

        syncWallet();
    }, [walletAddress]);

    return { walletAddress };
}

'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { Web3ContextType } from '@/types';

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

interface Web3ProviderProps {
    children: ReactNode;
}

interface ExtendedEthereumProvider {
    isMetaMask?: boolean;
    isRainbow?: boolean;
    isCoinbaseWallet?: boolean;
    isTrust?: boolean;
    isImToken?: boolean;
    isTokenPocket?: boolean;
    _metamask?: {
        isUnlocked?: () => Promise<boolean>;
    };
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: string, listener: (...args: unknown[]) => void) => void;
    removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
    chainId?: string;
    selectedAddress?: string | null;
}

declare global {
    interface Window {
        ethereum?: ExtendedEthereumProvider;
    }
}

const isRealMetaMask = (): boolean => {
    if (typeof window === 'undefined') return false;

    const ethereum = window.ethereum;
    if (!ethereum) return false;

    const isLikelyMetaMask = ethereum.isMetaMask && typeof ethereum._metamask === 'object';
    const isOtherWallet =
        ethereum.isRainbow ||
        ethereum.isCoinbaseWallet ||
        ethereum.isTrust ||
        ethereum.isImToken ||
        ethereum.isTokenPocket;

    return Boolean(isLikelyMetaMask && !isOtherWallet);
};

const getMetaMaskProvider = (): ExtendedEthereumProvider | null => {
    if (typeof window === 'undefined') return null;

    const ethereum = window.ethereum;
    if (!ethereum) return null;

    if (
        ethereum.isRainbow ||
        ethereum.isCoinbaseWallet ||
        ethereum.isTrust ||
        ethereum.isImToken ||
        ethereum.isTokenPocket
    ) {
        return null;
    }

    return ethereum.isMetaMask ? ethereum : null;
};

export function Web3Provider({ children }: Web3ProviderProps) {
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [account, setAccount] = useState<string>('');
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [metaMaskAvailable, setMetaMaskAvailable] = useState<boolean>(false);
    const [detectedWallets, setDetectedWallets] = useState<string[]>([]);

    useEffect(() => {
        const checkWallets = () => {
            const ethereum = window.ethereum;
            const wallets: string[] = [];

            if (ethereum?.isMetaMask) wallets.push('MetaMask');
            if (ethereum?.isRainbow) wallets.push('Rainbow');
            if (ethereum?.isCoinbaseWallet) wallets.push('Coinbase Wallet');
            if (ethereum?.isTrust) wallets.push('Trust Wallet');
            if (ethereum?.isImToken) wallets.push('ImToken');
            if (ethereum?.isTokenPocket) wallets.push('TokenPocket');

            setDetectedWallets(wallets);

            const hasRealMetaMask = isRealMetaMask();
            setMetaMaskAvailable(hasRealMetaMask);

            if (hasRealMetaMask) {
                const metaMaskProvider = getMetaMaskProvider();
                if (metaMaskProvider) {
                    const newProvider = new ethers.BrowserProvider(metaMaskProvider as ethers.Eip1193Provider);
                    setProvider(newProvider);
                    checkConnection(newProvider);

                    metaMaskProvider.on('accountsChanged', handleAccountsChanged);
                    metaMaskProvider.on('chainChanged', handleChainChanged);

                    return () => {
                        metaMaskProvider.removeListener('accountsChanged', handleAccountsChanged);
                        metaMaskProvider.removeListener('chainChanged', handleChainChanged);
                    };
                }
            }
        };

        checkWallets();
    }, []);

    const handleAccountsChanged = (accounts: unknown) => {
        if (Array.isArray(accounts) && accounts.every(item => typeof item === 'string')) {
            const accountList = accounts as string[];
            if (accountList.length === 0) {
                setAccount('');
                setIsConnected(false);
                setSigner(null);
            } else if (accountList[0] !== account) {
                setAccount(accountList[0]);
                updateSigner();
            }
        }
    };

    const handleChainChanged = () => {
        window.location.reload();
    };

    const updateSigner = async () => {
        const metaMaskProvider = getMetaMaskProvider();
        if (metaMaskProvider) {
            const newProvider = new ethers.BrowserProvider(metaMaskProvider as ethers.Eip1193Provider);
            try {
                const newSigner = await newProvider.getSigner();
                setSigner(newSigner);
            } catch (error) {
                console.error("Error updating signer:", error);
            }
        }
    };

    const checkConnection = async (provider: ethers.BrowserProvider) => {
        try {
            const accounts = await provider.send("eth_accounts", []);
            if (accounts.length > 0) {
                setAccount(accounts[0]);
                setIsConnected(true);
                const newSigner = await provider.getSigner();
                setSigner(newSigner);
            }
        } catch (error) {
            console.error("Error checking connection:", error);
        }
    };

    const connectWallet = async (): Promise<void> => {
        if (detectedWallets.includes('Rainbow') && !metaMaskAvailable) {
            alert("Please disable Rainbow Wallet and install MetaMask to continue. This dApp only supports MetaMask.");
            window.open('https://metamask.io/download.html', '_blank');
            return;
        }

        if (!metaMaskAvailable) {
            if (detectedWallets.length > 0) {
                alert(`Detected: ${detectedWallets.join(', ')}. This dApp only supports MetaMask. Please install MetaMask.`);
            } else {
                alert("Please install MetaMask to connect your wallet!");
            }
            window.open('https://metamask.io/download.html', '_blank');
            return;
        }

        const metaMaskProvider = getMetaMaskProvider();
        if (!metaMaskProvider) {
            alert("MetaMask is not available. Please refresh the page.");
            return;
        }

        try {
            const accounts = await metaMaskProvider.request({
                method: "eth_requestAccounts"
            });

            if (Array.isArray(accounts) && accounts.length > 0 && typeof accounts[0] === 'string') {
                setAccount(accounts[0]);
                setIsConnected(true);
                const newProvider = new ethers.BrowserProvider(metaMaskProvider as ethers.Eip1193Provider);
                const newSigner = await newProvider.getSigner();
                setProvider(newProvider);
                setSigner(newSigner);
            }
        } catch (error) {
            console.error("User rejected connection:", error);
            if (typeof error === 'object' && error !== null && 'code' in error) {
                const err = error as { code: number };
                if (err.code === 4001) {
                    alert("Please connect your MetaMask wallet to continue");
                }
            } else {
                alert("Connection failed. Please try again.");
            }
        }
    };

    return (
        <Web3Context.Provider value={{
            provider,
            signer,
            account,
            isConnected,
            connectWallet,
            isMetaMaskInstalled: metaMaskAvailable,
            detectedWallets
        }}>
            {children}
        </Web3Context.Provider>
    );
}

export const useWeb3 = (): Web3ContextType => {
    const context = useContext(Web3Context);
    if (context === undefined) {
        throw new Error('useWeb3 must be used within a Web3Provider');
    }
    return context;
};
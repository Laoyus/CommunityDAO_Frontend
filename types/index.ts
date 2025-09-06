import { ethers } from 'ethers';

export interface Web3ContextType {
    provider: ethers.BrowserProvider | null;
    signer: ethers.Signer | null;
    account: string;
    isConnected: boolean;
    isMetaMaskInstalled: boolean;
    detectedWallets: string[];
    connectWallet: () => Promise<void>;
}

export interface Member {
    memberAddress: string;
    contribution: string;
    profileNftId: number;
    votingPower: number;
    exists: boolean;
}

export interface Community {
    id: number;
    name: string;
    description: string;
    creator: string;
    treasury: string;
    creationTime: string;
}

export interface Poll {
    id: number;
    question: string;
    options: string[];
    recipients: string[];
    voteCounts: number[];
    creationTime: string;
    endTime: string;
    isClosed: boolean;
    fundsDistributed: boolean;
    totalVotes: number;
    totalFund: string;
}

export interface NewPoll {
    question: string;
    options: string[];
    recipients: string[];
    duration: number;
    totalFund: string;
}

export interface PollDetails {
    options: string[];
    recipients: string[];
}
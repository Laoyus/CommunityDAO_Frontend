'use client';
import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { getCreateCommunityContract } from '@/utils/contracts';
import { useParams } from 'next/navigation';
import { ethers } from 'ethers';
import { Community, Poll, NewPoll, PollDetails } from '@/types';
import { AlertCircle, CheckCircle, XCircle, Vote, Clock, Users, Plus, Minus } from 'lucide-react';

// Helper function to validate Ethereum addresses
const isValidEthereumAddress = (address: string): boolean => {
    try {
        ethers.getAddress(address);
        return true;
    } catch {
        return false;
    }
};

// Helper to validate all recipient addresses
const validateRecipients = (recipients: string[]): { valid: boolean; invalidIndexes: number[] } => {
    const invalidIndexes: number[] = [];

    recipients.forEach((recipient, index) => {
        if (recipient.trim() && !isValidEthereumAddress(recipient.trim())) {
            invalidIndexes.push(index);
        }
    });

    return {
        valid: invalidIndexes.length === 0,
        invalidIndexes
    };
};

export default function CommunityPage() {
    const params = useParams();
    const communityId = parseInt(params.id as string);
    const { signer, account, isConnected } = useWeb3();

    const [community, setCommunity] = useState<Community | null>(null);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [contributionAmount, setContributionAmount] = useState<string>('');
    const [showCreatePoll, setShowCreatePoll] = useState<boolean>(false);
    const [newPoll, setNewPoll] = useState<NewPoll>({
        question: '',
        options: ['', ''],
        recipients: ['', ''],
        duration: 7,
        totalFund: ''
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [addressValidation, setAddressValidation] = useState<{ [key: number]: boolean }>({});

    // Function to get poll details from localStorage
    const getPollDetails = (pollId: number): PollDetails => {
        try {
            const key = `poll-${communityId}-${pollId}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading poll details from localStorage:', error);
        }
        return { options: ['Option 1', 'Option 2'], recipients: [] };
    };

    // Function to save poll details to localStorage
    const savePollDetails = (pollId: number, details: PollDetails) => {
        try {
            const key = `poll-${communityId}-${pollId}`;
            localStorage.setItem(key, JSON.stringify(details));
        } catch (error) {
            console.error('Error saving poll details to localStorage:', error);
        }
    };

    useEffect(() => {
        if (isConnected && signer) {
            loadCommunity();
            loadPolls();
        }
    }, [isConnected, signer, communityId]);

    const loadCommunity = async (): Promise<void> => {
        try {
            if (!signer) return;

            const contract = getCreateCommunityContract(signer);
            const communityData = await contract.communities(communityId);
            setCommunity({
                id: communityId,
                name: communityData.name,
                description: communityData.description,
                creator: communityData.creator,
                treasury: ethers.formatEther(communityData.treasury),
                creationTime: new Date(Number(communityData.creationTime) * 1000).toLocaleDateString()
            });
        } catch (error) {
            console.error("Error loading community:", error);
        }
    };

    const loadPolls = async (): Promise<void> => {
        try {
            if (!signer) return;

            setLoading(true);
            const contract = getCreateCommunityContract(signer);
            const pollsData: Poll[] = [];

            // Load polls - adjust the limit as needed
            for (let i = 0; i < 20; i++) {
                try {
                    const poll = await contract.communityPolls(communityId, i);

                    // Get the locally stored options and recipients
                    const details = getPollDetails(i);

                    pollsData.push({
                        id: i,
                        question: poll.question,
                        options: details.options,
                        recipients: details.recipients,
                        voteCounts: new Array(details.options.length).fill(0),
                        creationTime: new Date(Number(poll.creationTime) * 1000).toLocaleDateString(),
                        endTime: new Date(Number(poll.endTime) * 1000).toLocaleDateString(),
                        isClosed: poll.isClosed,
                        fundsDistributed: poll.fundsDistributed,
                        totalVotes: Number(poll.totalVotes),
                        totalFund: ethers.formatEther(poll.totalFund)
                    });
                } catch (error) {
                    break; // Stop when we reach non-existent polls
                }
            }
            setPolls(pollsData);
        } catch (error) {
            console.error("Error loading polls:", error);
        } finally {
            setLoading(false);
        }
    };

    const contributeToTreasury = async (): Promise<void> => {
        try {
            if (!signer || !contributionAmount) return;

            const contract = getCreateCommunityContract(signer);
            const tx = await contract.contributeToTreasury(communityId, {
                value: ethers.parseEther(contributionAmount)
            });
            await tx.wait();
            setContributionAmount('');
            await loadCommunity();
            alert("Contribution successful!");
        } catch (error) {
            console.error("Error contributing:", error);
            alert("Contribution failed");
        }
    };

    const createPoll = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setError('');

        try {
            if (!signer) throw new Error('Wallet not connected');

            // Validate recipient addresses
            const validation = validateRecipients(newPoll.recipients);
            if (!validation.valid) {
                setError(`Invalid Ethereum addresses at positions: ${validation.invalidIndexes.map(i => i + 1).join(', ')}`);
                return;
            }

            // Filter out empty options and recipients
            const validOptions = newPoll.options.filter(opt => opt.trim() !== '');
            const validRecipients = newPoll.recipients.filter(addr => addr.trim() !== '');

            // Ensure we have at least 2 options and matching recipients
            if (validOptions.length < 2) {
                setError('Need at least 2 options');
                return;
            }

            if (validOptions.length !== validRecipients.length) {
                setError('Number of options must match number of recipients');
                return;
            }

            const totalFundWei = ethers.parseEther(newPoll.totalFund);
            const contract = getCreateCommunityContract(signer);

            const tx = await contract.createPoll(
                communityId,
                newPoll.question,
                validOptions,
                validRecipients,
                newPoll.duration * 86400,
                totalFundWei,
                { value: totalFundWei }
            );

            await tx.wait();

            // Store the options and recipients in localStorage
            const newPollId = polls.length; // This will be the new poll ID
            const pollDetails: PollDetails = {
                options: validOptions,
                recipients: validRecipients
            };
            savePollDetails(newPollId, pollDetails);

            setNewPoll({
                question: '',
                options: ['', ''],
                recipients: ['', ''],
                duration: 7,
                totalFund: ''
            });
            setShowCreatePoll(false);
            await loadPolls(); // Reload polls to include the new one
            setError('');
            alert("Poll created successfully!");
        } catch (error) {
            console.error("Error creating poll:", error);
            setError(error instanceof Error ? error.message : 'Failed to create poll');
        }
    };

    const voteOnPoll = async (pollId: number, option: number): Promise<void> => {
        try {
            if (!signer) return;

            const contract = getCreateCommunityContract(signer);
            const tx = await contract.vote(communityId, pollId, option);
            await tx.wait();
            await loadPolls();
            alert("Vote cast successfully!");
        } catch (error) {
            console.error("Error voting:", error);
            alert("Voting failed");
        }
    };

    const handleRecipientChange = (index: number, value: string) => {
        const newRecipients = [...newPoll.recipients];
        newRecipients[index] = value;
        setNewPoll({ ...newPoll, recipients: newRecipients });

        // Validate address in real-time
        if (value.trim()) {
            setAddressValidation({
                ...addressValidation,
                [index]: isValidEthereumAddress(value.trim())
            });
        }
    };

    const addOptionField = () => {
        setNewPoll({
            ...newPoll,
            options: [...newPoll.options, ''],
            recipients: [...newPoll.recipients, '']
        });
    };

    const removeOptionField = (index: number) => {
        if (newPoll.options.length > 2) {
            const newOptions = newPoll.options.filter((_, i) => i !== index);
            const newRecipients = newPoll.recipients.filter((_, i) => i !== index);
            setNewPoll({
                ...newPoll,
                options: newOptions,
                recipients: newRecipients
            });

            // Update address validation state
            const newValidation = { ...addressValidation };
            delete newValidation[index];
            setAddressValidation(newValidation);
        }
    };

    if (!community) return <div className="min-h-screen flex items-center justify-center">Loading community...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Error display */}
                {error && (
                    <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-50 max-w-md">
                        <div className="flex items-start">
                            <XCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-medium text-red-800">Error</h4>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Community Header */}
                <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{community.name}</h1>
                    <p className="text-gray-600 mb-4">{community.description}</p>
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-lg font-semibold text-green-600">
                                Treasury: {community.treasury} ETH
                            </span>
                        </div>
                        <div className="flex space-x-4">
                            <input
                                type="number"
                                value={contributionAmount}
                                onChange={(e) => setContributionAmount(e.target.value)}
                                placeholder="ETH amount"
                                className="border border-gray-300 rounded-md px-3 py-2 w-32"
                                step="0.001"
                                min="0.001"
                            />
                            <button
                                onClick={contributeToTreasury}
                                disabled={!contributionAmount}
                                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded"
                            >
                                Contribute
                            </button>
                        </div>
                    </div>
                </div>

                {/* Create Poll Section */}
                <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Funding Polls</h2>
                        <button
                            onClick={() => setShowCreatePoll(!showCreatePoll)}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
                        >
                            {showCreatePoll ? 'Cancel' : 'Create Poll'}
                        </button>
                    </div>

                    {showCreatePoll && (
                        <form onSubmit={createPoll} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Question</label>
                                <input
                                    type="text"
                                    value={newPoll.question}
                                    onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="What should we fund?"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Options & Recipients</label>
                                {newPoll.options.map((option, index) => (
                                    <div key={index} className="flex space-x-2 mt-2 items-start">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder={`Option ${index + 1} name`}
                                                value={option}
                                                onChange={(e) => {
                                                    const newOptions = [...newPoll.options];
                                                    newOptions[index] = e.target.value;
                                                    setNewPoll({ ...newPoll, options: newOptions });
                                                }}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                                required
                                            />
                                        </div>
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                placeholder="Recipient Address (0x...)"
                                                value={newPoll.recipients[index]}
                                                onChange={(e) => handleRecipientChange(index, e.target.value)}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10"
                                                required
                                            />
                                            {newPoll.recipients[index].trim() && (
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                    {addressValidation[index] ? (
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    ) : (
                                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {newPoll.options.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => removeOptionField(index)}
                                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addOptionField}
                                    className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded flex items-center"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Option
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Duration (days)</label>
                                    <input
                                        type="number"
                                        value={newPoll.duration}
                                        onChange={(e) => setNewPoll({ ...newPoll, duration: parseInt(e.target.value) })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        min="1"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Total Fund (ETH)</label>
                                    <input
                                        type="number"
                                        value={newPoll.totalFund}
                                        onChange={(e) => setNewPoll({ ...newPoll, totalFund: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        step="0.001"
                                        min="0.001"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded"
                            >
                                Create Poll
                            </button>
                        </form>
                    )}
                </div>

                {/* Polls List */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Polls</h2>
                    {loading ? (
                        <div className="text-center py-8">Loading polls...</div>
                    ) : polls.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg">
                            <Vote className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600">No active polls yet. Create the first one!</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {polls.map((poll) => (
                                <div key={poll.id} className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-2">{poll.question}</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                                        <div className="flex items-center">
                                            <Clock className="w-4 h-4 mr-1" />
                                            Ends: {poll.endTime}
                                        </div>
                                        <div className="flex items-center">
                                            <Users className="w-4 h-4 mr-1" />
                                            Votes: {poll.totalVotes}
                                        </div>
                                        <div>Fund: {poll.totalFund} ETH</div>
                                        <div>Status: {poll.isClosed ? 'Closed' : 'Active'}</div>
                                    </div>

                                    {!poll.isClosed ? (
                                        <div className="space-y-2">
                                            <h4 className="font-medium text-gray-900">Vote for:</h4>
                                            {poll.options.map((option, optionIndex) => (
                                                <button
                                                    key={optionIndex}
                                                    onClick={() => voteOnPoll(poll.id, optionIndex)}
                                                    className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 text-left transition duration-200"
                                                >
                                                    <div className="font-medium text-blue-900">{option}</div>
                                                    {poll.recipients[optionIndex] && (
                                                        <div className="text-xs text-gray-500 mt-1 truncate">
                                                            Recipient: {poll.recipients[optionIndex]}
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h4 className="font-medium text-gray-900 mb-3">Poll Results:</h4>
                                            {poll.options.map((option, optionIndex) => (
                                                <div key={optionIndex} className="flex justify-between items-center mb-2 p-2 bg-white rounded">
                                                    <span className="text-sm font-medium">{option}</span>
                                                    <span className="text-sm text-blue-600 font-semibold">
                                                        {poll.voteCounts[optionIndex] || 0} votes
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
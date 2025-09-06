// app/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { getCreateCommunityContract, getCommunityDAOContract } from '@/utils/contracts';
import Link from 'next/link';
import { Community } from '@/types';
import { ethers } from 'ethers';
import {
  Wallet,
  Users,
  Gem,
  AlertCircle,
  Download,
  PlusCircle
} from 'lucide-react';

export default function Home() {
  const { isConnected, account, connectWallet, signer, isMetaMaskInstalled } = useWeb3();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [newCommunity, setNewCommunity] = useState({ name: '', description: '' });
  const [isMember, setIsMember] = useState<boolean>(false);
  const [userVotingPower, setUserVotingPower] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);

  useEffect(() => {
    if (isConnected && signer) {
      loadCommunities();
      checkMembership();
    }
  }, [isConnected, signer]);

  const loadCommunities = async (): Promise<void> => {
    try {
      setLoading(true);
      const contract = getCreateCommunityContract(signer!);
      const count = await contract.communityCount();

      const communitiesData: Community[] = [];
      for (let i = 0; i < Math.min(Number(count), 10); i++) {
        try {
          const community = await contract.communities(i);
          communitiesData.push({
            id: i,
            name: community.name,
            description: community.description,
            creator: community.creator,
            treasury: ethers.formatEther(community.treasury),
            creationTime: new Date(Number(community.creationTime) * 1000).toLocaleDateString()
          });
        } catch (error) {
          break;
        }
      }
      setCommunities(communitiesData);
    } catch (error) {
      console.error("Error loading communities:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkMembership = async (): Promise<void> => {
    try {
      if (!signer) return;

      const daoContract = getCommunityDAOContract(signer);
      const memberStruct = await daoContract.getMemberStruct(account);
      setIsMember(memberStruct.exists);
      setUserVotingPower(Number(memberStruct.votingPower));
    } catch (error) {
      console.error("Error checking membership:", error);
      setIsMember(false);
    }
  };

  const registerMember = async (): Promise<void> => {
    try {
      if (!signer) return;

      const daoContract = getCommunityDAOContract(signer);
      const tx = await daoContract.registerMember({ value: ethers.parseEther("0.01") });
      await tx.wait();
      await checkMembership();
      alert("Successfully registered as member!");
    } catch (error) {
      console.error("Error registering:", error);
      alert("Registration failed");
    }
  };

  const createCommunity = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      if (!signer) return;

      const contract = getCreateCommunityContract(signer);
      const tx = await contract.createCommunity(newCommunity.name, newCommunity.description);
      await tx.wait();
      setNewCommunity({ name: '', description: '' });
      setShowCreateForm(false);
      await loadCommunities();
      alert("Community created successfully!");
    } catch (error) {
      console.error("Error creating community:", error);
      alert("Community creation failed");
    }
  };

  // Not connected state - MetaMask specific
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to CommunityDAO</h1>
            <p className="text-gray-600">Connect your MetaMask wallet to join communities and participate in funding decisions</p>
          </div>

          {!isMetaMaskInstalled ? (
            <div className="text-center">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center mb-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
                  <span className="text-orange-800 font-medium">MetaMask not found</span>
                </div>
                <p className="text-orange-700 text-sm">Please install MetaMask to continue</p>
              </div>
              <button
                onClick={() => window.open('https://metamask.io/download.html', '_blank')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
              >
                <Download className="w-5 h-5 mr-2" />
                Install MetaMask
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={connectWallet}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
              >
                Connect MetaMask Wallet
              </button>
              <p className="text-gray-500 text-sm mt-4">
                You will be prompted to connect your wallet securely
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">CommunityDAO</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {account.slice(0, 6)}...{account.slice(-4)}
              </div>
              {isMember && (
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
                  <Gem className="w-4 h-4 mr-1" />
                  Voting Power: {userVotingPower}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Membership Section */}
        {!isMember && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-start">
              <Gem className="w-6 h-6 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-yellow-800 mb-2">Become a DAO Member</h2>
                <p className="text-yellow-700 mb-4">
                  Join the DAO by contributing 0.01 ETH to get voting rights and participate in community decisions
                </p>
                <button
                  onClick={registerMember}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                >
                  Register Member (0.01 ETH)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Community Section */}
        {isMember && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Create New Community</h2>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <PlusCircle className="w-5 h-5 mr-1" />
                {showCreateForm ? 'Cancel' : 'New Community'}
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={createCommunity} className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Community Name</label>
                  <input
                    type="text"
                    value={newCommunity.name}
                    onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter community name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newCommunity.description}
                    onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe your community's purpose"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition duration-200"
                >
                  Create Community
                </button>
              </form>
            )}
          </div>
        )}

        {/* Communities Section */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Communities</h2>
            <span className="text-gray-500 text-sm">
              {communities.length} community{communities.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading communities...</p>
            </div>
          ) : communities.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No communities yet. Be the first to create one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communities.map((community) => (
                <Link key={community.id} href={`/communities/${community.id}`}>
                  <div className="bg-gray-50 hover:bg-gray-100 rounded-lg p-6 cursor-pointer transition duration-200 border border-gray-200 hover:border-gray-300">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{community.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 h-10">{community.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-600">
                        {community.treasury} ETH
                      </span>
                      <span className="text-xs text-gray-500">{community.creationTime}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
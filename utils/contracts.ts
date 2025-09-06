import { ethers } from 'ethers';
// import { Community, Poll, Member } from '../types';

// CommunityDAO Contract
export const COMMUNITY_DAO_ADDRESS = "0x11a99b229BAc81A3A45A2566Bc0C83AC3d89A30A";
export const COMMUNITY_DAO_ABI = [
    "function registerMember() external payable returns (uint256)",
    "function addContribution() external payable",
    "function getVotingPower(address member) external view returns (uint256)",
    "function totalMembers() external view returns (uint256)",
    "function getMemberStruct(address _member) external view returns (address memberAddress, uint256 contribution, uint256 profileNftId, uint256 votingPower, bool exists)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function tokenURI(uint256 tokenId) external view returns (string memory)",
    "function name() external view returns (string memory)",
    "function symbol() external view returns (string memory)",
    "function TOKENS_PER_ETH() external view returns (uint256)",
    "event MemberRegistered(address indexed member, uint256 nftId)",
    "event ContributionAdded(address indexed member, uint256 amount, uint256 votingPower)"
];

// CreateCommunity Contract
export const CREATE_COMMUNITY_ADDRESS = "0x801A82d5Fc8050b283197bF3cA6654dAB56e0e60";
export const CREATE_COMMUNITY_ABI = [
    "function createCommunity(string memory _name, string memory _description) public returns (uint256)",
    "function addCommunityMember(uint256 _communityId, address _member) external",
    "function createPoll(uint256 _communityId, string memory _question, string[] memory _options, address[] memory _recipients, uint256 _duration, uint256 _totalFund) external payable returns (uint256)",
    "function vote(uint256 _communityId, uint256 _pollId, uint256 _option) external",
    "function closePoll(uint256 _communityId, uint256 _pollId) external",
    "function contributeToTreasury(uint256 _communityId) external payable",
    "function getWinningOption(uint256 _communityId, uint256 _pollId) public view returns (uint256)",
    "function communityCount() external view returns (uint256)",
    "function communities(uint256) external view returns (string memory name, string memory description, address creator, uint256 creationTime, uint256 treasury)",
    "function communityPolls(uint256, uint256) external view returns (string memory question, uint256 creationTime, uint256 endTime, bool isClosed, bool fundsDistributed, uint256 totalVotes, uint256 totalFund)",
    "function hasVoted(uint256, uint256, address) external view returns (bool)",
    "function dao() external view returns (address)",
    "event CommunityCreated(uint256 indexed id, string name, address creator)",
    "event PollCreated(uint256 indexed communityId, uint256 pollId, string question, uint256 totalFund)",
    "event VoteCast(uint256 indexed communityId, uint256 pollId, address voter, uint256 option, uint256 power)",
    "event PollClosed(uint256 indexed communityId, uint256 pollId, uint256 winningOption)",
    "event FundsDistributed(uint256 indexed communityId, uint256 pollId, address winner, uint256 amount)"
];

// Contract instances with proper typing
export const getCommunityDAOContract = (signer: ethers.Signer) => {
    return new ethers.Contract(COMMUNITY_DAO_ADDRESS, COMMUNITY_DAO_ABI, signer);
};

export const getCreateCommunityContract = (signer: ethers.Signer) => {
    return new ethers.Contract(CREATE_COMMUNITY_ADDRESS, CREATE_COMMUNITY_ABI, signer);
};

// Type guards and utilities
export const isEthersError = (error: unknown): error is { code: string; message: string } => {
    return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
};
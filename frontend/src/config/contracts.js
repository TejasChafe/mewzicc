// src/config/contracts.js
export const CONTRACT_ADDRESSES = {
  RoyaltyDistributor: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Replace with Tejas's local output
  MockUSDC: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"           // Replace with Tejas's local output
};

export const ROYALTY_DISTRIBUTOR_ABI = [
  "function registerTrack(string title, string audioUri, address[] shareholders, uint256[] sharesBps) external returns (uint256 trackId)",
  "function triggerPayout(uint256 trackId, uint256 streamCount) external",
  "function claimRoyalty(uint256 trackId) external",
  "function getTrack(uint256 trackId) external view returns (string title, string audioUri, uint256 totalPlays, uint256 totalRevenueDistributed, address[] shareholders, uint256[] sharesBps)",
  "function getPendingRoyalty(uint256 trackId, address contributor) external view returns (uint256)",
  "event TrackRegistered(uint256 indexed trackId, string title, address indexed owner)",
  "event PayoutTriggered(uint256 indexed trackId, uint256 streamCount, uint256 totalAmountDistributed, uint256 timestamp)",
  "event RoyaltyClaimed(uint256 indexed trackId, address indexed contributor, uint256 amount)"
];
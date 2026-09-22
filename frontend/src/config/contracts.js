// src/config/contracts.js
import addressesJson from './addresses.json';

export const CONTRACT_ADDRESSES = {
  RoyaltyDistributor: addressesJson.royaltyDistributor,
  MockUSDC: addressesJson.mockUSDC
};

export const ROYALTY_DISTRIBUTOR_ABI = [
  "function registerTrack(string metadataCID, uint256 royaltyPerListen) external returns (uint256 trackId)",
  "function setSplits(uint256 trackId, address[] shareholders, uint256[] shares) external",
  "function triggerPayout(uint256 trackId, uint256 listenCount) external",
  "function getTrack(uint256 trackId) external view returns (address artist, string memory metadataCID, uint256 royaltyPerListen, uint256 totalPayouts)",
  "function getShareholders(uint256 trackId) external view returns (address[] memory)",
  "function getTrackSplits(uint256 trackId) external view returns (address[] memory shareholders, uint256[] memory shares)",
  "event TrackRegistered(uint256 indexed trackId, address indexed artist, string metadataCID, uint256 royaltyPerListen)",
  "event SplitsSet(uint256 indexed trackId, address[] shareholders, uint256[] shares)",
  "event PayoutTriggered(uint256 indexed trackId, uint256 indexed batchId, uint256 listenCount, uint256 totalRevenue)",
  "event RoyaltyPaid(uint256 indexed trackId, uint256 indexed batchId, address indexed recipient, uint256 amount)"
];
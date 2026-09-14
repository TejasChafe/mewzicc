// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract RoyaltyDistributor is AccessControl {
    using SafeERC20 for IERC20;

    // =============================================================
    // CONSTANTS
    // =============================================================

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAX_SHAREHOLDERS = 15;

    bytes32 public constant SETTLEMENT_ROLE = keccak256("SETTLEMENT_ROLE");

    // =============================================================
    // DATA STRUCTURES
    // =============================================================

    struct Track {
        uint256 id;
        address artist;
        string metadataCID;
        uint256 royaltyPerListen;
        uint256 totalPayouts;
        bool exists;
    }

    // =============================================================
    // STATE VARIABLES
    // =============================================================

    IERC20 public immutable royaltyToken;

    uint256 private nextTrackId = 1;

    // trackId => current batch sequence number
    mapping(uint256 => uint256) public currentBatchId;

    // trackId => track metadata & settings
    mapping(uint256 => Track) public tracks;

    // trackId => list of royalty recipients
    mapping(uint256 => address[]) private trackShareholders;

    // trackId => shareholder => share in basis points
    mapping(uint256 => mapping(address => uint256)) public sharesBps;

    // =============================================================
    // EVENTS
    // =============================================================

    event TrackRegistered(
        uint256 indexed trackId,
        address indexed artist,
        string metadataCID,
        uint256 royaltyPerListen
    );

    event SplitsSet(
        uint256 indexed trackId,
        address[] shareholders,
        uint256[] shares
    );

    event PayoutTriggered(
        uint256 indexed trackId,
        uint256 indexed batchId,
        uint256 listenCount,
        uint256 totalRevenue
    );

    event RoyaltyPaid(
        uint256 indexed trackId,
        uint256 indexed batchId,
        address indexed recipient,
        uint256 amount
    );

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    constructor(address _royaltyToken) {
        require(_royaltyToken != address(0), "Invalid royalty token");

        royaltyToken = IERC20(_royaltyToken);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SETTLEMENT_ROLE, msg.sender);
    }

    // =============================================================
    // TRACK REGISTRATION
    // =============================================================

    function registerTrack(
        string calldata metadataCID,
        uint256 royaltyPerListen
    ) external returns (uint256 trackId) {
        require(royaltyPerListen > 0, "Royalty rate must be greater than zero");

        trackId = nextTrackId++;

        tracks[trackId] = Track({
            id: trackId,
            artist: msg.sender,
            metadataCID: metadataCID,
            royaltyPerListen: royaltyPerListen,
            totalPayouts: 0,
            exists: true
        });

        emit TrackRegistered(
            trackId,
            msg.sender,
            metadataCID,
            royaltyPerListen
        );
    }

    // =============================================================
    // ROYALTY SPLITS
    // =============================================================

    function setSplits(
        uint256 trackId,
        address[] calldata shareholders,
        uint256[] calldata shares
    ) external {
        Track storage track = tracks[trackId];

        require(track.exists, "Track does not exist");
        require(msg.sender == track.artist, "Only artist can set splits");
        require(track.totalPayouts == 0, "Splits cannot change after payout");
        require(shareholders.length > 0, "No shareholders provided");
        require(shareholders.length == shares.length, "Length mismatch");
        require(shareholders.length <= MAX_SHAREHOLDERS, "Too many shareholders");

        uint256 totalShares = 0;

        // Reset previous split configuration
        address[] storage existingShareholders = trackShareholders[trackId];
        for (uint256 i = 0; i < existingShareholders.length; i++) {
            sharesBps[trackId][existingShareholders[i]] = 0;
        }
        delete trackShareholders[trackId];

        // Apply new split configuration
        for (uint256 i = 0; i < shareholders.length; i++) {
            address shareholder = shareholders[i];
            uint256 share = shares[i];

            require(shareholder != address(0), "Invalid shareholder");
            require(share > 0, "Share must be greater than zero");
            require(sharesBps[trackId][shareholder] == 0, "Duplicate shareholder");

            sharesBps[trackId][shareholder] = share;
            trackShareholders[trackId].push(shareholder);

            totalShares += share;
        }

        require(totalShares == BPS_DENOMINATOR, "Shares must total 10000 BPS");

        emit SplitsSet(trackId, shareholders, shares);
    }

    // =============================================================
    // BATCH PAYOUT (Compatible with Abhishek's Relayed Flow)
    // =============================================================

    function triggerPayout(
        uint256 trackId,
        uint256 listenCount
    ) external onlyRole(SETTLEMENT_ROLE) {
        Track storage track = tracks[trackId];

        require(track.exists, "Track does not exist");
        require(listenCount > 0, "Listen count must be greater than zero");

        address[] storage shareholders = trackShareholders[trackId];
        require(shareholders.length > 0, "Splits not configured");

        // Automatically assign sequential batch identifier
        uint256 batchId = ++currentBatchId[trackId];

        uint256 totalRevenue = listenCount * track.royaltyPerListen;
        require(totalRevenue > 0, "Revenue must be greater than zero");

        // Pull tokens from the authorized platform relayer (msg.sender)
        royaltyToken.safeTransferFrom(
            msg.sender,
            address(this),
            totalRevenue
        );

        uint256 distributedAmount = 0;

        // Direct push distribution to all configured stakeholders
        for (uint256 i = 0; i < shareholders.length; i++) {
            address recipient = shareholders[i];
            uint256 amount = (totalRevenue * sharesBps[trackId][recipient]) / BPS_DENOMINATOR;

            if (amount > 0) {
                royaltyToken.safeTransfer(recipient, amount);
                distributedAmount += amount;

                emit RoyaltyPaid(
                    trackId,
                    batchId,
                    recipient,
                    amount
                );
            }
        }

        // Remainder dust routed to the track artist
        uint256 remainder = totalRevenue - distributedAmount;
        if (remainder > 0) {
            royaltyToken.safeTransfer(track.artist, remainder);

            emit RoyaltyPaid(
                trackId,
                batchId,
                track.artist,
                remainder
            );
        }

        track.totalPayouts += totalRevenue;

        emit PayoutTriggered(
            trackId,
            batchId,
            listenCount,
            totalRevenue
        );
    }

    // =============================================================
    // VIEW FUNCTIONS
    // =============================================================

    function getShareholders(
        uint256 trackId
    ) external view returns (address[] memory) {
        return trackShareholders[trackId];
    }

    function getTrackSplits(
        uint256 trackId
    ) external view returns (
        address[] memory shareholders,
        uint256[] memory shares
    ) {
        shareholders = trackShareholders[trackId];
        shares = new uint256[](shareholders.length);

        for (uint256 i = 0; i < shareholders.length; i++) {
            shares[i] = sharesBps[trackId][shareholders[i]];
        }
    }

    function getTrack(
        uint256 trackId
    ) external view returns (
        address artist,
        string memory metadataCID,
        uint256 royaltyPerListen,
        uint256 totalPayouts
    ) {
        Track storage track = tracks[trackId];
        require(track.exists, "Track does not exist");

        return (
            track.artist,
            track.metadataCID,
            track.royaltyPerListen,
            track.totalPayouts
        );
    }
}
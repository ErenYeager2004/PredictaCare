// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * PredictaCare Smart Contract v4
 * ================================
 * Changes from v3:
 *   - Prediction struct now stores ipfsCid alongside hash
 *   - storePrediction() accepts ipfsCid as 3rd parameter
 *   - getCid() public getter for frontend to fetch from IPFS
 *   - ipfsCid is optional — pass "" if IPFS is unavailable
 *
 * This means for every prediction:
 *   - hash    → tamper detection (SHA-256 of prediction fields)
 *   - ipfsCid → full encrypted data on IPFS (permanent, decentralised)
 *
 * ⚠️  Breaking change — requires redeployment.
 *     Run: node blockchain/deploy.cjs
 *     Update CONTRACT_ADDRESS in .env
 */
contract PredictaCare {

    address public owner;
    bool    public paused;
    uint256 public writerCount;

    struct Prediction {
        bytes32 hash;
        string  ipfsCid;    // IPFS CID of encrypted full prediction data
        uint256 timestamp;
        address storedBy;
        bool    exists;
    }

    mapping(string  => Prediction) private predictions;
    mapping(address => bool)       public  authorizedWriters;

    event PredictionStored(
        string  indexed predictionId,
        bytes32         hash,
        string          ipfsCid,
        address indexed storedBy,
        uint256         timestamp
    );
    event WriterGranted(address indexed writer, uint256 timestamp);
    event WriterRevoked(address indexed writer, uint256 timestamp);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event ContractPaused(uint256 timestamp);
    event ContractUnpaused(uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "PredictaCare: caller is not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(
            authorizedWriters[msg.sender] || msg.sender == owner,
            "PredictaCare: caller is not authorized"
        );
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "PredictaCare: contract is paused");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedWriters[msg.sender] = true;
        writerCount = 1;
        emit WriterGranted(msg.sender, block.timestamp);
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Store a prediction hash + IPFS CID on-chain.
     * @param predictionId  MongoDB ObjectId of the prediction
     * @param hash          SHA-256 hash of prediction fields (tamper detection)
     * @param ipfsCid       IPFS CID of encrypted full data — pass "" if unavailable
     */
    function storePrediction(
        string  calldata predictionId,
        bytes32          hash,
        string  calldata ipfsCid
    )
        external
        onlyAuthorized
        whenNotPaused
    {
        require(!predictions[predictionId].exists, "PredictaCare: already stored");
        require(hash != bytes32(0),                "PredictaCare: hash cannot be empty");

        predictions[predictionId] = Prediction({
            hash:      hash,
            ipfsCid:   ipfsCid,
            timestamp: block.timestamp,
            storedBy:  msg.sender,
            exists:    true
        });

        emit PredictionStored(predictionId, hash, ipfsCid, msg.sender, block.timestamp);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    function verifyPrediction(string calldata predictionId, bytes32 hash)
        external
        view
        returns (bool valid, uint256 timestamp, address storedBy)
    {
        Prediction memory p = predictions[predictionId];
        if (!p.exists) return (false, 0, address(0));
        return (p.hash == hash, p.timestamp, p.storedBy);
    }

    function getPrediction(string calldata predictionId)
        external
        view
        returns (bytes32 hash, string memory ipfsCid, uint256 timestamp, address storedBy, bool exists)
    {
        Prediction memory p = predictions[predictionId];
        return (p.hash, p.ipfsCid, p.timestamp, p.storedBy, p.exists);
    }

    /**
     * Get just the IPFS CID for a prediction.
     * Frontend can call this directly via Ethers.js to fetch full data from IPFS.
     */
    function getCid(string calldata predictionId)
        external
        view
        returns (string memory ipfsCid, bool exists)
    {
        Prediction memory p = predictions[predictionId];
        return (p.ipfsCid, p.exists);
    }

    function predictionExists(string calldata predictionId)
        external
        view
        returns (bool)
    {
        return predictions[predictionId].exists;
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function grantWriter(address writer) external onlyOwner {
        require(writer != address(0),       "PredictaCare: invalid address");
        require(!authorizedWriters[writer], "PredictaCare: already a writer");
        authorizedWriters[writer] = true;
        writerCount++;
        emit WriterGranted(writer, block.timestamp);
    }

    function revokeWriter(address writer) external onlyOwner {
        require(writer != owner,            "PredictaCare: cannot revoke owner");
        require(authorizedWriters[writer],  "PredictaCare: not a writer");
        authorizedWriters[writer] = false;
        if (writerCount > 0) writerCount--;
        emit WriterRevoked(writer, block.timestamp);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "PredictaCare: invalid address");
        require(newOwner != owner,      "PredictaCare: already owner");

        address oldOwner = owner;

        if (authorizedWriters[oldOwner]) {
            authorizedWriters[oldOwner] = false;
            if (writerCount > 0) writerCount--;
            emit WriterRevoked(oldOwner, block.timestamp);
        }

        if (!authorizedWriters[newOwner]) {
            authorizedWriters[newOwner] = true;
            writerCount++;
            emit WriterGranted(newOwner, block.timestamp);
        }

        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    function pause() external onlyOwner {
        paused = true;
        emit ContractPaused(block.timestamp);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit ContractUnpaused(block.timestamp);
    }
}

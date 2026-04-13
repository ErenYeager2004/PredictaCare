// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * PredictaCare Smart Contract v2
 * ================================
 * Upgrades from v1:
 *   - Role-based access control (onlyAuthorized writers)
 *   - Event logs for every action (publicly auditable on Etherscan)
 *   - Owner can grant/revoke writer roles
 *   - verifyPrediction now returns full proof data
 *   - Emergency pause mechanism
 */
contract PredictaCare {

    // ── State ──────────────────────────────────────────────────────────────────
    address public owner;
    bool    public paused;

    struct Prediction {
        bytes32   hash;
        uint256   timestamp;
        address   storedBy;
        bool      exists;
    }

    mapping(string  => Prediction) private predictions;   // predictionId → data
    mapping(address => bool)       public  authorizedWriters; // role-based access

    // ── Events (publicly auditable on Etherscan) ───────────────────────────────
    event PredictionStored(
        string  indexed predictionId,
        bytes32         hash,
        address indexed storedBy,
        uint256         timestamp
    );

    event WriterGranted(address indexed writer, uint256 timestamp);
    event WriterRevoked(address indexed writer, uint256 timestamp);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event ContractPaused(uint256 timestamp);
    event ContractUnpaused(uint256 timestamp);

    // ── Modifiers ──────────────────────────────────────────────────────────────
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

    // ── Constructor ────────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        authorizedWriters[msg.sender] = true;
        emit WriterGranted(msg.sender, block.timestamp);
    }

    // ── Write functions ────────────────────────────────────────────────────────

    /**
     * Store a prediction hash on-chain.
     * Only callable by authorized writers (your backend wallet).
     */
    function storePrediction(string calldata predictionId, bytes32 hash)
        external
        onlyAuthorized
        whenNotPaused
    {
        require(!predictions[predictionId].exists, "PredictaCare: prediction already stored");
        require(hash != bytes32(0), "PredictaCare: hash cannot be empty");

        predictions[predictionId] = Prediction({
            hash:      hash,
            timestamp: block.timestamp,
            storedBy:  msg.sender,
            exists:    true
        });

        emit PredictionStored(predictionId, hash, msg.sender, block.timestamp);
    }

    // ── Read functions (PUBLIC — frontend can call directly) ───────────────────

    /**
     * Verify a prediction hash against what's stored on-chain.
     * Frontend calls this directly — no backend trust needed.
     *
     * @param predictionId  MongoDB _id of the prediction
     * @param hash          SHA256 hash recomputed from current data
     * @return valid        true if hash matches on-chain record
     * @return timestamp    when it was originally stored
     * @return storedBy     which wallet stored it
     */
    function verifyPrediction(string calldata predictionId, bytes32 hash)
        external
        view
        returns (bool valid, uint256 timestamp, address storedBy)
    {
        Prediction memory p = predictions[predictionId];
        if (!p.exists) {
            return (false, 0, address(0));
        }
        return (p.hash == hash, p.timestamp, p.storedBy);
    }

    /**
     * Get full prediction record from chain.
     * @return hash       original hash stored
     * @return timestamp  when stored
     * @return storedBy   wallet that stored it
     * @return exists     whether record exists
     */
    function getPrediction(string calldata predictionId)
        external
        view
        returns (bytes32 hash, uint256 timestamp, address storedBy, bool exists)
    {
        Prediction memory p = predictions[predictionId];
        return (p.hash, p.timestamp, p.storedBy, p.exists);
    }

    /**
     * Check if a prediction exists on-chain.
     */
    function predictionExists(string calldata predictionId)
        external
        view
        returns (bool)
    {
        return predictions[predictionId].exists;
    }

    // ── Admin functions ────────────────────────────────────────────────────────

    /**
     * Grant write access to a new address (e.g. new backend wallet).
     */
    function grantWriter(address writer) external onlyOwner {
        require(writer != address(0), "PredictaCare: invalid address");
        authorizedWriters[writer] = true;
        emit WriterGranted(writer, block.timestamp);
    }

    /**
     * Revoke write access from an address.
     */
    function revokeWriter(address writer) external onlyOwner {
        authorizedWriters[writer] = false;
        emit WriterRevoked(writer, block.timestamp);
    }

    /**
     * Transfer contract ownership.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "PredictaCare: invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner     = newOwner;
        authorizedWriters[newOwner] = true;
    }

    /**
     * Emergency pause — stops all new predictions from being stored.
     */
    function pause() external onlyOwner {
        paused = true;
        emit ContractPaused(block.timestamp);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit ContractUnpaused(block.timestamp);
    }
}

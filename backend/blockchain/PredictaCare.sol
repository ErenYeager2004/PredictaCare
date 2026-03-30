// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PredictaCare
 * @notice Stores tamper-proof hashes of AI health predictions on Sepolia testnet.
 *         Anyone can verify a prediction certificate is genuine by checking its hash.
 */
contract PredictaCare {

    // ── Events ────────────────────────────────────────────────────────────────
    event PredictionStored(
        string  indexed predictionId,
        bytes32         hash,
        address         storedBy,
        uint256         timestamp
    );

    // ── Structs ───────────────────────────────────────────────────────────────
    struct PredictionRecord {
        bytes32 hash;
        uint256 timestamp;
        address storedBy;
        bool    exists;
    }

    // ── State ─────────────────────────────────────────────────────────────────
    address public owner;
    mapping(string => PredictionRecord) private predictions;
    uint256 public totalPredictions;

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ── Write ─────────────────────────────────────────────────────────────────
    function storePrediction(string calldata predictionId, bytes32 hash)
        external
        onlyOwner
    {
        require(!predictions[predictionId].exists, "Already stored");
        require(hash != bytes32(0), "Empty hash");

        predictions[predictionId] = PredictionRecord({
            hash:      hash,
            timestamp: block.timestamp,
            storedBy:  msg.sender,
            exists:    true
        });

        totalPredictions++;
        emit PredictionStored(predictionId, hash, msg.sender, block.timestamp);
    }

    // ── Read: verify by id + hash ─────────────────────────────────────────────
    function verifyPrediction(string calldata predictionId, bytes32 hash)
        external view
        returns (bool valid, uint256 timestamp)
    {
        PredictionRecord storage r = predictions[predictionId];
        if (!r.exists) return (false, 0);
        return (r.hash == hash, r.timestamp);
    }

    // ── Read: get record ──────────────────────────────────────────────────────
    function getPrediction(string calldata predictionId)
        external view
        returns (bytes32 hash, uint256 timestamp, address storedBy, bool exists)
    {
        PredictionRecord storage r = predictions[predictionId];
        return (r.hash, r.timestamp, r.storedBy, r.exists);
    }
}

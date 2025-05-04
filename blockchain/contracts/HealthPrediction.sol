// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract HealthPrediction {
    struct PredictionMeta {
        uint256 id;
        bytes32 dataHash; // Hash of the full prediction data
    }

    mapping(uint256 => PredictionMeta) public predictions;
    uint256 public predictionCount;

    event PredictionStored(
        uint256 indexed id,
        bytes32 indexed dataHash
    );

    // Accepts hash of the full prediction data stored off-chain
    function storePredictionHash(
        string memory userId,
        string memory disease,
        string memory userInputs,
        string memory predictionResult,
        uint256 probability
    ) public {
        // Generate a hash off-chain and send it, OR do the hashing here
        bytes32 hash = keccak256(
            abi.encodePacked(userId, disease, userInputs, predictionResult, probability)
        );

        predictionCount++;
        predictions[predictionCount] = PredictionMeta(predictionCount, hash);

        emit PredictionStored(predictionCount, hash);
    }

    function getPredictionHash(uint256 id) public view returns (PredictionMeta memory) {
        require(id > 0 && id <= predictionCount, "Invalid prediction ID");
        return predictions[id];
    }
}

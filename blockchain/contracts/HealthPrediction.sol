// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract HealthPrediction {
    struct Prediction {
        uint256 id;
        string userId;
        string disease;
        string userInputs;
        string predictionResult;
        uint256 probability;
    }

    mapping(uint256 => Prediction) public predictions;
    uint256 public predictionCount;

    event PredictionStored(
        uint256 indexed id,
        string userId,
        string disease,
        string userInputs,
        string predictionResult,
        uint256 probability
    );

    function storePrediction(
        string memory _userId,
        string memory _disease,
        string memory _userInputs,
        string memory _predictionResult,
        uint256 _probability
    ) public {
        predictionCount++;
        predictions[predictionCount] = Prediction(
            predictionCount,
            _userId,
            _disease,
            _userInputs,
            _predictionResult,
            _probability
        );
        emit PredictionStored(
            predictionCount,
            _userId,
            _disease,
            _userInputs,
            _predictionResult,
            _probability
        );
    }

    function getPrediction(uint256 _id) public view returns (Prediction memory) {
        require(_id > 0 && _id <= predictionCount, "Invalid prediction ID");
        return predictions[_id];
    }
}

/**
 * ipfsService.js
 * ================
 * Encrypts anonymised prediction data and stores it on IPFS via Pinata.
 * The CID is then stored on-chain alongside the hash.
 *
 * Why encrypt before IPFS?
 *   IPFS is PUBLIC — anyone with the CID can fetch the file.
 *   Medical data must be encrypted before it leaves our server.
 *   Only parties with IPFS_ENCRYPTION_KEY can decrypt it.
 *
 * Copy to: backend/services/ipfsService.js
 *
 * Add to backend/.env:
 *   PINATA_API_KEY=your_key
 *   PINATA_SECRET_KEY=your_secret
 *   IPFS_ENCRYPTION_KEY=<64 hex chars>
 *   PINATA_GATEWAY=https://gateway.pinata.cloud
 *
 * Deps: npm install axios form-data
 */

import crypto from "crypto";
import axios from "axios";
import FormData from "form-data";

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_GATEWAY =
  process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud";

const getEncryptionKey = () => {
  const keyHex = process.env.IPFS_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64)
    throw new Error(
      "IPFS_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)",
    );
  return Buffer.from(keyHex, "hex");
};

// ── AES-256-GCM Encryption ────────────────────────────────────────────────────
const encrypt = (data) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Pack: [16B iv][16B authTag][NB ciphertext] → base64
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
};

const decrypt = (base64Blob) => {
  const key = getEncryptionKey();
  const packed = Buffer.from(base64Blob, "base64");

  const iv = packed.subarray(0, 16);
  const authTag = packed.subarray(16, 32);
  const ciphertext = packed.subarray(32);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return JSON.parse(
    Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      "utf8",
    ),
  );
};

// ── Upload to IPFS ────────────────────────────────────────────────────────────
/**
 * Encrypts and uploads a prediction to IPFS via Pinata.
 * Returns the CID string, or null on failure.
 * Never throws — IPFS failure must not block prediction response.
 */
export const uploadPredictionToIPFS = async (prediction) => {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    console.warn("Pinata keys missing — IPFS upload skipped");
    return null;
  }

  try {
    // Anonymised payload — NO name, email, image
    const payload = {
      predictionId: prediction._id.toString(),
      disease: prediction.disease,
      predictionResult: prediction.predictionResult,
      probability: prediction.probability,
      tier: prediction.tier,
      isBeta: prediction.isBeta,
      blockchainHash: prediction.blockchainHash || null,
      inputs: prediction.userData?.inputs || {},
      consentGiven: prediction.consentGiven,
      createdAt: prediction.createdAt,
    };

    const encryptedBlob = encrypt(payload);

    // Envelope: public metadata + encrypted data
    const envelope = {
      _meta: {
        source: "PredictaCare Research Hub",
        version: "1.0",
        predictionId: prediction._id.toString(),
        disease: prediction.disease,
        timestamp: prediction.createdAt,
        encrypted: true,
        algorithm: "AES-256-GCM",
        notice: "Encrypted medical research data. Decryption key required.",
      },
      data: encryptedBlob,
    };

    const formData = new FormData();
    formData.append("file", Buffer.from(JSON.stringify(envelope)), {
      filename: `predictacare_${prediction._id}.json`,
      contentType: "application/json",
    });
    formData.append(
      "pinataMetadata",
      JSON.stringify({
        name: `PredictaCare-${prediction.disease}-${prediction._id}`,
        keyvalues: {
          predictionId: prediction._id.toString(),
          disease: prediction.disease,
        },
      }),
    );
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      },
    );

    const cid = response.data.IpfsHash;
    console.log(`IPFS upload OK: ${cid} — prediction ${prediction._id}`);
    return cid;
  } catch (err) {
    console.error("IPFS upload failed (non-fatal):", err.message);
    return null;
  }
};

// ── Fetch from IPFS ───────────────────────────────────────────────────────────
/**
 * Fetches and decrypts a prediction from IPFS by CID.
 * Returns decrypted object or null.
 */
export const fetchPredictionFromIPFS = async (cid) => {
  if (!cid) return null;
  try {
    const response = await axios.get(`${PINATA_GATEWAY}/ipfs/${cid}`, {
      timeout: 15000,
    });
    const envelope = response.data;
    if (!envelope?.data || !envelope?._meta?.encrypted) return null;
    return { ...decrypt(envelope.data), _meta: envelope._meta };
  } catch (err) {
    console.error("IPFS fetch failed:", err.message);
    return null;
  }
};

/**
 * Verifies that IPFS data matches the expected blockchain hash.
 * Returns { valid, reason, ipfsData }
 */
export const verifyIPFSIntegrity = async (cid, expectedHash, buildHashFn) => {
  try {
    const ipfsData = await fetchPredictionFromIPFS(cid);
    if (!ipfsData) return { valid: false, reason: "Could not fetch from IPFS" };

    const recomputedHash = buildHashFn({
      predictionId: ipfsData.predictionId,
      userId: "",
      disease: ipfsData.disease,
      predictionResult: ipfsData.predictionResult,
      probability: ipfsData.probability,
      tier: ipfsData.tier,
      createdAt: ipfsData.createdAt,
    });

    const valid = recomputedHash === expectedHash;
    return {
      valid,
      reason: valid
        ? "IPFS data matches blockchain hash"
        : "Hash mismatch — data may be tampered",
      ipfsData,
    };
  } catch (err) {
    return { valid: false, reason: err.message };
  }
};

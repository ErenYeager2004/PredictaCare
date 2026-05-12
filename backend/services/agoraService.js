/**
 * agoraService.js
 * Copy to: backend/services/agoraService.js
 */

import pkg from "agora-token";

const { RtcTokenBuilder, RtcRole } = pkg;

const APP_ID          = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

/**
 * Generate Agora RTC token for a video call channel.
 * @param channelName - unique channel identifier
 * @param uid         - user ID (0 = any user)
 * @param role        - "publisher" or "subscriber"
 */
export const generateAgoraToken = (channelName, uid = 0, role = "publisher") => {
  if (!APP_ID || !APP_CERTIFICATE) {
    throw new Error("Agora credentials not configured");
  }

  const expiryTime  = Math.floor(Date.now() / 1000) + (3600); // 1 hour
  const agoraRole   = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    agoraRole,
    expiryTime,
    expiryTime,
  );

  return token;
};

export const generateChannelName = (consultationId) => {
  return `predictacare_${consultationId}`;
};

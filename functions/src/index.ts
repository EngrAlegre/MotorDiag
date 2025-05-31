
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK.
// This ensures it's initialized only once.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Interface for the DTC data structure in your database
interface DTC {
  code: string;
  description: string;
  severity: "warning" | "error" | "critical"; // Match your app's definition
  timestamp: number;
}

// Interface for basic motorcycle profile data (copied from web app for richer notifications)
interface MotorcycleProfile {
  make?: string;
  model?: string;
  vin?: string;
  year?: string;
  wifiSSID?: string;
  wifiPassword?: string;
  addedAt?: string;
}

/**
 * Sends a push notification when a new critical Diagnostic Trouble Code (DTC)
 * is added to a motorcycle's data in the Realtime Database.
 */
export const sendCriticalDtcNotification = functions.database
  .ref("/users/{userId}/motorcycles/{motorcycleId}/latest/dtcs/{dtcIndex}")
  .onCreate(async (snapshot, context) => {
    const dtc = snapshot.val() as DTC | null;
    const userId = context.params.userId;
    const motorcycleId = context.params.motorcycleId;
    const dtcIndex = context.params.dtcIndex;

    functions.logger.info(
      `[sendCriticalDtcNotification] Triggered for user: ${userId}, motorcycle: ${motorcycleId}, dtcIndex: ${dtcIndex}`
    );

    if (!dtc) {
      functions.logger.warn(
        `[sendCriticalDtcNotification] DTC data is null at index ${dtcIndex} for user: ${userId}, motorcycle: ${motorcycleId}. Exiting.`
      );
      return null;
    }

    functions.logger.info(
      `[sendCriticalDtcNotification] New DTC detected: ${JSON.stringify(dtc)}`
    );

    if (dtc.severity !== "critical") {
      functions.logger.info(
        `[sendCriticalDtcNotification] DTC severity is "${dtc.severity}", not "critical". No notification will be sent for this specific DTC.`
      );
      return null;
    }

    functions.logger.info(
      `[sendCriticalDtcNotification] Critical DTC. Proceeding to fetch FCM tokens for user: ${userId}`
    );

    let tokensSnapshot;
    try {
      tokensSnapshot = await admin
        .database()
        .ref(`/users/${userId}/fcmTokens`)
        .get();
    } catch (dbError) {
      functions.logger.error(
        `[sendCriticalDtcNotification] Error fetching FCM tokens node for user ${userId}:`,
        dbError
      );
      return null;
    }

    if (!tokensSnapshot.exists()) {
      functions.logger.warn(
        `[sendCriticalDtcNotification] No FCM tokens node found for user: ${userId}. Cannot send notification.`
      );
      return null;
    }

    const tokensMap = tokensSnapshot.val() as { [token: string]: any };
    const validTokens = Object.keys(tokensMap).filter(
      (token) => tokensMap[token] // Ensure token entry exists and is truthy (e.g., value is true)
    );

    if (validTokens.length === 0) {
      functions.logger.warn(
        `[sendCriticalDtcNotification] No valid FCM tokens available for user: ${userId} in tokensMap: ${JSON.stringify(tokensMap)}. Cannot send notification.`
      );
      return null;
    }

    functions.logger.info(
      `[sendCriticalDtcNotification] Found ${validTokens.length} valid FCM token(s) for user ${userId}: ${JSON.stringify(validTokens)}`
    );

    let motorcycleDisplayName = `Motorcycle (VIN: ${motorcycleId})`; // Fallback using VIN
    try {
      const profileSnapshot = await admin
        .database()
        .ref(`/users/${userId}/motorcycles/${motorcycleId}/profile`) // Assuming 'profile' node exists as per example.json
        .get();
      if (profileSnapshot.exists()) {
        const profile = profileSnapshot.val() as MotorcycleProfile;
        const make = profile.make || "";
        const model = profile.model || "";
        const vin = profile.vin || motorcycleId; // Use profile.vin if available, else context motorcycleId

        if (make || model) {
           motorcycleDisplayName = `${make} ${model} (VIN: ${vin})`.trim();
        } else if (vin) { // if no make/model, just use VIN
            motorcycleDisplayName = `Motorcycle (VIN: ${vin})`;
        }
        // If profile exists but make, model, and vin are all empty/undefined, it will use the initial fallback.
        functions.logger.info(`[sendCriticalDtcNotification] Motorcycle display name set to: "${motorcycleDisplayName}"`);
      } else {
        functions.logger.info(`[sendCriticalDtcNotification] No profile found for motorcycle ${motorcycleId}, using default display name: "${motorcycleDisplayName}".`);
      }
    } catch (error) {
      functions.logger.error(
        `[sendCriticalDtcNotification] Error fetching motorcycle profile for user ${userId}, motorcycle ${motorcycleId}:`,
        error
      );
    }

    const payload = {
      notification: {
        title: "🚨 Critical Motorcycle Alert!",
        body: `Your ${motorcycleDisplayName} reported a critical DTC: ${dtc.code} - ${dtc.description}. Please check your dashboard.`,
        icon: "/icons/icon-192x192.png", // Ensure this icon exists in your /public/icons folder
      },
      data: {
        motorcycleId: motorcycleId,
        dtcCode: dtc.code,
        severity: dtc.severity,
        click_action: `/dashboard/${motorcycleId}`, 
      },
    };

    functions.logger.info(
      `[sendCriticalDtcNotification] Preparing to send notification with payload: ${JSON.stringify(payload)} to tokens: ${JSON.stringify(validTokens)}`
    );

    try {
      const response = await admin.messaging().sendToDevice(validTokens, payload);
      functions.logger.info(
        `[sendCriticalDtcNotification] FCM sendToDevice response for user ${userId}: Success count: ${response.successCount}, Failure count: ${response.failureCount}`
      );

      if (response.failureCount > 0) {
        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            functions.logger.error(
              `[sendCriticalDtcNotification] Failure sending to token ${validTokens[index]} for user ${userId}: Code: ${error.code}, Message: ${error.message}`
            );
            if (
              error.code === "messaging/invalid-registration-token" ||
              error.code === "messaging/registration-token-not-registered"
            ) {
              functions.logger.info(
                `[sendCriticalDtcNotification] Removing invalid/unregistered token: ${validTokens[index]} for user ${userId}`
              );
              admin
                .database()
                .ref(`/users/${userId}/fcmTokens/${validTokens[index]}`)
                .remove()
                .then(() => {
                  functions.logger.info(
                    `[sendCriticalDtcNotification] Successfully removed token: ${validTokens[index]}`
                  );
                })
                .catch((removeError) => {
                  functions.logger.error(
                    `[sendCriticalDtcNotification] Error removing token ${validTokens[index]}:`,
                    removeError
                  );
                });
            }
          } else if (result.messageId) {
             functions.logger.info(`[sendCriticalDtcNotification] Successfully sent to token ${validTokens[index]} with message ID: ${result.messageId}`);
          }
        });
      }
    } catch (error) {
      functions.logger.error(
        `[sendCriticalDtcNotification] Critical error during sendToDevice call for user ${userId}:`,
        error
      );
    }
    return null;
  });

    
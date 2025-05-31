
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

// Interface for basic motorcycle profile data
interface MotorcycleProfile {
  make?: string;
  model?: string;
  vin?: string;
  year?: string;
  // Add other profile fields if needed, e.g., name
}


export const sendCriticalDtcNotification = functions.database
  .ref("/users/{userId}/motorcycles/{motorcycleId}/latest/dtcs/{dtcIndex}")
  .onCreate(async (snapshot, context) => {
    const dtc = snapshot.val() as DTC | null;
    const userId = context.params.userId;
    const motorcycleId = context.params.motorcycleId;
    const dtcIndex = context.params.dtcIndex; // For logging

    functions.logger.info(
      `[sendCriticalDtcNotification] Triggered for user: ${userId}, motorcycle: ${motorcycleId}, dtcIndex: ${dtcIndex}`
    );

    // Log Admin SDK Project ID
    try {
      const appInstance = admin.app(); // Get the default app instance
      const projectId = appInstance.options.projectId;
      if (projectId) {
        functions.logger.info(`[sendCriticalDtcNotification] Admin SDK initialized for Project ID: ${projectId}`);
      } else {
        functions.logger.warn('[sendCriticalDtcNotification] Admin SDK Project ID is undefined. This might indicate an initialization issue.');
      }
    } catch (initError) {
      functions.logger.error(`[sendCriticalDtcNotification] Error getting project ID from Admin SDK:`, initError);
    }


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
      return null; // Exit if we can't get tokens
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
    
    // Fetch motorcycle profile for a richer notification message
    let motorcycleDisplayName = `Motorcycle (VIN: ${motorcycleId})`; // Fallback using VIN
    try {
      const profileSnapshot = await admin
        .database()
        .ref(`/users/${userId}/motorcycles/${motorcycleId}/profile`) // Assuming 'profile' node exists
        .get();
      if (profileSnapshot.exists()) {
        const profile = profileSnapshot.val() as MotorcycleProfile; // Assuming MotorcycleProfile type
        const make = profile.make || "";
        const model = profile.model || "";
        const vin = profile.vin || motorcycleId; // Use profile.vin if available, else context motorcycleId

        if (make || model) {
           motorcycleDisplayName = `${make} ${model} (VIN: ${vin})`.trim();
        } else if (vin) { // if no make/model, just use VIN
            motorcycleDisplayName = `Motorcycle (VIN: ${vin})`;
        }
        functions.logger.info(`[sendCriticalDtcNotification] Motorcycle display name set to: "${motorcycleDisplayName}"`);
      } else {
        functions.logger.info(`[sendCriticalDtcNotification] No profile found for motorcycle ${motorcycleId}, using default display name: "${motorcycleDisplayName}".`);
      }
    } catch (error) {
      functions.logger.error(
        `[sendCriticalDtcNotification] Error fetching motorcycle profile for user ${userId}, motorcycle ${motorcycleId}:`,
        error
      );
      // Continue with default display name if profile fetch fails
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
        click_action: `/dashboard/${motorcycleId}`, // For PWA to handle click
      },
    };

    functions.logger.info(
      `[sendCriticalDtcNotification] Preparing to send notification for user ${userId}, motorcycle ${motorcycleId} to ${validTokens.length} token(s). Payload: ${JSON.stringify(payload)}`
    );

    try {
      const response = await admin.messaging().sendToDevice(validTokens, payload);
      functions.logger.info(
        `[sendCriticalDtcNotification] FCM sendToDevice response for user ${userId}: Success count: ${response.successCount}, Failure count: ${response.failureCount}`
      );

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            functions.logger.error(
              `[sendCriticalDtcNotification] Failure sending to token ${validTokens[index]} for user ${userId}: Code: ${error.code}, Message: ${error.message}`
            );
            // Check for common error codes indicating an invalid or unregistered token
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
      const genericError = error as any;
      functions.logger.error(
        `[sendCriticalDtcNotification] Critical error during sendToDevice call for user ${userId}:`,
        genericError
      );
      if (genericError && genericError.errorInfo) {
         functions.logger.error(`[sendCriticalDtcNotification] Detailed errorInfo: ${JSON.stringify(genericError.errorInfo)}`);
      }
    }
    return null; 
  });

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

// Interface for basic motorcycle profile data (optional, for richer notifications)
interface MotorcycleProfile {
  make?: string;
  model?: string;
  vin?: string;
  // Add other fields if you use them in notifications
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

    if (!dtc) {
      functions.logger.log("DTC data is null, exiting function for user:", userId, "motorcycle:", motorcycleId);
      return null;
    }

    functions.logger.log(
      `New DTC detected for user ${userId}, motorcycle ${motorcycleId}:`,
      dtc
    );

    // Only send notifications for 'critical' severity DTCs
    if (dtc.severity !== "critical") {
      functions.logger.log(
        "DTC severity is not 'critical'. No notification will be sent. Severity:",
        dtc.severity
      );
      return null;
    }

    // Get the user's FCM registration tokens
    const tokensSnapshot = await admin
      .database()
      .ref(`/users/${userId}/fcmTokens`)
      .get();

    if (!tokensSnapshot.exists()) {
      functions.logger.log("No FCM tokens node found for user:", userId);
      return null;
    }

    const tokensMap = tokensSnapshot.val() as { [token: string]: any }; // Value can be true or an object
    const validTokens = Object.keys(tokensMap).filter(
      (token) => tokensMap[token] // Ensure token entry exists and is truthy
    );

    if (validTokens.length === 0) {
      functions.logger.log("No valid FCM tokens available for user:", userId);
      return null;
    }

    // Attempt to get motorcycle details for a richer notification message
    let motorcycleDisplayName = `Motorcycle (ID: ${motorcycleId})`; // Fallback name
    try {
      const profileSnapshot = await admin
        .database()
        .ref(`/users/${userId}/motorcycles/${motorcycleId}/profile`) // Assuming 'profile' node exists
        .get();
      if (profileSnapshot.exists()) {
        const profile = profileSnapshot.val() as MotorcycleProfile;
        const make = profile.make || "Unknown Make";
        const model = profile.model || "Unknown Model";
        const vin = profile.vin || motorcycleId;
        motorcycleDisplayName = `${make} ${model} (VIN: ${vin})`;
      }
    } catch (error) {
      functions.logger.error(
        "Error fetching motorcycle profile for notification:",
        error
      );
    }

    // Construct the notification payload for FCM
    const payload = {
      notification: {
        title: "🚨 Critical Motorcycle Alert!",
        body: `Your ${motorcycleDisplayName} reported a critical DTC: ${dtc.code} - ${dtc.description}. Please check your dashboard.`,
        // Optional: Specify an icon for the notification (must be publicly accessible HTTPS URL)
        // icon: "https://www.your-app.com/images/notification-icon.png",
        // Optional: Specify a sound (default or custom)
        // sound: "default",
      },
      // Optional: Send custom data to your app.
      // Your PWA's service worker can use this data, e.g., to open a specific page.
      data: {
        motorcycleId: motorcycleId,
        dtcCode: dtc.code,
        click_action: `/dashboard/${motorcycleId}`, // Example: URL to open on click
      },
    };

    functions.logger.log(
      "Attempting to send notification to tokens:",
      validTokens,
      "with payload:",
      JSON.stringify(payload)
    );

    try {
      // Send messages to all valid tokens.
      const response = await admin.messaging().sendToDevice(validTokens, payload);
      functions.logger.log(
        "Successfully sent messages:",
        response.successCount,
        "messages"
      );
      functions.logger.log(
        "Failed messages:",
        response.failureCount,
        "messages"
      );

      // Clean up invalid or outdated tokens.
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          functions.logger.error(
            "Failure sending notification to token:",
            validTokens[index],
            error
          );
          // Common errors indicating an invalid token.
          if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          ) {
            // Remove the problematic token from the user's fcmTokens list.
            admin
              .database()
              .ref(`/users/${userId}/fcmTokens/${validTokens[index]}`)
              .remove()
              .then(() => {
                functions.logger.log("Removed invalid token:", validTokens[index]);
              })
              .catch((removeError) => {
                functions.logger.error(
                  "Error removing invalid token:",
                  validTokens[index],
                  removeError
                );
              });
          }
        }
      });
    } catch (error) {
      functions.logger.error("Error sending push notification:", error);
    }

    return null; // Indicate function completion.
  });

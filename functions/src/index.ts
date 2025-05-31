
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

// Interface for the Dynamic Parameter structure
interface DynamicParameter {
  value: number;
  unit: string;
  min: number;
  max: number;
  isValid: boolean;
  lastUpdate: number;
}

interface MotorcycleLatestData {
  dtcs?: DTC[];
  parameters?: Record<string, DynamicParameter>;
  profile?: MotorcycleProfile; // For motorcycle name
  // other fields from 'latest' if needed by notification logic
}

// Interface for basic motorcycle profile data
interface MotorcycleProfile {
  make?: string;
  model?: string;
  vin?: string;
  year?: string;
  name?: string; // If users can name their motorcycles
}

// Helper to find a specific DTC in an array by code
function findDtc(dtcs: DTC[] | undefined, code: string): DTC | undefined {
  if (!dtcs) return undefined;
  return dtcs.find(d => d.code === code);
}

export const sendMotorcycleAlertNotification = functions.database
  .ref("/users/{userId}/motorcycles/{motorcycleId}/latest")
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const motorcycleId = context.params.motorcycleId;

    functions.logger.info(
      `[sendMotorcycleAlertNotification] Triggered for user: ${userId}, motorcycle: ${motorcycleId}`
    );

    // Log Admin SDK Project ID
    try {
      const appInstance = admin.app();
      const projectId = appInstance.options.projectId;
      if (projectId) {
        functions.logger.info(`[sendMotorcycleAlertNotification] Admin SDK initialized for Project ID: ${projectId}`);
      } else {
        functions.logger.warn('[sendMotorcycleAlertNotification] Admin SDK Project ID is undefined.');
      }
    } catch (initError) {
      functions.logger.error(`[sendMotorcycleAlertNotification] Error getting project ID:`, initError);
    }

    if (!change.after.exists()) {
      functions.logger.info(`[sendMotorcycleAlertNotification] Data deleted for motorcycle ${motorcycleId}. No notification.`);
      return null;
    }

    const afterData = change.after.val() as MotorcycleLatestData;
    const beforeData = change.before.exists() ? change.before.val() as MotorcycleLatestData : null;

    let alertToSend: { type: 'criticalDtc' | 'warningDtc' | 'parameter'; title: string; body: string; dtc?: DTC; paramName?: string } | null = null;

    // 1. Check for new/escalated Critical DTCs
    if (afterData.dtcs) {
      for (const dtcAfter of afterData.dtcs) {
        if (dtcAfter.severity === "critical") {
          const dtcBefore = findDtc(beforeData?.dtcs, dtcAfter.code);
          if (!dtcBefore || dtcBefore.severity !== "critical") {
            alertToSend = {
              type: 'criticalDtc',
              title: "🚨 Critical Motorcycle Alert!",
              body: `DTC: ${dtcAfter.code} - ${dtcAfter.description}. Immediate attention required.`,
              dtc: dtcAfter,
            };
            functions.logger.info(`[sendMotorcycleAlertNotification] Identified new/escalated critical DTC: ${dtcAfter.code}`);
            break; 
          }
        }
      }
    }

    // 2. If no critical alert, check for new/escalated Warning DTCs
    if (!alertToSend && afterData.dtcs) {
      for (const dtcAfter of afterData.dtcs) {
        if (dtcAfter.severity === "warning") {
          const dtcBefore = findDtc(beforeData?.dtcs, dtcAfter.code);
          // Send if new, or escalated from non-warning, but not if it was demoted from critical
          if (!dtcBefore || (dtcBefore.severity !== "warning" && dtcBefore.severity !== "critical")) {
             alertToSend = {
              type: 'warningDtc',
              title: "⚠️ Motorcycle Warning",
              body: `DTC: ${dtcAfter.code} - ${dtcAfter.description}. Please check soon.`,
              dtc: dtcAfter,
            };
            functions.logger.info(`[sendMotorcycleAlertNotification] Identified new/escalated warning DTC: ${dtcAfter.code}`);
            break;
          }
        }
      }
    }

    // 3. If no DTC alert, check for newly invalid parameters
    if (!alertToSend && afterData.parameters) {
      for (const [paramName, paramAfter] of Object.entries(afterData.parameters)) {
        if (paramAfter.isValid === false) {
          const paramBefore = beforeData?.parameters?.[paramName];
          if (!paramBefore || paramBefore.isValid === true) {
            alertToSend = {
              type: 'parameter',
              title: "🔧 Motorcycle Parameter Alert",
              body: `Parameter "${paramName}" is reporting an issue (value: ${paramAfter.value} ${paramAfter.unit || ''}).`,
              paramName: paramName,
            };
            functions.logger.info(`[sendMotorcycleAlertNotification] Identified newly invalid parameter: ${paramName}`);
            break;
          }
        }
      }
    }
    
    // Handling for initial creation if beforeData is null (first write)
    if (!beforeData && !alertToSend) { // If it's a creation and no specific alert was caught by change detection logic
        if (afterData.dtcs) {
            const criticalDtc = afterData.dtcs.find(d => d.severity === 'critical');
            if (criticalDtc) {
                 alertToSend = { type: 'criticalDtc', title: "🚨 Critical Motorcycle Alert!", body: `DTC: ${criticalDtc.code} - ${criticalDtc.description}. Immediate attention required.`, dtc: criticalDtc };
                 functions.logger.info(`[sendMotorcycleAlertNotification] Identified critical DTC on creation: ${criticalDtc.code}`);
            } else {
                const warningDtc = afterData.dtcs.find(d => d.severity === 'warning');
                if (warningDtc) {
                    alertToSend = { type: 'warningDtc', title: "⚠️ Motorcycle Warning", body: `DTC: ${warningDtc.code} - ${warningDtc.description}. Please check soon.`, dtc: warningDtc };
                    functions.logger.info(`[sendMotorcycleAlertNotification] Identified warning DTC on creation: ${warningDtc.code}`);
                }
            }
        }
        if (!alertToSend && afterData.parameters) {
            for (const [paramName, paramAfter] of Object.entries(afterData.parameters)) {
                if (paramAfter.isValid === false) {
                    alertToSend = { type: 'parameter', title: "🔧 Motorcycle Parameter Alert", body: `Parameter "${paramName}" is reporting an issue (value: ${paramAfter.value} ${paramAfter.unit || ''}).`, paramName: paramName };
                     functions.logger.info(`[sendMotorcycleAlertNotification] Identified invalid parameter on creation: ${paramName}`);
                    break;
                }
            }
        }
    }


    if (!alertToSend) {
      functions.logger.info("[sendMotorcycleAlertNotification] No new critical/warning DTCs or parameter issues identified. No notification sent.");
      return null;
    }

    functions.logger.info(
      `[sendMotorcycleAlertNotification] Alert identified. Type: ${alertToSend.type}. Proceeding to fetch FCM tokens for user: ${userId}`
    );

    let tokensSnapshot;
    try {
      tokensSnapshot = await admin
        .database()
        .ref(`/users/${userId}/fcmTokens`)
        .get();
    } catch (dbError) {
      functions.logger.error(
        `[sendMotorcycleAlertNotification] Error fetching FCM tokens node for user ${userId}:`,
        dbError
      );
      return null;
    }

    if (!tokensSnapshot.exists()) {
      functions.logger.warn(
        `[sendMotorcycleAlertNotification] No FCM tokens node found for user: ${userId}. Cannot send notification.`
      );
      return null;
    }

    const tokensMap = tokensSnapshot.val() as { [token: string]: any };
    const validTokens = Object.keys(tokensMap).filter(
      (token) => tokensMap[token] 
    );

    if (validTokens.length === 0) {
      functions.logger.warn(
        `[sendMotorcycleAlertNotification] No valid FCM tokens available for user: ${userId}. Cannot send notification.`
      );
      return null;
    }

    functions.logger.info(
      `[sendMotorcycleAlertNotification] Found ${validTokens.length} valid FCM token(s) for user ${userId}: ${JSON.stringify(validTokens)}`
    );
    
    let motorcycleDisplayName = `Motorcycle (VIN: ${motorcycleId})`;
    try {
      // Try to get profile from the 'afterData' if it includes it, otherwise fetch
      const profile = afterData.profile || (await admin
        .database()
        .ref(`/users/${userId}/motorcycles/${motorcycleId}/profile`)
        .get()).val() as MotorcycleProfile | null;

      if (profile) {
        const make = profile.make || "";
        const model = profile.model || "";
        const vin = profile.vin || motorcycleId; 

        if (profile.name) { // Prefer user-set name if available
            motorcycleDisplayName = `${profile.name} (VIN: ${vin})`;
        } else if (make || model) {
           motorcycleDisplayName = `${make} ${model} (VIN: ${vin})`.trim();
        } else if (vin) { 
            motorcycleDisplayName = `Motorcycle (VIN: ${vin})`;
        }
        functions.logger.info(`[sendMotorcycleAlertNotification] Motorcycle display name set to: "${motorcycleDisplayName}"`);
      } else {
        functions.logger.info(`[sendMotorcycleAlertNotification] No profile found for motorcycle ${motorcycleId}, using default display name: "${motorcycleDisplayName}".`);
      }
    } catch (error) {
      functions.logger.error(
        `[sendMotorcycleAlertNotification] Error fetching motorcycle profile for user ${userId}, motorcycle ${motorcycleId}:`,
        error
      );
    }

    const finalAlertBody = `${alertToSend.body.startsWith('DTC:') || alertToSend.body.startsWith('Parameter') ? '' : 'Your ' + motorcycleDisplayName + ' reports: '}${alertToSend.body}`;

    const payload = {
      notification: {
        title: `${alertToSend.title} (${motorcycleDisplayName})`,
        body: finalAlertBody,
        icon: "/icons/icon-192x192.png", 
      },
      data: {
        motorcycleId: motorcycleId,
        alertType: alertToSend.type,
        code: alertToSend.dtc?.code || alertToSend.paramName || '',
        severity: alertToSend.dtc?.severity || (alertToSend.type === 'parameter' ? 'warning' : ''), // Default param alert to warning
        click_action: `/dashboard/${motorcycleId}`, 
      },
    };

    functions.logger.info(
      `[sendMotorcycleAlertNotification] Preparing to send notification for user ${userId}, motorcycle ${motorcycleId} to ${validTokens.length} token(s). Payload: ${JSON.stringify(payload)}`
    );

    try {
      const response = await admin.messaging().sendToDevice(validTokens, payload);
      functions.logger.info(
        `[sendMotorcycleAlertNotification] FCM sendToDevice response for user ${userId}: Success count: ${response.successCount}, Failure count: ${response.failureCount}`
      );

      if (response.failureCount > 0) {
        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            functions.logger.error(
              `[sendMotorcycleAlertNotification] Failure sending to token ${validTokens[index]} for user ${userId}: Code: ${error.code}, Message: ${error.message}`
            );
            if (
              error.code === "messaging/invalid-registration-token" ||
              error.code === "messaging/registration-token-not-registered"
            ) {
              functions.logger.info(
                `[sendMotorcycleAlertNotification] Removing invalid/unregistered token: ${validTokens[index]} for user ${userId}`
              );
              admin
                .database()
                .ref(`/users/${userId}/fcmTokens/${validTokens[index]}`)
                .remove()
                .then(() => {
                  functions.logger.info(
                    `[sendMotorcycleAlertNotification] Successfully removed token: ${validTokens[index]}`
                  );
                })
                .catch((removeError) => {
                  functions.logger.error(
                    `[sendMotorcycleAlertNotification] Error removing token ${validTokens[index]}:`,
                    removeError
                  );
                });
            }
          } else if (result.messageId) {
             functions.logger.info(`[sendMotorcycleAlertNotification] Successfully sent to token ${validTokens[index]} with message ID: ${result.messageId}`);
          }
        });
      }
    } catch (error) {
      const genericError = error as any; // Keep the simpler type assertion for now
      functions.logger.error(
        `[sendMotorcycleAlertNotification] Critical error during sendToDevice call for user ${userId}:`,
        genericError.message || genericError, genericError
      );
      if (genericError && genericError.errorInfo) {
         functions.logger.error(`[sendMotorcycleAlertNotification] Detailed errorInfo: ${JSON.stringify(genericError.errorInfo)}`);
      }
       if (genericError && genericError.codePrefix === 'messaging' && genericError.errorInfo?.code === 'messaging/unknown-error' && genericError.message?.includes("404")) {
        functions.logger.error("[sendMotorcycleAlertNotification] DETECTED FCM 404 ERROR. This usually indicates an issue with the Firebase Cloud Messaging API not being enabled or a billing problem on the Firebase project. Please verify these in the Google Cloud Console for your project.");
      }
    }
    return null; 
  });

    

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
  protocol?: string;
  dataValid?: boolean;
  systemStatus?: string;
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

    if (!change.after.exists()) {
      functions.logger.info(`[sendMotorcycleAlertNotification] Data deleted for motorcycle ${motorcycleId}. No notification.`);
      return null;
    }

    const afterData = change.after.val() as MotorcycleLatestData;
    const beforeData = change.before.exists() ? change.before.val() as MotorcycleLatestData : null;

    functions.logger.info(`[sendMotorcycleAlertNotification] Before data exists: ${change.before.exists()}`);
    if (beforeData) {
        functions.logger.info(`[sendMotorcycleAlertNotification] Partial Before data: DTCs count - ${beforeData.dtcs?.length || 0}, Params count - ${Object.keys(beforeData.parameters || {}).length}`);
    }
    functions.logger.info(`[sendMotorcycleAlertNotification] Partial After data: DTCs count - ${afterData.dtcs?.length || 0}, Params count - ${Object.keys(afterData.parameters || {}).length}, dataValid: ${afterData.dataValid}`);


    let alertToSend: { type: 'criticalDtc' | 'warningDtc' | 'parameter'; title: string; body: string; dtc?: DTC; paramName?: string; severity?: 'critical' | 'warning' | 'info' } | null = null;

    // 1. Check for new/escalated Critical DTCs
    if (afterData.dtcs) {
      functions.logger.info(`[sendMotorcycleAlertNotification] Checking ${afterData.dtcs.length} DTCs in afterData for critical alerts.`);
      for (const dtcAfter of afterData.dtcs) {
        functions.logger.info(`[sendMotorcycleAlertNotification] Evaluating DTC: ${dtcAfter.code}, Severity: ${dtcAfter.severity}`);
        if (dtcAfter.severity === "critical") {
          const dtcBefore = findDtc(beforeData?.dtcs, dtcAfter.code);
          functions.logger.info(`[sendMotorcycleAlertNotification] Critical DTC ${dtcAfter.code} found. Before state: ${JSON.stringify(dtcBefore)}`);
          if (!dtcBefore || dtcBefore.severity !== "critical") {
            alertToSend = {
              type: 'criticalDtc',
              title: "🚨 Critical Motorcycle Alert!",
              body: `DTC: ${dtcAfter.code} - ${dtcAfter.description}. Immediate attention required.`,
              dtc: dtcAfter,
              severity: 'critical',
            };
            functions.logger.info(`[sendMotorcycleAlertNotification] Identified new/escalated critical DTC: ${dtcAfter.code}. AlertToSend SET.`);
            break; 
          } else {
            functions.logger.info(`[sendMotorcycleAlertNotification] Critical DTC ${dtcAfter.code} was already present and critical. No new alert.`);
          }
        }
      }
    } else {
      functions.logger.info(`[sendMotorcycleAlertNotification] No DTCs in afterData to check for critical alerts.`);
    }

    // 2. If no critical alert from DTCs, check for new/escalated Warning DTCs
    if (!alertToSend && afterData.dtcs) {
      functions.logger.info(`[sendMotorcycleAlertNotification] No critical alert from DTCs. Checking ${afterData.dtcs.length} DTCs in afterData for warning alerts.`);
      for (const dtcAfter of afterData.dtcs) {
        functions.logger.info(`[sendMotorcycleAlertNotification] Evaluating DTC: ${dtcAfter.code}, Severity: ${dtcAfter.severity}`);
        if (dtcAfter.severity === "warning") {
          const dtcBefore = findDtc(beforeData?.dtcs, dtcAfter.code);
          functions.logger.info(`[sendMotorcycleAlertNotification] Warning DTC ${dtcAfter.code} found. Before state: ${JSON.stringify(dtcBefore)}`);
          if (!dtcBefore || (dtcBefore.severity !== "warning" && dtcBefore.severity !== "critical")) { // only alert if it's new or was less severe
             alertToSend = {
              type: 'warningDtc',
              title: "⚠️ Motorcycle Warning",
              body: `DTC: ${dtcAfter.code} - ${dtcAfter.description}. Please check soon.`,
              dtc: dtcAfter,
              severity: 'warning',
            };
            functions.logger.info(`[sendMotorcycleAlertNotification] Identified new/escalated warning DTC: ${dtcAfter.code}. AlertToSend SET.`);
            // Don't break for warnings, a critical parameter might still be found
          } else {
            functions.logger.info(`[sendMotorcycleAlertNotification] Warning DTC ${dtcAfter.code} was already present with same or higher severity. No new alert.`);
          }
        }
      }
    } else if (!alertToSend && !afterData.dtcs) { 
      functions.logger.info(`[sendMotorcycleAlertNotification] No critical alert from DTCs and no DTCs in afterData to check for warning alerts.`);
    }

    // 3. Parameter checks. A critical parameter (isValid:false) can override a warning DTC.
    // A warning parameter (out of range) will only be set if no DTC alert or critical parameter alert is already set.
    if (afterData.parameters) {
      functions.logger.info(`[sendMotorcycleAlertNotification] Checking parameters. Current alertToSend: ${JSON.stringify(alertToSend)}`);
      let foundCriticalParameter = false;
      for (const [paramName, paramAfter] of Object.entries(afterData.parameters)) {
        functions.logger.info(`[sendMotorcycleAlertNotification] Evaluating Parameter: ${paramName}, IsValid: ${paramAfter.isValid}, Value: ${paramAfter.value}, Min: ${paramAfter.min}, Max: ${paramAfter.max}`);
        const paramBefore = beforeData?.parameters?.[paramName];

        // Check 1: Parameter newly became invalid (sensor fault or severe value as per ESP32)
        if (paramAfter.isValid === false) {
          if (!paramBefore || paramBefore.isValid === true) { // Newly invalid
            functions.logger.info(`[sendMotorcycleAlertNotification] CONDITION MET (isValid): Parameter ${paramName} is newly invalid. Before isValid: ${paramBefore?.isValid}, After isValid: ${paramAfter.isValid}`);
            alertToSend = {
              type: 'parameter',
              title: "🔧 Critical Parameter Alert",
              body: `Parameter "${paramName}" reporting a critical issue or sensor fault (value: ${paramAfter.value} ${paramAfter.unit || ''}).`,
              paramName: paramName,
              severity: 'critical',
            };
            functions.logger.info(`[sendMotorcycleAlertNotification] Identified newly invalid (critical) parameter: ${paramName}. AlertToSend SET (overwriting previous if any).`);
            foundCriticalParameter = true;
            break; // Found a critical parameter, this is the highest priority among parameters
          } else {
            functions.logger.info(`[sendMotorcycleAlertNotification] Parameter ${paramName} was already invalid. No new alert based on 'isValid' status.`);
          }
        }
      } // End of critical parameter check loop

      // Check 2: Parameter value newly went out of its own min/max normal range (if no critical parameter alert was already set)
      if (!foundCriticalParameter && (!alertToSend || alertToSend.severity !== 'critical')) { // Only proceed if no critical alert already set
        for (const [paramName, paramAfter] of Object.entries(afterData.parameters)) {
            if (paramAfter.isValid === true) { // Only consider if sensor itself is valid
                const isOutOfRangeAfter = paramAfter.value < paramAfter.min || paramAfter.value > paramAfter.max;
                const paramBefore = beforeData?.parameters?.[paramName];
                
                // Determine if it was out of range before
                let isOutOfRangeBefore = false;
                if (paramBefore && paramBefore.isValid === true) { // Only if paramBefore was valid can we check its range
                    isOutOfRangeBefore = paramBefore.value < paramBefore.min || paramBefore.value > paramBefore.max;
                }

                if (isOutOfRangeAfter && (!paramBefore || paramBefore.isValid === false || !isOutOfRangeBefore)) {
                    // Condition: (Currently out of range) AND 
                    //            ( (was not present before) OR 
                    //              (was previously invalid itself, now valid but out of range) OR 
                    //              (was previously valid AND in range) )
                    functions.logger.info(`[sendMotorcycleAlertNotification] CONDITION MET (value vs min/max): Parameter ${paramName} value ${paramAfter.value} newly out of range (${paramAfter.min}-${paramAfter.max}). Before: ${paramBefore ? `value ${paramBefore.value}, isValid ${paramBefore.isValid}, inRange ${!isOutOfRangeBefore}` : 'not present'}`);
                    
                    // Set as warning, but only if no alert is set yet, or if current alert is also a warning (to allow multiple param warnings if we change logic later, though current logic only sets one)
                    // Crucially, DO NOT overwrite a CRITICAL DTC alert.
                    if (!alertToSend || alertToSend.severity === 'warning') {
                        alertToSend = {
                            type: 'parameter',
                            title: "⚠️ Parameter Warning",
                            body: `Parameter "${paramName}" value (${paramAfter.value} ${paramAfter.unit || ''}) is outside normal range (${paramAfter.min} - ${paramAfter.max} ${paramAfter.unit || ''}).`,
                            paramName: paramName,
                            severity: 'warning',
                        };
                        functions.logger.info(`[sendMotorcycleAlertNotification] Identified parameter with value newly out of range: ${paramName}. AlertToSend SET (warning).`);
                        // Don't break for parameter warnings; a critical DTC might have been missed or another param could be critical.
                        // However, current logic sets only one alertToSend.
                    } else {
                         functions.logger.info(`[sendMotorcycleAlertNotification] Parameter ${paramName} value out of range, but a more severe alert (${alertToSend.type}, ${alertToSend.severity}) is already set. Skipping this parameter warning.`);
                    }
                } else if (isOutOfRangeAfter && paramBefore && paramBefore.isValid === true && isOutOfRangeBefore) {
                    functions.logger.info(`[sendMotorcycleAlertNotification] Parameter ${paramName} value ${paramAfter.value} is out of range, but was also out of range before. No new alert.`);
                } else if (!isOutOfRangeAfter && paramAfter.isValid === true) {
                     functions.logger.info(`[sendMotorcycleAlertNotification] Parameter ${paramName} value ${paramAfter.value} is valid and within range (${paramAfter.min}-${paramAfter.max}).`);
                }
            }
        }
      }
    } else if (!alertToSend) { 
       functions.logger.info(`[sendMotorcycleAlertNotification] No DTC alert and no parameters in afterData to check.`);
    }
    
    // 4. Handle initial data creation (if beforeData did not exist)
    // This part also needs to respect the new parameter logic.
    if (!change.before.exists() && !alertToSend) {
        functions.logger.info("[sendMotorcycleAlertNotification] This is an initial data write (beforeData does not exist). Checking for alerts in new data.");
        // Check Critical DTCs first
        if (afterData.dtcs) {
            const criticalDtc = afterData.dtcs.find(d => d.severity === 'critical');
            if (criticalDtc) {
                 alertToSend = { type: 'criticalDtc', title: "🚨 Critical Motorcycle Alert!", body: `DTC: ${criticalDtc.code} - ${criticalDtc.description}. Immediate attention required.`, dtc: criticalDtc, severity: 'critical' };
                 functions.logger.info(`[sendMotorcycleAlertNotification] Initial Write: Identified critical DTC: ${criticalDtc.code}. AlertToSend SET.`);
            }
        }
        // Check Warning DTCs if no critical DTC
        if (!alertToSend && afterData.dtcs) {
            const warningDtc = afterData.dtcs.find(d => d.severity === 'warning');
            if (warningDtc) {
                alertToSend = { type: 'warningDtc', title: "⚠️ Motorcycle Warning", body: `DTC: ${warningDtc.code} - ${warningDtc.description}. Please check soon.`, dtc: warningDtc, severity: 'warning' };
                functions.logger.info(`[sendMotorcycleAlertNotification] Initial Write: Identified warning DTC: ${warningDtc.code}. AlertToSend SET.`);
            }
        }
        // Check Parameters if no DTC alert yet
        if (!alertToSend && afterData.parameters) { 
            let criticalParamFoundOnCreate = false;
            for (const [paramName, paramAfter] of Object.entries(afterData.parameters)) {
                 functions.logger.info(`[sendMotorcycleAlertNotification] Initial Write - Evaluating Parameter: ${paramName}, IsValid: ${paramAfter.isValid}, Value: ${paramAfter.value}`);
                if (paramAfter.isValid === false) { // Treat isValid:false as critical on create
                    alertToSend = { type: 'parameter', title: "🔧 Critical Parameter Alert", body: `Parameter "${paramName}" reporting a critical issue or sensor fault (value: ${paramAfter.value} ${paramAfter.unit || ''}).`, paramName: paramName, severity: 'critical' };
                     functions.logger.info(`[sendMotorcycleAlertNotification] Initial Write: Identified invalid (critical) parameter: ${paramName}. AlertToSend SET.`);
                    criticalParamFoundOnCreate = true;
                    break; 
                }
            }
            if (!criticalParamFoundOnCreate && !alertToSend) { // Check for out-of-range warnings if no critical param found
                 for (const [paramName, paramAfter] of Object.entries(afterData.parameters)) {
                    if (paramAfter.isValid === true && (paramAfter.value < paramAfter.min || paramAfter.value > paramAfter.max)) {
                        alertToSend = { type: 'parameter', title: "⚠️ Parameter Warning", body: `Parameter "${paramName}" value (${paramAfter.value} ${paramAfter.unit || ''}) is outside normal range (${paramAfter.min} - ${paramAfter.max} ${paramAfter.unit || ''}).`, paramName: paramName, severity: 'warning' };
                        functions.logger.info(`[sendMotorcycleAlertNotification] Initial Write: Identified parameter with value out of range: ${paramName}. AlertToSend SET.`);
                        break; // Take the first out-of-range parameter as a warning
                    }
                }
            }
        }
        if (!alertToSend) {
             functions.logger.info("[sendMotorcycleAlertNotification] Initial data write, but no critical/warning DTCs or parameter issues found in new data.");
        }
    } else if (change.before.exists() && !alertToSend) { 
        functions.logger.info("[sendMotorcycleAlertNotification] beforeData existed, and no new/escalated alerts found through diffing.");
    }


    if (!alertToSend) {
      functions.logger.info("[sendMotorcycleAlertNotification] Final check: No alertToSend. No new critical/warning DTCs or parameter issues identified. No notification will be sent.");
      return null;
    }
    
    functions.logger.info(
      `[sendMotorcycleAlertNotification] Alert identified. Type: ${alertToSend.type}, Severity: ${alertToSend.severity || 'N/A'}. Details: ${JSON.stringify(alertToSend)}. Checking user notification preference for user: ${userId}`
    );

    let userAppNotificationsEnabled = true; 
    try {
      const prefSnapshot = await admin.database().ref(`/users/${userId}/userPreferences/notificationsEnabled`).get();
      if (prefSnapshot.exists() && prefSnapshot.val() === false) {
        userAppNotificationsEnabled = false;
        functions.logger.info(`[sendMotorcycleAlertNotification] User ${userId} has app-level FCM notifications DISABLED in preferences.`);
      } else {
         functions.logger.info(`[sendMotorcycleAlertNotification] User ${userId} has app-level FCM notifications ENABLED in preferences (or no preference set, defaulting to enabled).`);
      }
    } catch (prefError) {
      functions.logger.error(
        `[sendMotorcycleAlertNotification] Error fetching app-level notification preference for user ${userId}:`,
        prefError
      );
    }

    let motorcycleDisplayName = `Motorcycle (${motorcycleId})`;
    try {
      const profileSnapshot = await admin
        .database()
        .ref(`/users/${userId}/motorcycles/${motorcycleId}/profile`) 
        .get();
      const profile = profileSnapshot.val() as MotorcycleProfile | null;

      if (profile) {
        const make = profile.make || "";
        const model = profile.model || "";
        const vin = profile.vin || motorcycleId; 

        if (profile.name) { 
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
    // Determine app notification type based on severity primarily
    let appNotificationType: 'critical' | 'warning' | 'info' = 'info';
    if (alertToSend.severity === 'critical') {
      appNotificationType = 'critical';
    } else if (alertToSend.severity === 'warning') {
      appNotificationType = 'warning';
    }


    // Create and store In-App Notification
    const appNotificationsRef = admin.database().ref(`/users/${userId}/appNotifications`);
    const newAppNotificationRef = appNotificationsRef.push();
    const appNotificationPayload = {
      id: newAppNotificationRef.key,
      motorcycleId: motorcycleId,
      motorcycleName: motorcycleDisplayName,
      title: alertToSend.title,
      body: finalAlertBody,
      type: appNotificationType,
      timestamp: admin.database.ServerValue.TIMESTAMP,
      read: false,
      code: alertToSend.dtc?.code || alertToSend.paramName || '',
      severity: alertToSend.severity || (alertToSend.type === 'parameter' ? 'warning' : 'info'), // Default severity for parameters if not set
      link: `/dashboard/${motorcycleId}`,
    };

    try {
      await newAppNotificationRef.set(appNotificationPayload);
      functions.logger.info(`[sendMotorcycleAlertNotification] In-app notification stored for user ${userId}: ${newAppNotificationRef.key}`);
    } catch (dbError) {
      functions.logger.error(`[sendMotorcycleAlertNotification] Failed to store in-app notification for user ${userId}:`, dbError);
    }


    if (!userAppNotificationsEnabled) {
      functions.logger.info(
        `[sendMotorcycleAlertNotification] User ${userId} has disabled FCM notifications at the app level. No FCM notification sent. In-app notification was still stored.`
      );
      return null; 
    }

    functions.logger.info(
      `[sendMotorcycleAlertNotification] User has app notifications enabled. Proceeding to fetch FCM tokens for user: ${userId}`
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
        `[sendMotorcycleAlertNotification] No FCM tokens node found for user: ${userId}. Cannot send FCM notification.`
      );
      return null;
    }

    const tokensMap = tokensSnapshot.val() as { [token: string]: any };
    const validTokens = Object.keys(tokensMap).filter(
      (token) => tokensMap[token] 
    );

    if (validTokens.length === 0) {
      functions.logger.warn(
        `[sendMotorcycleAlertNotification] No valid FCM tokens available for user: ${userId}. Cannot send FCM notification.`
      );
      return null;
    }

    const fcmPayload = {
      notification: {
        title: `${alertToSend.title} (${motorcycleDisplayName})`,
        body: finalAlertBody,
      },
      data: {
        motorcycleId: motorcycleId,
        alertType: appNotificationType, // Use the derived appNotificationType
        code: alertToSend.dtc?.code || alertToSend.paramName || '',
        severity: alertToSend.severity || (alertToSend.type === 'parameter' ? 'warning' : 'info'), 
        click_action: `/dashboard/${motorcycleId}`, 
      },
    };

    functions.logger.info(
      `[sendMotorcycleAlertNotification] Preparing to send FCM notification for user ${userId}, motorcycle ${motorcycleId} to ${validTokens.length} token(s). Payload: ${JSON.stringify(fcmPayload)}`
    );

    try {
      const response = await admin.messaging().sendToDevice(validTokens, fcmPayload);
      functions.logger.info(
        `[sendMotorcycleAlertNotification] FCM sendToDevice response for user ${userId}: Success count: ${response.successCount}, Failure count: ${response.failureCount}`
      );

      if (response.failureCount > 0) {
        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            functions.logger.error(
              `[sendMotorcycleAlertNotification] Failure sending FCM to token ${validTokens[index]} for user ${userId}: Code: ${error.code}, Message: ${error.message}`
            );
            if (
              error.code === "messaging/invalid-registration-token" ||
              error.code === "messaging/registration-token-not-registered"
            ) {
              functions.logger.info(
                `[sendMotorcycleAlertNotification] Removing invalid/unregistered FCM token: ${validTokens[index]} for user ${userId}`
              );
              admin
                .database()
                .ref(`/users/${userId}/fcmTokens/${validTokens[index]}`)
                .remove()
                .then(() => {
                  functions.logger.info(
                    `[sendMotorcycleAlertNotification] Successfully removed FCM token: ${validTokens[index]}`
                  );
                })
                .catch((removeError) => {
                  functions.logger.error(
                    `[sendMotorcycleAlertNotification] Error removing FCM token ${validTokens[index]}:`,
                    removeError
                  );
                });
            }
          } else if (result.messageId) {
             functions.logger.info(`[sendMotorcycleAlertNotification] Successfully sent FCM to token ${validTokens[index]} with message ID: ${result.messageId}`);
          }
        });
      }
    } catch (error) {
      const genericError = error as Error & {errorInfo?: any, codePrefix?: string};
      functions.logger.error(
        `[sendMotorcycleAlertNotification] Critical error during FCM sendToDevice call for user ${userId}:`,
        genericError.message || genericError, genericError
      );
      if (genericError && genericError.errorInfo) {
         functions.logger.error(`[sendMotorcycleAlertNotification] Detailed FCM errorInfo: ${JSON.stringify(genericError.errorInfo)}`);
      }
       if (genericError && genericError.codePrefix === 'messaging' && genericError.errorInfo?.code === 'messaging/unknown-error' && genericError.message?.includes("404")) {
        functions.logger.error("[sendMotorcycleAlertNotification] DETECTED FCM 404 ERROR. This usually indicates an issue with the Firebase Cloud Messaging API not being enabled or a billing problem on the Firebase project. Please verify these in the Google Cloud Console for your project.");
      }
    }
    return null; 
  });

    

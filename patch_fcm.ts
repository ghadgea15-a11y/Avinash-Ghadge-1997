import * as fs from 'fs';

const file = 'functions/src/index.ts';
let code = fs.readFileSync(file, 'utf8');

const fcmCode = `
// ----------------------------------------------------------------------
// PUSH NOTIFICATIONS & AUTO TOKEN CLEANUP
// ----------------------------------------------------------------------

export const sendPushNotification = https.onCall(async (request) => {
  const { title, body, data, targetEmployeeIds, companyId } = request.data;
  const callerClaims = request.auth?.token;

  if (!callerClaims) {
    throw new https.HttpsError("unauthenticated", "User must be authenticated to send push notifications.");
  }
  if (!companyId || !targetEmployeeIds || !Array.isArray(targetEmployeeIds)) {
    throw new https.HttpsError("invalid-argument", "Missing required arguments.");
  }

  const db = admin.firestore();
  let successCount = 0;
  let failureCount = 0;
  const tokensToRemove: { employeeId: string, token: string }[] = [];
  const tokensToEmployeeMap = new Map<string, string>(); // Maps token to employeeId
  const allTokens: string[] = [];

  try {
    // 1. Fetch FCM tokens for all target employees
    for (const employeeId of targetEmployeeIds) {
      const empRef = db.collection("companies").doc(companyId).collection("employees").doc(employeeId);
      const empSnap = await empRef.get();
      if (empSnap.exists) {
        const empData = empSnap.data();
        if (empData?.fcmTokens && Array.isArray(empData.fcmTokens)) {
          for (const token of empData.fcmTokens) {
            allTokens.push(token);
            tokensToEmployeeMap.set(token, employeeId);
          }
        }
      }
    }

    if (allTokens.length === 0) {
      return { success: true, message: "No registered tokens found for targets." };
    }

    // 2. Send Multicast Message
    const message = {
      notification: { title, body },
      data: data || {},
      tokens: allTokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    successCount = response.successCount;
    failureCount = response.failureCount;

    // 3. Automated Token Cleanup (Game-Day / Resilience feature)
    if (failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          // Identify uninstalled or expired tokens
          if (
            resp.error.code === 'messaging/invalid-registration-token' ||
            resp.error.code === 'messaging/registration-token-not-registered'
          ) {
            const invalidToken = allTokens[idx];
            const empId = tokensToEmployeeMap.get(invalidToken);
            if (empId) {
              tokensToRemove.push({ employeeId: empId, token: invalidToken });
            }
          }
        }
      });

      // 4. Batch delete invalid tokens from Firestore to prevent future errors and save costs
      if (tokensToRemove.length > 0) {
        const batch = db.batch();
        // Group by employee to avoid multiple updates to the same document
        const employeeUpdates = new Map<string, string[]>();
        for (const item of tokensToRemove) {
          if (!employeeUpdates.has(item.employeeId)) {
            employeeUpdates.set(item.employeeId, []);
          }
          employeeUpdates.get(item.employeeId)?.push(item.token);
        }

        for (const [empId, tokens] of employeeUpdates.entries()) {
          const empRef = db.collection("companies").doc(companyId).collection("employees").doc(empId);
          batch.update(empRef, {
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokens)
          });
        }
        await batch.commit();
        console.log(\`Successfully cleaned up \${tokensToRemove.length} dead FCM tokens.\`);
      }
    }

    return { 
      success: true, 
      successCount, 
      failureCount, 
      cleanedUpTokens: tokensToRemove.length 
    };

  } catch (error: any) {
    console.error("Error sending push notification:", error);
    throw new https.HttpsError("internal", "Failed to send push notification", error.message);
  }
});
`;

fs.writeFileSync(file, code + '\n' + fcmCode, 'utf8');

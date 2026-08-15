import * as functionsV1 from "firebase-functions/v1";
import * as https from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

type EmploymentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED" | "ON_LEAVE" | "PROBATION";

function mapRoleToAuthorityLevel(role: string): string {
  if (!role) return "A9_SUPPORT";
  const upperRole = role.toUpperCase();
  switch (upperRole) {
    case "A0_OWNER": case "OWNER": case "PROMOTER": case "OWNER_PROMOTER": return "A0_OWNER";
    case "A1_DIRECTOR_CEO": case "DIRECTOR": case "CEO": case "DIRECTOR_CEO": return "A1_DIRECTOR_CEO";
    case "A2_GENERAL_MANAGER": case "GENERAL_MANAGER": case "GM": return "A2_GENERAL_MANAGER";
    case "A3_OFFICIAL_STAFF": case "COMPANY_ADMIN": case "ADMIN": case "HR": case "HR_ADMIN":
    case "FINANCE": case "FINANCE_MANAGER": case "PROCUREMENT": case "EHS": case "QUALITY":
    case "COMMERCIAL": case "MIS": case "CLIENT_MANAGEMENT": case "IT": case "OPERATIONS_OFFICE": return "A3_OFFICIAL_STAFF";
    case "A4_REGIONAL_AREA_MANAGER": case "REGIONAL_MANAGER": case "AREA_MANAGER": return "A4_REGIONAL_AREA_MANAGER";
    case "A5_SITE_IN_CHARGE": case "SITE_IN_CHARGE": case "OPS_MANAGER": return "A5_SITE_IN_CHARGE";
    case "A6_SUPERVISOR": case "SUPERVISOR": case "FIELD_OFFICER": case "MANAGER": return "A6_SUPERVISOR";
    case "A7_SKILLED": case "SKILLED": return "A7_SKILLED";
    case "A8_SEMI_SKILLED": case "SEMI_SKILLED": case "GUARD": return "A8_SEMI_SKILLED";
    case "A9_SUPPORT": case "SUPPORT": return "A9_SUPPORT";
    default: return "A9_SUPPORT";
  }
}

export const syncUserClaims = functionsV1.firestore
  .document("companies/{companyId}/employees/{employeeId}")
  .onWrite(async (change, context) => {
    const companyId = context.params.companyId;

    if (!change.after.exists) {
      return null;
    }

    const empData = change.after.data() || {};
    const authUid = empData.authUid;

    if (!authUid) {
      return null;
    }

    try {
      const authAdmin = (admin as any).auth();
      try {
        await authAdmin.getUser(authUid);
      } catch (err: any) {
        if (err.code === "auth/user-not-found") return null;
        throw err;
      }

      const status = (empData.status || "INACTIVE") as EmploymentStatus;
      const isUnsafeStatus = ["TERMINATED", "INACTIVE", "SUSPENDED"].includes(status.toUpperCase());
      let customClaims: Record<string, any>;

      if (isUnsafeStatus) {
        customClaims = { cId: companyId, aLvl: "NONE", status, pV: Date.now() };
        if (["TERMINATED", "SUSPENDED"].includes(status.toUpperCase())) {
          await authAdmin.revokeRefreshTokens(authUid);
        }
      } else {
        const rawRole = empData.role || empData.designation || "";
        const authorityLevel = mapRoleToAuthorityLevel(rawRole);
        const assignedRegionId = empData.assignedRegionId || null;
        const assignedSiteId = empData.assignedSiteId || null;
        const departmentId = empData.departmentId || null;

        customClaims = { cId: companyId, aLvl: authorityLevel, pV: Date.now() };
        if (assignedRegionId) customClaims.rId = assignedRegionId;
        if (assignedSiteId) customClaims.sId = assignedSiteId;
        if (departmentId) customClaims.dId = departmentId;
        
        const userRecord = await authAdmin.getUser(authUid);
        if (userRecord.customClaims && userRecord.customClaims.superAdmin) {
          customClaims.superAdmin = true;
        }
      }

      await authAdmin.setCustomUserClaims(authUid, customClaims);
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  });

export const generatePinToken = https.onCall(async (request) => {
  const data = request.data;
  const companyId = data.companyId;
  const employeeId = data.employeeId;
  const pin = data.pin;

  if (!companyId || typeof companyId !== "string") throw new https.HttpsError("invalid-argument", "companyId is required");
  if (!employeeId || typeof employeeId !== "string") throw new https.HttpsError("invalid-argument", "employeeId is required");
  if (!pin || typeof pin !== "string") throw new https.HttpsError("invalid-argument", "pin is required");

  try {
    const db = (admin as any).firestore();
    const authAdmin = (admin as any).auth();

    const empRef = db.collection("companies").doc(companyId).collection("employees").doc(employeeId);
    const empSnap = await empRef.get();

    if (!empSnap.exists) throw new https.HttpsError("not-found", "Invalid credentials or employee not found.");
    
    const empData = empSnap.data()!;
    if (empData.companyId !== companyId) throw new https.HttpsError("permission-denied", "Invalid company context.");

    const status = (empData.status || "").toUpperCase();
    if (status === "TERMINATED" || status === "SUSPENDED" || status === "INACTIVE") {
      throw new https.HttpsError("permission-denied", `Account is ${status}. Login denied.`);
    }

    const storedPin = empData.pin || empData.password;
    if (!storedPin || storedPin !== pin) throw new https.HttpsError("unauthenticated", "Invalid PIN provided.");

    const authUid = empData.authUid;
    if (!authUid) throw new https.HttpsError("failed-precondition", "MISSING_AUTH_UID: This employee account has not been fully registered for login.");

    try {
      await authAdmin.getUser(authUid);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        throw new https.HttpsError("failed-precondition", "AUTH_USER_NOT_FOUND: The authentication record is missing.");
      }
      throw err;
    }

    const rawRole = empData.role || empData.designation || "";
    const authorityLevel = mapRoleToAuthorityLevel(rawRole);
    const assignedRegionId = empData.assignedRegionId || null;
    const assignedSiteId = empData.assignedSiteId || null;
    const departmentId = empData.departmentId || null;

    const customClaims: Record<string, any> = { cId: companyId, aLvl: authorityLevel, pV: Date.now() };
    if (assignedRegionId) customClaims.rId = assignedRegionId;
    if (assignedSiteId) customClaims.sId = assignedSiteId;
    if (departmentId) customClaims.dId = departmentId;

    const customToken = await authAdmin.createCustomToken(authUid, customClaims);
    return { token: customToken };
  } catch (error: any) {
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", "An internal error occurred during authentication.");
  }
});

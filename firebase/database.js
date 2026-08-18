const {
  db,
  auth,
  FieldValue
} = require("../config/firebase");

const crypto = require("crypto");


// ============================================================
// HELPERS
// ============================================================

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}


// ============================================================
// PROFILE SEARCH
// ============================================================

async function findProfileByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();

  const snapshot = await db
    .collection("profiles")
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];

  return {
    id: doc.id,
    ...doc.data()
  };
}


async function findProfileByPhone(phone) {
  const normalizedPhone = normalizePhone(phone);

  const snapshot = await db
    .collection("profiles")
    .where("phone", "==", normalizedPhone)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];

  return {
    id: doc.id,
    ...doc.data()
  };
}


function normalizePhone(phone) {
  if (!phone) return "";

  let cleaned = String(phone).replace(/[^\d+]/g, "");

  if (cleaned.startsWith("0")) {
    cleaned = "+27" + cleaned.substring(1);
  }

  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }

  return cleaned;
}


// ============================================================
// FIREBASE AUTHENTICATION
// ============================================================

async function findOrCreateAuthUser(email, displayName) {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingUser = await auth.getUserByEmail(normalizedEmail);

    return {
      user: existingUser,
      created: false
    };

  } catch (error) {

    if (error.code !== "auth/user-not-found") {
      throw error;
    }

    const temporaryPassword = crypto.randomBytes(24).toString("base64url");

    const user = await auth.createUser({
      email: normalizedEmail,
      displayName,
      password: temporaryPassword,
      emailVerified: false
    });

    return {
      user,
      created: true
    };
  }
}


// ============================================================
// CREATE / UPDATE PROFILE
// ============================================================

async function createOrUpdateProfile(data) {

  const normalizedEmail = data.email
    ? data.email.trim().toLowerCase()
    : null;

  let existingProfile = null;

  if (normalizedEmail) {
    existingProfile = await findProfileByEmail(normalizedEmail);
  }

  if (!existingProfile && data.phone) {
    existingProfile = await findProfileByPhone(data.phone);
  }

  const now = FieldValue.serverTimestamp();

  if (existingProfile) {

    const profileRef = db
      .collection("profiles")
      .doc(existingProfile.id);

    const updateData = {
      ...data,
      email: normalizedEmail,
      phone: data.phone ? normalizePhone(data.phone) : existingProfile.phone,
      updatedAt: now,
      sourceLastUpdated: "whatsapp"
    };

    await profileRef.set(updateData, {
      merge: true
    });

    return {
      id: existingProfile.id,
      created: false
    };
  }

  const profileId = generateId("prof");

  const profileRef = db
    .collection("profiles")
    .doc(profileId);

  const profileData = {
    id: profileId,

    fullName: data.fullName || "",
    email: normalizedEmail || "",
    phone: data.phone ? normalizePhone(data.phone) : "",

    cellphone: data.phone
      ? normalizePhone(data.phone)
      : "",

    dob: data.dob || "",

    idNumber: data.idNumber || "",
    passportNumber: data.passportNumber || "",

    businessName: data.businessName || "",
    businessRegistrationNumber:
      data.businessRegistrationNumber || "N/A",

    businessType: data.businessType || "",
    description: data.description || "",

    district: data.district || "",

    employeesFullTime:
      Number(data.employeesFullTime || 0),

    employeesPartTime:
      Number(data.employeesPartTime || 0),

    fundingAmount:
      Number(data.fundingAmount || 0),

    fundingType:
      data.fundingType || "",

    authUid:
      data.authUid || null,

    registrationSource:
      data.registrationSource || "whatsapp",

    createdAt: now,
    updatedAt: now,

    lastActivity: "WhatsApp registration"
  };

  await profileRef.set(profileData);

  return {
    id: profileId,
    created: true
  };
}


// ============================================================
// CREATE APPLICATION
// ============================================================

async function createApplication(data) {

  const applicationId = generateId("app");

  const applicationReference =
    `${process.env.APPLICATION_REFERENCE_PREFIX || "KZNWAF"}-${Date.now()}`;

  const now = FieldValue.serverTimestamp();

  const application = {

    id: applicationId,

    applicationId,

    applicationReference,

    profileId: data.profileId || null,

    authUid: data.authUid || null,

    applicantName: data.fullName || "",

    fullName: data.fullName || "",

    email: data.email || "",

    phone: data.phone
      ? normalizePhone(data.phone)
      : "",

    cellphone: data.phone
      ? normalizePhone(data.phone)
      : "",

    dob: data.dob || "",

    idNumber: data.idNumber || "",
    passportNumber: data.passportNumber || "",

    businessName: data.businessName || "",

    businessRegistrationNumber:
      data.businessRegistrationNumber || "N/A",

    businessType:
      data.businessType || "",

    description:
      data.description || "",

    district:
      data.district || "",

    employeesFullTime:
      Number(data.employeesFullTime || 0),

    employeesPartTime:
      Number(data.employeesPartTime || 0),

    fundingAmount:
      Number(data.fundingAmount || 0),

    fundingType:
      data.fundingType || "",

    source:
      "whatsapp",

    channel:
      "WhatsApp",

    status:
      "Submitted",

    applicationStatus:
      "Submitted",

    currentStage:
      "Application Submitted",

    createdAt:
      now,

    updatedAt:
      now,

    submittedAt:
      now
  };

  await db
    .collection("applications")
    .doc(applicationId)
    .set(application);

  return application;
}


// ============================================================
// ACTIVITIES
// ============================================================

async function createActivity(data) {

  const activityId = generateId("activity");

  const activity = {
    id: activityId,

    profileId:
      data.profileId || null,

    applicationId:
      data.applicationId || null,

    type:
      data.type || "general",

    source:
      "whatsapp",

    message:
      data.message || "",

    status:
      data.status || "Completed",

    createdAt:
      FieldValue.serverTimestamp()
  };

  await db
    .collection("activities")
    .doc(activityId)
    .set(activity);

  return activity;
}


// ============================================================
// UPDATE PROFILE LAST ACTIVITY
// ============================================================

async function updateProfileActivity(profileId, message) {

  if (!profileId) return;

  await db
    .collection("profiles")
    .doc(profileId)
    .set(
      {
        lastActivity: message,
        updatedAt: FieldValue.serverTimestamp()
      },
      {
        merge: true
      }
    );
}


// ============================================================
// WHATSAPP CONVERSATION STATE
// ============================================================

async function getConversation(phone) {

  const ref = db
    .collection("whatsapp_conversations")
    .doc(phone);

  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}


async function saveConversation(phone, conversation) {

  await db
    .collection("whatsapp_conversations")
    .doc(phone)
    .set(
      {
        phone,

        ...conversation,

        updatedAt:
          FieldValue.serverTimestamp()
      },
      {
        merge: true
      }
    );
}


async function clearConversation(phone) {

  await db
    .collection("whatsapp_conversations")
    .doc(phone)
    .delete();
}


// ============================================================
// EVENT DEDUPLICATION
// ============================================================

async function eventAlreadyProcessed(messageId) {

  if (!messageId) {
    return false;
  }

  const ref = db
    .collection("whatsapp_events")
    .doc(messageId);

  const snapshot = await ref.get();

  if (snapshot.exists) {
    return true;
  }

  await ref.set({
    messageId,
    processedAt: FieldValue.serverTimestamp()
  });

  return false;
}


module.exports = {
  generateId,
  normalizePhone,

  findProfileByEmail,
  findProfileByPhone,

  findOrCreateAuthUser,

  createOrUpdateProfile,
  createApplication,
  createActivity,
  updateProfileActivity,

  getConversation,
  saveConversation,
  clearConversation,

  eventAlreadyProcessed
};
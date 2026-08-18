const admin = require("firebase-admin");
const { Firestore } = require("@google-cloud/firestore");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const databaseId = process.env.FIRESTORE_DATABASE_ID;

if (!projectId) {
  throw new Error("Missing FIREBASE_PROJECT_ID");
}

if (!clientEmail) {
  throw new Error("Missing FIREBASE_CLIENT_EMAIL");
}

if (!privateKey) {
  throw new Error("Missing FIREBASE_PRIVATE_KEY");
}

if (!databaseId) {
  throw new Error("Missing FIRESTORE_DATABASE_ID");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

const db = new Firestore({
  projectId,
  databaseId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey.replace(/\\n/g, "\n"),
  },
});

module.exports = {
  admin,
  db,
};
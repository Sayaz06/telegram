const admin = require('firebase-admin');

let db;

function initFirebase() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  db = admin.firestore();
  console.log('✅ Firebase connected');
  return db;
}

function getDb() {
  if (!db) initFirebase();
  return db;
}

// Simpan session string ke Firebase
async function saveSession(phone, sessionString, userData = {}) {
  const db = getDb();
  await db.collection('telegram_sessions').doc(phone).set({
    sessionString,
    phone,
    ...userData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

// Load session string dari Firebase
async function loadSession(phone) {
  const db = getDb();
  const doc = await db.collection('telegram_sessions').doc(phone).get();
  if (!doc.exists) return null;
  return doc.data().sessionString;
}

// Hapus session (logout)
async function deleteSession(phone) {
  const db = getDb();
  await db.collection('telegram_sessions').doc(phone).delete();
}

// Simpan settings user
async function saveUserSettings(phone, settings) {
  const db = getDb();
  await db.collection('telegram_settings').doc(phone).set({
    ...settings,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

// Load settings user
async function loadUserSettings(phone) {
  const db = getDb();
  const doc = await db.collection('telegram_settings').doc(phone).get();
  return doc.exists ? doc.data() : {};
}

module.exports = { initFirebase, getDb, saveSession, loadSession, deleteSession, saveUserSettings, loadUserSettings };

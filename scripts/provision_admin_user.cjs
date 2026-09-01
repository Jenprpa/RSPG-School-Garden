/**
 * script: provision_admin_user.cjs
 * Description: Admin SDK script to provision or verify the designated Admin user (serser12six@gmail.com).
 *
 * Safety constraints:
 * 1. Default mode is DRY-RUN. Use "--apply" to commit changes.
 * 2. Requires GOOGLE_APPLICATION_CREDENTIALS environment variable.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const args = process.argv.slice(2);
const isApply = args.includes('--apply');

const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!SERVICE_ACCOUNT_PATH) {
  console.error("Error: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.");
  console.error("Please set it to the path of your Firebase Service Account JSON key file.");
  process.exit(1);
}

let app;
try {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  app = initializeApp({
    credential: cert(serviceAccount)
  });
} catch (e) {
  console.error(`Error initializing Firebase Admin SDK: ${e.message}`);
  process.exit(1);
}

const db = getFirestore(app);
const auth = getAuth(app);

const ADMIN_EMAIL = 'jenprapa@pwtk.ac.th';
const ADMIN_NAME = 'ครูเจนประภา เรือนคำ';
const ADMIN_ROLE = 'admin';

async function provisionAdmin() {
  console.log("==========================================");
  console.log(" RSPG Admin User Provisioning");
  console.log("==========================================");
  console.log(`Target: ${ADMIN_EMAIL} (${ADMIN_NAME})`);
  console.log(`Role:   ${ADMIN_ROLE}`);
  console.log(`Mode:   ${isApply ? '🔴 APPLY (REAL CHANGES)' : '🟢 DRY-RUN (PREVIEW ONLY)'}`);
  console.log("==========================================\n");

  try {
    let authUser = null;
    try {
      authUser = await auth.getUserByEmail(ADMIN_EMAIL);
      console.log(`ℹ️ User found in Firebase Auth: UID=${authUser.uid}`);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        console.log(`ℹ️ User not yet created in Firebase Auth.`);
      } else {
        throw e;
      }
    }

    if (isApply) {
      let uid = authUser ? authUser.uid : null;

      if (!authUser) {
        const createdUser = await auth.createUser({
          email: ADMIN_EMAIL,
          displayName: ADMIN_NAME,
          emailVerified: true
        });
        uid = createdUser.uid;
        console.log(`✅ Created Firebase Auth account for ${ADMIN_EMAIL} (UID=${uid})`);
      } else {
        await auth.updateUser(uid, {
          displayName: ADMIN_NAME
        });
        console.log(`✅ Updated Firebase Auth displayName to "${ADMIN_NAME}"`);
      }

      // Upsert Firestore profile by UID and Email
      const profileData = {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: ADMIN_ROLE,
        updatedAt: new Date().toISOString()
      };

      if (uid) {
        await db.collection('users').doc(uid).set(profileData, { merge: true });
        console.log(`✅ Upserted Firestore profile at users/${uid}`);
      }

      await db.collection('users').doc(ADMIN_EMAIL).set(profileData, { merge: true });
      console.log(`✅ Upserted Firestore profile at users/${ADMIN_EMAIL}`);

      console.log("\n🎉 Admin user provisioned successfully!");
    } else {
      console.log("👉 Dry-run: Will ensure Auth account exists and Firestore profile has role='admin'.");
      console.log("To apply: node scripts/provision_admin_user.cjs --apply");
    }
  } catch (err) {
    console.error("Fatal error provisioning admin:", err);
  }
}

provisionAdmin().then(() => process.exit(0)).catch(console.error);

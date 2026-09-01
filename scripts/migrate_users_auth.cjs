/**
 * script: migrate_users_auth.cjs
 * Description: Admin SDK migration script to provision Firebase Auth accounts for existing Firestore users.
 * 
 * Safety constraints:
 * 1. Default mode is DRY-RUN.
 * 2. Requires the "--apply" flag to make real changes (blocked in this sprint unless authorized).
 * 3. Service account key file MUST NOT be committed to git.
 * 4. Generates unique random passwords for each user.
 * 5. Does not log or leak generated passwords.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const crypto = require('crypto');

// Check arguments
const args = process.argv.slice(2);
const isApply = args.includes('--apply');

// Configuration
const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!SERVICE_ACCOUNT_PATH) {
  console.error("Error: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.");
  console.error("Please set it to the path of your Firebase Service Account JSON key file.");
  console.error("Example (PowerShell): $env:GOOGLE_APPLICATION_CREDENTIALS=\"C:\\path\\to\\serviceAccount.json\"");
  process.exit(1);
}

// Initialize Admin SDK
let app;
try {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  app = initializeApp({
    credential: cert(serviceAccount)
  });
} catch (e) {
  console.error(`Error initializing Firebase Admin SDK from ${SERVICE_ACCOUNT_PATH}:`, e.message);
  process.exit(1);
}

const db = getFirestore(app);
const auth = getAuth(app);

// Helper to generate a random password
function generateSecurePassword() {
  return crypto.randomBytes(16).toString('hex') + 'A1!'; // 35 chars, alphanumeric + uppercase + symbol
}

async function runMigration() {
  console.log("==========================================");
  console.log(" RSPG User Authentication Migration Script");
  console.log("==========================================");
  console.log(`Mode: ${isApply ? '🔴 APPLY (REAL CHANGES)' : '🟢 DRY-RUN (PREVIEW ONLY)'}`);
  if (!isApply) {
    console.log("To apply changes, run this script with: node migrate_users_auth.cjs --apply");
  }
  console.log("==========================================\n");

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  try {
    console.log("Fetching users from Firestore collection 'users'...");
    const snap = await db.collection('users').get();
    console.log(`Total Firestore documents found: ${snap.size}\n`);

    for (const doc of snap.docs) {
      const data = doc.data();
      const email = (data.email || doc.id).trim().toLowerCase();
      const name = data.name || 'No Name';
      const role = data.role || 'student';
      const isAlreadyMigrated = !!data.authMigrated;

      console.log(`Processing [${email}] (${name}) | Role: ${role}`);

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.warn(`  ⚠️ Skipped: Invalid email format.`);
        skippedCount++;
        continue;
      }

      if (isAlreadyMigrated) {
        console.log(`  ℹ️ Skipped: Already marked as migrated in Firestore.`);
        skippedCount++;
        continue;
      }

      // Check if user already exists in Firebase Auth
      let authUserExists = false;
      try {
        await auth.getUserByEmail(email);
        authUserExists = true;
        console.log(`  ℹ️ Account already exists in Firebase Authentication.`);
      } catch (authErr) {
        if (authErr.code !== 'auth/user-not-found') {
          console.error(`  ❌ Error checking Auth user: ${authErr.message}`);
          failedCount++;
          continue;
        }
      }

      if (isApply) {
        try {
          if (!authUserExists) {
            const tempPassword = generateSecurePassword();
            await auth.createUser({
              email: email,
              password: tempPassword,
              displayName: name,
              disabled: false
            });
            console.log(`  ✅ Successfully created Auth account with unique random password.`);
          }

          // Mark as migrated in Firestore
          await db.collection('users').doc(doc.id).update({
            authMigrated: true,
            authMigratedAt: new Date().toISOString()
          });
          console.log(`  ✅ Updated Firestore document to authMigrated: true.`);
          successCount++;
        } catch (err) {
          console.error(`  ❌ Migration failed: ${err.message}`);
          failedCount++;
        }
      } else {
        // Dry-run preview
        if (!authUserExists) {
          console.log(`  👉 Will create new Auth account with unique secure password.`);
        }
        console.log(`  👉 Will update Firestore document with migration metadata.`);
        successCount++;
      }
      console.log("");
    }

    console.log("==========================================");
    console.log(" Migration Summary");
    console.log("==========================================");
    console.log(`Successful/Planned: ${successCount}`);
    console.log(`Skipped:            ${skippedCount}`);
    console.log(`Failed:             ${failedCount}`);
    console.log("==========================================");

  } catch (err) {
    console.error("Fatal migration error:", err);
  }
}

runMigration().then(() => process.exit(0)).catch(console.error);

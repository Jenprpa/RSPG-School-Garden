# P0.1 Authentication Rollback Plan

This document outlines the rollback procedures and mitigation steps if critical issues arise during the deployment of Sprint P0.1 (Authentication Security Migration).

## 1. Rollback Trigger Criteria
A rollback should be initiated if any of the following conditions occur after deployment:
* Existing users are completely blocked from logging in even after resetting their passwords.
* System crashes or loops occur during the initial loading phase (`onAuthStateChanged` listener).
* Data corruption or unintended deletions occur in the `users` Firestore collection.
* High rate of authentication failures (e.g. CORS, domain blocking issues).

## 2. Rollback Process
Since we did not delete the legacy `password` field from the Firestore database, rolling back is straightforward:

1. **Revert Frontend Code**:
   - Revert the git commit of Sprint P0.1 to the previous commit (HEAD commit before migration: `e2d4d820bba9d32fb6b44726a4e5633c625cb878`).
   - Run build verification:
     ```bash
     npm run build
     ```
   - Deploy the reverted build to Firebase Hosting:
     ```bash
     firebase deploy --only hosting
     ```
2. **Database State Verification**:
   - Verify that the `users` collection has not been altered or deleted.
   - Confirm that users can log in using their old passwords.

## 3. Known Risks & Mitigation
* **Inconsistent Credentials**: Users who successfully migrated and changed their passwords during the migration window will have their passwords in Firebase Auth updated, but their old password will still be in Firestore. If we rollback, they will need to use their *old* password (the one stored in Firestore) to log in.
  - *Mitigation*: Display a system-wide banner on the website informing users of the rollback and instructing them to use their original passwords.
* **Orphaned Auth Users**: Accounts created in Firebase Authentication will remain there.
  - *Mitigation*: These can be left as is, as they do not affect the legacy Custom Login system, or can be cleaned up later if needed.

## 4. Next Steps for Sprint P0.2
Once P0.1 is successfully deployed and verified, the next phase (Sprint P0.2 - Database Authorization) will address:
1. **Firestore Security Rules**: Define strict access rules in `firestore.rules` preventing unauthenticated read/write access. Note: Currently, anonymous client access is rejected but the repository lacks rules-as-code configurations and deployed production rules have not been audited or verified yet.
2. **Ownership Enforcement**: Ensure users can only write to their own documents.
3. **Data Cleanup**: Safely delete the plaintext `password` field from the Firestore `users` collection once all users have migrated.
4. **Authorization Status Verification**: Full verification of security rules to ensure live database authorization status matches design expectations in Sprint P0.2 and P0.3.

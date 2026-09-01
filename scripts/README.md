# RSPG School Garden Admin Scripts

This directory contains admin scripts for database and user management.

## User Authentication Migration Script (`migrate_users_auth.cjs`)

This script queries the Firestore `users` collection and provisions corresponding accounts in Firebase Authentication using random, secure, unique passwords per user.

### Prerequisites

1. Install the Firebase Admin SDK dependency if it is not already installed (this script must be run locally on the server or developer workstation).
2. Generate a Service Account JSON key from the Firebase Console (Project Settings > Service accounts) and download it.
3. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the absolute path of the downloaded JSON key file.

**Example (PowerShell):**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
```

**Example (Bash):**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"
```

### Usage

Run the script from the project root directory.

#### Dry-run Mode (Default)
Inspect and preview the migration without making any actual changes to the live database or authentication system:
```bash
node scripts/migrate_users_auth.cjs
```

#### Apply Mode (Real Changes)
Execute the migration, creating Auth accounts and updating Firestore documents (Warning: **Do not run in Sprint P0.1**):
```bash
node scripts/migrate_users_auth.cjs --apply
```

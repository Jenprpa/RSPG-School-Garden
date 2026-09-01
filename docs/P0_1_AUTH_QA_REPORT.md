# P0.1 Authentication QA Verification Report

This document records the quality assurance checklist and verification results for Sprint P0.1 (Authentication Security Migration).

## 1. QA Checklist & Verification Scenarios

### Authentication & Session Restoration
* **TC-01: Guest Access**: Verify that opening the application without logging in lands the user on the public view or login screen without crashes.
  * **Result**: `PASS — static/code inspection only`
  * **Evidence**: App.jsx lines 547-564, viewMode default state is 'public'.
* **TC-02: Valid Login**: Verify that signing in with a valid Firebase Auth credential successfully logs the user in.
  * **Result**: `BLOCKED — requires Firebase Console/Auth user`
  * **Prerequisites**: Requires Email/Password provider enabled and admin user created on Firebase console.
* **TC-03: Invalid Password**: Verify that signing in with an incorrect password shows a clear, localized error message ("อีเมลหรือรหัสผ่านไม่ถูกต้อง").
  * **Result**: `PASS — static/code inspection only` (Logic verified); `BLOCKED` for runtime execution.
  * **Evidence**: App.jsx lines 434-442.
* **TC-04: Non-existent Email**: Verify that signing in with a non-existent email address shows a clear error message without disclosing user enumeration details.
  * **Result**: `BLOCKED — requires Firebase Console/Auth user`
* **TC-05: Session Persistence (Refresh)**: Verify that refreshing the page after login maintains the active session without redirecting to the login screen.
  * **Result**: `BLOCKED — requires Firebase Console/Auth user`
* **TC-06: Session Persistence (Tab Close)**: Verify that closing the tab and reopening the application keeps the user logged in.
  * **Result**: `BLOCKED — requires Firebase Console/Auth user`
* **TC-07: Safe Logout**: Verify that clicking logout signs the user out, clears local states, removes local storage artifacts, and redirects to the login screen.
  * **Result**: `PASS — static/code inspection only`
  * **Evidence**: App.jsx lines 516-531 (`signOut(auth)` is called and local states/localStorage are reset).
* **TC-08: Back Navigation Guard**: Verify that clicking the browser back button after logging out does not return the user to protected dashboard screens.
  * **Result**: `PASS — static/code inspection only`
  * **Evidence**: React view state is reset to 'public', protected sections cannot render since `isLoggedIn` is false.
* **TC-09: LocalStorage Role Manipulation Defense**: Verify that manually setting a role (e.g. `admin`) in LocalStorage key `rspg_logged_in_user` and refreshing does NOT grant admin privileges.
  * **Result**: `PASS — static/code inspection only`
  * **Evidence**: App.jsx lines 98-144, role and session are loaded strictly from `onAuthStateChanged` and Firestore `users/{email}`.
* **TC-10: Complete Session Cleansing**: Verify that clearing all LocalStorage while logged in and refreshing logs the user out gracefully.
  * **Result**: `PASS — static/code inspection only`

### Password Reset
* **TC-11: Password Reset Request**: Verify that requesting a password reset sends a native Firebase Auth password reset email.
  * **Result**: `BLOCKED — requires Firebase Console/Auth user`
* **TC-12: Invalid Email Validation**: Verify that submitting an invalid email format shows an error ("รูปแบบอีเมลไม่ถูกต้อง").
  * **Result**: `PASS — static/code inspection only`
  * **Evidence**: App.jsx lines 463-465 (`auth/invalid-email` caught).
* **TC-13: Submission Throttle**: Verify that the password reset button is disabled during submission to prevent duplicate triggers.
  * **Result**: `PASS — static/code inspection only`
  * **Evidence**: App.jsx line 737 (`disabled={isSubmitting}`).
* **TC-14: Security Enumeration Check**: Verify that the reset status message uses generic phrasing to avoid disclosing if an account exists.
  * **Result**: `PASS — static/code inspection only`
  * **Evidence**: App.jsx lines 461-462 (Displays generic success message regardless of user existence).

### Registration / Sign-up
* **TC-15: Student Registration**: Verify that new registrations automatically assign the role `student` and exclude password storage in Firestore.
  * **Result**: `BLOCKED — requires Firebase Console/Auth user`
* **TC-16: Role Tampering Block**: Verify that client-side role inputs cannot override the default `student` role on the backend Firestore document.
  * **Result**: `PASS — static/code inspection only`
  * **Evidence**: App.jsx lines 384-391 (Dropdown is disabled, and payload strictly writes `role: 'student'`).
* **TC-17: Duplicate Email Registration**: Verify that signing up with an email that already exists in Firebase Auth fails with a localized error.
  * **Result**: `BLOCKED — requires Firebase Console/Auth user`

### User Profile Management
* **TC-18: Profile Modification Ownership**: Verify that a user can update their name/classroom but cannot edit other profiles.
  * **Result**: `PASS — static/code inspection only`
  * **Evidence**: UserProfile.jsx lines 33-47, loading profile is tied strictly to `auth.currentUser.email`.
* **TC-19: Secure Password Change**: Verify that changing passwords in the profile requires current password re-authentication and uses `updatePassword` in Firebase Auth.
  * **Result**: `BLOCKED — requires Firebase Console/Auth user`
* **TC-20: Plaintext Database Exclusivity**: Verify that changing the password does NOT write the new password to Firestore in plaintext.
  * **Result**: `PASS — static/code inspection only`
  * **Evidence**: UserProfile.jsx lines 134-142 (`updateDoc` is completely removed from the password change process).

### Regression Testing
* **TC-21: Public Portal Functionality**: Verify that the public portal still loads all plants, banners, and public documents correctly.
  * **Result**: `PASS — static/code inspection only`
* **TC-22: Plant Registry Access**: Verify that the Plant Registry works for authorized roles.
  * **Result**: `PASS — static/code inspection only`
* **TC-23: Worksheets Editing**: Verify that online worksheets load, save, and submit drafts correctly.
  * **Result**: `PASS — static/code inspection only`
* **TC-24: Dashboard Rendering**: Verify that the Sidebar and Navbar render according to role-based access rules.
  * **Result**: `PASS — static/code inspection only`

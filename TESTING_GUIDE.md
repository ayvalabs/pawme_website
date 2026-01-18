# PawMe Website - End-to-End Testing Guide

This guide provides a comprehensive set of test cases to validate the full functionality of the PawMe pre-launch website.

**Testing Personas:**
- **New User (User A):** A visitor who has never used the site.
- **Referring User (User B):** An existing user who invites others.
- **Admin User:** `pawme@ayvalabs.com`.

---

## 1. New User Signup & Onboarding

### Test Case 1.1: Email & Password Signup

**Objective:** Verify a new user can sign up, verify their email, and access their dashboard.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | Open the website in an incognito window. | The homepage loads correctly with the hero section. |
| 2 | Click the **"Join Waitlist"** button. | The `AuthDialog` appears, showing a two-column layout with the "Sign Up" tab active. |
| 3 | Enter a **Name**, **new Email (User A)**, and a **Password**. | Input fields accept text. |
| 4 | Check the **"I agree to the Privacy Policy"** box. | The "Create Account" button becomes enabled. |
| 5 | Click **"Create Account"**. | A success toast appears: "Verification code sent!". The dialog moves to the verification step. |
| 6 | Check User A's email inbox. | An email with a 4-digit verification code is received (using the new editable template). |
| 7 | Enter the correct 4-digit code in the dialog. | Input is accepted. |
| 8 | Click **"Verify & Create Account"**. | A success toast appears: "Account created successfully!". The dialog closes. You are redirected to `/leaderboard`. |
| 9 | Check User A's email inbox again. | A "Welcome to PawMe!" email is received, containing the user's referral link and a prominent prompt to join the VIP list. |
| 10 | On the leaderboard page, check the header. | The user's name is displayed, and they have **100 points**. |

### Test Case 1.2: Signup with an Existing Referral Code

**Objective:** Verify a user signing up with a referral code correctly credits the referrer.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | **As User B (an existing user)**, go to `/leaderboard`. | User B's dashboard loads. |
| 2 | Copy User B's referral link. | Link is copied to the clipboard. |
| 3 | Open the copied link in a **new incognito window**. | The homepage loads. The referral code from User B is visible in the URL (`?ref=...`). The `AuthDialog` opens automatically. |
| 4 | In the `AuthDialog`, a message confirms "You were referred with code: [CODE]". | The referral code is correctly displayed. |
| 5 | Complete the signup process for a **new User C**. | Signup is successful. User C is redirected to `/leaderboard` and has **100 points**. |
| 6 | In the original browser, **refresh User B's `/leaderboard` page**. | User B's points should increase by **100** (or **150** if they are VIP). Their referral count should increase by 1. |
| 7 | Check User B's email inbox. | User B receives a "You've earned points!" email notification. |

---

## 2. Authentication

### Test Case 2.1: Sign In & Sign Out

**Objective:** Verify login, logout, and session management.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | On the homepage, click "Join Waitlist", then go to the "Sign In" tab. | The sign-in form is displayed. |
| 2 | Enter an incorrect password for an existing user. | An error message "Invalid email or password" is displayed. |
| 3 | Enter the correct email and password for User A. | Login is successful. The dialog closes. The user is redirected to `/leaderboard`. |
| 4 | In the header, click the user dropdown menu, then click **"Sign Out"**. | The user is signed out and returned to the homepage. The "Join Waitlist" button is visible again. |

### Test Case 2.2: Password Reset

**Objective:** Verify the "Forgot Password" functionality.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | On the Sign In dialog, enter an existing user's email. | Email is entered. |
| 2 | Click the **"Forgot Password?"** link. | A success toast appears: "Password reset email sent!". |
| 3 | Check the user's email inbox. | A password reset email from Firebase is received. |
| 4 | Click the link in the email and reset the password. | The user can set a new password. |
| 5 | Sign in with the **new password**. | Login is successful. |

---

## 3. Leaderboard & Rewards

### Test Case 3.1: Leaderboard & Sharing

**Objective:** Verify the leaderboard page functions correctly for a logged-in user.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | Log in as an existing user and navigate to `/leaderboard`. | The page displays the user's points, referrals, and current reward tier. |
| 2 | View the **Leaderboard** table. | It shows the top 10 users, ranked by points. |
| 3 | In the "Share Your Referral Link" section, click **"Copy Link"**. | The link is copied, and a confirmation toast appears. |
| 4 | Try the Email and WhatsApp share buttons. | Each button opens the appropriate client with a pre-filled message. |
| 5 | Scroll down to "Redeem Your Points". | The new pet-goodie-based rewards are displayed correctly. |

### Test Case 3.2: Redeeming Point Rewards

**Objective:** Verify a user can redeem rewards with their points.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | Log in as a user with enough points (e.g., >500) to redeem a reward. | The "Redeem" button for an affordable reward is enabled. |
| 2 | Click the **"Redeem"** button for an unlocked reward. | A dialog appears asking for shipping information. |
| 3 | Fill out and submit the shipping address form. | The form validates correctly. A success toast appears. |
| 4 | Check the reward card on the leaderboard page. | The button now says **"Redeemed"** and is disabled. |
| 5 | **As the Admin User**, navigate to `/dashboard`. | The "Pending Shipments" table shows the reward just redeemed by the user. |

---

## 4. VIP Membership

### Test Case 4.1: Joining the VIP List

**Objective:** Verify the VIP join flow and UI changes.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | Log in as a non-VIP user. The VIP banner is visible on `/leaderboard`. | The banner shows the correct number of spots left. |
| 2 | Click the VIP banner. | A dialog opens with enhanced marketing copy about the benefits of the $1.00 deposit. |
| 3 | Complete the Stripe checkout form (use a test card). | Payment is processed. |
| 4 | After successful payment, you are redirected back. | A confetti animation appears on the screen. A success toast "Welcome to the VIP list!" appears. |
| 5 | Refresh the page. | The VIP banner is gone. The leaderboard page now has a "royal" gold-themed UI. The user earns **1.5x points** (e.g., 150 points for a new referral). |
| 6 | **As the Admin User**, navigate to the "Users" tab in the dashboard. | The user now has a '👑' icon next to their name, indicating VIP status. |

---

## 5. Admin Dashboard (`/dashboard`)

**Prerequisite:** Log in as `pawme@ayvalabs.com`.

### Test Case 5.1: Managing Email Templates

**Objective:** Verify the admin can create, edit, and delete email templates.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | Navigate to the **"Templates"** tab. | A list of email templates is displayed. |
| 2 | Click **"New Template"**. | A dialog opens to create a new template. |
| 3 | Create a new template for "Password Reset" and save it. | The new template appears in the list. |
| 4 | Click the **Edit** icon on the "Verification Code" template. | The dialog opens with the template's content. |
| 5 | Modify the subject and click "Update Template". | The template is updated successfully. The list reflects the new subject. |
| 6 | Click the **Preview** icon on any template. | A dialog shows a rendered version of the email. |

### Test Case 5.2: Managing App Settings & Rewards

**Objective:** Verify the admin can update application-wide settings and rewards.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | Navigate to the **"Settings"** tab. | The settings for VIP spots and referral tiers are displayed. The new pet goodies rewards are shown in a table. |
| 2 | Click **"Add Reward"**. | A dialog appears to create a new reward. |
| 3 | Fill in the details for a new reward, upload an image, and click "Save". | The dialog closes. The new reward appears in the table. |
| 4 | Click the **"Save All Point Rewards"** button. | A success toast appears. The new rewards are saved to the database. |
| 5 | On the public `/leaderboard` page (as any user), verify the new rewards are visible. | The new reward tiers are displayed correctly. |

---

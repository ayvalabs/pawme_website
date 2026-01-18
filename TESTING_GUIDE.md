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
| 2 | Click the **"Join Waitlist"** button. | The `AuthDialog` appears, defaulting to the "Sign Up" tab. |
| 3 | Enter a **Name**, **new Email (User A)**, and a **Password**. | Input fields accept text. |
| 4 | Check the **"I agree to the Privacy Policy"** box. | The "Create Account" button becomes enabled. |
| 5 | Click **"Create Account"**. | A success toast appears: "Verification code sent!". The dialog moves to the verification step. |
| 6 | Check User A's email inbox. | An email with a 4-digit verification code is received. |
| 7 | Enter the correct 4-digit code in the dialog. | Input is accepted. |
| 8 | Click **"Verify & Create Account"**. | A success toast appears: "Account created successfully!". The dialog closes. You are redirected to `/leaderboard`. |
| 9 | Check User A's email inbox again. | A "Welcome to PawMe!" email is received, containing the new user's unique referral link and code. |
| 10 | On the leaderboard page, check the header. | The user's name is displayed, and they have **100 points**. |

### Test Case 1.2: Signup with an Existing Referral Code

**Objective:** Verify a user signing up with a referral code correctly credits the referrer.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | **As User B (an existing user)**, go to `/leaderboard`. | User B's dashboard loads. |
| 2 | Copy User B's referral link. | Link is copied to the clipboard. |
| 3 | Open the copied link in a **new incognito window**. | The homepage loads. The referral code from User B is visible in the URL (`?ref=...`). |
| 4 | Click **"Join Waitlist"**. | The `AuthDialog` appears. A message confirms "You were referred with code: [CODE]". |
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
| 4 | Try the social share buttons (Twitter, Facebook, WhatsApp). | Each button opens a new tab with the correct sharing URL, pre-filled with the referral link and a message. |
| 5 | Scroll down to "Your Referral Tiers". | Tiers that the user has unlocked are highlighted and marked with a check. |

### Test Case 3.2: Redeeming Point Rewards

**Objective:** Verify a user can redeem rewards with their points.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | Log in as a user with enough points to redeem a reward. | The "Redeem" button for an affordable reward is enabled. |
| 2 | Click the **"Redeem"** button for an unlocked reward. | A dialog appears asking for shipping information. |
| 3 | Fill out and submit the shipping address form. | The form validates correctly. A success toast appears. |
| 4 | Check the reward card on the leaderboard page. | The button now says **"Redeemed"** and is disabled. |
| 5 | **As the Admin User**, navigate to `/dashboard`. | The "Pending Shipments" table shows the reward just redeemed by the user. |

---

## 4. VIP Membership

### Test Case 4.1: Joining the VIP List

**Objective:** Verify the VIP join flow.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | Log in as a non-VIP user. The VIP banner is visible. | The banner shows the correct number of spots left. |
| 2 | Click the VIP banner. | A dialog opens with payment details for the $1.00 deposit. |
| 3 | Complete the Stripe checkout form (use a test card). | Payment is processed. |
| 4 | After successful payment, you are redirected back. | A success toast "Welcome to the VIP list!" appears. |
| 5 | Refresh the page. | The VIP banner is gone. The user now earns **1.5x points** (e.g., 150 points for a new referral). |
| 6 | **As the Admin User**, navigate to the "Users" tab in the dashboard. | The user now has a '👑' icon next to their name, indicating VIP status. |

---

## 5. Admin Dashboard (`/dashboard`)

**Prerequisite:** Log in as `pawme@ayvalabs.com`.

### Test Case 5.1: Managing Rewards Shipments

**Objective:** Verify the admin can process and ship rewards.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | Navigate to the **"Rewards"** tab. | The "Pending Shipments" table shows the reward redeemed in Test Case 3.2. |
| 2 | Click the **"Ship"** button for the pending reward. | A dialog appears asking for a tracking code. |
| 3 | Enter a tracking code (e.g., `1Z999AA10123456784`) and click "Mark Shipped". | A success toast appears. The reward disappears from the "Pending" table and appears in the "Shipped Rewards" table with the correct tracking code. |
| 4 | Check the user's email inbox (the user who redeemed the reward). | An email notification with the subject "Your PawMe Reward has Shipped!" and the tracking code is received. |

### Test Case 5.2: Managing App Settings

**Objective:** Verify the admin can update application-wide settings.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | Navigate to the **"Settings"** tab. | The settings for VIP spots, referral tiers, and reward tiers are displayed. |
| 2 | In "Point Rewards", click **"Add Reward"**. | A dialog appears to create a new reward. |
| 3 | Fill in the Title, Points, Description, and upload an Image. Click **"Save"**. | The dialog closes. The new reward appears in the table. |
| 4 | Click the **"Save All Point Rewards"** button. | A success toast appears. The new reward is saved to the database. |
| 5 | On the public `/leaderboard` page (as any user), verify the new reward is visible. | The new reward tier is displayed correctly. |
| 6 | In the dashboard, edit an existing reward's point value and click "Save". Then click "Save All Point Rewards". | The change is saved and reflected on the public `/leaderboard` page. |

### Test Case 5.3: Email Broadcast

**Objective:** Verify the admin can send a broadcast email to selected users.

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| 1 | Navigate to the **"Broadcast"** tab. | The user list and email composition form are displayed. |
| 2 | Select several users who have opted into marketing. | Checkboxes are selected. The "Send to X users" button updates its count. |
| 3 | Try to select a user who has opted out (has a lock icon). | The checkbox is disabled, and a tooltip explains they have unsubscribed. |
| 4 | Compose a **Subject** and **Body** for the email. Use `{{userName}}` in the body. | Text is entered into the fields. |
| 5 | Click **"Preview"**. | A dialog shows a rendered version of the email with `{{userName}}` replaced by sample data. |
| 6 | Click **"Send to X users"**. | A success toast appears. |
| 7 | Check the inboxes of the selected users. | They receive the broadcast email with their names correctly inserted. |

---

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy – PawMe',
  description: 'PawMe Privacy Policy. Learn how we collect, use, and protect your data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-600 to-pink-400 text-white py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-white/80 hover:text-white text-sm mb-4 inline-block">
            ← Back to PawMe
          </Link>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="mt-2 text-white/90 text-sm">Last updated: February 7, 2026</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-gray prose-headings:text-gray-900 prose-a:text-pink-600">
        <section>
          <h2>1. Introduction</h2>
          <p>
            PawMe (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is operated by Ayva Labs Limited. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you use our
            mobile application (&quot;PawMe App&quot;) and website (www.ayvalabs.com). Please read this
            policy carefully.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <h3>2.1 Information You Provide</h3>
          <ul>
            <li><strong>Account information:</strong> Name, email address, and password when you create an account.</li>
            <li><strong>Profile information:</strong> First name, last name, and phone number (optional).</li>
            <li><strong>Pet information:</strong> Pet name, breed, age, weight, color, gender, care notes, and pet photos.</li>
            <li><strong>Sign-in credentials:</strong> If you sign in with Apple or Google, we receive your name and email from those providers.</li>
          </ul>

          <h3>2.2 Information Collected Automatically</h3>
          <ul>
            <li><strong>Device information:</strong> Device type, operating system, and unique device identifiers.</li>
            <li><strong>Location data:</strong> When you use the &quot;Nearby&quot; feature, we access your approximate location to show nearby pet services. Location is only accessed when you grant permission and is not stored on our servers.</li>
            <li><strong>Usage data:</strong> App interactions, features used, and crash reports via Firebase Analytics.</li>
          </ul>

          <h3>2.3 Information from Third-Party Services</h3>
          <ul>
            <li><strong>Google Maps &amp; Places API:</strong> When you search for nearby pet services, we send your location to Google to retrieve results. Google&apos;s privacy policy applies to their processing.</li>
            <li><strong>Google Gemini AI:</strong> Pet photos are sent to Google&apos;s Gemini API for breed analysis. Images are processed in real-time and are not stored by us beyond the analysis session.</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To create and manage your account.</li>
            <li>To store and display your pet profiles.</li>
            <li>To provide AI-powered breed detection and care recommendations.</li>
            <li>To show nearby veterinary clinics, groomers, and pet shops.</li>
            <li>To send transactional emails (verification codes, welcome emails).</li>
            <li>To improve our app and services.</li>
            <li>To comply with legal obligations.</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Storage &amp; Security</h2>
          <p>
            Your data is stored securely using Firebase (Google Cloud Platform), including:
          </p>
          <ul>
            <li><strong>Firebase Authentication:</strong> Manages your sign-in credentials securely.</li>
            <li><strong>Cloud Firestore:</strong> Stores your profile and pet data.</li>
            <li><strong>Firebase Storage:</strong> Stores pet photos you upload.</li>
          </ul>
          <p>
            We implement industry-standard security measures including encryption in transit (TLS)
            and at rest. However, no method of electronic storage is 100% secure.
          </p>
        </section>

        <section>
          <h2>5. Data Sharing</h2>
          <p>We do not sell your personal data. We share data only with:</p>
          <ul>
            <li><strong>Google (Firebase, Maps, Gemini):</strong> For authentication, data storage, location services, and AI analysis.</li>
            <li><strong>Resend:</strong> For sending transactional emails.</li>
            <li><strong>Apple:</strong> If you use Sign in with Apple.</li>
          </ul>
          <p>We may also disclose information if required by law or to protect our rights.</p>
        </section>

        <section>
          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> View your personal data within the app.</li>
            <li><strong>Correction:</strong> Update your profile information at any time.</li>
            <li><strong>Deletion:</strong> Delete your account and all associated data through Settings → Account → Delete Account. This permanently removes your profile, pet data, photos, and authentication credentials.</li>
            <li><strong>Data portability:</strong> Contact us to request a copy of your data.</li>
            <li><strong>Withdraw consent:</strong> Revoke location permissions through your device settings at any time.</li>
          </ul>
        </section>

        <section>
          <h2>7. Children&apos;s Privacy</h2>
          <p>
            PawMe is not intended for children under 13. We do not knowingly collect personal
            information from children under 13. If you believe we have collected such information,
            please contact us immediately.
          </p>
        </section>

        <section>
          <h2>8. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. When you delete your account,
            all personal data, pet profiles, and photos are permanently deleted within 30 days.
          </p>
        </section>

        <section>
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes through the app or via email. Continued use of the app after changes constitutes
            acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2>10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or your data, contact us at:
          </p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:privacy@ayvalabs.com">privacy@ayvalabs.com</a></li>
            <li><strong>Website:</strong> <a href="https://www.ayvalabs.com/pawme/support">www.ayvalabs.com/pawme/support</a></li>
            <li><strong>Company:</strong> Ayva Labs Limited</li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6 text-center text-sm text-gray-500">
        <p>© 2026 PawMe by Ayva Labs Limited. All rights reserved.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/pawme/terms" className="text-pink-600 hover:underline">Terms of Use</Link>
          <Link href="/pawme/support" className="text-pink-600 hover:underline">Support</Link>
        </div>
      </footer>
    </div>
  );
}

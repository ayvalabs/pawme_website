import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Use – PawMe',
  description: 'PawMe Terms of Use. Read the terms and conditions for using the PawMe app.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-600 to-pink-400 text-white py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-white/80 hover:text-white text-sm mb-4 inline-block">
            ← Back to PawMe
          </Link>
          <h1 className="text-3xl font-bold">Terms of Use</h1>
          <p className="mt-2 text-white/90 text-sm">Last updated: February 7, 2026</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-gray prose-headings:text-gray-900 prose-a:text-pink-600">
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By downloading, installing, or using the PawMe mobile application (&quot;App&quot;) or
            visiting our website at www.ayvalabs.com (&quot;Website&quot;), you agree to be bound by
            these Terms of Use (&quot;Terms&quot;). If you do not agree to these Terms, do not use
            the App or Website.
          </p>
          <p>
            PawMe is provided by Ayva Labs Limited (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;).
          </p>
        </section>

        <section>
          <h2>2. Eligibility</h2>
          <p>
            You must be at least 13 years of age to use PawMe. If you are under 18, you must have
            the consent of a parent or legal guardian. By using the App, you represent that you meet
            these requirements.
          </p>
        </section>

        <section>
          <h2>3. Account Registration</h2>
          <ul>
            <li>You may create an account using email, Google Sign-In, or Apple Sign-In.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You agree to provide accurate and complete information during registration.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>Notify us immediately if you suspect unauthorized use of your account.</li>
          </ul>
        </section>

        <section>
          <h2>4. Use of the App</h2>
          <h3>4.1 Permitted Use</h3>
          <p>PawMe is intended for personal, non-commercial use to:</p>
          <ul>
            <li>Create and manage pet profiles.</li>
            <li>Use AI-powered breed detection and care recommendations.</li>
            <li>Find nearby pet services (vets, groomers, pet shops).</li>
          </ul>

          <h3>4.2 Prohibited Use</h3>
          <p>You agree not to:</p>
          <ul>
            <li>Use the App for any unlawful purpose.</li>
            <li>Attempt to reverse-engineer, decompile, or disassemble the App.</li>
            <li>Upload harmful, offensive, or inappropriate content.</li>
            <li>Interfere with or disrupt the App&apos;s functionality.</li>
            <li>Use automated systems (bots, scrapers) to access the App.</li>
            <li>Impersonate another person or entity.</li>
          </ul>
        </section>

        <section>
          <h2>5. AI-Powered Features</h2>
          <p>
            PawMe uses artificial intelligence (Google Gemini) to analyze pet photos and provide
            breed identification and care recommendations. You acknowledge that:
          </p>
          <ul>
            <li>AI results are estimates and may not be accurate.</li>
            <li>AI-generated care recommendations are for informational purposes only and do not
              constitute veterinary advice.</li>
            <li>You should always consult a licensed veterinarian for medical decisions regarding
              your pet.</li>
            <li>Pet photos submitted for analysis are processed by Google&apos;s AI services and are
              subject to Google&apos;s terms and privacy policy.</li>
          </ul>
        </section>

        <section>
          <h2>6. Location Services</h2>
          <p>
            The &quot;Nearby&quot; feature uses your device&apos;s location to show nearby pet
            services via Google Maps and Places API. You may deny location access at any time through
            your device settings. If denied, you can manually search by city or district.
          </p>
        </section>

        <section>
          <h2>7. User Content</h2>
          <p>
            You retain ownership of content you upload (pet photos, profile information). By
            uploading content, you grant us a limited, non-exclusive license to store, display, and
            process your content solely for the purpose of providing the App&apos;s services.
          </p>
          <p>
            We do not claim ownership of your content and will delete it upon account deletion.
          </p>
        </section>

        <section>
          <h2>8. Intellectual Property</h2>
          <p>
            The App, including its design, code, logos, and branding, is the property of Ayva Labs
            Limited and is protected by intellectual property laws. You may not copy, modify,
            distribute, or create derivative works based on the App without our written consent.
          </p>
        </section>

        <section>
          <h2>9. Account Deletion</h2>
          <p>
            You may delete your account at any time through Settings → Account → Delete Account.
            Upon deletion:
          </p>
          <ul>
            <li>All pet profiles and photos are permanently deleted.</li>
            <li>Your account credentials are removed from Firebase Authentication.</li>
            <li>This action cannot be undone.</li>
          </ul>
          <p>
            We may also suspend or terminate your account if you violate these Terms.
          </p>
        </section>

        <section>
          <h2>10. Disclaimers</h2>
          <p>
            THE APP IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
            ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED,
            ERROR-FREE, OR SECURE.
          </p>
          <p>
            WE ARE NOT RESPONSIBLE FOR THE ACCURACY OF AI-GENERATED CONTENT, THIRD-PARTY PLACE
            INFORMATION, OR ANY DECISIONS YOU MAKE BASED ON INFORMATION PROVIDED BY THE APP.
          </p>
        </section>

        <section>
          <h2>11. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, AYVA LABS LIMITED SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE
            OF THE APP, INCLUDING BUT NOT LIMITED TO DAMAGES RELATED TO PET HEALTH DECISIONS MADE
            BASED ON APP INFORMATION.
          </p>
        </section>

        <section>
          <h2>12. Third-Party Services</h2>
          <p>
            The App integrates with third-party services including Google (Firebase, Maps, Gemini),
            Apple (Sign-In), and Resend (email). Your use of these services is subject to their
            respective terms and privacy policies.
          </p>
        </section>

        <section>
          <h2>13. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of material changes
            through the App or via email. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2>14. Governing Law</h2>
          <p>
            These Terms are governed by the laws of Hong Kong SAR. Any disputes shall be resolved
            in the courts of Hong Kong.
          </p>
        </section>

        <section>
          <h2>15. Contact Us</h2>
          <p>For questions about these Terms, contact us at:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:legal@ayvalabs.com">legal@ayvalabs.com</a></li>
            <li><strong>Website:</strong> <a href="https://www.ayvalabs.com/pawme/support">www.ayvalabs.com/pawme/support</a></li>
            <li><strong>Company:</strong> Ayva Labs Limited</li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6 text-center text-sm text-gray-500">
        <p>© 2026 PawMe by Ayva Labs Limited. All rights reserved.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/pawme/privacy" className="text-pink-600 hover:underline">Privacy Policy</Link>
          <Link href="/pawme/support" className="text-pink-600 hover:underline">Support</Link>
        </div>
      </footer>
    </div>
  );
}

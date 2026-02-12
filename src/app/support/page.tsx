import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support – PawMe',
  description: 'Get help with PawMe. Contact our support team or find answers to common questions.',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-600 to-pink-400 text-white py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-white/80 hover:text-white text-sm mb-4 inline-block">
            ← Back to PawMe
          </Link>
          <h1 className="text-3xl font-bold">Support &amp; Help</h1>
          <p className="mt-2 text-white/90 text-sm">We&apos;re here to help you and your pets</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Contact */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Us</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <a
              href="mailto:support@ayvalabs.com"
              className="flex items-start gap-4 p-5 rounded-2xl border border-gray-200 hover:border-pink-300 hover:bg-pink-50/50 transition-colors"
            >
              <span className="text-2xl">📧</span>
              <div>
                <p className="font-semibold text-gray-900">Email Support</p>
                <p className="text-sm text-gray-500 mt-1">support@ayvalabs.com</p>
                <p className="text-xs text-gray-400 mt-1">We typically respond within 24 hours</p>
              </div>
            </a>
            <a
              href="mailto:privacy@ayvalabs.com"
              className="flex items-start gap-4 p-5 rounded-2xl border border-gray-200 hover:border-pink-300 hover:bg-pink-50/50 transition-colors"
            >
              <span className="text-2xl">🔒</span>
              <div>
                <p className="font-semibold text-gray-900">Privacy &amp; Data Requests</p>
                <p className="text-sm text-gray-500 mt-1">privacy@ayvalabs.com</p>
                <p className="text-xs text-gray-400 mt-1">Data deletion, export, or privacy concerns</p>
              </div>
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'How does AI breed detection work?',
                a: 'When you take or upload a photo of your pet, our AI (powered by Google Gemini) analyzes the image to identify the breed, estimate age, weight, and provide care recommendations. Results are estimates and should not replace professional veterinary advice.',
              },
              {
                q: 'Is my pet\'s data secure?',
                a: 'Yes. All data is stored securely on Firebase (Google Cloud Platform) with encryption in transit and at rest. Pet photos are stored in Firebase Storage and are only accessible to your account.',
              },
              {
                q: 'How do I delete my account?',
                a: 'Go to Settings → Account Actions → Delete Account. This permanently removes all your data including pet profiles, photos, and your authentication credentials. This action cannot be undone.',
              },
              {
                q: 'Why does PawMe need my location?',
                a: 'Location is used only for the "Nearby" feature to show vets, groomers, and pet shops near you. You can deny location access and search manually by city instead. We do not store your location.',
              },
              {
                q: 'Is PawMe free to use?',
                a: 'Yes, PawMe is free to download and use. All core features including AI breed detection, pet profiles, and nearby services are available at no cost.',
              },
              {
                q: 'Can I use PawMe for multiple pets?',
                a: 'Absolutely! You can add as many pets as you like. Each pet gets its own profile with breed info, care tips, and photo.',
              },
              {
                q: 'The AI breed detection gave incorrect results. What should I do?',
                a: 'AI results are estimates and may not always be accurate. You can manually edit all fields (breed, age, weight, etc.) after the AI analysis. For accurate breed identification, consult your veterinarian.',
              },
              {
                q: 'How do I reset my password?',
                a: 'On the login screen, enter your email and tap "Forgot Password?" We\'ll send you a password reset link via email. If you signed in with Apple or Google, you don\'t have a PawMe password — use those sign-in methods instead.',
              },
            ].map((item, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-gray-200 overflow-hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer p-5 font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                  {item.q}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl ml-4">+</span>
                </summary>
                <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* App Info */}
        <section className="bg-gray-50 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">PawMe App v1.0.0</p>
          <p className="text-sm text-gray-500">
            Developed by{' '}
            <a href="https://www.ayvalabs.com" className="text-pink-600 hover:underline">
              Ayva Labs Limited
            </a>
          </p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <Link href="/pawme/privacy" className="text-pink-600 hover:underline">Privacy Policy</Link>
            <Link href="/pawme/terms" className="text-pink-600 hover:underline">Terms of Use</Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6 text-center text-sm text-gray-500">
        <p>© 2026 PawMe by Ayva Labs Limited. All rights reserved.</p>
      </footer>
    </div>
  );
}

import MarketingLayout from '@/features/marketing/components/MarketingLayout';

const UPDATED = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export default function Privacy() {
  return (
    <MarketingLayout>
      <section className="bg-gradient-to-br from-slate-900 to-navy text-white py-16 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl font-extrabold mb-3">Privacy Policy</h1>
          <p className="text-white/60 text-sm">Last updated: {UPDATED}</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6 prose prose-slate prose-lg">
          <p className="lead text-slate-600">
            GOGET CRM ("we", "us", "our") is committed to protecting your privacy and the privacy of your clients.
            This policy explains what information we collect, how we use it, and your rights.
          </p>

          <h2>1. Information We Collect</h2>
          <p><strong>Account information:</strong> When you register, we collect your name, email address, firm name, and password.</p>
          <p><strong>Client and business data:</strong> The client records, filings, invoices, and other data you enter into GOGET CRM. This data belongs to you.</p>
          <p><strong>Usage data:</strong> We collect anonymized usage statistics (pages visited, features used) to improve the product. We do not track individual user behaviour for advertising.</p>
          <p><strong>Billing information:</strong> Payment card details are processed by Stripe and are never stored on our servers.</p>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain the GOGET CRM service</li>
            <li>To send transactional emails (invitations, password resets, billing receipts)</li>
            <li>To improve the product based on usage patterns</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p>
            We do <strong>not</strong> sell your data. We do not use your data for advertising. We do not share your
            client data with third parties except as required by law or to operate the service (e.g., cloud hosting).
          </p>

          <h2>3. Data Storage and Security</h2>
          <p>
            All data is stored on servers located in Canada, in compliance with PIPEDA (Personal Information Protection
            and Electronic Documents Act) and applicable provincial privacy laws.
          </p>
          <p>
            We use industry-standard encryption (TLS in transit, AES-256 at rest), regular security audits, and access
            controls to protect your data.
          </p>

          <h2>4. Data Retention</h2>
          <p>
            Your data is retained as long as your account is active. If you cancel your subscription, your data is
            retained for 30 days before permanent deletion, giving you time to export it. You can request immediate
            deletion by contacting us.
          </p>

          <h2>5. Your Rights</h2>
          <p>Under PIPEDA and applicable law, you have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data in a portable format</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p>To exercise these rights, contact us at <a href="mailto:privacy@gogetcrm.ca">privacy@gogetcrm.ca</a>.</p>

          <h2>6. Cookies</h2>
          <p>We use essential session cookies to keep you logged in. We do not use tracking cookies or third-party advertising cookies.</p>

          <h2>7. Third-Party Services</h2>
          <p>GOGET CRM uses the following third-party services:</p>
          <ul>
            <li><strong>Stripe</strong> — payment processing (see <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">Stripe's Privacy Policy</a>)</li>
            <li><strong>Amazon Web Services (Canadian regions)</strong> — cloud infrastructure</li>
            <li><strong>Microsoft Azure (Canadian regions)</strong> — optional calendar and document sync</li>
          </ul>

          <h2>8. Changes to This Policy</h2>
          <p>We may update this policy from time to time. We will notify you of significant changes via email or in-app notification at least 30 days before they take effect.</p>

          <h2>9. Contact</h2>
          <p>
            For privacy inquiries: <a href="mailto:privacy@gogetcrm.ca">privacy@gogetcrm.ca</a>
            <br />
            GOGET CRM, Saskatoon, Saskatchewan, Canada
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}

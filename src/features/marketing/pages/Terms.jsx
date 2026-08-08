import MarketingLayout from '@/features/marketing/components/MarketingLayout';

const UPDATED = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export default function Terms() {
  return (
    <MarketingLayout>
      <section className="bg-gradient-to-br from-slate-900 to-navy text-white py-16 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl font-extrabold mb-3">Terms of Service</h1>
          <p className="text-white/60 text-sm">Last updated: {UPDATED}</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6 prose prose-slate prose-lg">
          <p className="lead text-slate-600">
            These Terms of Service ("Terms") govern your use of GOGET CRM. By creating an account, you agree to these
            Terms. Please read them carefully.
          </p>

          <h2>1. Service Description</h2>
          <p>GOGET CRM is a cloud-based CRM platform for accounting firms. We provide tools for client management, filing tracking, invoicing, task management, and team collaboration.</p>

          <h2>2. Account Responsibilities</h2>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining the security of your account credentials</li>
            <li>All activity that occurs under your account</li>
            <li>Ensuring your team members comply with these Terms</li>
            <li>The accuracy of data you enter into the platform</li>
          </ul>
          <p>You must notify us immediately at <a href="mailto:security@gogetcrm.ca">security@gogetcrm.ca</a> if you suspect unauthorized access to your account.</p>

          <h2>3. Acceptable Use</h2>
          <p>You may use GOGET CRM only for lawful purposes and in accordance with these Terms. You agree not to:</p>
          <ul>
            <li>Use the platform to store or process data you are not authorized to handle</li>
            <li>Attempt to access other users' accounts or data</li>
            <li>Reverse engineer, copy, or resell the service</li>
            <li>Upload malicious code or attempt to disrupt the service</li>
            <li>Violate any applicable law, including Canadian privacy laws</li>
          </ul>

          <h2>4. Your Data</h2>
          <p>You retain ownership of all data you input into GOGET CRM. We do not claim any ownership rights over your client data, filing records, or documents.</p>
          <p>You grant us a limited licence to store, process, and display your data solely for the purpose of providing the service to you.</p>

          <h2>5. Subscription and Payment</h2>
          <p>Paid plans are billed monthly or annually in Canadian dollars. All prices include applicable taxes.</p>
          <p>Subscriptions renew automatically. You may cancel at any time from your account settings. Cancellation takes effect at the end of the current billing period — you will not be charged again, and you retain access until the period ends.</p>
          <p>We do not offer refunds for partial billing periods.</p>

          <h2>6. Free Trial</h2>
          <p>New accounts receive a 3-month free trial on our Professional plan, with full access to Professional features. No credit card is required to start a trial. At the end of the trial, you must choose a paid plan to continue using the service.</p>

          <h2>7. Service Availability</h2>
          <p>We aim for 99.9% uptime. Scheduled maintenance will be announced in advance. We are not liable for downtime caused by circumstances outside our control (force majeure, third-party outages, etc.).</p>

          <h2>8. Limitation of Liability</h2>
          <p>GOGET CRM is provided "as is." To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from your use of the service.</p>
          <p>Our total liability to you for any claim is limited to the amount you paid us in the 12 months preceding the claim.</p>

          <h2>9. Termination</h2>
          <p>We may suspend or terminate your account if you violate these Terms, fail to pay, or use the service in a way that harms other users or the platform. We will give reasonable notice unless the violation is severe.</p>

          <h2>10. Governing Law</h2>
          <p>These Terms are governed by the laws of the Province of Saskatchewan and the federal laws of Canada applicable therein. Any disputes will be resolved in the courts of Saskatchewan.</p>

          <h2>11. Changes to Terms</h2>
          <p>We may update these Terms. We will notify you via email and in-app notice at least 30 days before material changes take effect. Continued use after the effective date constitutes acceptance of the new Terms.</p>

          <h2>12. Contact</h2>
          <p>
            For questions about these Terms: <a href="mailto:legal@gogetcrm.ca">legal@gogetcrm.ca</a>
            <br />
            GOGET CRM, Saskatoon, Saskatchewan, Canada
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}

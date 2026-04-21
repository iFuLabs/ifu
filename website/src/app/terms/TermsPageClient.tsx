'use client'
import '../globals.css'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export default function TermsPageClient() {
  return (
    <>
      <SiteNav />

      {/* Content */}
      <article style={{ maxWidth: '800px', margin: '0 auto', padding: '120px 32px 80px' }}>
        <div style={{ marginBottom: '48px' }}>
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 48px)',
            fontWeight: 600,
            color: 'var(--ink)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: '16px',
            fontFamily: 'var(--serif)',
          }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--muted)' }}>
            Last updated: January 2026
          </p>
        </div>

        <div style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--ink)' }}>
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              1. Agreement to Terms
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              By accessing or using iFu Labs services, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, do not use our services.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              2. Services Description
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              iFu Labs provides:
            </p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li><strong>Cloud Consultancy:</strong> AWS architecture, migration, optimization, and managed services</li>
              <li><strong>Comply:</strong> Automated compliance monitoring for SOC 2, ISO 27001, and GDPR</li>
              <li><strong>FinOps:</strong> AWS cost optimization and waste detection tool</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              3. Account Registration
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              To use our services, you must:
            </p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be at least 18 years old or have legal capacity to enter contracts</li>
              <li>Represent an organization with authority to bind it to these terms</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              4. AWS Access and Permissions
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              When you connect your AWS account:
            </p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>You grant us read-only access to your AWS infrastructure</li>
              <li>We will never modify, delete, or create resources in your AWS account</li>
              <li>You can revoke access at any time by deleting the IAM role</li>
              <li>You remain responsible for your AWS costs and configurations</li>
              <li>You must have proper authorization to grant us access</li>
            </ul>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              5. Subscription and Billing
            </h2>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', marginTop: '20px' }}>
              5.1 Free Trial
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              New customers receive a 3-day free trial. Your payment method will be charged automatically after the trial unless you cancel.
            </p>

            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', marginTop: '20px' }}>
              5.2 Subscription Plans
            </h3>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Subscriptions are billed monthly in advance</li>
              <li>Prices are in USD or local currency via Paystack</li>
              <li>You can upgrade or downgrade at any time</li>
              <li>Downgrades take effect at the next billing cycle</li>
              <li>No refunds for partial months</li>
            </ul>

            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', marginTop: '20px' }}>
              5.3 Payment
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              Payments are processed securely through Paystack. You authorize us to charge your payment method for all fees. If payment fails, we may suspend your account after reasonable notice.
            </p>

            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', marginTop: '20px' }}>
              5.4 Cancellation
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              You can cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. No refunds will be provided for the remaining subscription period.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              6. Acceptable Use
            </h2>
            <p style={{ marginBottom: '12px', color: 'var(--muted)' }}>You agree not to:</p>
            <ul style={{ marginLeft: '24px', marginBottom: '16px', color: 'var(--muted)' }}>
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt our services</li>
              <li>Use our services for illegal or harmful purposes</li>
              <li>Share your account credentials with others</li>
              <li>Reverse engineer or copy our software</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              See our <a href="/acceptable-use" style={{ color: 'var(--brand)' }}>Acceptable Use Policy</a> for details.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              7. Intellectual Property
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              All content, features, and functionality of our services are owned by iFu Labs and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written permission.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              8. Data Ownership and Usage
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              You retain all rights to your data. We may use aggregated, anonymized data for analytics and service improvement. We will never sell your data to third parties.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              9. Service Availability
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              We strive for 99.9% uptime but do not guarantee uninterrupted service. We may perform maintenance with reasonable notice. We are not liable for service interruptions beyond our control.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              10. Limitation of Liability
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IFU LABS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              11. Warranties Disclaimer
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              OUR SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT OUR SERVICES WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              12. Indemnification
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              You agree to indemnify and hold iFu Labs harmless from any claims, damages, losses, liabilities, and expenses arising from your use of our services or violation of these terms.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              13. Termination
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              We may suspend or terminate your account if you violate these terms or for any other reason with reasonable notice. Upon termination, your right to use our services ceases immediately, and we will delete your data according to our retention policy.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              14. Governing Law
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              These terms are governed by the laws of [Your Jurisdiction]. Any disputes shall be resolved in the courts of [Your Jurisdiction].
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              15. Changes to Terms
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              We may modify these terms at any time. We will notify you of material changes via email or through our service. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--serif)' }}>
              16. Contact
            </h2>
            <p style={{ color: 'var(--muted)' }}>
              For questions about these terms, contact us at <a href="mailto:info@ifulabs.com" style={{ color: 'var(--brand)' }}>info@ifulabs.com</a>
            </p>
          </section>
        </div>
      </article>

      <SiteFooter />
    </>
  )
}

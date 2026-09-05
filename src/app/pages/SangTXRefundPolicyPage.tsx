import { SangTXStaticPage, SectionHeading, Para, List, Emphasis } from './SangTXStaticPage';

export function SangTXRefundPolicyPage() {
  return (
    <SangTXStaticPage
      title="Refund & Cancellation Policy"
      description="Clear policy on refunds, cancellations, and payment disputes for SangTX subscriptions"
    >
      <Para>
        <Emphasis>Last Updated: September 2026</Emphasis>
      </Para>

      <SectionHeading>1. Non-Refundable Payments Policy</SectionHeading>

      <Para style={{ marginBottom: 24, padding: 16, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6, borderLeft: '3px solid #ef4444' }}>
        <Emphasis style={{ color: '#fca5a5' }}>ALL PAYMENTS FOR SANGTX SUBSCRIPTIONS ARE NON-REFUNDABLE ONCE SUCCESSFULLY PROCESSED.</Emphasis>
      </Para>

      <Para>
        By submitting payment via UPI to SangTX, you acknowledge and agree that:
      </Para>

      <List items={[
        'You have reviewed the plan, pricing, features, subscription terms, and service details before making payment',
        'You understand the scope and limitations of the Service',
        'Your payment is final and non-refundable',
        'You accept full responsibility for your purchase decision',
      ]} />

      <SectionHeading>2. Situations Where Refunds Are NOT Provided</SectionHeading>

      <Para>
        SangTX does not provide refunds for:
      </Para>

      <List items={[
        'Change of mind or decision not to use the Service',
        'Unused subscription period',
        'Partial usage of the Service',
        'Cancellation after payment has been successfully processed',
        'Failure to use the Service effectively or achieve desired results',
        'Customer-provided incorrect information during registration or payment',
        'Technical issues on the customer\'s device or network',
        'Domain, hosting, or website issues caused by customer misconfiguration',
        'Content-related issues (publishing, article quality, editorial decisions)',
        'Failure to manage categories, reporters, or media properly',
        'Customer error in using the admin dashboard',
        'Subscription activation delays due to manual verification processes',
        'Disagreement with new features, changes, or pricing',
        'Performance concerns or lack of expected growth/engagement',
        'Third-party service issues (Google Analytics, payment providers, hosting)',
      ]} />

      <SectionHeading>3. When Refunds Might Be Considered</SectionHeading>

      <Para>
        Refunds may only be considered in limited circumstances:
      </Para>

      <List items={[
        'Billing Error: If you were charged multiple times due to SangTX error',
        'Service Unavailability: If SangTX was unavailable for an extended period due to our fault, not force majeure',
        'Successful Dispute: If a payment processor determines a claim in your favor',
      ]} />

      <Para>
        Even in these cases, refunds are not guaranteed and will be evaluated on a case-by-case basis. Any refund approved will be processed to the original UPI account used for payment within 7-10 business days.
      </Para>

      <SectionHeading>4. Payment Disputes and Chargebacks</SectionHeading>

      <Para>
        <Emphasis>Dispute Process:</Emphasis> If you believe a payment was incorrect or unauthorized:
      </Para>

      <List items={[
        'Contact us immediately at legal@swiftgrowthdigital.com with details',
        'Provide proof of the issue (screenshots, transaction IDs, etc.)',
        'Do not file a chargeback or dispute with your bank until you have contacted us',
        'We will investigate and respond within 5 business days',
      ]} />

      <Para>
        <Emphasis>Chargebacks:</Emphasis> If you initiate a chargeback or dispute with your bank/UPI provider without first contacting us, we reserve the right to:
      </Para>

      <List items={[
        'Suspend or terminate your account immediately',
        'Hold your data pending the chargeback resolution',
        'Recover chargeback fees and costs from future payments',
        'Refuse service to you in the future',
      ]} />

      <SectionHeading>5. Plan Changes and Upgrades</SectionHeading>

      <Para>
        <Emphasis>Switching Plans:</Emphasis> You may switch between Monthly and Yearly plans. When you switch:
      </Para>

      <List items={[
        'You submit a new payment for the new plan via UPI',
        'Your current plan remains active until the new payment is verified',
        'The new plan is activated after manual verification (within 24 hours)',
        'No refund is issued for the remaining period of your current plan',
        'You are not charged prorated amounts; each plan is standalone',
      ]} />

      <Para>
        <Emphasis>Adding Features:</Emphasis> Additional features (e.g., Android App for ₹3,000) are purchased separately and are also non-refundable.
      </Para>

      <SectionHeading>6. Trial Period</SectionHeading>

      <Para>
        <Emphasis>7-Day Free Trial:</Emphasis> Every new SangTX account includes a complimentary 7-day trial with full platform access.
      </Para>

      <List items={[
        'No payment or credit card is required to start the trial',
        'You have complete access to all features during the trial',
        'You can cancel at any time during the trial with no charge',
        'To avoid future charges, do not submit payment during or after the trial',
        'The trial does not guarantee permanent free access',
      ]} />

      <Para>
        If you submit a payment during the trial, that payment is processed and is non-refundable.
      </Para>

      <SectionHeading>7. Cancellation and Expiration</SectionHeading>

      <Para>
        <Emphasis>How Cancellation Works:</Emphasis> SangTX uses manual UPI payment with no automatic renewal. Your subscription ends on its expiration date unless you choose to renew by submitting a new payment.
      </Para>

      <List items={[
        'Your current subscription remains active until expiration',
        'You will receive a payment due notice before expiration',
        'If you do not pay, your subscription enters a suspended state',
        'Your website will display a service unavailability message',
        'Your data remains preserved and can be recovered if you reactivate',
        'You can reactivate at any time by submitting a new payment',
      ]} />

      <Para>
        <Emphasis>No Refund for Unused Time:</Emphasis> If your subscription expires and you do not renew, no refund is issued for the remaining subscription period. This is by design because you have the option to reactivate without penalty.
      </Para>

      <SectionHeading>8. Data Retention After Cancellation</SectionHeading>

      <Para>
        When your subscription ends:
      </Para>

      <List items={[
        'Your account data (articles, media, configurations) is preserved for 90 days',
        'After 90 days, we may delete your data permanently',
        'To recover data, you must reactivate your subscription',
        'For data export requests before deletion, contact us within the 90-day window',
      ]} />

      <SectionHeading>9. Payment Delays and Processing</SectionHeading>

      <Para>
        <Emphasis>Manual Verification:</Emphasis> All UPI payments are manually verified by our team. Verification may take up to 24 hours. During this time:
      </Para>

      <List items={[
        'Your subscription status shows "Payment Under Review"',
        'Your platform may have limited access during verification',
        'You will be notified once payment is approved or rejected',
        'No refund is issued if verification is delayed',
      ]} />

      <Para>
        <Emphasis>Failed or Invalid Payments:</Emphasis> If a payment cannot be verified:
      </Para>

      <List items={[
        'We will notify you with a rejection reason',
        'You may submit a corrected payment via UPI',
        'Previous payments cannot be recovered; a new payment must be submitted',
        'No refund is issued for rejected payments',
      ]} />

      <SectionHeading>10. Subscription Suspension Due to Non-Payment</SectionHeading>

      <Para>
        If your subscription expires and you do not renew:
      </Para>

      <List items={[
        'Your platform enters a suspended state',
        'Your public website displays a service unavailability message',
        'No refund is issued for the unpaid period',
        'You can reactivate immediately by paying via UPI',
        'Data remains available for 90 days after suspension',
      ]} />

      <Para>
        There is no "catch-up" payment required to reactivate. You simply pay for a new subscription period.
      </Para>

      <SectionHeading>11. Android App Payment</SectionHeading>

      <Para>
        <Emphasis>Android App Fee:</Emphasis> The branded Android app is available for a one-time fee of ₹3,000, in addition to any subscription plan.
      </Para>

      <List items={[
        'The Android app fee is non-refundable once payment is processed',
        'The fee covers app creation and initial setup',
        'Updates and maintenance are included during your active subscription',
        'If your subscription expires, the app functionality is limited but the app itself is not deleted',
      ]} />

      <SectionHeading>12. Third-Party Payment Issues</SectionHeading>

      <Para>
        SangTX uses UPI payment, which is processed through your bank or UPI provider. For payment issues:
      </Para>

      <List items={[
        'Contact your bank or UPI provider for technical issues',
        'Verify your UPI account has sufficient balance',
        'Check for UPI transaction limits imposed by your provider',
        'If payment appears to have been sent but not received, verify with your provider first',
        'SangTX is not responsible for third-party payment provider issues',
      ]} />

      <SectionHeading>13. Legal Disclaimers</SectionHeading>

      <Para style={{ marginBottom: 24, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, borderLeft: '3px solid #3b82f6' }}>
        <Emphasis>Important Disclaimer:</Emphasis> This policy is a business policy, not a substitute for applicable consumer protection laws. Nothing in this policy is intended to exclude or limit your consumer protection rights. To the extent applicable law grants you mandatory consumer protections, those rights cannot be waived by this policy. If you have a dispute regarding this policy, you may pursue remedies as permitted by your local laws.
      </Para>

      <Para style={{ marginBottom: 24, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, borderLeft: '3px solid #3b82f6' }}>
        <Emphasis>No Liability for Content Results:</Emphasis> SangTX provides platform infrastructure only. We are not responsible for and do not guarantee: Google search rankings, article performance, audience growth, advertising revenue, app store approval, or any business outcomes. Your content quality, SEO optimization, marketing, and audience engagement are your responsibility.
      </Para>

      <SectionHeading>14. Grievance Redressal</SectionHeading>

      <Para>
        If you have a complaint or grievance regarding this policy, refunds, or payments:
      </Para>

      <List items={[
        'Email: legal@swiftgrowthdigital.com',
        'Include your account details, transaction ID, and detailed explanation',
        'We will respond within 5 business days',
      ]} />

      <Para>
        If you are not satisfied with our response, you may pursue remedies as permitted by applicable law in your jurisdiction.
      </Para>

      <SectionHeading>15. Policy Changes</SectionHeading>

      <Para>
        We may update this Refund & Cancellation Policy at any time. Changes become effective immediately upon posting. We will update the "Last Updated" date. Your continued use of SangTX after changes constitutes acceptance.
      </Para>

      <Para>
        <Emphasis>No Retroactive Refunds:</Emphasis> Policy changes do not entitle you to refunds on payments made before the change.
      </Para>

      <SectionHeading>Contact</SectionHeading>

      <Para>
        For questions or requests regarding this Refund & Cancellation Policy:
      </Para>

      <Para>
        <Emphasis>SangTX Legal Team</Emphasis><br />
        Operated by SwiftGrowthDigital<br />
        Email: legal@swiftgrowthdigital.com<br />
        Website: https://sangtx.com
      </Para>
    </SangTXStaticPage>
  );
}

import { SangTXStaticPage, SectionHeading, Para, List, Emphasis } from './SangTXStaticPage';

export function SangTXTermsOfServicePage() {
  return (
    <SangTXStaticPage
      title="Terms of Service"
      description="Legal agreement governing your use of the SangTX platform"
    >
      <Para>
        <Emphasis>Last Updated: September 2026</Emphasis>
      </Para>

      <Para>
        These Terms of Service ("Terms") govern your use of the SangTX platform, website, and all services provided by SangTX (operated by SwiftGrowthDigital). By accessing or using SangTX, you agree to be bound by these Terms. If you do not agree with any part of these Terms, you must not use the Service.
      </Para>

      <SectionHeading>1. Definitions</SectionHeading>

      <List items={[
        '"Service" means the SangTX platform, website, applications, and all features, functionality, and services provided',
        '"Account" means your user account and workspace on SangTX',
        '"Content" means news articles, images, videos, configurations, and other materials you create or upload',
        '"Customer" or "You" means the individual or organization using the Service',
        '"Subscription" means your paid or trial access to the Service',
      ]} />

      <SectionHeading>2. Eligibility and Account Responsibility</SectionHeading>

      <Para>
        You represent and warrant that:
      </Para>

      <List items={[
        'You are at least 18 years old and have the legal capacity to enter into this agreement',
        'You are authorized to bind your organization to these Terms',
        'All information provided during registration is accurate and current',
        'You are not a competitor or operating under a competing service',
        'You will comply with all applicable laws and regulations',
      ]} />

      <Para>
        <Emphasis>You are responsible for:</Emphasis>
      </Para>

      <List items={[
        'Maintaining the confidentiality of your account credentials',
        'All activities that occur under your account',
        'Notifying us immediately of unauthorized account access',
        'Ensuring your use complies with these Terms and applicable laws',
      ]} />

      <SectionHeading>3. Subscription and Pricing</SectionHeading>

      <Para>
        <Emphasis>Trial Period:</Emphasis> New accounts receive a 7-day free trial with full access to all features. The trial is designed to allow you to evaluate the Service. SangTX may modify, suspend, or discontinue trial offers at any time without notice.
      </Para>

      <Para>
        <Emphasis>Paid Plans:</Emphasis> After your trial, you may choose to subscribe to a paid plan:
      </Para>

      <List items={[
        'Monthly Plan: ₹499/month',
        'Yearly Plan: ₹5,599/year (approximately ₹466/month)',
      ]} />

      <Para>
        Pricing is subject to change with 30 days' notice. Your continued use after price changes constitutes acceptance of new pricing.
      </Para>

      <SectionHeading>4. Payment Terms</SectionHeading>

      <Para>
        <Emphasis>Payment Method:</Emphasis> All payments are made via UPI (Unified Payments Interface). Credit card, debit card, or other payment methods are not supported.
      </Para>

      <Para>
        <Emphasis>Manual Verification:</Emphasis> After you submit a UPI payment, it is manually verified by our team within 24 hours. Your subscription is activated only after verification.
      </Para>

      <Para>
        <Emphasis>No Automatic Renewal:</Emphasis> SangTX does not operate automatic subscription renewal. You must manually submit payment via UPI when your subscription period ends. If payment is not received by the due date, your subscription enters a suspended state.
      </Para>

      <Para>
        <Emphasis>Payment Disputes:</Emphasis> If you believe a payment was incorrectly processed, contact us immediately. Do not submit duplicate payments.
      </Para>

      <SectionHeading>5. Non-Refundable Payments Policy</SectionHeading>

      <Para>
        <Emphasis>All subscription payments are NON-REFUNDABLE once successfully processed.</Emphasis>
      </Para>

      <Para>
        You acknowledge that:
      </Para>

      <List items={[
        'You have reviewed the plan, pricing, features, and subscription details before making payment',
        'Payments are non-refundable for any reason, including: change of mind, unused subscription period, partial usage, cancellation after payment, or failure to use the Service',
        'SangTX will not issue refunds for: customer-provided incorrect information, customer-side technical issues, domain or hosting issues caused by the customer, content-related issues, or failure to publish properly',
        'Your liability is limited to the amount paid for the subscription (see Limitation of Liability section)',
      ]} />

      <Para style={{ marginBottom: 24, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, borderLeft: '3px solid #3b82f6' }}>
        <Emphasis>Important Legal Qualification:</Emphasis> Nothing in this policy is intended to limit consumer protection rights that cannot legally be excluded under applicable law. To the extent permitted by law, all refund claims are expressly disclaimed except where mandatory consumer protections apply in your jurisdiction.
      </Para>

      <SectionHeading>6. Cancellation</SectionHeading>

      <Para>
        <Emphasis>How to Cancel:</Emphasis> Since SangTX uses manual payment via UPI, there is no automatic renewal. Your subscription ends on its expiration date unless you choose to renew. You can reactivate at any time by submitting a new payment.
      </Para>

      <Para>
        <Emphasis>Effect of Cancellation:</Emphasis> When your subscription expires and is not renewed:
      </Para>

      <List items={[
        'Your news website will display a service unavailability message',
        'Your data remains preserved in our systems',
        'The admin dashboard becomes inaccessible',
        'Android app functionality stops syncing new content',
        'You may reactivate at any time by submitting payment',
      ]} />

      <Para>
        <Emphasis>Data Retention After Cancellation:</Emphasis> We retain your account data for 90 days after cancellation. After 90 days, we may delete your data. Contact us if you need to recover data before deletion.
      </Para>

      <SectionHeading>7. Service Availability and Maintenance</SectionHeading>

      <Para>
        SangTX is provided on an "as-is" basis. We do not guarantee uninterrupted or error-free operation. We reserve the right to:
      </Para>

      <List items={[
        'Perform scheduled and emergency maintenance',
        'Modify or discontinue features',
        'Temporarily suspend access for security or technical reasons',
        'Update or change service infrastructure',
      ]} />

      <Para>
        We will notify you of planned maintenance where practicable. We are not liable for downtime during maintenance or caused by events beyond our reasonable control.
      </Para>

      <SectionHeading>8. Customer Content and Responsibility</SectionHeading>

      <Para>
        <Emphasis>Content Ownership:</Emphasis> You retain all ownership rights to Content you create or upload. SangTX does not claim ownership of your Content.
      </Para>

      <Para>
        <Emphasis>Your Responsibilities:</Emphasis> You are solely responsible for all Content you publish on your news platform. You warrant and represent that:
      </Para>

      <List items={[
        'You have the legal right to publish all Content',
        'Your Content does not infringe on third-party intellectual property, privacy, or publicity rights',
        'Your Content complies with all applicable laws, including copyright, libel, defamation, and content regulations',
        'Your Content does not contain illegal, fraudulent, hateful, abusive, or harmful material',
        'You have obtained all necessary permissions and clearances',
      ]} />

      <Para>
        <Emphasis>Content Removal:</Emphasis> SangTX may remove, restrict, or suspend Content or your account if:
      </Para>

      <List items={[
        'We receive valid legal claims regarding your Content',
        'Your Content violates these Terms or applicable law',
        'Your Content violates our Acceptable Use Policy',
        'We determine your Content creates legal or security liability',
        'As required by law or government request',
      ]} />

      <Para>
        <Emphasis>No Editorial Control:</Emphasis> SangTX is a technology platform. We do not editorially review, approve, or endorse your Content. We are not responsible for content accuracy, truthfulness, or editorial quality.
      </Para>

      <SectionHeading>9. Intellectual Property Rights</SectionHeading>

      <Para>
        <Emphasis>SangTX IP:</Emphasis> All SangTX platform features, design, code, documentation, and materials are our intellectual property. You may use them only as permitted by these Terms and applicable law.
      </Para>

      <Para>
        <Emphasis>License to Use:</Emphasis> We grant you a limited, non-exclusive, non-transferable license to use the SangTX Service solely for your personal or business use. You may not:
      </Para>

      <List items={[
        'Reproduce, modify, or distribute SangTX code or materials',
        'Reverse-engineer or attempt to access underlying code',
        'Use SangTX platform to build competing services',
        'Remove or alter copyright or trademark notices',
      ]} />

      <SectionHeading>10. Third-Party Integrations</SectionHeading>

      <Para>
        SangTX may integrate with third-party services (Google Analytics, Google Drive, payment providers, etc.). Your use of these integrations is subject to their terms and privacy policies. We are not responsible for third-party services, their availability, or their terms.
      </Para>

      <Para>
        If you connect your Google Account or other credentials to SangTX, you authorize us to access and use that data as necessary to provide the Service.
      </Para>

      <SectionHeading>11. Domain and Custom Domain</SectionHeading>

      <Para>
        Your SangTX platform includes a subdomain URL (your-slug.sangtx.com). Custom domain support is available where permitted. You are responsible for:
      </Para>

      <List items={[
        'Owning or legally controlling any custom domain you connect',
        'Maintaining valid domain registration and DNS configuration',
        'Compliance with domain registrar terms and applicable law',
        'Domain-related technical issues and configuration',
      ]} />

      <Para>
        SangTX is not liable for custom domain issues, DNS misconfiguration, or domain registrar problems.
      </Para>

      <SectionHeading>12. Prohibited Activities</SectionHeading>

      <Para>
        You agree not to use SangTX for any unlawful or prohibited purposes. Prohibited activities include:
      </Para>

      <List items={[
        'Illegal activities, fraud, or scams',
        'Phishing, malware, or malicious code',
        'Copyright or intellectual property infringement',
        'Harassment, threats, or hate speech',
        'Impersonation or misrepresentation',
        'Unauthorized access or breach attempts',
        'Spam or unsolicited communications',
        'Circumventing security or access controls',
        'Extracting or scraping data without permission',
        'Selling or redistributing SangTX services',
      ]} />

      <Para>
        See our Acceptable Use Policy for detailed prohibited activities.
      </Para>

      <SectionHeading>13. Account Suspension and Termination</SectionHeading>

      <Para>
        We may suspend or terminate your account without notice if:
      </Para>

      <List items={[
        'You violate these Terms or Acceptable Use Policy',
        'You engage in illegal or harmful activity',
        'Your use creates security or liability risks',
        'You fail to pay or submit invalid payments repeatedly',
        'As required by law or legal process',
      ]} />

      <Para>
        Upon termination, your access ends immediately. You remain liable for all obligations under these Terms.
      </Para>

      <SectionHeading>14. Limitation of Liability</SectionHeading>

      <Para style={{ marginBottom: 24, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, borderLeft: '3px solid #3b82f6' }}>
        <Emphasis>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</Emphasis>
        <br /><br />
        SangTX shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits, data loss, or business interruption, arising from or related to your use of the Service, even if SangTX has been advised of the possibility of such damages.
        <br /><br />
        Our total liability to you for any claim arising out of or related to this agreement shall not exceed the amount you paid for the Service in the 12 months preceding the claim.
      </Para>

      <SectionHeading>15. Disclaimer of Warranties</SectionHeading>

      <Para style={{ marginBottom: 24, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, borderLeft: '3px solid #3b82f6' }}>
        <Emphasis>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.</Emphasis>
        <br /><br />
        SangTX DISCLAIMS ALL EXPRESS AND IMPLIED WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        <br /><br />
        We do not warrant that the Service will be error-free, secure, or uninterrupted. We do not guarantee article rankings, Google visibility, app store approval, or advertising revenue.
      </Para>

      <SectionHeading>16. Indemnification</SectionHeading>

      <Para>
        You agree to indemnify and hold harmless SangTX from any claims, damages, losses, or expenses (including attorneys' fees) arising from:
      </Para>

      <List items={[
        'Your violation of these Terms',
        'Your Content or its publication',
        'Your use of the Service',
        'Your violation of third-party rights',
        'Your violation of applicable law',
      ]} />

      <SectionHeading>17. Governing Law and Jurisdiction</SectionHeading>

      <Para>
        These Terms shall be governed by and construed in accordance with the laws of <Emphasis>India</Emphasis>, without regard to conflicts of law principles. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts in <Emphasis>Patna, Bihar, India</Emphasis>.
      </Para>

      <SectionHeading>18. Changes to Terms</SectionHeading>

      <Para>
        We may modify these Terms at any time. Changes become effective immediately upon posting. Your continued use of the Service after changes constitutes acceptance of the updated Terms. We recommend reviewing these Terms periodically.
      </Para>

      <SectionHeading>19. Severability</SectionHeading>

      <Para>
        If any provision of these Terms is found invalid or unenforceable, that provision will be severed and the remaining provisions will continue in full force and effect.
      </Para>

      <SectionHeading>20. Entire Agreement</SectionHeading>

      <Para>
        These Terms, together with our Privacy Policy and Acceptable Use Policy, constitute the entire agreement between you and SangTX regarding the Service and supersede all prior agreements and understandings.
      </Para>

      <SectionHeading>21. Contact Us</SectionHeading>

      <Para>
        For questions regarding these Terms, please contact us:
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

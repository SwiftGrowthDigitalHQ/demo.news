import { SangTXStaticPage, SectionHeading, Para, List, Emphasis } from './SangTXStaticPage';

export function SangTXDisclaimerPage() {
  return (
    <SangTXStaticPage
      title="Disclaimer"
      description="Important disclaimers regarding SangTX platform and services"
    >
      <Para>
        <Emphasis>Last Updated: September 2026</Emphasis>
      </Para>

      <Para>
        This Disclaimer outlines important limitations, disclaimers, and legal provisions regarding the use of the SangTX platform and services.
      </Para>

      <SectionHeading>1. Platform Disclaimer</SectionHeading>

      <Para>
        SangTX is a <Emphasis>technology platform and infrastructure service</Emphasis>. We provide tools and services that allow news publishers to create, manage, and publish their own news websites and applications.
      </Para>

      <Para>
        <Emphasis>SangTX does not:</Emphasis>
      </Para>

      <List items={[
        'Create, edit, approve, or verify content published by customers',
        'Endorse, review, or vouch for the accuracy of customer content',
        'Exercise editorial control over news, articles, or information published',
        'Guarantee the truth, accuracy, or quality of any published content',
        'Assume responsibility for content-related legal issues',
        'Provide journalism, editorial, or reporting services',
      ]} />

      <Para>
        <Emphasis>Customers are solely responsible for:</Emphasis>
      </Para>

      <List items={[
        'All content they create, publish, or upload',
        'Accuracy, truthfulness, and legality of their content',
        'Compliance with laws, regulations, and journalistic ethics',
        'Obtaining necessary permissions and clearances',
        'Protecting their own data and intellectual property',
        'Managing their editorial policy and brand reputation',
      ]} />

      <SectionHeading>2. No Endorsement of Customer Content</SectionHeading>

      <Para>
        SangTX is not responsible for and does not automatically endorse any news articles, opinions, advertisements, images, videos, or other content published on customer platforms built with SangTX.
      </Para>

      <Para>
        The presence of content on a SangTX-powered website does not imply SangTX's approval, agreement, or verification. Readers should evaluate content based on the customer's editorial standards and credibility, not on SangTX's platform affiliation.
      </Para>

      <SectionHeading>3. Service "As Is" Disclaimer</SectionHeading>

      <Para style={{ marginBottom: 24, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, borderLeft: '3px solid #3b82f6' }}>
        <Emphasis>THE SANGTX PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES, EXPRESS OR IMPLIED.</Emphasis>
        <br /><br />
        SangTX DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND TITLE.
      </Para>

      <Para>
        We do not warrant that:
      </Para>

      <List items={[
        'The Service will be error-free or uninterrupted',
        'Defects will be corrected',
        'The Service will meet your requirements',
        'The platform will be secure or free from malware',
        'Data transmission will be secure or encrypted',
        'Any uptime, performance, or availability guarantees',
      ]} />

      <SectionHeading>4. No Liability for Content Issues</SectionHeading>

      <Para>
        SangTX is not liable for:
      </Para>

      <List items={[
        'Inaccurate, defamatory, or harmful content published by customers',
        'Copyright or intellectual property infringement in customer content',
        'Claims related to customer content, statements, or opinions',
        'Third-party claims arising from customer content',
        'Content moderation failures (we moderate only for policy violations, not accuracy)',
      ]} />

      <Para>
        If you have concerns about content accuracy or legality, contact the content publisher or the news organization directly, not SangTX.
      </Para>

      <SectionHeading>5. No Business Results Guarantee</SectionHeading>

      <Para>
        SangTX provides platform infrastructure only. We make <Emphasis>no guarantees</Emphasis> regarding:
      </Para>

      <List items={[
        'Google search visibility or SEO rankings',
        'Article performance, clicks, or engagement',
        'Audience growth or reader retention',
        'Advertising revenue or click-through rates',
        'Google AdSense approval or placement',
        'Android app store approval or visibility',
        'Social media reach or engagement',
        'Website or app performance metrics',
      ]} />

      <Para>
        Your results depend on your content quality, marketing efforts, SEO optimization, audience engagement, and external factors beyond SangTX's control.
      </Para>

      <SectionHeading>6. No Technical Support Guarantee</SectionHeading>

      <Para>
        While we provide customer support for platform technical issues, we do not guarantee:
      </Para>

      <List items={[
        'Immediate response to support requests',
        'Resolution of all technical issues',
        'Compatibility with specific third-party services',
        'Custom integrations or workarounds',
        'Data recovery from customer error or deletion',
      ]} />

      <Para>
        We recommend regular backups of your important data.
      </Para>

      <SectionHeading>7. Third-Party Services Disclaimer</SectionHeading>

      <Para>
        SangTX integrates with third-party services (Google, payment providers, hosting services, etc.). These integrations are subject to:
      </Para>

      <List items={[
        'Third-party terms of service and privacy policies',
        'Third-party availability and reliability',
        'Third-party changes, updates, or discontinuation',
      ]} />

      <Para>
        SangTX is not responsible for third-party service failures, changes, or data handling. Use of third-party services is at your own risk.
      </Para>

      <SectionHeading>8. Payment and Refund Disclaimer</SectionHeading>

      <Para>
        All payments for SangTX subscriptions are non-refundable once processed. By submitting payment, you accept this policy. See our <Emphasis>Refund & Cancellation Policy</Emphasis> for details.
      </Para>

      <Para>
        SangTX is not responsible for payment processing delays, bank errors, or issues with third-party payment providers.
      </Para>

      <SectionHeading>9. Data Loss Disclaimer</SectionHeading>

      <Para>
        While we employ security measures to protect your data, we do not guarantee that data loss will not occur. Risk of data loss includes:
      </Para>

      <List items={[
        'Natural disasters, cyberattacks, or force majeure events',
        'Third-party service provider failures',
        'Customer error or accidental deletion',
        'Security breaches despite reasonable precautions',
      ]} />

      <Para>
        <Emphasis>SangTX is not liable for data loss.</Emphasis> We recommend maintaining backups of critical data outside of SangTX.
      </Para>

      <SectionHeading>10. Security Disclaimer</SectionHeading>

      <Para>
        SangTX implements security measures, but we do not guarantee that:
      </Para>

      <List items={[
        'Your account cannot be compromised',
        'Your data cannot be intercepted or accessed by unauthorized parties',
        'The platform is impervious to cyberattacks',
        'Account credentials are absolutely secure',
      ]} />

      <Para>
        You are responsible for protecting your account credentials. If you suspect unauthorized access, contact us immediately.
      </Para>

      <SectionHeading>11. Android App Disclaimer</SectionHeading>

      <Para>
        The Android app is a separate product and is subject to:
      </Para>

      <List items={[
        'Google Play Store terms and policies',
        'Android OS updates and compatibility changes',
        'Device-specific issues and variations',
        'No guarantee of permanent availability or support',
        'Google Play Store review and approval processes (we do not control these)',
      ]} />

      <Para>
        SangTX is not responsible for app store issues, app rejection, or device-specific problems.
      </Para>

      <SectionHeading>12. Domain and Hosting Disclaimer</SectionHeading>

      <Para>
        If you connect a custom domain to SangTX:
      </Para>

      <List items={[
        'You are responsible for domain registration and renewal',
        'DNS configuration is your responsibility',
        'SangTX is not liable for domain expiration or DNS misconfiguration',
        'SSL/TLS certificates and HTTPS setup are handled by SangTX, but issues caused by domain misconfiguration are your responsibility',
      ]} />

      <SectionHeading>13. Limitation of Liability</SectionHeading>

      <Para style={{ marginBottom: 24, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, borderLeft: '3px solid #3b82f6' }}>
        <Emphasis>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</Emphasis>
        <br /><br />
        SangTX SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING LOST PROFITS, DATA LOSS, OR BUSINESS INTERRUPTION, ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE.
        <br /><br />
        This limitation applies even if we have been advised of the possibility of such damages.
      </Para>

      <SectionHeading>14. Legal Qualifications</SectionHeading>

      <Para style={{ marginBottom: 24, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, borderLeft: '3px solid #3b82f6' }}>
        <Emphasis>Important:</Emphasis> This disclaimer does not exclude or limit any liability that cannot legally be excluded under applicable law. Where mandatory consumer protection laws apply in your jurisdiction, those protections remain in effect and cannot be waived by this disclaimer.
      </Para>

      <SectionHeading>15. Assumption of Risk</SectionHeading>

      <Para>
        By using SangTX, you acknowledge and accept the risks associated with:
      </Para>

      <List items={[
        'Internet-based services and potential downtime',
        'Data transmission over the internet',
        'Third-party service integrations',
        'Platform features and limitations',
        'Content and editorial responsibilities',
      ]} />

      <SectionHeading>16. Governing Law</SectionHeading>

      <Para>
        This Disclaimer is governed by the laws of <Emphasis>India</Emphasis> and is subject to the <Emphasis>Terms of Service</Emphasis>.
      </Para>

      <SectionHeading>Contact</SectionHeading>

      <Para>
        For questions regarding this Disclaimer:
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

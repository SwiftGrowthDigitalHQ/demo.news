import { SangTXStaticPage, SectionHeading, Para, List, Emphasis } from './SangTXStaticPage';

export function SangTXPrivacyPolicyPage() {
  return (
    <SangTXStaticPage
      title="Privacy Policy"
      description="How SangTX collects, uses, and protects your personal information"
    >
      <Para>
        <Emphasis>Last Updated: September 2026</Emphasis>
      </Para>

      <Para>
        SangTX ("we", "us", "our", or "Company") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use the SangTX platform, website (https://sangtx.com), and related services (collectively, the "Service").
      </Para>

      <SectionHeading>1. Information We Collect</SectionHeading>

      <Para><Emphasis>Information you provide directly:</Emphasis></Para>
      <List items={[
        'Name, email address, and phone number when you create an account',
        'Business information (news publication name, slug, location, website configuration)',
        'Login credentials and account settings',
        'Payment and subscription information',
        'Support communications and feedback you send us',
        'Content you upload or create within the SangTX platform (articles, media, configurations)',
      ]} />

      <Para><Emphasis>Information collected automatically:</Emphasis></Para>
      <List items={[
        'Browser type, operating system, and device information',
        'IP address and approximate location (based on IP)',
        'Pages accessed, features used, and time spent on the platform',
        'HTTP referrer and other technical data',
        'Cookies and similar tracking technologies (see Cookie Policy)',
      ]} />

      <Para><Emphasis>Third-party integrations:</Emphasis></Para>
      <List items={[
        'Google OAuth: When you connect your Google account, we receive your email, profile name, and user ID via OAuth 2.0',
        'Google Drive Integration: We request access to your Google Drive files via the Google Drive API (scope: drive.file)',
        'Google Drive Tokens: We securely store encrypted access tokens and refresh tokens to manage your Drive connection',
        'Google Analytics & Search Console: If you connect these services, we receive performance metrics according to their terms',
        'Payment Providers: UPI payment processors handle payment data according to their privacy policies',
      ]} />

      <SectionHeading>2. How We Use Your Information</SectionHeading>

      <Para>We use the information we collect for the following purposes:</Para>

      <List items={[
        'Provide, maintain, and improve the SangTX Service',
        'Create and manage your account and subscription',
        'Process payments and billing',
        'Send you service-related notices and updates',
        'Provide customer support and respond to your inquiries',
        'Monitor security and detect fraudulent or unauthorized activity',
        'Comply with legal and regulatory obligations',
        'Generate analytics and usage reports to improve our Service',
        'Send newsletters and updates (only if you opt in)',
        'Personalize your experience within the platform',
      ]} />

      <SectionHeading>3. Data Sharing and Third Parties</SectionHeading>

      <Para>
        <Emphasis>We do not sell your personal information.</Emphasis> We may share your information in the following circumstances:
      </Para>

      <List items={[
        'Service Providers: We share data with third-party vendors who help us operate SangTX (hosting providers, payment processors, email services)',
        'Legal Compliance: We may disclose information to comply with legal obligations, court orders, or government requests',
        'Business Transfers: If SangTX is acquired or merged, your information may be transferred as part of that transaction',
        'With Your Consent: We may share information with third parties when you explicitly authorize us',
        'Aggregated Data: We may publish anonymized, aggregated analytics that cannot identify you',
      ]} />

      <SectionHeading>4. Google OAuth and Drive Security</SectionHeading>

      <Para>
        <Emphasis>OAuth 2.0 Implementation:</Emphasis> We use secure OAuth 2.0 authentication with Google. When you authorize SangTX to access your Google account, we receive your email, profile information, and user ID, but never your password.
      </Para>

      <Para>
        <Emphasis>Google Drive Access:</Emphasis> When you connect Google Drive, we request the `drive.file` scope, which allows us to:
      </Para>

      <List items={[
        'Access files and folders you explicitly authorize us to manage',
        'Upload, download, and delete media files within your authorized Drive folders',
        'View file metadata (name, size, timestamps)',
      ]} />

      <Para>
        <Emphasis>Importance Note:</Emphasis> We do NOT have access to:
      </Para>

      <List items={[
        'Your entire Google Drive (only authorized files/folders)',
        'Any files you have not explicitly granted access to',
        'Your Google password or security credentials',
        'Your other Google accounts or services',
      ]} />

      <Para>
        <Emphasis>Token Management:</Emphasis> OAuth refresh tokens are:
      </Para>

      <List items={[
        'Encrypted end-to-end using AES-256-GCM',
        'Stored securely in our database with restricted access',
        'Never exposed to the frontend or logged in plain text',
        'Automatically refreshed to maintain connection security',
      ]} />

      <Para>
        <Emphasis>Disconnection:</Emphasis> You can disconnect Google Drive at any time from your SangTX settings. This will:
      </Para>

      <List items={[
        'Revoke SangTX\'s access to your Google Drive',
        'Remove all stored tokens from our database',
        'Prevent future Drive operations until you reconnect',
        'Not affect files already in your Google Drive',
      ]} />

      <SectionHeading>5. Data Security</SectionHeading>

      <Para>
        We implement industry-standard security measures to protect your personal information, including encryption, secure authentication, and access controls. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security and you use the Service at your own risk.
      </Para>

      <Para>
        Payment information and sensitive credentials are encrypted using AES-256-GCM. OAuth tokens and API credentials are never stored in plain text and are encrypted at rest.
      </Para>

      <SectionHeading>6. Data Retention and Deletion</SectionHeading>

      <Para>
        We retain your personal information as long as your account is active or as long as necessary to provide the Service. When you delete your account or disconnect services:
      </Para>

      <List items={[
        'Account deletion: We retain data as required by applicable law (typically 30 days for recovery) then delete permanently',
        'Google Drive disconnection: OAuth tokens are deleted immediately; you can re-authorize at any time',
        'Payment data: Retained per payment processor requirements and legal obligations',
        'Audit logs: Retained for security and legal compliance purposes',
      ]} />

      <Para>
        You can request data deletion by contacting us, subject to legal retention requirements and service obligations.
      </Para>

      <SectionHeading>7. Your Rights and Controls</SectionHeading>

      <Para>
        Depending on your location, you may have the following rights regarding your personal information:
      </Para>

      <List items={[
        'Right to Access: You may request a copy of the personal information we hold about you',
        'Right to Correction: You may request that we correct inaccurate or incomplete information',
        'Right to Deletion: You may request deletion of your personal information (subject to legal retention requirements)',
        'Right to Data Portability: You may request export of your data in a portable format',
        'Right to Withdraw Consent: You may withdraw consent for certain processing at any time',
        'Right to Disconnect Services: You may disconnect Google Drive and other integrations at any time',
        'Right to Opt-Out: You may opt out of marketing communications',
        'Right to Lodge a Complaint: You may file a complaint with your local data protection authority',
      ]} />

      <Para>
        To exercise any of these rights, contact us at legal@swiftgrowthdigital.com with details of your request.
      </Para>

      <SectionHeading>8. Children's Privacy</SectionHeading>

      <Para>
        The SangTX Service is not intended for users under 18 years of age. We do not knowingly collect personal information from individuals under 18. If we discover that we have collected such information, we will delete it promptly. If you are a parent or guardian and believe a child has provided information to us, please contact us immediately.
      </Para>

      <SectionHeading>9. Cookies and Tracking</SectionHeading>

      <Para>
        We use cookies and similar tracking technologies to enhance your experience. For detailed information about cookies, see our Cookie Policy.
      </Para>

      <SectionHeading>10. International Data Transfer</SectionHeading>

      <Para>
        Your information may be transferred to, processed, and stored in countries other than the country where you reside. These countries may have data protection laws that differ from your home country. By using SangTX, you consent to such transfer and processing.
      </Para>

      <SectionHeading>11. Third-Party Links</SectionHeading>

      <Para>
        SangTX may contain links to third-party websites (Google, payment processors, etc.). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies separately.
      </Para>

      <SectionHeading>12. Changes to This Privacy Policy</SectionHeading>

      <Para>
        We may update this Privacy Policy periodically to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of material changes by updating the "Last Updated" date and posting the revised policy on our website. Your continued use of the Service after changes constitutes acceptance of the updated Privacy Policy.
      </Para>

      <SectionHeading>13. Contact Us</SectionHeading>

      <Para>
        If you have questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us:
      </Para>

      <Para>
        <Emphasis>SangTX Legal Team</Emphasis><br />
        Operated by SwiftGrowthDigital<br />
        Email: legal@swiftgrowthdigital.com<br />
        Website: https://sangtx.com
      </Para>

      <Para style={{ fontSize: 12, color: '#94a3b8', marginTop: 32 }}>
        Nothing in this policy is intended to limit any rights or remedies that cannot legally be excluded under applicable law. Where mandatory consumer protections apply in your jurisdiction, they will not be overridden by this policy.
      </Para>
    </SangTXStaticPage>
  );
}

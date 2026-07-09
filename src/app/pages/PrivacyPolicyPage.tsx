import { StaticPage, Heading, Para, List } from './StaticPage';

export function PrivacyPolicyPage() {
  return (
    <StaticPage title="Privacy Policy" description="Privacy Policy of Buxar News - How we collect, use, and protect your personal information.">
      <Para>
        Last updated: June 2026. This Privacy Policy describes how Buxar News ("we", "us", or "our") collects, uses, and shares your personal information when you visit our website.
      </Para>

      <Heading>1. Information We Collect</Heading>
      <Para>We collect information you provide directly to us, including:</Para>
      <List items={[
        'Name, email address, and phone number when you subscribe to our newsletter',
        'Contact information when you submit a contact form or feedback',
        'Comments and messages you post on our platform',
        'Account information if you create a user profile',
      ]} />

      <Para>We automatically collect certain information when you visit our website:</Para>
      <List items={[
        'IP address, browser type, and operating system',
        'Pages visited, time spent on pages, and navigation patterns',
        'Referring website or source that led you to our site',
        'Device type and screen resolution',
      ]} />

      <Heading>2. Cookies</Heading>
      <Para>
        We use cookies and similar tracking technologies to track activity on our website and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier.
      </Para>
      <List items={[
        'Essential Cookies: Required for the website to function properly',
        'Analytics Cookies: Help us understand how visitors interact with our website',
        'Preference Cookies: Remember your settings and preferences',
        'Marketing Cookies: Used to deliver relevant advertisements',
      ]} />
      <Para>
        You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, some features of our site may not function properly without cookies.
      </Para>

      <Heading>3. Analytics</Heading>
      <Para>
        We use analytics services to monitor and analyze web traffic. These services may collect information about your use of the website, including pages viewed, time on site, and interactions. This data helps us improve our content and user experience.
      </Para>

      <Heading>4. How We Use Your Information</Heading>
      <List items={[
        'To provide, maintain, and improve our news services',
        'To send you newsletters and breaking news alerts (with your consent)',
        'To respond to your comments, questions, and requests',
        'To monitor usage patterns and improve website performance',
        'To detect, prevent, and address technical issues or abuse',
        'To comply with legal obligations',
      ]} />

      <Heading>5. Data Sharing</Heading>
      <Para>
        We do not sell your personal information. We may share your information with third-party service providers who assist us in operating our website, conducting our business, or serving our users, so long as those parties agree to keep this information confidential.
      </Para>

      <Heading>6. Your Rights</Heading>
      <Para>You have the right to:</Para>
      <List items={[
        'Access the personal data we hold about you',
        'Request correction of inaccurate personal data',
        'Request deletion of your personal data',
        'Opt-out of marketing communications at any time',
        'Withdraw consent where processing is based on consent',
        'Lodge a complaint with a data protection authority',
      ]} />

      <Heading>7. Data Security</Heading>
      <Para>
        We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
      </Para>

      <Heading>8. Children's Privacy</Heading>
      <Para>
        Our website is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
      </Para>

      <Heading>9. Contact Us</Heading>
      <Para>
        If you have questions about this Privacy Policy, please contact us:
      </Para>
      <Para>
        Email: <a href="mailto:hello@swiftgrowthdigital.com" className="text-red-600 hover:underline">hello@swiftgrowthdigital.com</a><br />
        Phone: <a href="tel:+919229721835" className="text-red-600 hover:underline">+91 9229721835</a><br />
        Address: Patna, Bihar, India
      </Para>
    </StaticPage>
  );
}

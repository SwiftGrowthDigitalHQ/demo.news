import { StaticPage, Heading, Para, List } from './StaticPage';

export function CookiePolicyPage() {
  return (
    <StaticPage title="Cookie Policy" description="Cookie Policy of Buxar News - How we use cookies and similar technologies on our website.">
      <Para>
        Last updated: June 2026. This Cookie Policy explains how Buxar News uses cookies and similar technologies when you visit our website.
      </Para>

      <Heading>What Are Cookies?</Heading>
      <Para>
        Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently and to provide information to the website owners.
      </Para>

      <Heading>Types of Cookies We Use</Heading>

      <Para><strong>Essential Cookies</strong></Para>
      <Para>
        These cookies are necessary for the website to function properly. They enable basic functions like page navigation, access to secure areas, and remembering your preferences. The website cannot function without these cookies.
      </Para>

      <Para><strong>Analytics Cookies</strong></Para>
      <Para>
        These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our website structure and content.
      </Para>

      <Para><strong>Functionality Cookies</strong></Para>
      <Para>
        These cookies allow the website to remember choices you make (such as your language preference or region) and provide enhanced, personalized features.
      </Para>

      <Para><strong>Advertising/Marketing Cookies</strong></Para>
      <Para>
        These cookies are used to deliver advertisements that are relevant to you and your interests. They also limit the number of times you see an advertisement and help measure the effectiveness of advertising campaigns.
      </Para>

      <Heading>Third-Party Cookies</Heading>
      <Para>Some cookies are placed by third-party services that appear on our pages:</Para>
      <List items={[
        'Google Analytics — for website traffic analysis',
        'Google AdSense — for displaying relevant advertisements',
        'Social media platforms — for share buttons and embedded content',
        'Video hosting services — for embedded video content',
      ]} />

      <Heading>Managing Cookies</Heading>
      <Para>
        Most web browsers allow you to control cookies through their settings. You can set your browser to refuse cookies, delete cookies, or alert you when a cookie is being set. Please note that disabling cookies may affect the functionality of this website.
      </Para>
      <Para>How to manage cookies in popular browsers:</Para>
      <List items={[
        'Google Chrome: Settings → Privacy and Security → Cookies',
        'Mozilla Firefox: Settings → Privacy & Security → Cookies',
        'Safari: Preferences → Privacy → Cookies',
        'Microsoft Edge: Settings → Privacy → Cookies',
      ]} />

      <Heading>Cookie Retention</Heading>
      <List items={[
        'Session cookies: Deleted when you close your browser',
        'Persistent cookies: Remain for a set period (typically 30 days to 2 years)',
        'Analytics cookies: Retained for up to 26 months',
      ]} />

      <Heading>Updates to This Policy</Heading>
      <Para>
        We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated revision date.
      </Para>

      <Heading>Contact</Heading>
      <Para>
        If you have questions about our use of cookies, contact us at:{' '}
        <a href="mailto:hello@swiftgrowthdigital.com" className="text-red-600 hover:underline">hello@swiftgrowthdigital.com</a>
      </Para>
    </StaticPage>
  );
}

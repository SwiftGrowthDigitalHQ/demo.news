import { SangTXStaticPage, SectionHeading, Para, List, Emphasis, Code } from './SangTXStaticPage';

export function SangTXCookiePolicyPage() {
  return (
    <SangTXStaticPage
      title="Cookie Policy"
      description="Information about cookies and tracking technologies used by SangTX"
    >
      <Para>
        <Emphasis>Last Updated: September 2026</Emphasis>
      </Para>

      <Para>
        This Cookie Policy explains what cookies are, how SangTX ("we", "us", or "our") uses them on the SangTX platform and website (https://sangtx.com), and your choices regarding cookies.
      </Para>

      <SectionHeading>1. What Are Cookies?</SectionHeading>

      <Para>
        Cookies are small text files stored on your device (computer, tablet, or smartphone) when you visit a website. Cookies help websites recognize your device, remember information about you, and improve your experience.
      </Para>

      <Para>
        <Emphasis>Types of cookies:</Emphasis>
      </Para>

      <List items={[
        'Session cookies: Deleted when you close your browser',
        'Persistent cookies: Remain on your device for a set period',
        'First-party cookies: Set by SangTX',
        'Third-party cookies: Set by external services SangTX uses',
      ]} />

      <SectionHeading>2. Cookies We Use</SectionHeading>

      <Para><Emphasis>Essential/Functional Cookies:</Emphasis></Para>

      <Para>
        These cookies are necessary for the SangTX platform to function. They enable:
      </Para>

      <List items={[
        'Authentication and login functionality',
        'Session management and security',
        'Account preferences and settings',
        'Platform navigation and core features',
        'CSRF (Cross-Site Request Forgery) protection',
      ]} />

      <Para style={{ fontSize: 13, marginBottom: 16, padding: 12, background: 'rgba(148, 163, 184, 0.1)', borderRadius: 4 }}>
        <Emphasis>Example:</Emphasis> <Code>auth_token</Code>, <Code>session_id</Code>, <Code>csrf_token</Code>, <Code>user_preferences</Code>
      </Para>

      <Para>
        <Emphasis>These cookies cannot be disabled</Emphasis> as they are essential for the platform to work.
      </Para>

      <Para><Emphasis>Analytics Cookies:</Emphasis></Para>

      <Para>
        We use analytics cookies to understand how users interact with SangTX. This helps us:
      </Para>

      <List items={[
        'Track page views and user flows',
        'Identify popular features and usage patterns',
        'Improve platform performance and user experience',
        'Debug technical issues',
      ]} />

      <Para>
        Analytics are processed in aggregated, anonymized form. We use services like Google Analytics where configured.
      </Para>

      <Para><Emphasis>Preference Cookies:</Emphasis></Para>

      <Para>
        Preference cookies remember your choices:
      </Para>

      <List items={[
        'Language preference',
        'Theme preference (light/dark mode)',
        'UI settings and customizations',
      ]} />

      <Para><Emphasis>Security Cookies:</Emphasis></Para>

      <Para>
        We use security cookies to:
      </Para>

      <List items={[
        'Detect and prevent fraudulent activity',
        'Verify user identity and authorization',
        'Protect against unauthorized access',
        'Log security events',
      ]} />

      <Para>
        <Emphasis>We do NOT use:</Emphasis> Marketing cookies, advertising cookies, or tracking cookies that follow you across the web for targeted advertising.
      </Para>

      <SectionHeading>3. Third-Party Cookies and Services</SectionHeading>

      <Para>
        SangTX integrates with third-party services that may set their own cookies:
      </Para>

      <Para><Emphasis>Google Analytics:</Emphasis></Para>

      <Para>
        If enabled, we use Google Analytics to track visitor behavior. Google sets cookies to:
      </Para>

      <List items={[
        'Identify unique visitors',
        'Track page views and sessions',
        'Measure conversion and engagement',
      ]} />

      <Para>
        Google Analytics cookies include <Code>_ga</Code>, <Code>_gid</Code>, and related identifiers. See Google's privacy policy at https://policies.google.com/privacy for details.
      </Para>

      <Para><Emphasis>Payment Processors:</Emphasis></Para>

      <Para>
        When you submit a UPI payment, your payment provider may set cookies or tracking identifiers. These are governed by their privacy policies.
      </Para>

      <Para><Emphasis>Supabase/Firebase (Backend Services):</Emphasis></Para>

      <Para>
        Our backend infrastructure may set session or analytics cookies. These are essential for platform functionality.
      </Para>

      <SectionHeading>4. How to Control Cookies</SectionHeading>

      <Para><Emphasis>Browser Settings:</Emphasis></Para>

      <Para>
        You can control cookies through your browser settings:
      </Para>

      <List items={[
        'Accept all cookies',
        'Block all cookies',
        'Block third-party cookies only',
        'Delete cookies when you close the browser',
        'View or delete specific cookies',
      ]} />

      <Para>
        Browser controls vary by browser. For help, visit:
      </Para>

      <List items={[
        'Chrome: https://support.google.com/chrome/answer/95647',
        'Firefox: https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer',
        'Safari: https://support.apple.com/kb/PH21411',
        'Edge: https://support.microsoft.com/en-us/windows/delete-and-manage-cookies',
      ]} />

      <Para><Emphasis>Important:</Emphasis> If you block essential cookies, SangTX may not function properly, and you may not be able to log in or use core features.
      </Para>

      <Para><Emphasis>Opt-Out from Google Analytics:</Emphasis></Para>

      <Para>
        You can opt out of Google Analytics by:
      </Para>

      <List items={[
        'Installing the Google Analytics Opt-out Browser Add-on: https://support.google.com/analytics/answer/181881',
        'Disabling analytics in your browser settings',
      ]} />

      <Para><Emphasis>Do Not Track (DNT):</Emphasis></Para>

      <Para>
        If your browser sends a DNT signal, we will attempt to respect it for analytics cookies. However, some features may still require cookies to function.
      </Para>

      <SectionHeading>5. Cookies on Customer News Websites</SectionHeading>

      <Para>
        If you are a SangTX customer publishing a news website under your own brand, the cookies on your public website are <Emphasis>your responsibility</Emphasis>. Your website visitors' cookie preferences and consents are governed by <Emphasis>your Privacy Policy and Cookie Policy</Emphasis>, not SangTX's.
      </Para>

      <Para>
        SangTX's admin platform uses the cookies described in this policy. Your published website may use different cookies based on your configuration and integrations (e.g., your own Google Analytics account, your own ad networks).
      </Para>

      <SectionHeading>6. Changes to This Cookie Policy</SectionHeading>

      <Para>
        We may update this Cookie Policy to reflect changes in our practices, technology, or legal requirements. We will update the "Last Updated" date and post the revised policy on our website. Your continued use of SangTX after changes constitutes acceptance.
      </Para>

      <SectionHeading>7. Contact Us</SectionHeading>

      <Para>
        If you have questions about this Cookie Policy or how we use cookies:
      </Para>

      <Para>
        <Emphasis>SangTX Legal Team</Emphasis><br />
        Operated by SwiftGrowthDigital<br />
        Email: legal@swiftgrowthdigital.com<br />
        Website: https://sangtx.com
      </Para>

      <Para style={{ fontSize: 12, color: '#94a3b8', marginTop: 32 }}>
        <Emphasis>Additional Resources:</Emphasis>
        <br />
        All About Cookies: https://www.allaboutcookies.org
        <br />
        IAMAI Cookie Policy Guidelines: https://www.iamai.in/
      </Para>
    </SangTXStaticPage>
  );
}

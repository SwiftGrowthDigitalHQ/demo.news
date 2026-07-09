import { StaticPage, Heading, Para, List } from './StaticPage';

export function TermsPage() {
  return (
    <StaticPage title="Terms & Conditions" description="Terms and Conditions of use for Buxar News website and services.">
      <Para>
        Last updated: June 2026. Please read these Terms and Conditions carefully before using the Buxar News website. By accessing or using our website, you agree to be bound by these terms.
      </Para>

      <Heading>1. Acceptance of Terms</Heading>
      <Para>
        By accessing and using this website, you accept and agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree with any part of these terms, you must not use our website.
      </Para>

      <Heading>2. Usage of Content</Heading>
      <List items={[
        'All content on this website is for general information and news purposes only',
        'You may read, share links, and quote brief excerpts with proper attribution',
        'You may not reproduce, distribute, or republish full articles without written permission',
        'Content is provided "as is" without warranties of any kind',
        'We reserve the right to modify or remove content at any time without notice',
      ]} />

      <Heading>3. Copyright & Intellectual Property</Heading>
      <Para>
        All content published on Buxar News, including but not limited to text, graphics, logos, images, audio/video clips, and software, is the property of Buxar News or its content suppliers and is protected by Indian and international copyright laws.
      </Para>
      <Para>
        The compilation of all content on this site is the exclusive property of Buxar News. Unauthorized use of any material on this website may violate copyright, trademark, and other applicable laws.
      </Para>

      <Heading>4. User Responsibilities</Heading>
      <Para>When using our website, you agree to:</Para>
      <List items={[
        'Use the website only for lawful purposes',
        'Not engage in any activity that disrupts or interferes with the website',
        'Not attempt to gain unauthorized access to any part of the website',
        'Not upload or transmit any viruses, malware, or harmful code',
        'Not post defamatory, obscene, or offensive content in comments',
        'Respect the intellectual property rights of Buxar News and third parties',
        'Not use automated systems (bots, scrapers) to access the website',
      ]} />

      <Heading>5. User Comments & Contributions</Heading>
      <Para>
        If you post comments or contribute content to our website, you grant Buxar News a non-exclusive, royalty-free, perpetual license to use, reproduce, modify, and display that content. You are solely responsible for the content you post.
      </Para>

      <Heading>6. Limitation of Liability</Heading>
      <Para>
        Buxar News shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of, or inability to use, this website. This includes damages for loss of profits, data, or other intangible losses.
      </Para>
      <Para>
        We make no guarantees about the accuracy, completeness, or timeliness of information on this website. News content is subject to change and correction.
      </Para>

      <Heading>7. Third-Party Links</Heading>
      <Para>
        Our website may contain links to third-party websites. These links are provided for convenience only. We have no control over the content of these sites and accept no responsibility for them or for any loss or damage arising from your use of them.
      </Para>

      <Heading>8. Governing Law</Heading>
      <Para>
        These Terms and Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts in Patna, Bihar, India.
      </Para>

      <Heading>9. Changes to Terms</Heading>
      <Para>
        We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting on this page. Your continued use of the website after changes constitutes acceptance of the new terms.
      </Para>

      <Heading>10. Contact</Heading>
      <Para>
        For questions about these Terms, contact us at:{' '}
        <a href="mailto:hello@swiftgrowthdigital.com" className="text-red-600 hover:underline">hello@swiftgrowthdigital.com</a>
      </Para>
    </StaticPage>
  );
}

import { StaticPage, Heading, Para } from './StaticPage';

export function DisclaimerPage() {
  return (
    <StaticPage title="Disclaimer" description="Disclaimer for Buxar News - Important information about our news content and services.">
      <Para>
        Last updated: June 2026. The information provided by Buxar News ("we", "us", or "our") on our website is for general informational and news purposes only.
      </Para>

      <Heading>General Disclaimer</Heading>
      <Para>
        All information on this website is published in good faith and for general news and information purposes only. Buxar News does not make any warranties about the completeness, reliability, or accuracy of this information. Any action you take upon the information you find on this website is strictly at your own risk.
      </Para>

      <Heading>News Content</Heading>
      <Para>
        While we strive to provide accurate and timely news, we cannot guarantee that all information published is free from errors. News events develop rapidly, and initial reports may be updated or corrected as more information becomes available. We encourage readers to verify critical information from multiple sources.
      </Para>

      <Heading>Opinions & Editorials</Heading>
      <Para>
        Opinion pieces, editorials, and columns published on this website represent the views of their respective authors and do not necessarily reflect the editorial stance of Buxar News. These articles are clearly marked and should be understood as personal commentary rather than factual reporting.
      </Para>

      <Heading>External Links</Heading>
      <Para>
        Our website may contain links to external websites that are not provided or maintained by us. We do not guarantee the accuracy, relevance, timeliness, or completeness of any information on these external websites. The inclusion of any link does not imply endorsement by Buxar News.
      </Para>

      <Heading>Professional Advice</Heading>
      <Para>
        The content on this website is not intended to be a substitute for professional advice, including but not limited to legal, financial, medical, or other expert guidance. Always seek the advice of qualified professionals regarding specific situations.
      </Para>

      <Heading>Images & Multimedia</Heading>
      <Para>
        Images, videos, and other multimedia content used on this website may be sourced from various providers. While we make every effort to properly attribute and license media content, if you believe any content infringes your rights, please contact us immediately.
      </Para>

      <Heading>Limitation of Liability</Heading>
      <Para>
        In no event shall Buxar News, its directors, employees, partners, agents, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, or other intangible losses, resulting from your access to or use of the website.
      </Para>

      <Heading>Contact</Heading>
      <Para>
        If you have concerns about any content on this website, please contact us at:{' '}
        <a href="mailto:hello@swiftgrowthdigital.com" className="text-red-600 hover:underline">hello@swiftgrowthdigital.com</a>
      </Para>
    </StaticPage>
  );
}

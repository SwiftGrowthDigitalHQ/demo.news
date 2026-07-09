import { StaticPage, Heading, Para, List } from './StaticPage';

export function EditorialPolicyPage() {
  return (
    <StaticPage title="Editorial Policy" description="Editorial Policy of Buxar News - Our commitment to quality journalism and ethical reporting standards.">
      <Para>
        At Buxar News, we are committed to delivering accurate, fair, and responsible journalism. This Editorial Policy outlines the principles and standards that guide our newsroom operations.
      </Para>

      <Heading>Core Principles</Heading>
      <List items={[
        'Truth and Accuracy: We are dedicated to factual reporting. All stories are verified before publication.',
        'Independence: Our editorial decisions are made independently of commercial, political, or personal interests.',
        'Fairness and Impartiality: We present multiple perspectives and give all parties an opportunity to respond.',
        'Humanity: We exercise compassion and sensitivity in reporting on victims of crime, tragedy, and grief.',
        'Accountability: We are accountable to our readers and promptly correct errors.',
      ]} />

      <Heading>Source Verification</Heading>
      <Para>
        All stories must be based on verified information from credible sources. Our reporters are required to confirm facts with at least two independent sources before publication, except in cases of official press releases or government notifications.
      </Para>

      <Heading>Corrections Policy</Heading>
      <Para>
        We take errors seriously. When mistakes are identified, we issue corrections promptly and transparently. Corrections are clearly labeled and appended to the original article. Significant errors may warrant an editor's note or separate correction notice.
      </Para>

      <Heading>Separation of News and Opinion</Heading>
      <Para>
        We maintain a clear distinction between news reporting and opinion content. News articles present facts without editorial comment. Opinion pieces, editorials, and columns are clearly labeled and represent the views of individual authors.
      </Para>

      <Heading>Conflict of Interest</Heading>
      <Para>
        Our journalists must disclose any potential conflicts of interest. No reporter may cover a story in which they have a personal, financial, or political interest. Sponsored content is clearly labeled and kept separate from editorial content.
      </Para>

      <Heading>Privacy and Sensitivity</Heading>
      <List items={[
        'We do not identify victims of sexual assault or minors involved in criminal cases',
        'We exercise restraint in publishing graphic images or details that serve no public interest',
        'We respect the privacy of individuals unless public interest demands disclosure',
        'We do not publish unverified personal information from social media',
      ]} />

      <Heading>Digital Ethics</Heading>
      <Para>
        We do not engage in clickbait, sensationalism, or misleading headlines. Our headlines accurately reflect the content of the article. We do not manipulate images or videos to misrepresent events.
      </Para>

      <Heading>Reader Engagement</Heading>
      <Para>
        We welcome reader feedback, corrections, and story tips. Readers can reach our editorial team at:{' '}
        <a href="mailto:hello@swiftgrowthdigital.com" className="text-red-600 hover:underline">hello@swiftgrowthdigital.com</a>
      </Para>
    </StaticPage>
  );
}

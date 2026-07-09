import { StaticPage, Heading, Para, List } from './StaticPage';

export function AboutPage() {
  return (
    <StaticPage title="About Us" description="Learn about Buxar News - Bihar's trusted digital news platform for local, national, politics, crime, education, and business news.">
      <Heading>Company Overview</Heading>
      <Para>
        Buxar News is a modern digital news platform serving readers across Bihar and India. Founded with the mission of delivering accurate, timely, and unbiased news coverage, we have grown to become one of the most trusted sources of information for local communities.
      </Para>
      <Para>
        Our dedicated team of journalists and reporters work around the clock to bring you the latest updates on politics, crime, education, employment, sports, business, and technology from Buxar, Bihar, and across India.
      </Para>

      <Heading>Our Mission</Heading>
      <Para>
        To empower citizens with accurate, timely, and unbiased news that helps them make informed decisions. We believe in journalism that serves the public interest, holds power accountable, and gives voice to the voiceless.
      </Para>

      <Heading>Our Vision</Heading>
      <Para>
        To become Bihar's most trusted and widely-read digital news platform, setting the standard for quality journalism in regional media. We aspire to reach every household with news that matters to their daily lives.
      </Para>

      <Heading>Editorial Standards</Heading>
      <List items={[
        'Accuracy: Every story is fact-checked before publication',
        'Impartiality: We present all sides of a story without bias',
        'Independence: Our editorial decisions are free from commercial or political influence',
        'Accountability: We promptly correct errors and maintain transparency',
        'Ethics: We respect privacy, avoid sensationalism, and uphold journalistic ethics',
        'Timeliness: Breaking news is published within minutes of verification',
      ]} />

      <Heading>Coverage Areas</Heading>
      <List items={[
        'Buxar District — Local governance, events, and community news',
        'Bihar State — State politics, development, and policy updates',
        'National — India-wide news, Parliament, and Supreme Court coverage',
        'Politics — Elections, party activities, and government decisions',
        'Crime — Law enforcement, court proceedings, and public safety',
        'Education — Examinations, results, admissions, and scholarships',
        'Jobs — Government and private sector recruitment notifications',
        'Sports — Cricket, football, local tournaments, and athlete profiles',
        'Business — Markets, startups, and economic developments',
        'Technology — Digital India, gadgets, and innovation',
      ]} />

      <Heading>Contact Information</Heading>
      <Para>
        Editorial Office: Patna, Bihar, India
      </Para>
      <Para>
        Phone: <a href="tel:+919229721835" className="text-red-600 hover:underline">+91 9229721835</a>
      </Para>
      <Para>
        Email: <a href="mailto:hello@swiftgrowthdigital.com" className="text-red-600 hover:underline">hello@swiftgrowthdigital.com</a>
      </Para>
    </StaticPage>
  );
}
